// Express Backend Server with Full Tier-1 Enterprise ERP API Endpoints
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, TransactionError } from './server/store.js';
import { processOrderRouting } from './server/smartRouting.js';
import {
  calculateSkuVelocities,
  runAutomatedReplenishmentCron,
  generateAiDemandForecast,
} from './server/demandPlanning.js';
import {
  optimizePickingPath,
  processScannerStream,
} from './server/wes.js';
import { Wave } from './server/types.js';
import { ReceivingEngine } from './server/receivingEngine.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// -------------------------------------------------------------
// 0. AUTHENTICATION & MULTI-TENANT DATABASE PROFILES
// -------------------------------------------------------------
app.get('/api/auth/users', (req, res) => {
  res.json(db.users);
});

app.post('/api/auth/login', (req, res) => {
  const { email, badgeCode } = req.body;
  const user = db.users.find(
    (u) =>
      (email && u.email.toLowerCase() === email.toLowerCase().trim()) ||
      (badgeCode && u.badgeCode === badgeCode.trim())
  );

  if (!user) {
    // If not found, create or return demo admin
    const defaultUser = db.users[0];
    res.json({
      success: true,
      user: defaultUser,
      token: `jwt-mock-${defaultUser.id}`,
      activeDatabase: db.currentDatabaseId,
    });
    return;
  }

  res.json({
    success: true,
    user,
    token: `jwt-mock-${user.id}`,
    activeDatabase: db.currentDatabaseId,
  });
});

app.get('/api/database/instances', (req, res) => {
  res.json({
    currentDatabaseId: db.currentDatabaseId,
    instances: db.getDatabaseInstances(),
  });
});

