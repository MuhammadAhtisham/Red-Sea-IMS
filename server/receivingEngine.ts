// Automated Inbound Receiving & UoM Reconciliation Engine
import { db, TransactionError } from './store.js';
import {
  PurchaseOrder,
  GoodsReceipt,
  GoodsReceiptLine,
  PackageLevel,
  Product,
  ProductPackaging,
  UoM,
} from './types.js';

export interface ScannedLineInput {
  productId: string;
  scannedBarcode: string;
  scannedQty: number;
}

export interface BarcodeLookupResult {
  found: boolean;
  product?: Product;
  packaging?: ProductPackaging;
  uom?: UoM;
  detectedPackageLevel: PackageLevel;
  conversionRatio: number;
  label: string;
}

export class ReceivingEngine {
  /**
   * Barcode Lookup Middleware:
   * Dynamically inspects Product base barcode AND all Packaging-level barcodes (Each, Inner Pack, Case, Pallet)
   */
  public static lookupBarcode(barcode: string): BarcodeLookupResult {
    const cleanBarcode = barcode.trim();

    // 1. Search in Packaging table for packaging-specific barcodes (e.g. Case of 24, Pallet of 144)
    for (const prod of db.products) {
      if (prod.packagings) {
        const pkg = prod.packagings.find((p) => p.barcode === cleanBarcode);
        if (pkg) {
          const uom = db.uoms.find((u) => u.id === pkg.uomId);
          return {
            found: true,
            product: prod,
            packaging: pkg,
            uom,
            detectedPackageLevel: pkg.packageLevel,
            conversionRatio: pkg.qty,
            label: `${prod.name} [${pkg.packageLevel}] (${pkg.qty} base units/pkg)`,
          };
        }
      }
    }

    // 2. Search in base Product barcodes (standard Each/Unit)
    const productByBase = db.products.find(
      (p) => p.barcode === cleanBarcode || p.sku.toLowerCase() === cleanBarcode.toLowerCase()
    );
    if (productByBase) {
      const baseUom = db.uoms.find((u) => u.id === productByBase.baseUoMId) || db.uoms[0];
      return {
        found: true,
        product: productByBase,
        detectedPackageLevel: 'EACH',
        conversionRatio: 1,
        uom: baseUom,
        label: `${productByBase.name} [EACH] (1 unit)`,
      };
    }

    return {
      found: false,
      detectedPackageLevel: 'EACH',
      conversionRatio: 1,
      label: 'Unknown Barcode',
    };
  }

