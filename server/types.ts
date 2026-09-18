// Server TypeScript Interfaces and DTOs

export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';
export type LocationType = 'WAREHOUSE' | 'STOREFRONT' | 'QUARANTINE' | 'STORE' | 'TRANSIT_HUB';
export type MovementType = 'RECEIPT' | 'TRANSFER' | 'SALE' | 'ADJUSTMENT' | 'RETURN' | 'QUARANTINE_ISOLATION' | 'QUARANTINE_RELEASE' | 'SCRAP';
export type SyncPlatform = 'SHOPIFY' | 'WOOCOMMERCE' | 'AMAZON' | 'ODOO_ERP' | 'B2B_PORTAL';
export type ItemStatus = 'AVAILABLE' | 'RESERVED' | 'QUARANTINED' | 'EXPIRED' | 'SHIPPED';
export type WorkOrderStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type OrderStatus = 'PENDING' | 'ROUTED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED';
export type PurchaseOrderStatus = 'DRAFT' | 'APPROVED' | 'RECEIVING' | 'PARTIAL' | 'COMPLETED' | 'QUARANTINED' | 'CANCELLED';
export type WaveStatus = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type UoMType = 'REFERENCE' | 'BIGGER' | 'SMALLER';
export type PackageLevel = 'EACH' | 'INNER_PACK' | 'CASE' | 'PALLET';
export type GoodsReceiptStatus = 'PENDING_REVIEW' | 'COMMITTED' | 'QUARANTINED';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  role: Role;
  jobTitle?: string;
  badgeCode?: string;
  createdAt: string;
}

// 1. Multi-Tier UoM & Packaging Schema
export interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  color?: string;
}

export interface UoMCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface UoM {
  id: string;
  name: string;
  code: string;
  categoryId: string;
  categoryCode?: string;
  type: UoMType;
  ratio: number; // e.g. Reference is 1.0, Box of 6 is 6.0, Case of 24 is 24.0, Pallet is 144.0
  active: boolean;
}