app.post('/api/database/switch', (req, res) => {
  try {
    const { instanceId } = req.body;
    const switched = db.switchDatabase(instanceId);
    res.json({
      success: true,
      message: `Active system context successfully switched to "${switched.name}".`,
      currentDatabase: switched,
      instances: db.getDatabaseInstances(),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/database/clone', (req, res) => {
  try {
    const { name, description } = req.body;
    const cloned = db.cloneCurrentDatabase(name, description);
    res.json({
      success: true,
      message: `Database successfully duplicated into sandbox profile "${cloned.name}".`,
      newInstance: cloned,
      instances: db.getDatabaseInstances(),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/database/neutralize', (req, res) => {
  try {
    const { name } = req.body;
    const neutralized = db.neutralizeDatabase(name);
    res.json({
      success: true,
      message: `Neutralized database profile created with pristine zero-inventory topology.`,
      newInstance: neutralized,
      instances: db.getDatabaseInstances(),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 1. HEALTH & DASHBOARD OPERATIONS METRICS
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    system: 'RedSea IMS (Enterprise v4.9 - NEOM Port Authority Logistics)',
    databaseProfile: db.currentDatabaseId,
  });
});

app.get('/api/dashboard/stats', (req, res) => {
  try {
    // Total inventory valuation
    let totalValuation = 0;
    let totalUnits = 0;

    for (const sl of db.stockLevels) {
      const product = db.products.find((p) => p.id === sl.productId);
      if (product) {
        totalValuation += sl.quantity * product.unitCost;
        totalUnits += sl.quantity;
      }
    }

    // Low stock alerts
    const velocities = calculateSkuVelocities();
    const lowStockAlerts = velocities.filter((v) => v.urgency !== 'HEALTHY');

    // Recent movements
    const recentMovements = db.stockMovements.slice(0, 8);

    // Active Channels
    const channels = db.channelSyncs;

    // Active Work Orders & Waves
    const activeWorkOrders = db.workOrders.filter((wo) => wo.status === 'IN_PROGRESS').length;
    const activeWaves = db.waves.filter((w) => w.status === 'IN_PROGRESS').length;

    res.json({
      totalValuation: Math.round(totalValuation),
      totalUnits,
      productCount: db.products.length,
      locationCount: db.locations.length,
      lowStockCount: lowStockAlerts.length,
      lowStockAlerts: lowStockAlerts.slice(0, 5),
      recentMovements,
      channels,
      activeWorkOrders,
      activeWaves,
      draftPurchaseOrdersCount: db.purchaseOrders.filter((po) => po.status === 'DRAFT').length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 2. PRODUCT MASTER CRUD
// -------------------------------------------------------------
app.get('/api/products', (req, res) => {
  const productsWithStock = db.products.map((p) => {
    const stockLevels = db.stockLevels.filter((sl) => sl.productId === p.id);
    const totalStock = stockLevels.reduce((sum, sl) => sum + sl.quantity, 0);
    return {
      ...p,
      totalStock,
      stockByLocation: stockLevels.map((sl) => {
        const loc = db.locations.find((l) => l.id === sl.locationId);
        return {
          locationId: sl.locationId,
          locationName: loc ? loc.name : sl.locationId,
          locationCode: loc ? loc.code : 'UNKNOWN',
          quantity: sl.quantity,
        };
      }),
    };
  });
  res.json(productsWithStock);
});

app.post('/api/products', (req, res) => {
  try {
    const {
      sku,
      barcode,
      name,
      description,
      category,
      unitCost,
      retailPrice,
      trackInventory,
      reorderPoint,
      leadTimeDays,
      unitOfMeasure,
    } = req.body;

    if (!sku || !barcode || !name) {
      res.status(400).json({ error: 'SKU, barcode, and product name are required fields.' });
      return;
    }

    if (db.products.some((p) => p.sku.toLowerCase() === sku.toLowerCase())) {
      res.status(400).json({ error: `Product with SKU "${sku}" already exists.` });
      return;
    }
    if (db.products.some((p) => p.barcode === barcode)) {
      res.status(400).json({ error: `Product with barcode "${barcode}" already exists.` });
      return;
    }

    const newProduct = {
      id: `prod-${Date.now()}`,
      sku: sku.toUpperCase().trim(),
      barcode: barcode.trim(),
      name: name.trim(),
      description: description || '',
      category: category || 'General',
      unitCost: parseFloat(unitCost) || 0,
      retailPrice: parseFloat(retailPrice) || 0,
      trackInventory: trackInventory !== false,
      reorderPoint: parseInt(reorderPoint, 10) || 15,
      leadTimeDays: parseInt(leadTimeDays, 10) || 7,
      unitOfMeasure: unitOfMeasure || 'EA',
      baseUoMId: req.body.baseUoMId || 'uom-ea',
      purchaseUoMId: req.body.purchaseUoMId || 'uom-cs24',
      salesUoMId: req.body.salesUoMId || 'uom-ea',
      hsCode: req.body.hsCode || '',
      internalReference: req.body.internalReference || '',
      defaultVendor: req.body.defaultVendor || 'Red Sea Global Procurement',
      vendorLeadTime: parseInt(req.body.vendorLeadTime, 10) || 14,
      moq: parseInt(req.body.moq, 10) || 1,
      packagings: req.body.packagings || [
        {
          id: `pkg-${Date.now()}-ea`,
          productId: `prod-${Date.now()}`,
          uomId: req.body.baseUoMId || 'uom-ea',
          uomCode: 'EA',
          packageLevel: 'EACH',
          barcode: barcode.trim(),
          qty: 1,
          maxWeight: 0.5,
          length: 10,
          width: 10,
          height: 10,
        },
      ],
      variants: req.body.variants || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.products.push(newProduct);
    res.status(201).json(newProduct);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const product = db.products.find((p) => p.id === id);
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  Object.assign(product, req.body, { updatedAt: new Date().toISOString() });
  res.json(product);
});

app.patch('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const product = db.products.find((p) => p.id === id);
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  Object.assign(product, req.body, { updatedAt: new Date().toISOString() });
  res.json(product);
});

// -------------------------------------------------------------
// 2B. MULTI-TIER UoM & PACKAGING ENGINE
// -------------------------------------------------------------
app.get('/api/uom/categories', (req, res) => {
  res.json(db.uomCategories);
});

app.get('/api/uom/units', (req, res) => {
  res.json(db.uoms);
});

app.post('/api/uom/units', (req, res) => {
  try {
    const { name, code, categoryId, type, ratio } = req.body;
    if (!name || !code || !categoryId) {
      res.status(400).json({ error: 'Name, code, and category are required for UoM.' });
      return;
    }

    const category = db.uomCategories.find((c) => c.id === categoryId);
    const newUom = {
      id: `uom-${Date.now()}`,
      name: name.trim(),
      code: code.toUpperCase().trim(),
      categoryId,
      categoryCode: category ? category.code : 'CUSTOM',
      type: type || 'BIGGER',
      ratio: parseFloat(ratio) || 1.0,
      active: true,
    };

    db.uoms.push(newUom);
    res.status(201).json(newUom);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/barcode/lookup/:barcode', (req, res) => {
  try {
    const result = ReceivingEngine.lookupBarcode(req.params.barcode);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 2C. BLIND INBOUND RECEIVING & VARIANCE RECONCILIATION
// -------------------------------------------------------------
app.get('/api/receiving/purchase-orders', (req, res) => {
  const receivingPos = db.purchaseOrders.filter(
    (po) => po.status === 'APPROVED' || po.status === 'RECEIVING' || po.status === 'QUARANTINED'
  );
  res.json(receivingPos);
});

app.get('/api/receiving/receipts', (req, res) => {
  res.json(db.goodsReceipts);
});

app.post('/api/receiving/blind-submit', async (req, res) => {
  try {
    const { poId, locationId, receivedByUserId, receivedByUserName, scannedItems, notes } = req.body;
    if (!poId || !locationId || !scannedItems || !Array.isArray(scannedItems)) {
      res.status(400).json({ error: 'poId, locationId, and scannedItems are required.' });
      return;
    }

    const result = await ReceivingEngine.processBlindReceipt({
      poId,
      locationId,
      receivedByUserId: receivedByUserId || 'usr-staff-1',
      receivedByUserName: receivedByUserName || 'Fahad Al-Shehri',
      scannedItems,
      notes,
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message, details: err.details });
  }
});

app.post('/api/receiving/resolve-variance', async (req, res) => {
  try {
    const { receiptId, action, managerUserId, managerName, notes } = req.body;
    if (!receiptId || !action) {
      res.status(400).json({ error: 'receiptId and action are required.' });
      return;
    }

    const result = await ReceivingEngine.resolveVariance({
      receiptId,
      action,
      managerUserId: managerUserId || 'usr-mgr-1',
      managerName: managerName || 'Sara Al-Ghamdi',
      notes,
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message, details: err.details });
  }
});

// -------------------------------------------------------------
// 3. LOCATIONS & STOCK LEVELS
// -------------------------------------------------------------
app.get('/api/locations', (req, res) => {
  res.json(db.locations);
});

app.get('/api/stock-levels', (req, res) => {
  const { locationId, productId } = req.query;
  let levels = db.stockLevels;
  if (locationId) levels = levels.filter((sl) => sl.locationId === locationId);
  if (productId) levels = levels.filter((sl) => sl.productId === productId);

  const enriched = levels.map((sl) => {
    const product = db.products.find((p) => p.id === sl.productId);
    const location = db.locations.find((l) => l.id === sl.locationId);
    return {
      ...sl,
      product,
      location,
    };
  });
  res.json(enriched);
});

// -------------------------------------------------------------
// 4. ATOMIC STOCK OPERATIONS (RECEIVE, TRANSFER, ADJUST)
// -------------------------------------------------------------
app.post('/api/stock/adjust', async (req, res) => {
  try {
    const { productId, locationId, quantityDelta, reference, notes, userId } = req.body;

    const result = await db.executeTransaction(async ({ adjustStock }) => {
      return adjustStock({
        productId,
        locationId,
        quantityDelta: parseInt(quantityDelta, 10),
        type: 'ADJUSTMENT',
        reference: reference || 'MANUAL-ADJUST',
        notes,
        userId,
      });
    });

    res.json({
      message: 'Stock adjusted atomically.',
      stockLevel: result.stockLevel,
      movement: result.movement,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message, details: err.details });
  }
});

app.post('/api/stock/receive', async (req, res) => {
  try {
    const { productId, locationId, quantity, reference, notes, userId } = req.body;
    const qty = parseInt(quantity, 10);
    if (qty <= 0) {
      res.status(400).json({ error: 'Received quantity must be greater than zero.' });
      return;
    }

    const result = await db.executeTransaction(async ({ adjustStock }) => {
      return adjustStock({
        productId,
        locationId,
        quantityDelta: qty,
        type: 'RECEIPT',
        reference: reference || 'PO-RECEIPT',
        notes: notes || 'Supplier goods receiving dock inspection passed',
        userId,
      });
    });

    res.json({
      message: 'Supplier goods received and snapshot updated.',
      stockLevel: result.stockLevel,
      movement: result.movement,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/stock/transfer', async (req, res) => {
  try {
    const { productId, fromLocationId, toLocationId, quantity, reference, notes, userId } =
      req.body;

    const result = await db.executeTransaction(async ({ transferStock }) => {
      return transferStock({
        productId,
        fromLocationId,
        toLocationId,
        quantity: parseInt(quantity, 10),
        reference,
        notes,
        userId,
      });
    });

    res.json({
      message: 'Inter-location transfer committed successfully.',
      fromStock: result.fromStock,
      toStock: result.toStock,
      movement: result.movement,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message, details: err.details });
  }
});

app.get('/api/stock/movements', (req, res) => {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const enriched = db.stockMovements.slice(0, limit).map((m) => {
    const product = db.products.find((p) => p.id === m.productId);
    const fromLoc = m.fromLocationId ? db.locations.find((l) => l.id === m.fromLocationId) : null;
    const toLoc = m.toLocationId ? db.locations.find((l) => l.id === m.toLocationId) : null;
    return {
      ...m,
      productName: product ? product.name : 'Unknown Product',
      sku: product ? product.sku : 'UNKNOWN',
      fromLocationName: fromLoc ? fromLoc.name : null,
      toLocationName: toLoc ? toLoc.name : null,
    };
  });
  res.json(enriched);
});

// -------------------------------------------------------------
// 5. OMNI-CHANNEL WEBHOOKS & SMART ORDER ROUTING
// -------------------------------------------------------------
app.post('/api/webhooks/orders', async (req, res) => {
  try {
    const {
      externalOrderNo,
      platform,
      customerName,
      customerEmail,
      destAddress,
      destCity,
      destState,
      destPostalCode,
      destLat,
      destLng,
      items,
    } = req.body;

    if (!externalOrderNo || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        error: 'Invalid order payload. externalOrderNo and items array are required.',
      });
      return;
    }

    const routingResult = await processOrderRouting({
      externalOrderNo,
      platform: platform || 'SHOPIFY',
      customerName: customerName || 'Valued Customer',
      customerEmail: customerEmail || 'customer@example.com',
      destAddress: destAddress || '123 Commerce Way',
      destCity: destCity || 'Dallas',
      destState: destState || 'TX',
      destPostalCode: destPostalCode || '75201',
      destLat: destLat ? parseFloat(destLat) : undefined,
      destLng: destLng ? parseFloat(destLng) : undefined,
      items,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: `Order ${externalOrderNo} successfully ingested and routed.`,
      result: routingResult,
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'FAILED',
      error: err.message,
      details: err.details,
    });
  }
});

app.get('/api/orders', (req, res) => {
  const enrichedOrders = db.orders.map((o) => {
    const itemsEnriched = o.items.map((i) => {
      const p = db.products.find((prod) => prod.id === i.productId);
      return {
        ...i,
        sku: p ? p.sku : 'UNKNOWN',
        name: p ? p.name : 'Unknown Product',
      };
    });
    return {
      ...o,
      items: itemsEnriched,
    };
  });
  res.json(enrichedOrders);
});

app.get('/api/channels', (req, res) => {
  res.json(db.channelSyncs);
});

// -------------------------------------------------------------
// 6. LOW-LATENCY POS CHECKOUT ENDPOINT
// -------------------------------------------------------------
app.post('/api/pos/checkout', async (req, res) => {
  const startTime = performance.now();
  try {
    const { locationId, items, paymentMethod, cashierId } = req.body;

    if (!locationId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        error: 'locationId and non-empty items array are required for POS checkout.',
      });
      return;
    }

    const receiptId = `RCP-POS-${Date.now().toString().slice(-6)}`;

    const result = await db.executeTransaction(async ({ adjustStock }) => {
      const lineItems: any[] = [];
      let subtotal = 0;

      for (const item of items) {
        const product = db.products.find(
          (p) =>
            p.barcode === item.barcodeOrSku ||
            p.sku.toLowerCase() === item.barcodeOrSku.toLowerCase()
        );

        if (!product) {
          throw new TransactionError(
            `POS Scan Error: Item with barcode/SKU "${item.barcodeOrSku}" was not found.`
          );
        }

        const qty = item.quantity || 1;
        adjustStock({
          productId: product.id,
          locationId,
          quantityDelta: -qty,
          type: 'SALE',
          reference: receiptId,
          notes: `POS Register Checkout (${paymentMethod || 'CARD'})`,
          userId: cashierId || 'usr-staff-1',
        });

        const lineTotal = product.retailPrice * qty;
        subtotal += lineTotal;
        lineItems.push({
          productId: product.id,
          sku: product.sku,
          barcode: product.barcode,
          name: product.name,
          unitPrice: product.retailPrice,
          quantity: qty,
          lineTotal,
        });
      }

      return {
        receiptId,
        locationId,
        subtotal,
        tax: Math.round(subtotal * 0.0825 * 100) / 100,
        total: Math.round((subtotal + subtotal * 0.0825) * 100) / 100,
        paymentMethod: paymentMethod || 'CREDIT_CARD',
        items: lineItems,
        timestamp: new Date().toISOString(),
      };
    });

    const elapsedMs = (performance.now() - startTime).toFixed(2);

    res.status(200).json({
      status: 'PAID',
      latencyMs: parseFloat(elapsedMs),
      receipt: result,
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'FAILED',
      error: err.message,
      details: err.details,
    });
  }
});

// -------------------------------------------------------------
// 7. DIRECTED WAREHOUSE EXECUTION SYSTEM (WES) & WAVE PICKING
// -------------------------------------------------------------
app.get('/api/wes/waves', (req, res) => {
  res.json(db.waves);
});

app.get('/api/wes/waves/:id', (req, res) => {
  const wave = db.waves.find((w) => w.id === req.params.id);
  if (!wave) {
    res.status(404).json({ error: 'Wave not found' });
    return;
  }
  res.json(wave);
});

app.post('/api/wes/waves/create', (req, res) => {
  try {
    const { waveNumber, orderIds } = req.body;
    const waveNum = waveNumber || `WAVE-${Date.now().toString().slice(-4)}`;

    // Build wave items from pending orders
    const targetOrders = db.orders.filter((o) =>
      orderIds ? orderIds.includes(o.id) : o.status === 'ROUTED'
    );

    const rawItems: any[] = [];
    for (const ord of targetOrders) {
      for (const it of ord.items) {
        const prod = db.products.find((p) => p.id === it.productId);
        const bin = db.bins.find((b) => b.productId === it.productId) || db.bins[0];
        rawItems.push({
          id: `wi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          waveId: `wav-${Date.now()}`,
          orderId: ord.externalOrderNo,
          productId: it.productId,
          sku: prod ? prod.sku : 'SKU',
          productName: prod ? prod.name : 'Product',
          binCode: bin ? bin.binCode : 'A-01-01-L1',
          binCoordinates: bin ? { x: bin.xCoord, y: bin.yCoord, z: bin.zCoord } : { x: 0, y: 0, z: 0 },
          quantity: it.quantity,
          pickedQty: 0,
          isComplete: false,
        });
      }
    }

    // Apply TSP shortest walking path approximation
    const sequencedItems = optimizePickingPath(rawItems);

    const newWave: Wave = {
      id: `wav-${Date.now()}`,
      waveNumber: waveNum,
      status: 'IN_PROGRESS',
      assignedTo: 'usr-staff-1',
      items: sequencedItems,
      createdAt: new Date().toISOString(),
      optimalDistanceMeters: Math.round(sequencedItems.length * 18.5 + 24),
    };

    db.waves.unshift(newWave);
    res.status(201).json(newWave);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rapid Continuous RFID / Barcode Scanner Stream Ingestion
app.post('/api/wes/scan-stream', (req, res) => {
  try {
    const { barcodeOrRfid, waveId, scannerId } = req.body;
    if (!barcodeOrRfid) {
      res.status(400).json({ error: 'barcodeOrRfid token is required.' });
      return;
    }

    const result = processScannerStream({
      barcodeOrRfid,
      waveId,
      scannerId: scannerId || 'scanner-rfid-01',
      timestamp: new Date().toISOString(),
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 8. AI DEMAND PLANNING & REPLENISHMENT
// -------------------------------------------------------------
app.get('/api/demand-planning/velocities', (req, res) => {
  const velocities = calculateSkuVelocities();
  res.json(velocities);
});

app.post('/api/demand-planning/trigger-replenishment', (req, res) => {
  const result = runAutomatedReplenishmentCron();
  res.json({
    message: `Replenishment cron executed. Evaluated ${result.evaluatedSkus} SKUs. Created ${result.generatedPOs.length} draft POs.`,
    ...result,
  });
});

app.get('/api/demand-planning/ai-forecast', async (req, res) => {
  try {
    const forecast = await generateAiDemandForecast();
    res.json(forecast);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/purchase-orders', (req, res) => {
  const enriched = db.purchaseOrders.map((po) => {
    const loc = db.locations.find((l) => l.id === po.locationId);
    const itemsList = po.items || po.lines?.map((l) => ({
      productId: l.productId,
      quantity: l.expectedBaseQty,
      unitCost: l.unitCost,
    })) || [];
    const itemsEnriched = itemsList.map((i) => {
      const prod = db.products.find((p) => p.id === i.productId);
      return {
        ...i,
        sku: prod ? prod.sku : 'UNKNOWN',
        name: prod ? prod.name : 'Unknown Product',
      };
    });
    return {
      ...po,
      locationName: loc ? loc.name : po.locationId,
      items: itemsEnriched,
    };
  });
  res.json(enriched);
});

// 1-Click Purchase Order Approval
app.post('/api/purchase-orders/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const po = db.purchaseOrders.find((p) => p.id === id);
    if (!po) {
      res.status(404).json({ error: 'Purchase order not found.' });
      return;
    }

    po.status = 'APPROVED';
    res.json({
      message: `Purchase Order ${po.poNumber} has been approved for supplier dispatch.`,
      purchaseOrder: po,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 9. MANUFACTURING & BILL OF MATERIALS (BOM)
// -------------------------------------------------------------
app.get('/api/manufacturing/boms', (req, res) => {
  const enriched = db.boms.map((b) => {
    const finishedProd = db.products.find((p) => p.id === b.finishedGoodId);
    const itemsEnriched = b.items.map((item) => {
      const comp = db.products.find((p) => p.id === item.componentProductId);
      return {
        ...item,
        sku: comp ? comp.sku : 'UNKNOWN',
        name: comp ? comp.name : 'Component',
      };
    });
    return {
      ...b,
      finishedGoodSku: finishedProd ? finishedProd.sku : 'UNKNOWN',
      finishedGoodName: finishedProd ? finishedProd.name : 'Finished Good',
      items: itemsEnriched,
    };
  });
  res.json(enriched);
});

app.get('/api/manufacturing/work-orders', (req, res) => {
  const enriched = db.workOrders.map((wo) => {
    const bom = db.boms.find((b) => b.id === wo.bomId);
    const finishedProd = bom ? db.products.find((p) => p.id === bom.finishedGoodId) : null;
    const loc = db.locations.find((l) => l.id === wo.locationId);
    return {
      ...wo,
      bomCode: bom ? bom.bomCode : 'UNKNOWN',
      finishedGoodName: finishedProd ? finishedProd.name : 'Product',
      finishedGoodSku: finishedProd ? finishedProd.sku : 'SKU',
      locationName: loc ? loc.name : wo.locationId,
    };
  });
  res.json(enriched);
});

app.post('/api/manufacturing/work-orders', (req, res) => {
  try {
    const { orderNumber, bomId, locationId, quantityToProduce } = req.body;
    const bom = db.boms.find((b) => b.id === bomId);
    if (!bom) {
      res.status(400).json({ error: 'Bill of Materials not found.' });
      return;
    }
    const newWo = {
      id: `wo-${Date.now()}`,
      workOrderNumber: orderNumber || `WO-${Date.now().toString().slice(-4)}`,
      bomId,
      locationId: locationId || db.locations[0].id,
      quantityToProduce: parseInt(quantityToProduce, 10) || 10,
      status: 'IN_PROGRESS' as const,
      createdAt: new Date().toISOString(),
    };
    db.workOrders.push(newWo);
    res.status(201).json(newWo);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Complete Work Order: Deducts raw materials per BOM items and increments finished goods atomically
app.post('/api/manufacturing/work-orders/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const workOrder = db.workOrders.find((wo) => wo.id === id);
    if (!workOrder) {
      res.status(404).json({ error: 'Work Order not found.' });
      return;
    }
    if (workOrder.status === 'COMPLETED') {
      res.status(400).json({ error: 'Work Order is already completed.' });
      return;
    }

    const bom = db.boms.find((b) => b.id === workOrder.bomId);
    if (!bom) {
      res.status(400).json({ error: 'Associated Bill of Materials not found.' });
      return;
    }

    // ATOMIC TRANSACTION: Convert Raw Materials into Finished Goods
    const result = await db.executeTransaction(async ({ adjustStock }) => {
      const deductions: any[] = [];

      // 1. Deduct all raw materials
      for (const component of bom.items) {
        const requiredQty = component.quantityRequired * workOrder.quantityToProduce;
        adjustStock({
          productId: component.componentProductId,
          locationId: workOrder.locationId,
          quantityDelta: -requiredQty,
          type: 'ADJUSTMENT',
          reference: workOrder.workOrderNumber,
          notes: `BOM consumption for ${workOrder.workOrderNumber}`,
          userId: 'usr-mfg-lead',
        });
        deductions.push({ componentProductId: component.componentProductId, quantity: requiredQty });
      }

      // 2. Increment finished goods stock
      const finishedProduced = bom.finishedQuantity * workOrder.quantityToProduce;
      const { stockLevel: finishedStock } = adjustStock({
        productId: bom.finishedGoodId,
        locationId: workOrder.locationId,
        quantityDelta: finishedProduced,
        type: 'RECEIPT',
        reference: workOrder.workOrderNumber,
        notes: `Work Order manufacturing output completion`,
        userId: 'usr-mfg-lead',
      });

      workOrder.status = 'COMPLETED';
      workOrder.completedAt = new Date().toISOString();

      return {
        workOrder,
        rawMaterialsDeducted: deductions,
        finishedGoodsAdded: finishedProduced,
        finishedStockQuantity: finishedStock.quantity,
      };
    });

    res.json({
      message: `Work Order ${workOrder.workOrderNumber} completed successfully. Stock converted atomically.`,
      result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message, details: err.details });
  }
});

// -------------------------------------------------------------
// 10. LICENSE PLATE NUMBERS (LPN) & PALLETS
// -------------------------------------------------------------
app.get('/api/pallets', (req, res) => {
  const enriched = db.pallets.map((p) => {
    const loc = db.locations.find((l) => l.id === p.locationId);
    const itemsEnriched = p.items.map((it) => {
      const prod = db.products.find((pr) => pr.id === it.productId);
      return {
        ...it,
        sku: prod ? prod.sku : 'UNKNOWN',
        name: prod ? prod.name : 'Item',
      };
    });
    return {
      ...p,
      locationName: loc ? loc.name : p.locationId,
      items: itemsEnriched,
    };
  });
  res.json(enriched);
});

// Move an entire LPN Pallet to another location atomically
app.post('/api/pallets/:lpn/move', async (req, res) => {
  try {
    const { lpn } = req.params;
    const { targetLocationId, targetBinId } = req.body;

    const pallet = db.pallets.find((p) => p.lpnCode.toLowerCase() === lpn.toLowerCase());
    if (!pallet) {
      res.status(404).json({ error: `Pallet with LPN "${lpn}" not found.` });
      return;
    }

    const fromLocationId = pallet.locationId;
    if (fromLocationId === targetLocationId) {
      res.status(400).json({ error: 'Target location must be different from current location.' });
      return;
    }

    // ATOMIC BULK STOCK MOVE
    await db.executeTransaction(async ({ transferStock }) => {
      for (const item of pallet.items) {
        transferStock({
          productId: item.productId,
          fromLocationId,
          toLocationId: targetLocationId,
          quantity: item.quantity,
          reference: `LPN-MOVE-${pallet.lpnCode}`,
          notes: `Bulk pallet container relocation`,
          userId: 'usr-wes-operator',
        });
      }

      pallet.locationId = targetLocationId;
      pallet.binId = targetBinId || null;
      pallet.status = 'RECEIVED';
      pallet.createdAt = new Date().toISOString();
    });

    res.json({
      message: `Pallet ${pallet.lpnCode} and all its ${pallet.items.length} items moved to target location atomically.`,
      pallet,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message, details: err.details });
  }
});

// -------------------------------------------------------------
// 11. VITE INTEGRATION & SERVER START
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Apex Enterprise IMS] Running on http://localhost:${PORT}`);
  });
}

startServer();