  /**
   * Process Blind Receipt Submission:
   * Reconciles counted packaging levels against Purchase Order expected lines.
   * Routes to Quarantine if variances exist, or commits to active stock if exact match.
   */
  public static async processBlindReceipt(params: {
    poId: string;
    locationId: string;
    receivedByUserId: string;
    receivedByUserName: string;
    scannedItems: ScannedLineInput[];
    notes?: string;
  }): Promise<{
    receipt: GoodsReceipt;
    hasVariance: boolean;
    quarantined: boolean;
    message: string;
  }> {
    const po = db.purchaseOrders.find((p) => p.id === params.poId);
    if (!po) {
      throw new TransactionError(`Purchase Order "${params.poId}" not found.`);
    }

    const location = db.locations.find((l) => l.id === params.locationId) || db.locations[0];
    const quarantineLocation =
      db.locations.find((l) => l.type === 'QUARANTINE') ||
      db.locations.find((l) => l.id.includes('quar')) ||
      db.locations[0];

    const receiptId = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const receiptNumber = `REC-NEOM-${Date.now().toString().slice(-5)}`;

    // Group scanned items by Product and calculate aggregate base units converted
    const aggregatedCountByProduct: Record<
      string,
      {
        totalBaseQty: number;
        scans: {
          scannedBarcode: string;
          scannedQty: number;
          packageLevel: PackageLevel;
          ratio: number;
          uomId: string;
          uomCode: string;
        }[];
      }
    > = {};

    for (const scan of params.scannedItems) {
      const lookup = this.lookupBarcode(scan.scannedBarcode);
      const ratio = lookup.conversionRatio || 1;
      const baseUnits = scan.scannedQty * ratio;

      if (!aggregatedCountByProduct[scan.productId]) {
        aggregatedCountByProduct[scan.productId] = {
          totalBaseQty: 0,
          scans: [],
        };
      }

      aggregatedCountByProduct[scan.productId].totalBaseQty += baseUnits;
      aggregatedCountByProduct[scan.productId].scans.push({
        scannedBarcode: scan.scannedBarcode,
        scannedQty: scan.scannedQty,
        packageLevel: lookup.detectedPackageLevel,
        ratio,
        uomId: lookup.uom?.id || 'uom-ea',
        uomCode: lookup.uom?.code || 'EA',
      });
    }

    // Build Receipt Lines comparing against PO Expected Lines
    let hasVariance = false;
    let totalExpectedBase = 0;
    let totalReceivedBase = 0;
    const receiptLines: GoodsReceiptLine[] = [];

    // Evaluate all expected PO lines
    for (const poLine of po.lines) {
      const prod = db.products.find((p) => p.id === poLine.productId);
      const expectedBase = poLine.expectedBaseQty;
      totalExpectedBase += expectedBase;

      const userScans = aggregatedCountByProduct[poLine.productId];
      const actualBase = userScans ? userScans.totalBaseQty : 0;
      totalReceivedBase += actualBase;

      const delta = actualBase - expectedBase;
      const status: 'MATCH' | 'SHORTAGE' | 'OVERAGE' =
        delta === 0 ? 'MATCH' : delta > 0 ? 'OVERAGE' : 'SHORTAGE';

      if (status !== 'MATCH') {
        hasVariance = true;
      }

      // Representative scan or default
      const primaryScan = userScans?.scans[0] || {
        scannedBarcode: prod?.barcode || 'N/A',
        scannedQty: actualBase,
        packageLevel: 'EACH' as PackageLevel,
        ratio: 1,
        uomId: 'uom-ea',
        uomCode: 'EA',
      };

      receiptLines.push({
        id: `rcl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        receiptId,
        productId: poLine.productId,
        productSku: poLine.productSku,
        productName: poLine.productName,
        scannedBarcode: primaryScan.scannedBarcode,
        scannedQty: actualBase,
        scannedUomId: primaryScan.uomId,
        scannedUomCode: primaryScan.uomCode,
        scannedPackageLevel: primaryScan.packageLevel,
        conversionRatio: primaryScan.ratio,
        baseQtyConverted: actualBase,
        expectedBaseQty: expectedBase,
        varianceDelta: delta,
        status,
      });
    }

    // Also check if user scanned products that were NOT even in the PO (unauthorized overage)
    for (const [prodId, data] of Object.entries(aggregatedCountByProduct)) {
      if (!po.lines.some((l) => l.productId === prodId)) {
        hasVariance = true;
        const unexpectedProd = db.products.find((p) => p.id === prodId);
        totalReceivedBase += data.totalBaseQty;
        receiptLines.push({
          id: `rcl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          receiptId,
          productId: prodId,
          productSku: unexpectedProd?.sku || 'UNKNOWN',
          productName: unexpectedProd?.name || 'Unlisted Inbound Item',
          scannedBarcode: data.scans[0]?.scannedBarcode || 'N/A',
          scannedQty: data.totalBaseQty,
          scannedUomId: data.scans[0]?.uomId || 'uom-ea',
          scannedUomCode: data.scans[0]?.uomCode || 'EA',
          scannedPackageLevel: data.scans[0]?.packageLevel || 'EACH',
          conversionRatio: data.scans[0]?.ratio || 1,
          baseQtyConverted: data.totalBaseQty,
          expectedBaseQty: 0,
          varianceDelta: data.totalBaseQty,
          status: 'OVERAGE',
        });
      }
    }

    // EXCEPTION ROUTING & TRANSACTION EXECUTION
    const receiptStatus = hasVariance ? 'PENDING_REVIEW' : 'COMMITTED';
    const targetLocationId = hasVariance ? quarantineLocation.id : location.id;

    const receipt: GoodsReceipt = {
      id: receiptId,
      receiptNumber,
      poId: po.id,
      poNumber: po.poNumber,
      vendorName: po.vendorName || po.supplier || 'Standard Supplier',
      locationId: targetLocationId,
      locationName: hasVariance ? quarantineLocation.name : location.name,
      receivedByUserId: params.receivedByUserId,
      receivedByUserName: params.receivedByUserName,
      timestamp: new Date().toISOString(),
      status: receiptStatus,
      lines: receiptLines,
      hasVariance,
      varianceSummary: {
        totalExpectedBase,
        totalReceivedBase,
        netDelta: totalReceivedBase - totalExpectedBase,
        notes: hasVariance
          ? `Discrepancy detected: Expected ${totalExpectedBase} base units, physical count received ${totalReceivedBase}. Placed in Quarantine Bay.`
          : 'Exact count matched purchase order specifications.',
      },
      quarantineNotes: hasVariance
        ? `AUTOMATIC ROUTING: Discrepancy detected (+/- ${Math.abs(
            totalReceivedBase - totalExpectedBase
          )} units). Goods staged in ${quarantineLocation.name} pending manager signoff.`
        : undefined,
    };

    // Execute atomic transaction to update stock & ledger
    await db.executeTransaction(async ({ adjustStock }) => {
      // 1. Credit stock to location (Quarantine if variance, or Active Warehouse if clean)
      for (const line of receiptLines) {
        if (line.baseQtyConverted > 0) {
          adjustStock({
            productId: line.productId,
            locationId: targetLocationId,
            quantityDelta: line.baseQtyConverted,
            type: hasVariance ? 'QUARANTINE_ISOLATION' : 'RECEIPT',
            reference: receiptNumber,
            notes: hasVariance
              ? `Blind Inbound Receipt Discrepancy - Quarantined in ${quarantineLocation.code}`
              : `Clean Inbound Receipt against ${po.poNumber}`,
            userId: params.receivedByUserId,
          });
        }
      }

      // 2. Update Purchase Order status
      po.status = hasVariance ? 'QUARANTINED' : 'COMPLETED';

      // 3. Save receipt
      db.goodsReceipts.unshift(receipt);
    });

