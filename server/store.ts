// Transactional In-Memory Storage Engine with ACID Guarantees, Disk Persistence & Multi-Tenant Profiles
import fs from 'node:fs';
import path from 'node:path';
import {
  Product,
  Location,
  StockLevel,
  StockMovement,
  ChannelSync,
  StockItem,
  Pallet,
  BillOfMaterials,
  WorkOrder,
  Bin,
  Order,
  Shipment,
  PurchaseOrder,
  PurchaseOrderLine,
  Wave,
  WaveItem,
  User,
  MovementType,
  UoMCategory,
  UoM,
  ProductPackaging,
  ProductVariant,
  GoodsReceipt,
  GoodsReceiptLine,
  DatabaseInstance,
  Category,
} from './types.js';

interface DatabaseSnapshot {
  users: User[];
  categories: Category[];
  products: Product[];
  locations: Location[];
  stockLevels: StockLevel[];
  stockMovements: StockMovement[];
  channelSyncs: ChannelSync[];
  stockItems: StockItem[];
  pallets: Pallet[];
  boms: BillOfMaterials[];
  workOrders: WorkOrder[];
  bins: Bin[];
  orders: Order[];
  shipments: Shipment[];
  purchaseOrders: PurchaseOrder[];
  waves: Wave[];
  uomCategories: UoMCategory[];
  uoms: UoM[];
  goodsReceipts: GoodsReceipt[];
}

export class TransactionError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'TransactionError';
  }
}

export class EnterpriseStore {
  public users: User[] = [];
  public categories: Category[] = [];
  public products: Product[] = [];
  public locations: Location[] = [];
  public stockLevels: StockLevel[] = [];
  public stockMovements: StockMovement[] = [];
  public channelSyncs: ChannelSync[] = [];
  public stockItems: StockItem[] = [];
  public pallets: Pallet[] = [];
  public boms: BillOfMaterials[] = [];
  public workOrders: WorkOrder[] = [];
  public bins: Bin[] = [];
  public orders: Order[] = [];
  public shipments: Shipment[] = [];
  public purchaseOrders: PurchaseOrder[] = [];
  public waves: Wave[] = [];

  // Multi-Tier UoM & Inbound Receiving
  public uomCategories: UoMCategory[] = [];
  public uoms: UoM[] = [];
  public goodsReceipts: GoodsReceipt[] = [];

  // Multi-Instance Database Management
  public databaseInstances: DatabaseInstance[] = [];
  public currentDatabaseId: string = 'db-neom-live';
  private instancesData: Map<string, DatabaseSnapshot> = new Map();

  private isLocked: boolean = false;
  private dataDir: string = path.join(process.cwd(), 'data');
  private storeFilePath: string = path.join(process.cwd(), 'data', 'store_state.json');

  constructor() {
    const loaded = this.loadFromDisk();
    if (!loaded) {
      this.seedInitialData();
      this.saveToDisk();
    }
  }

