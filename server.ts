// Express Backend Server with Full Tier-1 Enterprise ERP API Endpoints
import express from 'express';
import path from 'path';
import fs from 'fs';
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
import { Wave, PurchaseOrder, BillOfMaterials, Pallet } from './server/types.js';
import { ReceivingEngine } from './server/receivingEngine.js';

const app = express();
const PORT = process.env.PORT || 3000;

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

app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, role, jobTitle, badgeCode } = req.body;
    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are mandatory.' });
      return;
    }

    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (existing) {
      res.status(400).json({ error: `User with email "${email}" already exists.` });
      return;
    }

    const newUser = {
      id: `usr-${Date.now().toString().slice(-6)}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: (role || 'STAFF') as 'ADMIN' | 'MANAGER' | 'STAFF',
      jobTitle: jobTitle || 'Logistics Operator',
      badgeCode: badgeCode ? badgeCode.trim() : `NEOM-USR-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.saveToDisk();

    res.status(201).json({
      success: true,
      message: `User "${newUser.name}" registered successfully.`,
      user: newUser,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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

app.post('/api/database/reset-seed', (req, res) => {
  try {
    db.resetToFactorySeed();
    res.json({
      success: true,
      message: 'Active database reset to original RedSea IMS factory seed data.',
      currentDatabaseId: db.currentDatabaseId,
      instances: db.getDatabaseInstances(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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

// Specialized Enterprise Reporting Endpoints
app.get('/api/reports/valuation', (req, res) => {
  try {
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let totalUnits = 0;

    const skuBreakdown = db.products.map((p) => {
      const stockLevels = db.stockLevels.filter((sl) => sl.productId === p.id);
      const units = stockLevels.reduce((sum, sl) => sum + sl.quantity, 0);
      const costValuation = units * (p.unitCost || 0);
      const retailValuation = units * (p.retailPrice || 0);
      const grossMarginPct =
        p.retailPrice > 0 ? Math.round(((p.retailPrice - p.unitCost) / p.retailPrice) * 1000) / 10 : 0;

      totalCostValuation += costValuation;
      totalRetailValuation += retailValuation;
      totalUnits += units;

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category || 'General',
        uom: p.unitOfMeasure || 'EA',
        units,
        unitCost: p.unitCost,
        retailPrice: p.retailPrice,
        costValuation: Math.round(costValuation * 100) / 100,
        retailValuation: Math.round(retailValuation * 100) / 100,
        grossMarginPct,
      };
    });

    const aggregateMarginPct =
      totalRetailValuation > 0
        ? Math.round(((totalRetailValuation - totalCostValuation) / totalRetailValuation) * 1000) / 10
        : 0;

    res.json({
      summary: {
        totalSkus: db.products.length,
        totalUnits,
        totalCostValuation: Math.round(totalCostValuation * 100) / 100,
        totalRetailValuation: Math.round(totalRetailValuation * 100) / 100,
        potentialProfit: Math.round((totalRetailValuation - totalCostValuation) * 100) / 100,
        aggregateMarginPct,
      },
      skuBreakdown,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/reorder-alerts', (req, res) => {
  try {
    const velocities = calculateSkuVelocities();
    const critical = velocities.filter((v) => v.urgency === 'CRITICAL');
    const warning = velocities.filter((v) => v.urgency === 'WARNING');
    const healthy = velocities.filter((v) => v.urgency === 'HEALTHY');

    res.json({
      summary: {
        criticalCount: critical.length,
        warningCount: warning.length,
        healthyCount: healthy.length,
        totalEvaluated: velocities.length,
      },
      alerts: velocities,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/bay-utilization', (req, res) => {
  try {
    const facilityData = db.locations.map((loc) => {
      const facilityStock = db.stockLevels.filter((sl) => sl.locationId === loc.id);
      const totalUnits = facilityStock.reduce((acc, s) => acc + s.quantity, 0);
      const uniqueSkus = new Set(facilityStock.filter((s) => s.quantity > 0).map((s) => s.productId)).size;

      // Simulated capacity based on facility type
      const nominalCapacity = loc.type === 'WAREHOUSE' ? 12000 : loc.type === 'STOREFRONT' || (loc.type as string) === 'STORE' ? 2500 : 8000;
      const utilizationRate = Math.min(100, Math.round((totalUnits / nominalCapacity) * 1000) / 10);

      return {
        locationId: loc.id,
        name: loc.name,
        code: loc.code,
        type: loc.type,
        city: loc.city,
        totalUnits,
        uniqueSkus,
        nominalCapacity,
        utilizationRate,
        status: utilizationRate > 90 ? 'SATURATED' : utilizationRate > 65 ? 'OPTIMAL' : 'UNDERUTILIZED',
      };
    });

    res.json(facilityData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/movements-summary', (req, res) => {
  try {
    const totalMovements = db.stockMovements.length;
    const receipts = db.stockMovements.filter((m) => m.type === 'RECEIPT');
    const transfers = db.stockMovements.filter((m) => m.type === 'TRANSFER');
    const adjustments = db.stockMovements.filter((m) => m.type === 'ADJUSTMENT');
    const sales = db.stockMovements.filter((m) => m.type === 'SALE');

    res.json({
      totalMovements,
      receipts: {
        count: receipts.length,
        volume: receipts.reduce((sum, m) => sum + m.quantity, 0),
      },
      transfers: {
        count: transfers.length,
        volume: transfers.reduce((sum, m) => sum + m.quantity, 0),
      },
      adjustments: {
        count: adjustments.length,
        volume: adjustments.reduce((sum, m) => sum + m.quantity, 0),
      },
      sales: {
        count: sales.length,
        volume: sales.reduce((sum, m) => sum + m.quantity, 0),
      },
      recentLedger: db.stockMovements.slice(0, 25).map((m) => {
        const prod = db.products.find((p) => p.id === m.productId);
        return {
          ...m,
          productSku: prod ? prod.sku : 'UNKNOWN',
          productName: prod ? prod.name : 'Unknown Product',
        };
      }),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/system/metrics', (req, res) => {
  try {
    const mem = process.memoryUsage();
    res.json({
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
      },
      activeDatabaseId: db.currentDatabaseId,
      collections: {
        products: db.products.length,
        locations: db.locations.length,
        categories: db.categories.length,
        stockLevels: db.stockLevels.length,
        stockMovements: db.stockMovements.length,
        orders: db.orders.length,
        purchaseOrders: db.purchaseOrders.length,
        workOrders: db.workOrders.length,
        waves: db.waves.length,
        pallets: db.pallets.length,
        uoms: db.uoms.length,
        users: db.users.length,
      },
      timestamp: new Date().toISOString(),
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
      status: req.body.status || 'ACTIVE',
      brand: req.body.brand || '',
      storageCondition: req.body.storageCondition || 'Ambient',
      weight: parseFloat(req.body.weight) || 0,
      dimensions: req.body.dimensions || '',
      countryOfOrigin: req.body.countryOfOrigin || '',
      maxCapacity: parseInt(req.body.maxCapacity, 10) || 500,
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
    db.saveToDisk();
    res.status(201).json(newProduct);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const product = db.products.find((p) => p.id === id || p.sku.toLowerCase() === id.toLowerCase());
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  const stockLevels = db.stockLevels.filter((sl) => sl.productId === product.id);
  const totalStock = stockLevels.reduce((sum, sl) => sum + sl.quantity, 0);

  res.json({
    ...product,
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
  });
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const product = db.products.find((p) => p.id === id);
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  Object.assign(product, req.body, { updatedAt: new Date().toISOString() });
  db.saveToDisk();
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
  db.saveToDisk();
  res.json(product);
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pIndex = db.products.findIndex((p) => p.id === id);
    if (pIndex === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const product = db.products[pIndex];

    // Remove stock levels associated with this product
    db.stockLevels = db.stockLevels.filter((sl) => sl.productId !== id);

    // Audit movement ledger entry
    db.stockMovements.unshift({
      id: `mov-${Date.now()}-del`,
      productId: id,
      fromLocationId: null,
      toLocationId: null,
      quantity: 0,
      type: 'ADJUSTMENT',
      reference: `SKU-DEL-${product.sku}`,
      notes: `Product "${product.name}" (${product.sku}) permanently de-registered from catalog.`,
      timestamp: new Date().toISOString(),
      userId: 'usr-system-admin',
    });

    // Remove from catalog
    db.products.splice(pIndex, 1);
    db.saveToDisk();

    res.json({
      success: true,
      message: `Product "${product.name}" (${product.sku}) successfully deleted and purged from catalog.`,
      deletedProductId: id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/bulk', (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      res.status(400).json({ error: 'Array of products is required.' });
      return;
    }

    let inserted = 0;
    let updated = 0;

    products.forEach((raw) => {
      if (!raw.sku || !raw.name) return;
      const cleanSku = raw.sku.toUpperCase().trim();
      const existing = db.products.find((p) => p.sku.toLowerCase() === cleanSku.toLowerCase());

      if (existing) {
        Object.assign(existing, {
          name: raw.name.trim(),
          category: raw.category || existing.category,
          unitCost: parseFloat(raw.unitCost) || existing.unitCost,
          retailPrice: parseFloat(raw.retailPrice) || existing.retailPrice,
          unitOfMeasure: raw.unitOfMeasure || existing.unitOfMeasure,
          reorderPoint: parseInt(raw.reorderPoint, 10) || existing.reorderPoint,
          updatedAt: new Date().toISOString(),
        });
        updated++;
      } else {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const newProd = {
          id: `prod-${Date.now()}-${randomSuffix}`,
          sku: cleanSku,
          barcode: raw.barcode || `628100${randomSuffix}01`,
          name: raw.name.trim(),
          description: raw.description || '',
          category: raw.category || 'General',
          unitCost: parseFloat(raw.unitCost) || 50,
          retailPrice: parseFloat(raw.retailPrice) || 120,
          trackInventory: raw.trackInventory !== false,
          reorderPoint: parseInt(raw.reorderPoint, 10) || 20,
          leadTimeDays: parseInt(raw.leadTimeDays, 10) || 14,
          unitOfMeasure: raw.unitOfMeasure || 'EA',
          baseUoMId: 'uom-ea',
          purchaseUoMId: 'uom-cs24',
          salesUoMId: 'uom-ea',
          defaultVendor: raw.defaultVendor || 'Red Sea Global Procurement',
          vendorLeadTime: 14,
          moq: 1,
          packagings: [
            {
              id: `pkg-${Date.now()}-ea`,
              productId: `prod-${Date.now()}-${randomSuffix}`,
              uomId: 'uom-ea',
              uomCode: 'EA',
              packageLevel: 'EACH' as const,
              barcode: raw.barcode || `628100${randomSuffix}01`,
              qty: 1,
              maxWeight: 1.0,
              length: 10,
              width: 10,
              height: 10,
            },
          ],
          variants: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.products.push(newProd);
        inserted++;
      }
    });

    db.saveToDisk();

    res.json({
      success: true,
      message: `Bulk import completed: ${inserted} new SKUs created, ${updated} existing SKUs updated.`,
      inserted,
      updated,
      totalCatalogCount: db.products.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/bulk-action', (req, res) => {
  try {
    const { action, productIds, payload } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      res.status(400).json({ error: 'Array of product IDs is required.' });
      return;
    }

    let affectedCount = 0;

    if (action === 'SET_CATEGORY') {
      const { category } = payload;
      if (!category) {
        res.status(400).json({ error: 'Category name is required.' });
        return;
      }
      db.products.forEach((p) => {
        if (productIds.includes(p.id)) {
          p.category = category;
          p.updatedAt = new Date().toISOString();
          affectedCount++;
        }
      });
    } else if (action === 'SET_STATUS') {
      const { status } = payload;
      db.products.forEach((p) => {
        if (productIds.includes(p.id)) {
          (p as any).status = status;
          p.updatedAt = new Date().toISOString();
          affectedCount++;
        }
      });
    } else if (action === 'ADJUST_PRICE') {
      const { percentChange, fixedDelta } = payload;
      db.products.forEach((p) => {
        if (productIds.includes(p.id)) {
          if (percentChange !== undefined) {
            p.retailPrice = Math.max(0, Math.round(p.retailPrice * (1 + percentChange / 100) * 100) / 100);
          } else if (fixedDelta !== undefined) {
            p.retailPrice = Math.max(0, Math.round((p.retailPrice + fixedDelta) * 100) / 100);
          }
          p.updatedAt = new Date().toISOString();
          affectedCount++;
        }
      });
    } else if (action === 'DELETE') {
      const toDelete = new Set(productIds);
      db.stockLevels = db.stockLevels.filter((sl) => !toDelete.has(sl.productId));
      const initialCount = db.products.length;
      db.products = db.products.filter((p) => !toDelete.has(p.id));
      affectedCount = initialCount - db.products.length;
    } else {
      res.status(400).json({ error: `Unknown bulk action "${action}".` });
      return;
    }

    db.saveToDisk();
    res.json({
      success: true,
      message: `Bulk action "${action}" completed successfully on ${affectedCount} products.`,
      affectedCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 2B. PRODUCT CATEGORY MANAGEMENT
// -------------------------------------------------------------
app.get('/api/categories', (req, res) => {
  const enriched = db.categories.map((cat) => {
    const matchingProducts = db.products.filter(
      (p) => p.category && p.category.toLowerCase().trim() === cat.name.toLowerCase().trim()
    );
    let totalUnits = 0;
    let totalValuation = 0;

    matchingProducts.forEach((p) => {
      const stockLevels = db.stockLevels.filter((sl) => sl.productId === p.id);
      const stock = stockLevels.reduce((sum, sl) => sum + sl.quantity, 0);
      totalUnits += stock;
      totalValuation += stock * p.unitCost;
    });

    return {
      ...cat,
      productCount: matchingProducts.length,
      totalUnits,
      totalValuation: Math.round(totalValuation * 100) / 100,
      productIds: matchingProducts.map((p) => p.id),
    };
  });
  res.json(enriched);
});

app.get('/api/categories/:id', (req, res) => {
  const cat = db.categories.find((c) => c.id === req.params.id);
  if (!cat) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }
  const matchingProducts = db.products.filter(
    (p) => p.category && p.category.toLowerCase().trim() === cat.name.toLowerCase().trim()
  );
  let totalUnits = 0;
  let totalValuation = 0;

  matchingProducts.forEach((p) => {
    const stockLevels = db.stockLevels.filter((sl) => sl.productId === p.id);
    const stock = stockLevels.reduce((sum, sl) => sum + sl.quantity, 0);
    totalUnits += stock;
    totalValuation += stock * p.unitCost;
  });

  res.json({
    ...cat,
    productCount: matchingProducts.length,
    totalUnits,
    totalValuation: Math.round(totalValuation * 100) / 100,
    products: matchingProducts,
  });
});

app.post('/api/categories', (req, res) => {
  try {
    const { name, code, description, color } = req.body;
    if (!name || !code) {
      res.status(400).json({ error: 'Category Name and Code are required.' });
      return;
    }
    const exists = db.categories.find(
      (c) => c.code.toLowerCase() === code.toLowerCase() || c.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      res.status(400).json({ error: `Category "${name}" or code "${code}" already exists.` });
      return;
    }

    const newCat = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description || '',
      color: color || '#122b39',
    };
    db.categories.push(newCat);
    db.saveToDisk();
    res.status(201).json(newCat);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', (req, res) => {
  const cat = db.categories.find((c) => c.id === req.params.id);
  if (!cat) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }
  const oldName = cat.name;
  Object.assign(cat, req.body);
  if (req.body.name && req.body.name !== oldName) {
    db.products.forEach((p) => {
      if (p.category === oldName) {
        p.category = req.body.name;
      }
    });
  }
  db.saveToDisk();
  res.json(cat);
});

app.delete('/api/categories/:id', (req, res) => {
  const idx = db.categories.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }
  const cat = db.categories[idx];
  db.categories.splice(idx, 1);
  db.saveToDisk();
  res.json({ message: `Category "${cat.name}" removed successfully.` });
});

// -------------------------------------------------------------
// 2C. MULTI-TIER UoM & PACKAGING ENGINE
// -------------------------------------------------------------
app.get('/api/uom/categories', (req, res) => {
  res.json(db.uomCategories);
});

app.post('/api/uom/categories', (req, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) {
      res.status(400).json({ error: 'Category name and code are required.' });
      return;
    }

    const newUomCat = {
      id: `uom-cat-${Date.now()}`,
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description || '',
    };
    db.uomCategories.push(newUomCat);
    db.saveToDisk();
    res.status(201).json(newUomCat);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
    db.saveToDisk();
    res.status(201).json(newUom);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/uom/units/:id', (req, res) => {
  const u = db.uoms.find((item) => item.id === req.params.id);
  if (!u) {
    res.status(404).json({ error: 'Unit of Measure not found.' });
    return;
  }
  Object.assign(u, req.body);
  db.saveToDisk();
  res.json(u);
});

app.delete('/api/uom/units/:id', (req, res) => {
  const idx = db.uoms.findIndex((u) => u.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Unit of Measure not found.' });
    return;
  }
  const u = db.uoms[idx];
  db.uoms.splice(idx, 1);
  db.saveToDisk();
  res.json({ message: `Unit of Measure "${u.code}" removed.` });
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
  const enriched = db.locations.map((loc) => {
    const facilityStock = db.stockLevels.filter((sl) => sl.locationId === loc.id);
    const totalUnits = facilityStock.reduce((acc, s) => acc + s.quantity, 0);
    const uniqueSkus = new Set(facilityStock.filter((s) => s.quantity > 0).map((s) => s.productId)).size;
    const nominalCapacity = loc.nominalCapacity || (loc.type === 'WAREHOUSE' ? 12000 : loc.type === 'QUARANTINE' ? 2000 : 3500);
    const utilizationRate = Math.min(100, Math.round((totalUnits / nominalCapacity) * 1000) / 10);

    return {
      ...loc,
      totalUnits,
      skuCount: uniqueSkus,
      nominalCapacity,
      utilizationRate,
      zones: loc.zones && loc.zones.length > 0 ? loc.zones : [
        'Zone A - Inbound Receiving & Staging',
        'Zone B - Automated High-Bay Racks',
        'Zone C - Pick-to-Light & Sorting',
        'Zone D - Outbound Freight Dispatch',
      ],
      temperatureZone: loc.temperatureZone || (loc.name.toLowerCase().includes('cold') || loc.name.toLowerCase().includes('trojena') ? 'Cold Logistics (-20°C to 4°C)' : 'Ambient Climate Controlled (20-24°C)'),
      managerName: loc.managerName || 'Logistics Operations Lead',
      contactPhone: loc.contactPhone || '+966 14 555 0192',
    };
  });
  res.json(enriched);
});

app.get('/api/locations/:id', (req, res) => {
  const loc = db.locations.find((l) => l.id === req.params.id || l.code.toLowerCase() === req.params.id.toLowerCase());
  if (!loc) {
    res.status(404).json({ error: 'Location not found.' });
    return;
  }

  const facilityStock = db.stockLevels.filter((sl) => sl.locationId === loc.id);
  const totalUnits = facilityStock.reduce((acc, s) => acc + s.quantity, 0);
  const uniqueSkus = new Set(facilityStock.filter((s) => s.quantity > 0).map((s) => s.productId)).size;
  const nominalCapacity = loc.nominalCapacity || (loc.type === 'WAREHOUSE' ? 12000 : 3500);
  const utilizationRate = Math.min(100, Math.round((totalUnits / nominalCapacity) * 1000) / 10);

  const inventory = facilityStock.map((sl) => {
    const prod = db.products.find((p) => p.id === sl.productId);
    return {
      ...sl,
      product: prod,
    };
  });

  res.json({
    ...loc,
    totalUnits,
    skuCount: uniqueSkus,
    nominalCapacity,
    utilizationRate,
    zones: loc.zones || [
      'Zone A - Inbound Receiving & Staging',
      'Zone B - Automated High-Bay Racks',
      'Zone C - Pick-to-Light & Sorting',
      'Zone D - Outbound Freight Dispatch',
    ],
    temperatureZone: loc.temperatureZone || 'Ambient Climate Controlled (20-24°C)',
    managerName: loc.managerName || 'Logistics Operations Lead',
    contactPhone: loc.contactPhone || '+966 14 555 0192',
    inventory,
  });
});

app.post('/api/locations', (req, res) => {
  try {
    const {
      name,
      code,
      type,
      address,
      city,
      state,
      postalCode,
      latitude,
      longitude,
      nominalCapacity,
      zones,
      temperatureZone,
      managerName,
      contactPhone,
    } = req.body;

    if (!name || !code) {
      res.status(400).json({ error: 'Facility Name and Code are mandatory.' });
      return;
    }

    const cleanCode = code.toUpperCase().trim();
    if (db.locations.some((l) => l.code.toLowerCase() === cleanCode.toLowerCase())) {
      res.status(400).json({ error: `Location with code "${cleanCode}" already exists.` });
      return;
    }

    const parsedZones = Array.isArray(zones) && zones.length > 0
      ? zones.map((z: string) => z.trim()).filter(Boolean)
      : [
          'Zone A - Inbound Receiving & Staging',
          'Zone B - High-Bay Racks',
          'Zone C - Pick & Pack Sorting',
          'Zone D - Outbound Shipping Dock',
        ];

    const newLoc = {
      id: `loc-${Date.now()}`,
      name: name.trim(),
      code: cleanCode,
      type: (type || 'WAREHOUSE') as any,
      address: address || '',
      city: city || 'NEOM Region',
      state: state || 'Tabuk Province',
      postalCode: postalCode || '49643',
      latitude: latitude ? parseFloat(latitude) : 28.0,
      longitude: longitude ? parseFloat(longitude) : 35.2,
      nominalCapacity: nominalCapacity ? parseInt(nominalCapacity, 10) : 12000,
      zones: parsedZones,
      temperatureZone: temperatureZone || 'Ambient Climate Controlled (20-24°C)',
      managerName: managerName || 'Logistics Lead',
      contactPhone: contactPhone || '+966 14 555 0192',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.locations.push(newLoc);
    db.saveToDisk();

    res.status(201).json({
      success: true,
      message: `Facility "${newLoc.name}" registered in logistics network.`,
      location: newLoc,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/locations/:id', (req, res) => {
  const loc = db.locations.find((l) => l.id === req.params.id);
  if (!loc) {
    res.status(404).json({ error: 'Location not found.' });
    return;
  }

  const {
    name,
    code,
    type,
    address,
    city,
    state,
    postalCode,
    latitude,
    longitude,
    nominalCapacity,
    zones,
    temperatureZone,
    managerName,
    contactPhone,
    active,
  } = req.body;

  if (name) loc.name = name.trim();
  if (code) loc.code = code.toUpperCase().trim();
  if (type) loc.type = type;
  if (address !== undefined) loc.address = address;
  if (city !== undefined) loc.city = city;
  if (state !== undefined) loc.state = state;
  if (postalCode !== undefined) loc.postalCode = postalCode;
  if (latitude !== undefined) loc.latitude = parseFloat(latitude) || loc.latitude;
  if (longitude !== undefined) loc.longitude = parseFloat(longitude) || loc.longitude;
  if (nominalCapacity !== undefined) loc.nominalCapacity = parseInt(nominalCapacity, 10) || loc.nominalCapacity;
  if (zones !== undefined) loc.zones = Array.isArray(zones) ? zones : loc.zones;
  if (temperatureZone !== undefined) loc.temperatureZone = temperatureZone;
  if (managerName !== undefined) loc.managerName = managerName;
  if (contactPhone !== undefined) loc.contactPhone = contactPhone;
  if (active !== undefined) loc.active = Boolean(active);

  loc.updatedAt = new Date().toISOString();
  db.saveToDisk();
  res.json(loc);
});

app.delete('/api/locations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const lIndex = db.locations.findIndex((l) => l.id === id);
    if (lIndex === -1) {
      res.status(404).json({ error: 'Location not found.' });
      return;
    }

    const loc = db.locations[lIndex];
    const activeUnits = db.stockLevels
      .filter((sl) => sl.locationId === id)
      .reduce((sum, sl) => sum + sl.quantity, 0);

    if (activeUnits > 0) {
      res.status(400).json({
        error: `Cannot decommission facility "${loc.name}". It currently stores ${activeUnits} physical units. Please perform a stock transfer or write-off adjustment before deleting.`,
      });
      return;
    }

    // Clean up empty stock level records
    db.stockLevels = db.stockLevels.filter((sl) => sl.locationId !== id);
    db.locations.splice(lIndex, 1);
    db.saveToDisk();

    res.json({
      success: true,
      message: `Facility "${loc.name}" (${loc.code}) safely decommissioned from network.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/locations/:id/bays', (req, res) => {
  const loc = db.locations.find((l) => l.id === req.params.id);
  if (!loc) {
    res.status(404).json({ error: 'Location not found.' });
    return;
  }

  const facilityStock = db.stockLevels.filter((sl) => sl.locationId === loc.id);
  const aisles = ['A', 'B', 'C', 'D'];
  const racksPerAisle = 4;
  const tiersPerRack = 3;

  const baySlots: any[] = [];
  let stockIndex = 0;

  aisles.forEach((aisle) => {
    for (let rack = 1; rack <= racksPerAisle; rack++) {
      for (let tier = 1; tier <= tiersPerRack; tier++) {
        const slotCode = `${aisle}${rack}-T${tier}`;
        const assignedStock = facilityStock[stockIndex % (facilityStock.length || 1)];
        const prod = assignedStock ? db.products.find((p) => p.id === assignedStock.productId) : null;
        const isOccupied = !!(assignedStock && assignedStock.quantity > 0 && stockIndex < facilityStock.length);

        baySlots.push({
          id: `slot-${loc.id}-${slotCode}`,
          code: slotCode,
          aisle,
          rack: `R-${rack}`,
          tier: `Tier ${tier}`,
          isOccupied,
          productId: isOccupied && prod ? prod.id : undefined,
          sku: isOccupied && prod ? prod.sku : undefined,
          productName: isOccupied && prod ? prod.name : undefined,
          category: isOccupied && prod ? prod.category : undefined,
          quantity: isOccupied && assignedStock ? assignedStock.quantity : 0,
          maxCapacity: 100,
        });

        if (isOccupied) stockIndex++;
      }
    }
  });

  res.json({
    locationId: loc.id,
    locationName: loc.name,
    totalSlots: baySlots.length,
    occupiedSlots: baySlots.filter((s) => s.isOccupied).length,
    slots: baySlots,
  });
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
    const { productId, locationId, quantityDelta, reference, notes, userId, type } = req.body;

    const result = await db.executeTransaction(async ({ adjustStock }) => {
      return adjustStock({
        productId,
        locationId,
        quantityDelta: parseInt(quantityDelta, 10),
        type: (type as any) || 'ADJUSTMENT',
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

app.post('/api/stock/scrap', async (req, res) => {
  try {
    const { productId, locationId, quantity, reference, notes, userId, reasonCode, disposalMethod, witnessBadge } = req.body;
    const qty = Math.abs(parseInt(quantity, 10));
    if (!qty || qty <= 0) {
      res.status(400).json({ error: 'Scrap quantity must be greater than zero.' });
      return;
    }

    const result = await db.executeTransaction(async ({ adjustStock }) => {
      const reasonTag = reasonCode ? `[Reason: ${reasonCode}]` : '[Reason: DAMAGED]';
      const methodTag = disposalMethod ? `[Method: ${disposalMethod}]` : '';
      const witnessTag = witnessBadge ? `[Witness: ${witnessBadge}]` : '';
      const formattedNotes = `${reasonTag} ${methodTag} ${witnessTag} ${notes || ''}`.trim();

      return adjustStock({
        productId,
        locationId,
        quantityDelta: -qty,
        type: 'SCRAP' as any,
        reference: reference || `SCRAP-${Date.now().toString().slice(-6)}`,
        notes: formattedNotes,
        userId,
      });
    });

    res.json({
      message: 'Scrap write-off committed and stock written down.',
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
  const limit = parseInt(req.query.limit as string, 10) || 100;
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
// 4B. PHYSICAL QUANTITY ADJUSTMENT & CYCLE COUNT ENGINE
// -------------------------------------------------------------
app.post('/api/stock/physical-count/post', async (req, res) => {
  try {
    const { locationId, reason, notes, adjustments, userId } = req.body;
    if (!locationId || !Array.isArray(adjustments) || adjustments.length === 0) {
      res.status(400).json({ error: 'Location and non-empty adjustments array are required.' });
      return;
    }

    const sessionRef = `PHYS-ADJ-${Date.now().toString().slice(-6)}`;
    const results: any[] = [];

    await db.executeTransaction(async ({ adjustStock }) => {
      for (const adj of adjustments) {
        const delta = parseInt(adj.countedQty, 10) - parseInt(adj.systemQty, 10);
        if (delta !== 0) {
          const r = adjustStock({
            productId: adj.productId,
            locationId,
            quantityDelta: delta,
            type: 'ADJUSTMENT',
            reference: sessionRef,
            notes: `${reason || 'Physical Count Audit'}: ${delta > 0 ? '+' : ''}${delta} diff. ${adj.notes || notes || ''}`,
            userId: userId || 'usr-audit-lead',
          });
          results.push(r);
        }
      }
      return results;
    });

    res.json({
      success: true,
      message: `Physical count reconciliation committed. ${results.length} SKU discrepancies adjusted atomically.`,
      reference: sessionRef,
      adjustedCount: results.length,
      results,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message, details: err.details });
  }
});

// -------------------------------------------------------------
// 4C. BATCH IMPORT & EXPORT INVENTORY OPERATIONS
// -------------------------------------------------------------
app.post('/api/stock/batch-operations', async (req, res) => {
  try {
    const { operations, userId } = req.body;
    if (!Array.isArray(operations) || operations.length === 0) {
      res.status(400).json({ error: 'Operations array is required.' });
      return;
    }

    const results: any[] = [];
    await db.executeTransaction(async ({ adjustStock, transferStock }) => {
      for (const op of operations) {
        const type = (op.type || 'TRANSFER').toUpperCase().trim();
        const qty = Math.abs(parseInt(op.quantity, 10));
        if (!qty || qty <= 0) continue;

        if (type === 'TRANSFER') {
          const r = transferStock({
            productId: op.productId,
            fromLocationId: op.fromLocationId,
            toLocationId: op.toLocationId,
            quantity: qty,
            reference: op.reference || 'BATCH-TRF',
            notes: op.notes || 'Batch imported transfer',
            userId: userId || 'usr-ops-lead',
          });
          results.push(r);
        } else if (type === 'RECEIPT') {
          const r = adjustStock({
            productId: op.productId,
            locationId: op.toLocationId || op.locationId,
            quantityDelta: qty,
            type: 'RECEIPT',
            reference: op.reference || 'BATCH-RCV',
            notes: op.notes || 'Batch imported receipt',
            userId: userId || 'usr-ops-lead',
          });
          results.push(r);
        } else if (type === 'SCRAP' || type === 'ISSUE') {
          const r = adjustStock({
            productId: op.productId,
            locationId: op.fromLocationId || op.locationId,
            quantityDelta: -qty,
            type: 'SCRAP' as any,
            reference: op.reference || 'BATCH-SCRAP',
            notes: op.notes || 'Batch scrap write-off',
            userId: userId || 'usr-ops-lead',
          });
          results.push(r);
        } else if (type === 'ADJUSTMENT') {
          const delta = parseInt(op.quantityDelta || op.quantity, 10);
          const r = adjustStock({
            productId: op.productId,
            locationId: op.locationId,
            quantityDelta: delta,
            type: 'ADJUSTMENT',
            reference: op.reference || 'BATCH-ADJ',
            notes: op.notes || 'Batch imported adjustment',
            userId: userId || 'usr-ops-lead',
          });
          results.push(r);
        }
      }
      return results;
    });

    res.json({
      success: true,
      message: `Successfully executed ${results.length} operations in atomic batch.`,
      executedCount: results.length,
      results,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message, details: err.details });
  }
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

app.get('/api/orders/:id', (req, res) => {
  const order = db.orders.find((o) => o.id === req.params.id || o.externalOrderNo === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  const itemsEnriched = order.items.map((i) => {
    const p = db.products.find((prod) => prod.id === i.productId);
    return {
      ...i,
      sku: p ? p.sku : 'UNKNOWN',
      name: p ? p.name : 'Unknown Product',
    };
  });
  res.json({ ...order, items: itemsEnriched });
});

app.post('/api/orders/:id/status', (req, res) => {
  const order = db.orders.find((o) => o.id === req.params.id || o.externalOrderNo === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  const { status } = req.body;
  if (status) {
    order.status = status;
    order.updatedAt = new Date().toISOString();
    db.saveToDisk();
  }
  res.json({ success: true, order });
});

app.get('/api/channels', (req, res) => {
  res.json(db.channelSyncs);
});

app.post('/api/channels/:id/sync', (req, res) => {
  const channel = db.channelSyncs.find((c) => c.id === req.params.id || c.channelId === req.params.id);
  if (!channel) {
    res.status(404).json({ error: 'Channel not found.' });
    return;
  }
  channel.lastSyncAt = new Date().toISOString();
  channel.syncStatus = 'SYNCED';
  channel.pendingOrdersCount = 0;
  db.saveToDisk();
  res.json({
    success: true,
    message: `Channel "${channel.name}" inventory catalog synchronized.`,
    channel,
  });
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

app.get('/api/purchase-orders/:id', (req, res) => {
  const po = db.purchaseOrders.find((p) => p.id === req.params.id || p.poNumber === req.params.id);
  if (!po) {
    res.status(404).json({ error: 'Purchase Order not found.' });
    return;
  }
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

  res.json({
    ...po,
    locationName: loc ? loc.name : po.locationId,
    items: itemsEnriched,
  });
});

app.post('/api/purchase-orders', (req, res) => {
  try {
    const { supplier, locationId, items, notes } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Items array is required to create a purchase order.' });
      return;
    }

    const locId = locationId || db.locations[0].id;
    const poNumber = `PO-NEOM-${Date.now().toString().slice(-5)}`;
    let totalCost = 0;

    const formattedItems = items.map((it: any) => {
      const prod = db.products.find((p) => p.id === it.productId || p.sku === it.sku);
      const cost = parseFloat(it.unitCost) || (prod ? prod.unitCost : 50);
      const qty = parseInt(it.quantity, 10) || 10;
      totalCost += cost * qty;
      return {
        productId: prod ? prod.id : it.productId,
        quantity: qty,
        unitCost: cost,
      };
    });

    const newPo: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber,
      vendorName: supplier || 'Red Sea Global Procurement',
      supplier: supplier || 'Red Sea Global Procurement',
      locationId: locId,
      status: 'DRAFT',
      isAiAutoGenerated: false,
      items: formattedItems,
      lines: formattedItems.map((f, idx) => {
        const prod = db.products.find((p) => p.id === f.productId);
        return {
          id: `pol-${Date.now()}-${idx}`,
          poId: `po-${Date.now()}`,
          productId: f.productId,
          productSku: prod ? prod.sku : 'SKU',
          productName: prod ? prod.name : 'Product',
          expectedQty: f.quantity,
          expectedUomId: 'uom-ea',
          expectedUomCode: 'EA',
          expectedBaseQty: f.quantity,
          unitCost: f.unitCost,
        };
      }),
      totalCost: Math.round(totalCost * 100) / 100,
      createdAt: new Date().toISOString(),
    };

    db.purchaseOrders.unshift(newPo);
    db.saveToDisk();

    res.status(201).json({
      success: true,
      message: `Purchase Order ${poNumber} generated successfully.`,
      purchaseOrder: newPo,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
    db.saveToDisk();
    res.json({
      message: `Purchase Order ${po.poNumber} has been approved for supplier dispatch.`,
      purchaseOrder: po,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchase-orders/:id/cancel', (req, res) => {
  const { id } = req.params;
  const po = db.purchaseOrders.find((p) => p.id === id);
  if (!po) {
    res.status(404).json({ error: 'Purchase Order not found.' });
    return;
  }
  po.status = 'CANCELLED';
  db.saveToDisk();
  res.json({
    message: `Purchase Order ${po.poNumber} has been cancelled.`,
    purchaseOrder: po,
  });
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

app.post('/api/manufacturing/boms', (req, res) => {
  try {
    const { bomCode, name, finishedGoodId, finishedQuantity, items } = req.body;
    if (!bomCode || !finishedGoodId || !items || !Array.isArray(items)) {
      res.status(400).json({ error: 'bomCode, finishedGoodId, and items array are required.' });
      return;
    }

    const newBom: BillOfMaterials = {
      id: `bom-${Date.now()}`,
      bomCode: bomCode.toUpperCase().trim(),
      name: name || `BOM for ${bomCode}`,
      finishedGoodId,
      finishedQuantity: parseInt(finishedQuantity, 10) || 1,
      laborCostEstimate: 0,
      items: items.map((it: any) => ({
        componentProductId: it.componentProductId || it.productId,
        quantityRequired: parseFloat(it.quantityRequired) || 1,
      })),
      createdAt: new Date().toISOString(),
    };

    db.boms.push(newBom);
    db.saveToDisk();

    res.status(201).json({
      success: true,
      message: `Bill of Materials "${newBom.bomCode}" registered.`,
      bom: newBom,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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

app.post('/api/pallets', (req, res) => {
  try {
    const { lpnCode, locationId, binId, items } = req.body;
    if (!lpnCode || !locationId || !items || !Array.isArray(items)) {
      res.status(400).json({ error: 'lpnCode, locationId, and items array are required.' });
      return;
    }

    const cleanLpn = lpnCode.toUpperCase().trim();
    if (db.pallets.some((p) => p.lpnCode.toLowerCase() === cleanLpn.toLowerCase())) {
      res.status(400).json({ error: `Pallet with LPN "${cleanLpn}" already exists.` });
      return;
    }

    const newPallet: Pallet = {
      id: `plt-${Date.now()}`,
      lpnCode: cleanLpn,
      locationId,
      binId: binId || null,
      status: 'RECEIVED',
      items: items.map((it: any) => ({
        productId: it.productId,
        quantity: parseInt(it.quantity, 10) || 1,
      })),
      createdAt: new Date().toISOString(),
    };

    db.pallets.push(newPallet);
    db.saveToDisk();

    res.status(201).json({
      success: true,
      message: `LPN Pallet "${newPallet.lpnCode}" registered.`,
      pallet: newPallet,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
    let distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      distPath = __dirname;
    }
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      distPath = process.cwd();
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('index.html not found. Please run "npm run build".');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Apex Enterprise IMS] Running on http://localhost:${PORT}`);
  });
}

startServer();