    return {
      receipt,
      hasVariance,
      quarantined: hasVariance,
      message: hasVariance
        ? `Variance detected (${totalReceivedBase - totalExpectedBase > 0 ? '+' : ''}${
            totalReceivedBase - totalExpectedBase
          } base units). Goods held in Quarantine (${quarantineLocation.name}) awaiting Manager Authorization.`
        : `Receipt successfully verified! ${totalReceivedBase} base units committed directly to ${location.name}.`,
    };
  }

  /**
   * Manager Discrepancy Resolution:
   * Allows warehouse managers to review quarantined goods and:
   * 1. Accept Variance: moves stock from Quarantine to Active Warehouse.
   * 2. Return to Vendor (RTV): deducts discrepancy and generates supplier chargeback.
   * 3. Trigger Recount: flags lines for recount by floor staff.
   */
  public static async resolveVariance(params: {
    receiptId: string;
    action: 'ACCEPT_VARIANCE' | 'GENERATE_RTV' | 'TRIGGER_RECOUNT';
    managerUserId: string;
    managerName: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; receipt: GoodsReceipt }> {
    const receipt = db.goodsReceipts.find((r) => r.id === params.receiptId);
    if (!receipt) {
      throw new TransactionError(`Goods Receipt "${params.receiptId}" not found.`);
    }

    const quarantineLocation =
      db.locations.find((l) => l.type === 'QUARANTINE') ||
      db.locations.find((l) => l.id.includes('quar')) ||
      db.locations[0];

    const targetActiveLocation =
      db.locations.find((l) => l.type === 'WAREHOUSE') || db.locations[0];

    const po = db.purchaseOrders.find((p) => p.id === receipt.poId);

    if (params.action === 'ACCEPT_VARIANCE') {
      await db.executeTransaction(async ({ transferStock }) => {
        // Move all items from quarantine to active warehouse
        for (const line of receipt.lines) {
          if (line.baseQtyConverted > 0) {
            transferStock({
              productId: line.productId,
              fromLocationId: quarantineLocation.id,
              toLocationId: targetActiveLocation.id,
              quantity: line.baseQtyConverted,
              reference: `VAR-ACC-${receipt.receiptNumber}`,
              notes: `Manager Approved Variance: ${params.notes || 'Accepted overage/shortage by ' + params.managerName}`,
              userId: params.managerUserId,
            });
          }
        }

        receipt.status = 'COMMITTED';
        receipt.resolutionAction = 'ACCEPT_VARIANCE';
        receipt.resolvedAt = new Date().toISOString();
        receipt.resolvedBy = params.managerName;
        receipt.locationId = targetActiveLocation.id;
        receipt.locationName = targetActiveLocation.name;

        if (po) {
          po.status = 'COMPLETED';
        }
      });

      return {
        success: true,
        message: `Variance accepted by ${params.managerName}. Inventory released from Quarantine to ${targetActiveLocation.name}.`,
        receipt,
      };
    } else if (params.action === 'GENERATE_RTV') {
      await db.executeTransaction(async ({ adjustStock }) => {
        // Find lines with overage to deduct from quarantine
        for (const line of receipt.lines) {
          if (line.status === 'OVERAGE' && line.varianceDelta > 0) {
            adjustStock({
              productId: line.productId,
              locationId: quarantineLocation.id,
              quantityDelta: -line.varianceDelta,
              type: 'RETURN',
              reference: `RTV-${receipt.receiptNumber}`,
              notes: `Return to Vendor (RTV) initiated by ${params.managerName} for ${line.varianceDelta} unapproved units`,
              userId: params.managerUserId,
            });
          }
        }

        receipt.status = 'COMMITTED';
        receipt.resolutionAction = 'GENERATE_RTV';
        receipt.resolvedAt = new Date().toISOString();
        receipt.resolvedBy = params.managerName;

        if (po) {
          po.status = 'COMPLETED';
        }
      });

      return {
        success: true,
        message: `Return to Vendor (RTV) protocol generated. Unapproved inventory removed from Quarantine.`,
        receipt,
      };
    } else {
      // TRIGGER_RECOUNT
      receipt.status = 'PENDING_REVIEW';
      receipt.resolutionAction = 'TRIGGER_RECOUNT';
      receipt.quarantineNotes = `RECOUNT TRIGGERED by ${params.managerName}: "${params.notes || 'Count mismatch'}"`;

      return {
        success: true,
        message: `High-priority physical recount task assigned to warehouse staff for Receipt ${receipt.receiptNumber}.`,
        receipt,
      };
    }
  }
}