export interface ProductPackaging {
  id: string;
  productId: string;
  uomId: string;
  uomCode?: string;
  packageLevel: PackageLevel;
  barcode: string; // Unique packaging barcode
  qty: number; // base units contained
  maxWeight: number; // kg
  length: number; // cm
  width: number; // cm
  height: number; // cm
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  attributes: {
    size?: string;
    color?: string;
    material?: string;
    [key: string]: string | undefined;
  };
  priceOffset: number;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description?: string;
  category: string;
  unitCost: number;
  retailPrice: number;
  trackInventory: boolean;
  reorderPoint: number;
  leadTimeDays: number;
  unitOfMeasure: string; // Legacy display code
  baseUoMId: string;
  purchaseUoMId: string;
  salesUoMId: string;
  hsCode?: string;
  internalReference?: string;
  defaultVendor?: string;
  vendorLeadTime?: number;
  moq?: number;
  packagings?: ProductPackaging[];
  variants?: ProductVariant[];
  weight?: number;
  dimensions?: string;
  storageCondition?: string;
  brand?: string;
  countryOfOrigin?: string;
  maxCapacity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  active: boolean;
  nominalCapacity?: number;
  totalUnits?: number;
  skuCount?: number;
  utilizationRate?: number;
  zones?: string[];
  temperatureZone?: string;
  managerName?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StockLevel {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  fromLocationId: string | null;
  toLocationId: string | null;
  quantity: number;
  type: MovementType;
  reference?: string;
  notes?: string;
  timestamp: string;
  userId?: string;
}

export interface ChannelSync {
  id: string;
  platform: SyncPlatform;
  externalId: string;
  channelName: string;
  status: 'HEALTHY' | 'SYNCING' | 'ERROR';
  lastSyncTime: string;
  name?: string;
  channelId?: string;
  syncStatus?: string;
  pendingOrdersCount?: number;
  lastSyncAt?: string;
}

export interface StockItem {
  id: string;
  productId: string;
  locationId: string;
  palletId?: string;
  binId?: string;
  serialNumber?: string;
  lotNumber?: string;
  expirationDate?: string;
  status: ItemStatus;
  createdAt: string;
}

export interface Pallet {
  id: string;
  lpnCode: string;
  locationId: string;
  binId?: string;
  status: 'STAGED' | 'IN_TRANSIT' | 'RECEIVED' | 'STORED';
  items: {
    productId: string;
    quantity: number;
  }[];
  createdAt: string;
}

export interface BillOfMaterials {
  id: string;
  bomCode: string;
  name: string;
  description?: string;
  finishedGoodId: string;
  finishedQuantity: number;
  laborCostEstimate: number;
  items: {
    componentProductId: string;
    quantityRequired: number;
  }[];
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  bomId: string;
  locationId: string;
  quantityToProduce: number;
  status: WorkOrderStatus;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Bin {
  id: string;
  zone: string;
  aisle: number;
  rack: number;
  shelfLevel: number;
  binCode: string;
  xCoord: number;
  yCoord: number;
  zCoord: number;
  productId?: string;
  quantity?: number;
}

export interface Wave {
  id: string;
  waveNumber: string;
  status: WaveStatus;
  assignedTo?: string;
  items: WaveItem[];
  createdAt: string;
  optimalDistanceMeters?: number;
}

export interface WaveItem {
  id: string;
  waveId: string;
  orderId: string;
  productId: string;
  sku: string;
  productName: string;
  binCode: string;
  binCoordinates: { x: number; y: number; z: number };
  quantity: number;
  pickedQty: number;
  sequence: number;
  isComplete: boolean;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  externalOrderNo: string;
  platform: SyncPlatform;
  customerName: string;
  customerEmail: string;
  destAddress: string;
  destCity: string;
  destState: string;
  destPostalCode: string;
  destLat: number;
  destLng: number;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  shipments?: Shipment[];
  createdAt: string;
  updatedAt?: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  locationId: string;
  locationName: string;
  carrier: string;
  trackingNumber: string;
  estimatedCost: number;
  isSplit: boolean;
  items: {
    productId: string;
    sku: string;
    name: string;
    quantity: number;
  }[];
  createdAt: string;
}

export interface PurchaseOrderLine {
  id: string;
  poId: string;
  productId: string;
  productSku: string;
  productName: string;
  expectedQty: number; // in expected UoM (e.g. 5 cases)
  expectedUomId: string;
  expectedUomCode: string;
  expectedBaseQty: number; // e.g. 5 * 24 = 120 eaches
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId?: string;
  vendorName: string;
  supplier?: string; // backward compat
  locationId: string;
  locationName?: string;
  status: PurchaseOrderStatus;
  expectedDate?: string;
  totalCost: number;
  isAiAutoGenerated: boolean;
  notes?: string;
  lines: PurchaseOrderLine[];
  items?: {
    productId: string;
    quantity: number;
    unitCost: number;
  }[]; // backward compat
  createdAt: string;
  updatedAt?: string;
}

export interface GoodsReceiptLine {
  id: string;
  receiptId: string;
  productId: string;
  productSku: string;
  productName: string;
  scannedBarcode: string;
  scannedQty: number; // count scanned in that package level
  scannedUomId: string;
  scannedUomCode: string;
  scannedPackageLevel: PackageLevel;
  conversionRatio: number;
  baseQtyConverted: number; // scannedQty * ratio
  expectedBaseQty: number; // expected in PO
  varianceDelta: number; // baseQtyConverted - expectedBaseQty
  status: 'MATCH' | 'SHORTAGE' | 'OVERAGE';
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  poId: string;
  poNumber: string;
  vendorName: string;
  locationId: string;
  locationName: string;
  receivedByUserId: string;
  receivedByUserName: string;
  timestamp: string;
  status: GoodsReceiptStatus;
  lines: GoodsReceiptLine[];
  hasVariance: boolean;
  varianceSummary?: {
    totalExpectedBase: number;
    totalReceivedBase: number;
    netDelta: number;
    notes?: string;
  };
  quarantineNotes?: string;
  resolutionAction?: 'ACCEPT_VARIANCE' | 'GENERATE_RTV' | 'TRIGGER_RECOUNT';
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface DatabaseInstance {
  id: string;
  name: string;
  code: string;
  description: string;
  type: 'LIVE' | 'SANDBOX' | 'EMPTY';
  createdAt: string;
  isCurrent: boolean;
  productCount: number;
  stockCount: number;
  locationCount: number;
}

export interface SkuVelocity {
  productId: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  sales30Days: number;
  dailyVelocity: number;
  daysOfInventoryRemaining: number;
  suggestedReorderQuantity: number;
  unitCost: number;
  estimatedRestockCost: number;
  leadTimeDays: number;
  urgency: 'CRITICAL' | 'WARNING' | 'HEALTHY';
}
