// High-Velocity Smart Order Routing & Split Fulfillment Automation Engine
import { db, TransactionError } from './store.js';
import { Order, Shipment, Location, Product } from './types.js';

// Haversine formula to calculate great-circle distance between two coordinates in kilometers
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface RoutingResult {
  order: Order;
  shipments: Shipment[];
  routingDecision: {
    isSplit: boolean;
    reason: string;
    locationsUsed: {
      locationId: string;
      locationName: string;
      distanceKm: number;
      itemsAssigned: number;
    }[];
  };
}

export async function processOrderRouting(orderPayload: {
  externalOrderNo: string;
  platform: 'SHOPIFY' | 'WOOCOMMERCE' | 'AMAZON' | 'ODOO_ERP' | 'B2B_PORTAL';
  customerName: string;
  customerEmail: string;
  destAddress: string;
  destCity: string;
  destState: string;
  destPostalCode: string;
  destLat?: number;
  destLng?: number;
  items: { skuOrBarcode: string; quantity: number; unitPrice?: number }[];
}): Promise<RoutingResult> {
  // Normalize items to product IDs
  const resolvedItems: { product: Product; quantity: number; unitPrice: number }[] = [];
  for (const item of orderPayload.items) {
    const product = db.products.find(
      (p) => p.sku.toLowerCase() === item.skuOrBarcode.toLowerCase() || p.barcode === item.skuOrBarcode
    );
    if (!product) {
      throw new TransactionError(`Order routing error: Product with SKU/Barcode "${item.skuOrBarcode}" does not exist.`);
    }
    resolvedItems.push({
      product,
      quantity: item.quantity,
      unitPrice: item.unitPrice || product.retailPrice,
    });
  }

  // Fallback coordinates if not provided (e.g. estimate by city)
  const destLat = orderPayload.destLat || 39.8283; // US Center
  const destLng = orderPayload.destLng || -98.5795;

  // Rank active warehouses by proximity to customer
  const activeLocations = db.locations
    .filter((loc) => loc.active)
    .map((loc) => ({
      location: loc,
      distanceKm: calculateHaversineDistance(destLat, destLng, loc.latitude, loc.longitude),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  // ATOMIC DATABASE TRANSACTION FOR ORDER ROUTING & STOCK ALLOCATION
  return await db.executeTransaction(async ({ adjustStock }) => {
    // 1. Check if single closest location can satisfy 100% of all line items
    let singleFulfillmentLoc: { location: Location; distanceKm: number } | null = null;

    for (const { location, distanceKm } of activeLocations) {
      let canFulfillAll = true;
      for (const item of resolvedItems) {
        const stockLevel = db.stockLevels.find(
          (sl) => sl.productId === item.product.id && sl.locationId === location.id
        );
        const available = stockLevel ? stockLevel.quantity : 0;
        if (item.product.trackInventory && available < item.quantity) {
          canFulfillAll = false;
          break;
        }
      }
      if (canFulfillAll) {
        singleFulfillmentLoc = { location, distanceKm };
        break;
      }
    }

    const shipments: Shipment[] = [];
    const routingLogs: RoutingResult['routingDecision']['locationsUsed'] = [];
    let isSplit = false;
    let reason = '';

    const newOrderId = `ord-${Date.now()}`;
    const totalAmount = resolvedItems.reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);

    if (singleFulfillmentLoc) {
      // SINGLE OPTIMAL LOCATION FULFILLMENT
      const loc = singleFulfillmentLoc.location;
      isSplit = false;
      reason = `Single optimal fulfillment: ${loc.name} (${Math.round(singleFulfillmentLoc.distanceKm)} km away) has 100% inventory availability.`;

      const shipmentItems: Shipment['items'] = [];

      for (const item of resolvedItems) {
        // Atomic stock decrement with negative stock prevention
        adjustStock({
          productId: item.product.id,
          locationId: loc.id,
          quantityDelta: -item.quantity,
          type: 'SALE',
          reference: orderPayload.externalOrderNo,
          notes: `Auto-routed from ${orderPayload.platform} to ${loc.code}`,
          userId: 'usr-smart-router',
        });

        shipmentItems.push({
          productId: item.product.id,
          sku: item.product.sku,
          name: item.product.name,
          quantity: item.quantity,
        });
      }

      const shipment: Shipment = {
        id: `shp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderId: newOrderId,
        locationId: loc.id,
        locationName: loc.name,
        carrier: 'Standard Ground Priority',
        trackingNumber: `TRK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        estimatedCost: 14.5 + Math.round(singleFulfillmentLoc.distanceKm * 0.012),
        isSplit: false,
        items: shipmentItems,
        createdAt: new Date().toISOString(),
      };
      shipments.push(shipment);
      routingLogs.push({
        locationId: loc.id,
        locationName: loc.name,
        distanceKm: Math.round(singleFulfillmentLoc.distanceKm),
        itemsAssigned: shipmentItems.length,
      });
    } else {
      // SPLIT FULFILLMENT ENGINE
      // Greedily fulfill from closest locations with available stock
      isSplit = true;
      reason = 'Split fulfillment triggered: No single warehouse contains 100% of order inventory. Algorithmic multi-origin split applied.';

      const remainingNeed = new Map<string, number>();
      resolvedItems.forEach((i) => remainingNeed.set(i.product.id, i.quantity));

      for (const { location, distanceKm } of activeLocations) {
        const itemsForThisLoc: Shipment['items'] = [];

        for (const item of resolvedItems) {
          const needed = remainingNeed.get(item.product.id) || 0;
          if (needed <= 0) continue;

          const stockLevel = db.stockLevels.find(
            (sl) => sl.productId === item.product.id && sl.locationId === location.id
          );
          const available = stockLevel ? stockLevel.quantity : 0;
          if (available <= 0 && item.product.trackInventory) continue;

          const allocated = item.product.trackInventory ? Math.min(needed, available) : needed;

          if (allocated > 0) {
            adjustStock({
              productId: item.product.id,
              locationId: location.id,
              quantityDelta: -allocated,
              type: 'SALE',
              reference: orderPayload.externalOrderNo,
              notes: `Split Fulfillment Part [${location.code}] via ${orderPayload.platform}`,
              userId: 'usr-smart-router',
            });

            remainingNeed.set(item.product.id, needed - allocated);
            itemsForThisLoc.push({
              productId: item.product.id,
              sku: item.product.sku,
              name: item.product.name,
              quantity: allocated,
            });
          }
        }

        if (itemsForThisLoc.length > 0) {
          const shipment: Shipment = {
            id: `shp-split-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            orderId: newOrderId,
            locationId: location.id,
            locationName: location.name,
            carrier: 'Priority Air Express',
            trackingNumber: `SPLIT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
            estimatedCost: 18.0 + Math.round(distanceKm * 0.015),
            isSplit: true,
            items: itemsForThisLoc,
            createdAt: new Date().toISOString(),
          };
          shipments.push(shipment);
          routingLogs.push({
            locationId: location.id,
            locationName: location.name,
            distanceKm: Math.round(distanceKm),
            itemsAssigned: itemsForThisLoc.length,
          });
        }

        // Check if all needed items have been fulfilled
        const totalRemaining = Array.from(remainingNeed.values()).reduce((a, b) => a + b, 0);
        if (totalRemaining === 0) break;
      }

      // Check if any items could not be fulfilled anywhere
      for (const [prodId, unfulfilled] of remainingNeed.entries()) {
        if (unfulfilled > 0) {
          const prod = db.products.find((p) => p.id === prodId);
          if (prod?.trackInventory) {
            throw new TransactionError(
              `Global Stockout: Unable to fulfill ${unfulfilled} units of "${prod.name}" (${prod.sku}) across any network warehouse. Entire transaction rolled back.`
            );
          }
        }
      }
    }

    const orderRecord: Order = {
      id: newOrderId,
      externalOrderNo: orderPayload.externalOrderNo,
      platform: orderPayload.platform,
      customerName: orderPayload.customerName,
      customerEmail: orderPayload.customerEmail,
      destAddress: orderPayload.destAddress,
      destCity: orderPayload.destCity,
      destState: orderPayload.destState,
      destPostalCode: orderPayload.destPostalCode,
      destLat,
      destLng,
      status: isSplit ? 'PARTIALLY_FULFILLED' : 'ROUTED',
      totalAmount,
      items: resolvedItems.map((ri) => ({
        productId: ri.product.id,
        quantity: ri.quantity,
        unitPrice: ri.unitPrice,
      })),
      shipments,
      createdAt: new Date().toISOString(),
    };

    db.orders.unshift(orderRecord);
    shipments.forEach((s) => db.shipments.unshift(s));

    return {
      order: orderRecord,
      shipments,
      routingDecision: {
        isSplit,
        reason,
        locationsUsed: routingLogs,
      },
    };
  });
}