  // Persist current multi-tenant database state to disk
  public saveToDisk(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Update current active instance snapshot in the map
      this.instancesData.set(this.currentDatabaseId, this.takeSnapshot());

      // Update metadata counts for current instance
      const curInst = this.databaseInstances.find((i) => i.id === this.currentDatabaseId);
      if (curInst) {
        curInst.productCount = this.products.length;
        curInst.stockCount = this.stockLevels.reduce((a, b) => a + b.quantity, 0);
        curInst.locationCount = this.locations.length;
      }

      const payload = {
        version: '4.9',
        savedAt: new Date().toISOString(),
        currentDatabaseId: this.currentDatabaseId,
        databaseInstances: this.databaseInstances,
        instancesData: Array.from(this.instancesData.entries()),
      };

      const tmpFile = `${this.storeFilePath}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf-8');
      fs.renameSync(tmpFile, this.storeFilePath);
    } catch (err) {
      console.error('[EnterpriseStore] Failed to write state to disk:', err);
    }
  }

  // Hydrate database state from disk if present
  public loadFromDisk(): boolean {
    try {
      if (!fs.existsSync(this.storeFilePath)) {
        return false;
      }

      const raw = fs.readFileSync(this.storeFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.databaseInstances || !parsed.instancesData) {
        return false;
      }

      this.currentDatabaseId = parsed.currentDatabaseId || 'db-neom-live';
      this.databaseInstances = parsed.databaseInstances;
      this.instancesData = new Map(parsed.instancesData);

      const activeSnapshot = this.instancesData.get(this.currentDatabaseId);
      if (activeSnapshot) {
        this.restoreSnapshot(activeSnapshot);
        console.log(
          `[EnterpriseStore] Successfully hydrated ${this.products.length} SKUs, ${this.locations.length} facilities, and ${this.stockMovements.length} ledger movements from ${this.storeFilePath}`
        );
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[EnterpriseStore] Could not hydrate from disk, will seed fresh database:', err);
      return false;
    }
  }

  // Restore factory seed data
  public resetToFactorySeed(): void {
    this.instancesData.clear();
    this.seedInitialData();
    this.saveToDisk();
  }

  // Create deep snapshot for ACID rollback
  private takeSnapshot(): DatabaseSnapshot {
    return {
      users: JSON.parse(JSON.stringify(this.users)),
      categories: JSON.parse(JSON.stringify(this.categories)),
      products: JSON.parse(JSON.stringify(this.products)),
      locations: JSON.parse(JSON.stringify(this.locations)),
      stockLevels: JSON.parse(JSON.stringify(this.stockLevels)),
      stockMovements: JSON.parse(JSON.stringify(this.stockMovements)),
      channelSyncs: JSON.parse(JSON.stringify(this.channelSyncs)),
      stockItems: JSON.parse(JSON.stringify(this.stockItems)),
      pallets: JSON.parse(JSON.stringify(this.pallets)),
      boms: JSON.parse(JSON.stringify(this.boms)),
      workOrders: JSON.parse(JSON.stringify(this.workOrders)),
      bins: JSON.parse(JSON.stringify(this.bins)),
      orders: JSON.parse(JSON.stringify(this.orders)),
      shipments: JSON.parse(JSON.stringify(this.shipments)),
      purchaseOrders: JSON.parse(JSON.stringify(this.purchaseOrders)),
      waves: JSON.parse(JSON.stringify(this.waves)),
      uomCategories: JSON.parse(JSON.stringify(this.uomCategories)),
      uoms: JSON.parse(JSON.stringify(this.uoms)),
      goodsReceipts: JSON.parse(JSON.stringify(this.goodsReceipts)),
    };
  }

  // Restore snapshot on transaction rollback or database switch
  private restoreSnapshot(snapshot: DatabaseSnapshot): void {
    this.users = snapshot.users;
    this.categories = snapshot.categories || [];
    this.products = snapshot.products;
    this.locations = snapshot.locations;
    this.stockLevels = snapshot.stockLevels;
    this.stockMovements = snapshot.stockMovements;
    this.channelSyncs = snapshot.channelSyncs;
    this.stockItems = snapshot.stockItems;
    this.pallets = snapshot.pallets;
    this.boms = snapshot.boms;
    this.workOrders = snapshot.workOrders;
    this.bins = snapshot.bins;
    this.orders = snapshot.orders;
    this.shipments = snapshot.shipments;
    this.purchaseOrders = snapshot.purchaseOrders;
    this.waves = snapshot.waves;
    this.uomCategories = snapshot.uomCategories;
    this.uoms = snapshot.uoms;
    this.goodsReceipts = snapshot.goodsReceipts;
  }

  // Atomic Transaction Runner
  public async executeTransaction<T>(
    fn: (tx: {
      store: EnterpriseStore;
      adjustStock: typeof EnterpriseStore.prototype.adjustStockInternal;
      transferStock: typeof EnterpriseStore.prototype.transferStockInternal;
    }) => Promise<T>
  ): Promise<T> {
    while (this.isLocked) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    this.isLocked = true;
    const snapshot = this.takeSnapshot();

    try {
      const result = await fn({
        store: this,
        adjustStock: this.adjustStockInternal.bind(this),
        transferStock: this.transferStockInternal.bind(this),
      });
      this.isLocked = false;
      this.saveToDisk();
      return result;
    } catch (error) {
      this.restoreSnapshot(snapshot);
      this.isLocked = false;
      throw error;
    }
  }

  // Atomic Stock Adjustment with Negative Stock Prevention & Movement Ledger
  public adjustStockInternal(params: {
    productId: string;
    locationId: string;
    quantityDelta: number;
    type: MovementType;
    reference?: string;
    notes?: string;
    userId?: string;
  }): { stockLevel: StockLevel; movement: StockMovement } {
    const product = this.products.find((p) => p.id === params.productId);
    if (!product) {
      throw new TransactionError(`Product with ID "${params.productId}" not found.`);
    }

    const location = this.locations.find((l) => l.id === params.locationId);
    if (!location) {
      throw new TransactionError(`Location with ID "${params.locationId}" not found.`);
    }

    let stockLevel = this.stockLevels.find(
      (sl) => sl.productId === params.productId && sl.locationId === params.locationId
    );

    const currentQty = stockLevel ? stockLevel.quantity : 0;
    const newQty = currentQty + params.quantityDelta;

    if (newQty < 0 && product.trackInventory) {
      throw new TransactionError(
        `Negative stock constraint violation: Product "${product.name}" (${product.sku}) at ${location.name} ` +
          `currently has ${currentQty} units. Attempted to deduct ${Math.abs(params.quantityDelta)} units resulting in ${newQty}.`,
        {
          sku: product.sku,
          location: location.name,
          currentQty,
          delta: params.quantityDelta,
        }
      );
    }

    if (!stockLevel) {
      stockLevel = {
        id: `sl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        productId: params.productId,
        locationId: params.locationId,
        quantity: newQty,
        updatedAt: new Date().toISOString(),
      };
      this.stockLevels.push(stockLevel);
    } else {
      stockLevel.quantity = newQty;
      stockLevel.updatedAt = new Date().toISOString();
    }

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productId: params.productId,
      fromLocationId: params.quantityDelta < 0 ? params.locationId : null,
      toLocationId: params.quantityDelta > 0 ? params.locationId : null,
      quantity: Math.abs(params.quantityDelta),
      type: params.type,
      reference: params.reference || `ADJ-${Date.now()}`,
      notes: params.notes,
      timestamp: new Date().toISOString(),
      userId: params.userId || 'usr-system-admin',
    };
    this.stockMovements.unshift(movement);

    return { stockLevel, movement };
  }

  // Atomic Inter-Location Transfer
  public transferStockInternal(params: {
    productId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    reference?: string;
    notes?: string;
    userId?: string;
  }): { fromStock: StockLevel; toStock: StockLevel; movement: StockMovement } {
    if (params.quantity <= 0) {
      throw new TransactionError('Transfer quantity must be greater than zero.');
    }
    if (params.fromLocationId === params.toLocationId) {
      throw new TransactionError('Source and destination locations must be distinct.');
    }

    const { stockLevel: fromStock } = this.adjustStockInternal({
      productId: params.productId,
      locationId: params.fromLocationId,
      quantityDelta: -params.quantity,
      type: 'TRANSFER',
      reference: params.reference,
      notes: `Transfer OUT to ${params.toLocationId}`,
      userId: params.userId,
    });

    const { stockLevel: toStock } = this.adjustStockInternal({
      productId: params.productId,
      locationId: params.toLocationId,
      quantityDelta: params.quantity,
      type: 'TRANSFER',
      reference: params.reference,
      notes: `Transfer IN from ${params.fromLocationId}`,
      userId: params.userId,
    });

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productId: params.productId,
      fromLocationId: params.fromLocationId,
      toLocationId: params.toLocationId,
      quantity: params.quantity,
      type: 'TRANSFER',
      reference: params.reference || `TRF-${Date.now()}`,
      notes: params.notes || `Inter-facility transfer`,
      timestamp: new Date().toISOString(),
      userId: params.userId || 'usr-system-admin',
    };
    this.stockMovements.unshift(movement);

    return { fromStock, toStock, movement };
  }

  // -------------------------------------------------------------
  // MULTI-TENANT DATABASE MANAGEMENT (CLONE, NEUTRALIZE, SWITCH)
  // -------------------------------------------------------------
  public getDatabaseInstances(): DatabaseInstance[] {
    return this.databaseInstances.map((inst) => {
      const isCurrent = inst.id === this.currentDatabaseId;
      return {
        ...inst,
        isCurrent,
        productCount: isCurrent ? this.products.length : inst.productCount,
        stockCount: isCurrent
          ? this.stockLevels.reduce((acc, s) => acc + s.quantity, 0)
          : inst.stockCount,
        locationCount: isCurrent ? this.locations.length : inst.locationCount,
      };
    });
  }

  public switchDatabase(instanceId: string): DatabaseInstance {
    if (instanceId === this.currentDatabaseId) {
      const inst = this.databaseInstances.find((i) => i.id === instanceId);
      if (inst) return inst;
    }

    // Save current active state before switching
    this.instancesData.set(this.currentDatabaseId, this.takeSnapshot());

    const targetSnapshot = this.instancesData.get(instanceId);
    if (!targetSnapshot) {
      throw new TransactionError(`Database profile "${instanceId}" does not exist.`);
    }

    this.restoreSnapshot(targetSnapshot);
    this.currentDatabaseId = instanceId;

    this.databaseInstances.forEach((inst) => {
      inst.isCurrent = inst.id === instanceId;
    });

    const currentInst = this.databaseInstances.find((i) => i.id === instanceId)!;
    this.saveToDisk();
    return currentInst;
  }

  public cloneCurrentDatabase(name: string, description: string): DatabaseInstance {
    const newId = `db-sandbox-${Date.now()}`;
    const snapshot = this.takeSnapshot();
    this.instancesData.set(newId, JSON.parse(JSON.stringify(snapshot)));

    const newInst: DatabaseInstance = {
      id: newId,
      name: name || `NEOM Sandbox Clone (${new Date().toLocaleTimeString()})`,
      code: `SANDBOX-${Date.now().toString().slice(-4)}`,
      description: description || 'Duplicated sandbox instance cloned from live NEOM operations.',
      type: 'SANDBOX',
      createdAt: new Date().toISOString(),
      isCurrent: false,
      productCount: this.products.length,
      stockCount: this.stockLevels.reduce((a, b) => a + b.quantity, 0),
      locationCount: this.locations.length,
    };

    this.databaseInstances.push(newInst);
    this.saveToDisk();
    return newInst;
  }

  public neutralizeDatabase(name?: string): DatabaseInstance {
    const newId = `db-empty-${Date.now()}`;
    // Empty dataset with foundational locations and UoM categories preserved
    const emptySnapshot: DatabaseSnapshot = {
      users: JSON.parse(JSON.stringify(this.users)),
      categories: JSON.parse(JSON.stringify(this.categories)),
      products: [],
      locations: JSON.parse(JSON.stringify(this.locations)),
      stockLevels: [],
      stockMovements: [],
      channelSyncs: JSON.parse(JSON.stringify(this.channelSyncs)),
      stockItems: [],
      pallets: [],
      boms: [],
      workOrders: [],
      bins: JSON.parse(JSON.stringify(this.bins)),
      orders: [],
      shipments: [],
      purchaseOrders: [],
      waves: [],
      uomCategories: JSON.parse(JSON.stringify(this.uomCategories)),
      uoms: JSON.parse(JSON.stringify(this.uoms)),
      goodsReceipts: [],
    };

    this.instancesData.set(newId, emptySnapshot);

    const newInst: DatabaseInstance = {
      id: newId,
      name: name || `Clean Slate Database (Zero Inventory)`,
      code: `CLEAN-${Date.now().toString().slice(-4)}`,
      description: 'Neutralized database instance with master topology but 0 SKUs, ready for fresh import.',
      type: 'EMPTY',
      createdAt: new Date().toISOString(),
      isCurrent: false,
      productCount: 0,
      stockCount: 0,
      locationCount: this.locations.length,
    };

    this.databaseInstances.push(newInst);
    this.saveToDisk();
    return newInst;
  }

  // -------------------------------------------------------------
  // INITIAL SEED DATA (REDSEA IMS & NEOM WAREHOUSE NETWORK)
  // -------------------------------------------------------------
  private seedInitialData(): void {
    // 1. Users
    this.users = [
      {
        id: 'usr-admin-1',
        email: 'tariq.alharbi@neom.sa',
        name: 'Tariq Al-Harbi (Inbound Logistics Director)',
        role: 'ADMIN',
        jobTitle: 'VP Supply Chain Operations - Red Sea Authority',
        badgeCode: 'NEOM-DIR-001',
        createdAt: '2026-01-10T08:00:00Z',
      },
      {
        id: 'usr-mgr-1',
        email: 'sara.alghamdi@neom.sa',
        name: 'Sara Al-Ghamdi (Oxagon Terminal Manager)',
        role: 'MANAGER',
        jobTitle: 'Port Warehouse Operations Manager',
        badgeCode: 'OXA-MGR-042',
        createdAt: '2026-02-15T09:30:00Z',
      },
      {
        id: 'usr-staff-1',
        email: 'fahad.alshehri@neom.sa',
        name: 'Fahad Al-Shehri (Lead Blind Receiving Inspector)',
        role: 'STAFF',
        jobTitle: 'Inbound Dock Inspector & RFID Lead',
        badgeCode: 'BAY-RCV-109',
        createdAt: '2026-03-01T07:15:00Z',
      },
    ];

    // 2. NEOM Logistics Network Locations
    this.locations = [
      {
        id: 'loc-neom-bay-01',
        name: 'NEOM Bay Automated Distribution Center (BAY-01)',
        code: 'BAY-01',
        type: 'WAREHOUSE',
        address: 'Zone 1 Logistics Spine, NEOM Bay',
        city: 'NEOM Bay',
        state: 'Tabuk Province',
        postalCode: '49643',
        latitude: 27.9402,
        longitude: 35.2911,
        active: true,
        createdAt: '2025-11-01T00:00:00Z',
      },
      {
        id: 'loc-neom-oxa-02',
        name: 'Oxagon Port Maritime Mega-Terminal (OXA-02)',
        code: 'OXA-02',
        type: 'WAREHOUSE',
        address: 'Floating Industrial Gateway, Oxagon Port',
        city: 'Oxagon',
        state: 'Tabuk Province',
        postalCode: '49712',
        latitude: 27.8105,
        longitude: 35.3421,
        active: true,
        createdAt: '2025-11-01T00:00:00Z',
      },
      {
        id: 'loc-neom-lin-03',
        name: 'The Line Central Logistics Spine (LIN-03)',
        code: 'LIN-03',
        type: 'WAREHOUSE',
        address: 'Service Module 14, The Line Core',
        city: 'The Line',
        state: 'Tabuk Province',
        postalCode: '49820',
        latitude: 28.0125,
        longitude: 35.4529,
        active: true,
        createdAt: '2025-12-01T00:00:00Z',
      },
      {
        id: 'loc-neom-tro-04',
        name: 'Trojena Alpine Regional Store (TRO-04)',
        code: 'TRO-04',
        type: 'STOREFRONT',
        address: 'Mountain Village Retail Portal',
        city: 'Trojena',
        state: 'Tabuk Province',
        postalCode: '49901',
        latitude: 28.7214,
        longitude: 35.3812,
        active: true,
        createdAt: '2026-01-05T00:00:00Z',
      },
      {
        id: 'loc-neom-quar-01',
        name: 'NEOM Port Customs & Quarantine Depot (QUAR-01)',
        code: 'QUAR-01',
        type: 'QUARANTINE',
        address: 'Red Sea Gate Maritime Inspection Pier',
        city: 'Oxagon Customs Enclave',
        state: 'Tabuk Province',
        postalCode: '49715',
        latitude: 27.8055,
        longitude: 35.3355,
        active: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    // 3. Multi-Tier UoM Categories & UoMs
    this.uomCategories = [
      {
        id: 'cat-count',
        name: 'Units & Count',
        code: 'COUNT',
        description: 'Discrete physical inventory pieces, packs, cartons, and pallets',
      },
      {
        id: 'cat-weight',
        name: 'Weight & Mass',
        code: 'WEIGHT',
        description: 'Metric mass measures for bulk materials and chemicals',
      },
      {
        id: 'cat-volume',
        name: 'Liquid & Volume',
        code: 'VOLUME',
        description: 'Cubic and volumetric measurements for fluids and gases',
      },
      {
        id: 'cat-length',
        name: 'Length & Dimensions',
        code: 'LENGTH',
        description: 'Linear metric distance and spool lengths',
      },
    ];

    this.uoms = [
      {
        id: 'uom-ea',
        name: 'Each / Single Unit',
        code: 'EA',
        categoryId: 'cat-count',
        categoryCode: 'COUNT',
        type: 'REFERENCE',
        ratio: 1.0,
        active: true,
      },
      {
        id: 'uom-pk6',
        name: 'Pack of 6 Units',
        code: 'PK6',
        categoryId: 'cat-count',
        categoryCode: 'COUNT',
        type: 'BIGGER',
        ratio: 6.0,
        active: true,
      },
      {
        id: 'uom-bx10',
        name: 'Standard Box (10 Units)',
        code: 'BX10',
        categoryId: 'cat-count',
        categoryCode: 'COUNT',
        type: 'BIGGER',
        ratio: 10.0,
        active: true,
      },
      {
        id: 'uom-cs24',
        name: 'Master Case (Case of 24)',
        code: 'CS24',
        categoryId: 'cat-count',
        categoryCode: 'COUNT',
        type: 'BIGGER',
        ratio: 24.0,
        active: true,
      },
      {
        id: 'uom-pl144',
        name: 'Standard Logistics Pallet (144 Units)',
        code: 'PL144',
        categoryId: 'cat-count',
        categoryCode: 'COUNT',
        type: 'BIGGER',
        ratio: 144.0,
        active: true,
      },
      {
        id: 'uom-kg',
        name: 'Kilogram',
        code: 'KG',
        categoryId: 'cat-weight',
        categoryCode: 'WEIGHT',
        type: 'REFERENCE',
        ratio: 1.0,
        active: true,
      },
      {
        id: 'uom-mt',
        name: 'Metric Ton (1,000 kg)',
        code: 'MT',
        categoryId: 'cat-weight',
        categoryCode: 'WEIGHT',
        type: 'BIGGER',
        ratio: 1000.0,
        active: true,
      },
      {
        id: 'uom-g',
        name: 'Gram',
        code: 'G',
        categoryId: 'cat-weight',
        categoryCode: 'WEIGHT',
        type: 'SMALLER',
        ratio: 0.001,
        active: true,
      },
      {
        id: 'uom-l',
        name: 'Litre',
        code: 'L',
        categoryId: 'cat-volume',
        categoryCode: 'VOLUME',
        type: 'REFERENCE',
        ratio: 1.0,
        active: true,
      },
      {
        id: 'uom-drm',
        name: 'Industrial Drum (200 Litres)',
        code: 'DRM',
        categoryId: 'cat-volume',
        categoryCode: 'VOLUME',
        type: 'BIGGER',
        ratio: 200.0,
        active: true,
      },
      {
        id: 'uom-m',
        name: 'Meter (Linear)',
        code: 'M',
        categoryId: 'cat-length',
        categoryCode: 'LENGTH',
        type: 'REFERENCE',
        ratio: 1.0,
        active: true,
      },
      {
        id: 'uom-roll',
        name: 'Spool / Roll (100 Meters)',
        code: 'ROLL',
        categoryId: 'cat-length',
        categoryCode: 'LENGTH',
        type: 'BIGGER',
        ratio: 100.0,
        active: true,
      },
    ];

    // 3B. Product Categories with taxonomy and visual coding
    this.categories = [
      {
        id: 'cat-smart-infra',
        name: 'Smart Infrastructure',
        code: 'INFRA',
        description: 'Edge gateways, telemetry hardware, subsea interconnects & smart city sensors',
        color: '#122b39',
      },
      {
        id: 'cat-iot-sensors',
        name: 'Industrial IoT Sensors',
        code: 'SENSORS',
        description: 'High-precision vibration, temperature, and environmental telemetry sensors',
        color: '#0284c7',
      },
      {
        id: 'cat-energy',
        name: 'Power & Energy Distribution',
        code: 'ENERGY',
        description: 'Solar inverters, high-capacity battery units, and smart grid transformers',
        color: '#e5a329',
      },
      {
        id: 'cat-machinery',
        name: 'Heavy Machinery & Hydraulics',
        code: 'MACHINERY',
        description: 'Excavation parts, hydraulic pumps, mechanical bearings & turbine seals',
        color: '#d97706',
      },
      {
        id: 'cat-safety',
        name: 'Safety & Tactical Gear',
        code: 'SAFETY',
        description: 'High-risk PPE, hazardous chemical suits, smart helmets, and oxygen packs',
        color: '#dc2626',
      },
      {
        id: 'cat-network',
        name: 'Network & Telecommunications',
        code: 'TELECOM',
        description: '5G beamforming antennae, fiber-optic distribution hubs & satellite transceivers',
        color: '#7c3aed',
      },
    ];

    // 4. Products with 4-Tier Packaging Hierarchies
    this.products = [
      {
        id: 'prod-iot-gw',
        sku: 'NEOM-IOT-GW500',
        barcode: '6281002938101',
        name: 'Edge AI Industrial Telemetry Gateway',
        description: 'Ruggedized IP67 IoT telemetry bridge with dual-CANbus and Red Sea 5G uplink',
        category: 'Smart Infrastructure',
        unitCost: 142.5,
        retailPrice: 389.0,
        trackInventory: true,
        reorderPoint: 45,
        leadTimeDays: 14,
        unitOfMeasure: 'EA',
        baseUoMId: 'uom-ea',
        purchaseUoMId: 'uom-cs24',
        salesUoMId: 'uom-ea',
        hsCode: '8517.62.0000',
        internalReference: 'NEOM-GW-REF-26A',
        defaultVendor: 'Red Sea Microelectronics Ltd',
        vendorLeadTime: 12,
        moq: 24,
        packagings: [
          {
            id: 'pkg-gw-ea',
            productId: 'prod-iot-gw',
            uomId: 'uom-ea',
            uomCode: 'EA',
            packageLevel: 'EACH',
            barcode: '6281002938101',
            qty: 1,
            maxWeight: 0.45,
            length: 15.0,
            width: 10.0,
            height: 4.5,
          },
          {
            id: 'pkg-gw-inp',
            productId: 'prod-iot-gw',
            uomId: 'uom-inp6',
            uomCode: 'INP6',
            packageLevel: 'INNER_PACK',
            barcode: '6281002938106',
            qty: 6,
            maxWeight: 2.8,
            length: 32.0,
            width: 22.0,
            height: 12.0,
          },
          {
            id: 'pkg-gw-cs',
            productId: 'prod-iot-gw',
            uomId: 'uom-cs24',
            uomCode: 'CS24',
            packageLevel: 'CASE',
            barcode: '10628100293818',
            qty: 24,
            maxWeight: 11.5,
            length: 45.0,
            width: 35.0,
            height: 28.0,
          },
          {
            id: 'pkg-gw-pl',
            productId: 'prod-iot-gw',
            uomId: 'uom-pl144',
            uomCode: 'PL144',
            packageLevel: 'PALLET',
            barcode: '006281002938100014',
            qty: 144,
            maxWeight: 85.0,
            length: 120.0,
            width: 100.0,
            height: 140.0,
          },
        ],
        variants: [
          {
            id: 'var-gw-sub1g',
            productId: 'prod-iot-gw',
            sku: 'NEOM-IOT-GW500-SUB',
            barcode: '6281002938102',
            name: 'Sub-1GHz LoRaWAN Edition',
            attributes: { size: 'Standard', color: 'Matte Black', material: 'Cast Aluminum' },
            priceOffset: 45.0,
          },
        ],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'prod-sns-vib',
        sku: 'NEOM-SNS-VIB99',
        barcode: '6281002938102',
        name: 'Tri-Axial High-Temp Vibration Sensor',
        description: 'Piezoelectric sensor rated to 180°C for NEOM desalination & port turbine monitoring',
        category: 'Precision Sensors',
        unitCost: 38.0,
        retailPrice: 119.5,
        trackInventory: true,
        reorderPoint: 80,
        leadTimeDays: 10,
        unitOfMeasure: 'EA',
        baseUoMId: 'uom-ea',
        purchaseUoMId: 'uom-cs24',
        salesUoMId: 'uom-inp6',
        hsCode: '9031.80.8085',
        internalReference: 'NEOM-VIB-SENS-09',
        defaultVendor: 'Oxagon Sensor Systems LLC',
        vendorLeadTime: 10,
        moq: 48,
        packagings: [
          {
            id: 'pkg-vib-ea',
            productId: 'prod-sns-vib',
            uomId: 'uom-ea',
            uomCode: 'EA',
            packageLevel: 'EACH',
            barcode: '6281002938102',
            qty: 1,
            maxWeight: 0.12,
            length: 8.0,
            width: 5.0,
            height: 3.0,
          },
          {
            id: 'pkg-vib-inp',
            productId: 'prod-sns-vib',
            uomId: 'uom-inp6',
            uomCode: 'INP6',
            packageLevel: 'INNER_PACK',
            barcode: '6281002938126',
            qty: 6,
            maxWeight: 0.8,
            length: 18.0,
            width: 12.0,
            height: 8.0,
          },
          {
            id: 'pkg-vib-cs',
            productId: 'prod-sns-vib',
            uomId: 'uom-cs24',
            uomCode: 'CS24',
            packageLevel: 'CASE',
            barcode: '10628100293825',
            qty: 24,
            maxWeight: 3.4,
            length: 30.0,
            width: 25.0,
            height: 18.0,
          },
          {
            id: 'pkg-vib-pl',
            productId: 'prod-sns-vib',
            uomId: 'uom-pl144',
            uomCode: 'PL144',
            packageLevel: 'PALLET',
            barcode: '006281002938200021',
            qty: 144,
            maxWeight: 32.0,
            length: 120.0,
            width: 100.0,
            height: 120.0,
          },
        ],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'prod-opt-lidar',
        sku: 'NEOM-LDR-360X',
        barcode: '6281002938103',
        name: 'Solid-State 3D LiDAR Scanner Unit',
        description: '100m range pulsed laser scanner for autonomous AGVs and autonomous pod shuttles',
        category: 'Autonomous Mobility',
        unitCost: 480.0,
        retailPrice: 1250.0,
        trackInventory: true,
        reorderPoint: 20,
        leadTimeDays: 21,
        unitOfMeasure: 'EA',
        baseUoMId: 'uom-ea',
        purchaseUoMId: 'uom-inp6',
        salesUoMId: 'uom-ea',
        hsCode: '9015.10.0000',
        internalReference: 'NEOM-LDR-AUT-01',
        defaultVendor: 'Arabian Optics & Photonics FZCO',
        vendorLeadTime: 20,
        moq: 6,
        packagings: [
          {
            id: 'pkg-ldr-ea',
            productId: 'prod-opt-lidar',
            uomId: 'uom-ea',
            uomCode: 'EA',
            packageLevel: 'EACH',
            barcode: '6281002938103',
            qty: 1,
            maxWeight: 1.2,
            length: 16.0,
            width: 16.0,
            height: 14.0,
          },
          {
            id: 'pkg-ldr-inp',
            productId: 'prod-opt-lidar',
            uomId: 'uom-inp6',
            uomCode: 'INP6',
            packageLevel: 'INNER_PACK',
            barcode: '6281002938133',
            qty: 6,
            maxWeight: 8.0,
            length: 40.0,
            width: 35.0,
            height: 25.0,
          },
          {
            id: 'pkg-ldr-cs',
            productId: 'prod-opt-lidar',
            uomId: 'uom-cs24',
            uomCode: 'CS24',
            packageLevel: 'CASE',
            barcode: '10628100293832',
            qty: 24,
            maxWeight: 34.0,
            length: 80.0,
            width: 60.0,
            height: 50.0,
          },
        ],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'prod-bat-48v',
        sku: 'NEOM-BAT-48V',
        barcode: '6281002938104',
        name: 'Industrial LiFePO4 Power Module 48V 100Ah',
        description: 'Smart BMS battery pack with internal aerosol thermal suppression for clean grid buffers',
        category: 'Clean Energy',
        unitCost: 590.0,
        retailPrice: 1420.0,
        trackInventory: true,
        reorderPoint: 15,
        leadTimeDays: 25,
        unitOfMeasure: 'EA',
        baseUoMId: 'uom-ea',
        purchaseUoMId: 'uom-inp6',
        salesUoMId: 'uom-ea',
        hsCode: '8507.60.0000',
        internalReference: 'NEOM-BAT-GRD-48',
        defaultVendor: 'Red Sea Energy Storage Co',
        vendorLeadTime: 25,
        moq: 6,
        packagings: [
          {
            id: 'pkg-bat-ea',
            productId: 'prod-bat-48v',
            uomId: 'uom-ea',
            uomCode: 'EA',
            packageLevel: 'EACH',
            barcode: '6281002938104',
            qty: 1,
            maxWeight: 38.0,
            length: 50.0,
            width: 40.0,
            height: 22.0,
          },
          {
            id: 'pkg-bat-pl',
            productId: 'prod-bat-48v',
            uomId: 'uom-inp6',
            uomCode: 'INP6',
            packageLevel: 'PALLET',
            barcode: '006281002938400038',
            qty: 6,
            maxWeight: 245.0,
            length: 120.0,
            width: 100.0,
            height: 80.0,
          },
        ],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      // Raw Components for BOM / Assembly
      {
        id: 'raw-pcb-mb',
        sku: 'RAW-PCB-GW-MB',
        barcode: '6281002938201',
        name: 'Mainboard PCB Sub-Assembly for Gateway',
        description: 'Populated SMT board with NXP MCU and cryptographic element',
        category: 'Raw Components',
        unitCost: 65.0,
        retailPrice: 95.0,
        trackInventory: true,
        reorderPoint: 120,
        leadTimeDays: 12,
        unitOfMeasure: 'EA',
        baseUoMId: 'uom-ea',
        purchaseUoMId: 'uom-cs24',
        salesUoMId: 'uom-ea',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'raw-alu-enc',
        sku: 'RAW-ENC-ALU-67',
        barcode: '6281002938202',
        name: 'CNC Anodized Aluminum IP67 Housing',
        description: 'Extruded high-conductivity enclosure for thermal dissipation',
        category: 'Raw Components',
        unitCost: 28.0,
        retailPrice: 48.0,
        trackInventory: true,
        reorderPoint: 100,
        leadTimeDays: 14,
        unitOfMeasure: 'EA',
        baseUoMId: 'uom-ea',
        purchaseUoMId: 'uom-cs24',
        salesUoMId: 'uom-ea',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    // 5. Stock Levels across NEOM locations
    this.stockLevels = [
      // NEOM Bay (BAY-01)
      { id: 'sl-1', productId: 'prod-iot-gw', locationId: 'loc-neom-bay-01', quantity: 240, updatedAt: '2026-09-18T00:00:00Z' },
      { id: 'sl-2', productId: 'prod-sns-vib', locationId: 'loc-neom-bay-01', quantity: 480, updatedAt: '2026-09-18T00:00:00Z' },
      { id: 'sl-3', productId: 'prod-opt-lidar', locationId: 'loc-neom-bay-01', quantity: 65, updatedAt: '2026-09-18T00:00:00Z' },
      { id: 'sl-4', productId: 'prod-bat-48v', locationId: 'loc-neom-bay-01', quantity: 28, updatedAt: '2026-09-18T00:00:00Z' },
      { id: 'sl-5', productId: 'raw-pcb-mb', locationId: 'loc-neom-bay-01', quantity: 310, updatedAt: '2026-09-18T00:00:00Z' },
      { id: 'sl-6', productId: 'raw-alu-enc', locationId: 'loc-neom-bay-01', quantity: 280, updatedAt: '2026-09-18T00:00:00Z' },

      // Oxagon Mega-Terminal (OXA-02)
      { id: 'sl-7', productId: 'prod-iot-gw', locationId: 'loc-neom-oxa-02', quantity: 180, updatedAt: '2026-09-18T00:00:00Z' },
      { id: 'sl-8', productId: 'prod-sns-vib', locationId: 'loc-neom-oxa-02', quantity: 74, updatedAt: '2026-09-18T00:00:00Z' }, // Low stock vs ROP 80
      { id: 'sl-9', productId: 'prod-opt-lidar', locationId: 'loc-neom-oxa-02', quantity: 14, updatedAt: '2026-09-18T00:00:00Z' }, // Low stock vs ROP 20
      { id: 'sl-10', productId: 'prod-bat-48v', locationId: 'loc-neom-oxa-02', quantity: 18, updatedAt: '2026-09-18T00:00:00Z' },

      // The Line (LIN-03)
      { id: 'sl-11', productId: 'prod-iot-gw', locationId: 'loc-neom-lin-03', quantity: 95, updatedAt: '2026-09-18T00:00:00Z' },
      { id: 'sl-12', productId: 'prod-sns-vib', locationId: 'loc-neom-lin-03', quantity: 210, updatedAt: '2026-09-18T00:00:00Z' },
      { id: 'sl-13', productId: 'prod-opt-lidar', locationId: 'loc-neom-lin-03', quantity: 32, updatedAt: '2026-09-18T00:00:00Z' },
      { id: 'sl-14', productId: 'prod-bat-48v', locationId: 'loc-neom-lin-03', quantity: 9, updatedAt: '2026-09-18T00:00:00Z' }, // Critical vs ROP 15

      // Trojena (TRO-04)
      { id: 'sl-15', productId: 'prod-iot-gw', locationId: 'loc-neom-tro-04', quantity: 22, updatedAt: '2026-09-18T00:00:00Z' },
      { id: 'sl-16', productId: 'prod-sns-vib', locationId: 'loc-neom-tro-04', quantity: 35, updatedAt: '2026-09-18T00:00:00Z' },

      // Quarantine Zone (QUAR-01) - Initial 6 units held in quarantine from discrepancy
      { id: 'sl-17', productId: 'prod-sns-vib', locationId: 'loc-neom-quar-01', quantity: 6, updatedAt: '2026-09-18T01:00:00Z' },
    ];

    // 6. Immutable Stock Movement Ledger
    this.stockMovements = [
      {
        id: 'mov-init-1',
        productId: 'prod-iot-gw',
        fromLocationId: null,
        toLocationId: 'loc-neom-bay-01',
        quantity: 240,
        type: 'RECEIPT',
        reference: 'PO-NEOM-2026-001',
        notes: 'Red Sea container sea shipment cleared customs at Oxagon Port',
        timestamp: '2026-09-15T09:00:00Z',
        userId: 'usr-admin-1',
      },
      {
        id: 'mov-init-2',
        productId: 'prod-sns-vib',
        fromLocationId: null,
        toLocationId: 'loc-neom-quar-01',
        quantity: 6,
        type: 'QUARANTINE_ISOLATION',
        reference: 'REC-NEOM-8821',
        notes: 'Blind receiving overage: +6 unmanifested units staged in Quarantine Bay',
        timestamp: '2026-09-17T15:30:00Z',
        userId: 'usr-staff-1',
      },
      {
        id: 'mov-init-3',
        productId: 'prod-sns-vib',
        fromLocationId: 'loc-neom-bay-01',
        toLocationId: 'loc-neom-lin-03',
        quantity: 120,
        type: 'TRANSFER',
        reference: 'TRF-BAY-LIN-04',
        notes: 'Hyperloop logistics spine replenishment for The Line Section 14',
        timestamp: '2026-09-16T11:20:00Z',
        userId: 'usr-mgr-1',
      },
    ];

    // 7. Channel Syncs
    this.channelSyncs = [
      {
        id: 'sync-neom-b2b',
        platform: 'B2B_PORTAL',
        externalId: 'neom-procurement-edi',
        channelName: 'NEOM Authority Central Procurement EDI',
        status: 'HEALTHY',
        lastSyncTime: '2026-09-18T09:30:00Z',
      },
      {
        id: 'sync-odoo-erp',
        platform: 'ODOO_ERP',
        externalId: 'odoo-neom-v19',
        channelName: 'Odoo 19 ERP Master Sync',
        status: 'HEALTHY',
        lastSyncTime: '2026-09-18T09:28:00Z',
      },
      {
        id: 'sync-amz-me',
        platform: 'AMAZON',
        externalId: 'amz-sa-neom-express',
        channelName: 'Amazon Saudi Arabia & Prime Middle East',
        status: 'HEALTHY',
        lastSyncTime: '2026-09-18T09:25:00Z',
      },
    ];

    // 8. License Plate Numbers (LPN Pallets)
    this.pallets = [
      {
        id: 'pal-neom-001',
        lpnCode: 'LPN-NEOM-2026-001',
        locationId: 'loc-neom-bay-01',
        binId: 'bin-a1-r1-s1',
        status: 'STORED',
        items: [{ productId: 'prod-iot-gw', quantity: 144 }],
        createdAt: '2026-09-16T08:00:00Z',
      },
      {
        id: 'pal-neom-002',
        lpnCode: 'LPN-NEOM-2026-002',
        locationId: 'loc-neom-oxa-02',
        binId: 'bin-b2-r1-s1',
        status: 'STAGED',
        items: [{ productId: 'prod-sns-vib', quantity: 144 }],
        createdAt: '2026-09-17T10:00:00Z',
      },
    ];

    // 9. BOM & Work Orders
    this.boms = [
      {
        id: 'bom-gw-500',
        bomCode: 'BOM-NEOM-GW-01',
        name: 'Edge AI Gateway Final Assembly Recipe',
        description: 'Integrates mainboard PCB, CNC aluminum enclosure, and antenna',
        finishedGoodId: 'prod-iot-gw',
        finishedQuantity: 1,
        laborCostEstimate: 14.0,
        items: [
          { componentProductId: 'raw-pcb-mb', quantityRequired: 1 },
          { componentProductId: 'raw-alu-enc', quantityRequired: 1 },
        ],
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    this.workOrders = [
      {
        id: 'wo-2026-01',
        workOrderNumber: 'WO-NEOM-901',
        bomId: 'bom-gw-500',
        locationId: 'loc-neom-bay-01',
        quantityToProduce: 50,
        status: 'IN_PROGRESS',
        notes: 'Priority batch for Oxagon autonomous vessel telemetry system',
        createdAt: '2026-09-17T08:00:00Z',
      },
    ];

    // 10. Purchase Orders with UoM-Aware Lines for Blind Inbound Receiving
    this.purchaseOrders = [
      {
        id: 'po-neom-101',
        poNumber: 'PO-NEOM-2026-081',
        vendorId: 'vend-redsea-tech',
        vendorName: 'Red Sea Microelectronics Ltd',
        supplier: 'Red Sea Microelectronics Ltd',
        locationId: 'loc-neom-bay-01',
        locationName: 'NEOM Bay Automated Distribution Center (BAY-01)',
        status: 'APPROVED',
        expectedDate: '2026-09-19T10:00:00Z',
        totalCost: 17100.0,
        isAiAutoGenerated: false,
        notes: 'Dock Receiving: Inbound delivery via Oxagon Gate 4. Blind receiving count required.',
        lines: [
          {
            id: 'pol-1',
            poId: 'po-neom-101',
            productId: 'prod-iot-gw',
            productSku: 'NEOM-IOT-GW500',
            productName: 'Edge AI Industrial Telemetry Gateway',
            expectedQty: 5, // 5 Master Cases
            expectedUomId: 'uom-cs24',
            expectedUomCode: 'CS24',
            expectedBaseQty: 120, // 5 * 24 = 120 eaches
            unitCost: 142.5,
          },
        ],
        items: [{ productId: 'prod-iot-gw', quantity: 120, unitCost: 142.5 }],
        createdAt: '2026-09-17T12:00:00Z',
      },
      {
        id: 'po-neom-102',
        poNumber: 'PO-NEOM-2026-082',
        vendorId: 'vend-oxagon-sens',
        vendorName: 'Oxagon Sensor Systems LLC',
        supplier: 'Oxagon Sensor Systems LLC',
        locationId: 'loc-neom-bay-01',
        locationName: 'NEOM Bay Automated Distribution Center (BAY-01)',
        status: 'APPROVED',
        expectedDate: '2026-09-20T14:00:00Z',
        totalCost: 9120.0,
        isAiAutoGenerated: true,
        notes: 'AI Automated Replenishment: Oxagon terminal turbine monitoring stock below ROP buffer.',
        lines: [
          {
            id: 'pol-2',
            poId: 'po-neom-102',
            productId: 'prod-sns-vib',
            productSku: 'NEOM-SNS-VIB99',
            productName: 'Tri-Axial High-Temp Vibration Sensor',
            expectedQty: 10, // 10 Master Cases
            expectedUomId: 'uom-cs24',
            expectedUomCode: 'CS24',
            expectedBaseQty: 240, // 10 * 24 = 240 eaches
            unitCost: 38.0,
          },
        ],
        items: [{ productId: 'prod-sns-vib', quantity: 240, unitCost: 38.0 }],
        createdAt: '2026-09-18T02:00:00Z',
      },
    ];

    // 11. Initial Goods Receipts (Including 1 Quarantine Discrepancy for Demonstration)
    this.goodsReceipts = [
      {
        id: 'rec-neom-8821',
        receiptNumber: 'REC-NEOM-8821',
        poId: 'po-neom-102',
        poNumber: 'PO-NEOM-2026-082',
        vendorName: 'Oxagon Sensor Systems LLC',
        locationId: 'loc-neom-quar-01',
        locationName: 'NEOM Port Customs & Quarantine Depot (QUAR-01)',
        receivedByUserId: 'usr-staff-1',
        receivedByUserName: 'Fahad Al-Shehri',
        timestamp: '2026-09-17T15:30:00Z',
        status: 'PENDING_REVIEW',
        hasVariance: true,
        lines: [
          {
            id: 'rcl-1',
            receiptId: 'rec-neom-8821',
            productId: 'prod-sns-vib',
            productSku: 'NEOM-SNS-VIB99',
            productName: 'Tri-Axial High-Temp Vibration Sensor',
            scannedBarcode: '6281002938126', // Scanned as Inner Pack of 6
            scannedQty: 41, // 41 inner packs scanned = 246 units (expected was 240 units)
            scannedUomId: 'uom-inp6',
            scannedUomCode: 'INP6',
            scannedPackageLevel: 'INNER_PACK',
            conversionRatio: 6,
            baseQtyConverted: 246,
            expectedBaseQty: 240,
            varianceDelta: 6,
            status: 'OVERAGE',
          },
        ],
        varianceSummary: {
          totalExpectedBase: 240,
          totalReceivedBase: 246,
          netDelta: 6,
          notes: 'Discrepancy detected: Physical count found +6 unmanifested units (41 inner packs vs 40 expected). Quarantined.',
        },
        quarantineNotes: 'AUTOMATIC EXCEPTION ROUTING: Stock staged in QUAR-01 awaiting manager review.',
      },
    ];

    // 12. Bins & Waves for WES
    this.bins = [
      { id: 'bin-1', zone: 'ZONE-A', aisle: 1, rack: 1, shelfLevel: 1, binCode: 'A-01-01-L1', xCoord: 2.0, yCoord: 10.0, zCoord: 1.0, productId: 'prod-iot-gw', quantity: 180 },
      { id: 'bin-2', zone: 'ZONE-A', aisle: 1, rack: 2, shelfLevel: 1, binCode: 'A-01-02-L1', xCoord: 4.0, yCoord: 18.0, zCoord: 1.0, productId: 'prod-sns-vib', quantity: 340 },
      { id: 'bin-3', zone: 'ZONE-B', aisle: 2, rack: 1, shelfLevel: 1, binCode: 'B-02-01-L1', xCoord: 16.0, yCoord: 8.0, zCoord: 1.0, productId: 'prod-opt-lidar', quantity: 45 },
      { id: 'bin-4', zone: 'ZONE-C', aisle: 3, rack: 1, shelfLevel: 1, binCode: 'C-03-01-L1', xCoord: 28.0, yCoord: 12.0, zCoord: 0.5, productId: 'prod-bat-48v', quantity: 20 },
    ];

    this.waves = [
      {
        id: 'wav-2026-901',
        waveNumber: 'WAV-NEOM-2026-01',
        status: 'IN_PROGRESS',
        assignedTo: 'Fahad Al-Shehri (Lead Scanner)',
        optimalDistanceMeters: 84.5,
        createdAt: '2026-09-18T08:00:00Z',
        items: [
          {
            id: 'wi-1',
            waveId: 'wav-2026-901',
            orderId: 'ORD-NEOM-101',
            productId: 'prod-iot-gw',
            sku: 'NEOM-IOT-GW500',
            productName: 'Edge AI Industrial Telemetry Gateway',
            binCode: 'A-01-01-L1',
            binCoordinates: { x: 2.0, y: 10.0, z: 1.0 },
            quantity: 3,
            pickedQty: 3,
            sequence: 1,
            isComplete: true,
          },
          {
            id: 'wi-2',
            waveId: 'wav-2026-901',
            orderId: 'ORD-NEOM-101',
            productId: 'prod-sns-vib',
            sku: 'NEOM-SNS-VIB99',
            productName: 'Tri-Axial High-Temp Vibration Sensor',
            binCode: 'A-01-02-L1',
            binCoordinates: { x: 4.0, y: 18.0, z: 1.0 },
            quantity: 6,
            pickedQty: 2,
            sequence: 2,
            isComplete: false,
          },
        ],
      },
    ];

    this.orders = [
      {
        id: 'ord-neom-101',
        externalOrderNo: 'ORD-NEOM-8801',
        platform: 'B2B_PORTAL',
        customerName: 'NEOM Autonomous Shuttles Authority',
        customerEmail: 'fleet-ops@neom.sa',
        destAddress: 'Sector 4 Depot, The Line',
        destCity: 'The Line',
        destState: 'Tabuk',
        destPostalCode: '49820',
        destLat: 28.0125,
        destLng: 35.4529,
        status: 'ROUTED',
        totalAmount: 1884.0,
        items: [
          { productId: 'prod-iot-gw', quantity: 3, unitPrice: 389.0 },
          { productId: 'prod-sns-vib', quantity: 6, unitPrice: 119.5 },
        ],
        shipments: [],
        createdAt: '2026-09-18T07:15:00Z',
      },
    ];

    // 13. Initialize Database Profiles
    const initialSnapshot = this.takeSnapshot();
    this.instancesData.set('db-neom-live', initialSnapshot);

    this.databaseInstances = [
      {
        id: 'db-neom-live',
        name: 'RedSea IMS - NEOM Live Operations',
        code: 'PROD-NEOM-LIVE',
        description: 'Active production database with multi-facility NEOM inventory and live stock ledgers.',
        type: 'LIVE',
        createdAt: '2026-01-01T00:00:00Z',
        isCurrent: true,
        productCount: this.products.length,
        stockCount: this.stockLevels.reduce((a, b) => a + b.quantity, 0),
        locationCount: this.locations.length,
      },
    ];
  }
}

export const db = new EnterpriseStore();
