// Centralized Frontend API Service Layer using Axios
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Data Transfer Objects (DTOs)
export interface DashboardStatsDTO {
  totalValuation: number;
  totalUnits: number;
  productCount: number;
  locationCount: number;
  lowStockCount: number;
  lowStockAlerts: SkuVelocityDTO[];
  recentMovements: StockMovementDTO[];
  channels: ChannelSyncDTO[];
  activeWorkOrders: number;
  activeWaves: number;
  draftPurchaseOrdersCount: number;
}

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  jobTitle?: string;
  badgeCode?: string;
  createdAt: string;
}

export interface DatabaseInstanceDTO {
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

export interface UoMCategoryDTO {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface UoMDTO {
  id: string;
  name: string;
  code: string;
  categoryId: string;
  categoryCode?: string;
  type: 'REFERENCE' | 'BIGGER' | 'SMALLER';
  ratio: number;
  active: boolean;
}

export interface ProductPackagingDTO {
  id: string;
  productId: string;
  uomId: string;
  uomCode?: string;
  packageLevel: 'EACH' | 'INNER_PACK' | 'CASE' | 'PALLET';
  barcode: string;
  qty: number;
  maxWeight: number;
  length: number;
  width: number;
  height: number;
}

export interface ProductVariantDTO {
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

export interface ProductDTO {
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
  unitOfMeasure: string;
  baseUoMId?: string;
  purchaseUoMId?: string;
  salesUoMId?: string;
  hsCode?: string;
  internalReference?: string;
  defaultVendor?: string;
  vendorLeadTime?: number;
  moq?: number;
  packagings?: ProductPackagingDTO[];
  variants?: ProductVariantDTO[];
  totalStock: number;
  stockByLocation: {
    locationId: string;
    locationName: string;
    locationCode: string;
    quantity: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  sku: string;
  barcode: string;
  name: string;
  description?: string;
  category?: string;
  unitCost: number;
  retailPrice: number;
  trackInventory?: boolean;
  reorderPoint?: number;
  leadTimeDays?: number;
  unitOfMeasure?: string;
  baseUoMId?: string;
  purchaseUoMId?: string;
  salesUoMId?: string;
  hsCode?: string;
  internalReference?: string;
  defaultVendor?: string;
  vendorLeadTime?: number;
  moq?: number;
  packagings?: ProductPackagingDTO[];
  variants?: ProductVariantDTO[];
}

export interface PurchaseOrderLineDTO {
  id: string;
  poId: string;
  productId: string;
  productSku: string;
  productName: string;
  expectedQty: number;
  expectedUomId: string;
  expectedUomCode: string;
  expectedBaseQty: number;
  unitCost: number;
}

export interface GoodsReceiptLineDTO {
  id: string;
  receiptId: string;
  productId: string;
  productSku: string;
  productName: string;
  scannedBarcode: string;
  scannedQty: number;
  scannedUomId: string;
  scannedUomCode: string;
  scannedPackageLevel: 'EACH' | 'INNER_PACK' | 'CASE' | 'PALLET';
  conversionRatio: number;
  baseQtyConverted: number;
  expectedBaseQty: number;
  varianceDelta: number;
  status: 'MATCH' | 'SHORTAGE' | 'OVERAGE';
}

export interface GoodsReceiptDTO {
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
  status: 'PENDING_REVIEW' | 'COMMITTED' | 'QUARANTINED';
  lines: GoodsReceiptLineDTO[];
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

export interface BarcodeLookupDTO {
  found: boolean;
  product?: ProductDTO;
  packaging?: ProductPackagingDTO;
  uom?: UoMDTO;
  detectedPackageLevel: 'EACH' | 'INNER_PACK' | 'CASE' | 'PALLET';
  conversionRatio: number;
  label: string;
}

export interface LocationDTO {
  id: string;
  name: string;
  code: string;
  type: 'WAREHOUSE' | 'STOREFRONT';
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  active: boolean;
}

export interface StockLevelDTO {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  product?: ProductDTO;
  location?: LocationDTO;
  updatedAt: string;
}

export interface StockMovementDTO {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  fromLocationId: string | null;
  toLocationId: string | null;
  fromLocationName: string | null;
  toLocationName: string | null;
  quantity: number;
  type: 'RECEIPT' | 'TRANSFER' | 'SALE' | 'ADJUSTMENT' | 'RETURN';
  reference?: string;
  notes?: string;
  timestamp: string;
  userId?: string;
}

export interface ChannelSyncDTO {
  id: string;
  platform: 'SHOPIFY' | 'WOOCOMMERCE' | 'AMAZON' | 'ODOO_ERP' | 'B2B_PORTAL';
  externalId: string;
  channelName: string;
  status: 'HEALTHY' | 'SYNCING' | 'ERROR';
  lastSyncTime: string;
}

export interface SkuVelocityDTO {
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

export interface PurchaseOrderDTO {
  id: string;
  poNumber: string;
  supplier: string;
  vendorName?: string;
  locationId: string;
  locationName?: string;
  status: 'DRAFT' | 'APPROVED' | 'SENT' | 'RECEIVED' | 'CANCELLED';
  totalCost: number;
  isAiAutoGenerated: boolean;
  notes?: string;
  items: {
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    unitCost: number;
  }[];
  lines?: PurchaseOrderLineDTO[];
  createdAt: string;
}

export interface OrderDTO {
  id: string;
  externalOrderNo: string;
  platform: string;
  customerName: string;
  customerEmail: string;
  destAddress: string;
  destCity: string;
  destState: string;
  destPostalCode: string;
  destLat: number;
  destLng: number;
  status: string;
  totalAmount: number;
  items: {
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
  shipments?: {
    id: string;
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
  }[];
  createdAt: string;
}

export interface WaveDTO {
  id: string;
  waveNumber: string;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedTo?: string;
  items: {
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
  }[];
  createdAt: string;
  optimalDistanceMeters?: number;
}

export interface BillOfMaterialsDTO {
  id: string;
  bomCode: string;
  name: string;
  description?: string;
  finishedGoodId: string;
  finishedGoodSku: string;
  finishedGoodName: string;
  finishedQuantity: number;
  laborCostEstimate: number;
  items: {
    componentProductId: string;
    sku: string;
    name: string;
    quantityRequired: number;
  }[];
}

export type BomDTO = BillOfMaterialsDTO;

export interface WorkOrderDTO {
  id: string;
  workOrderNumber: string;
  bomId: string;
  bomCode: string;
  finishedGoodName: string;
  finishedGoodSku: string;
  locationId: string;
  locationName: string;
  quantityToProduce: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PalletDTO {
  id: string;
  lpnCode: string;
  locationId: string;
  locationName: string;
  binId?: string;
  status: string;
  items: {
    productId: string;
    sku: string;
    name: string;
    quantity: number;
  }[];
  createdAt: string;
}

// ==========================================
// Centralized API Contract Methods
// ==========================================
export const api = {
  // 1. Dashboard
  getDashboardStats: async (): Promise<DashboardStatsDTO> => {
    const { data } = await apiClient.get<DashboardStatsDTO>('/dashboard/stats');
    return data;
  },

  // 2. Products
  getProducts: async (): Promise<ProductDTO[]> => {
    const { data } = await apiClient.get<ProductDTO[]>('/products');
    return data;
  },

  createProduct: async (payload: CreateProductInput): Promise<ProductDTO> => {
    const { data } = await apiClient.post<ProductDTO>('/products', payload);
    return data;
  },

  updateProduct: async (id: string, payload: Partial<ProductDTO>): Promise<ProductDTO> => {
    const { data } = await apiClient.put<ProductDTO>(`/products/${id}`, payload);
    return data;
  },

  // 3. Locations & Stock
  getLocations: async (): Promise<LocationDTO[]> => {
    const { data } = await apiClient.get<LocationDTO[]>('/locations');
    return data;
  },

  getStockLevels: async (params?: { locationId?: string; productId?: string }): Promise<StockLevelDTO[]> => {
    const { data } = await apiClient.get<StockLevelDTO[]>('/stock-levels', { params });
    return data;
  },

  getStockMovements: async (limit: number = 50): Promise<StockMovementDTO[]> => {
    const { data } = await apiClient.get<StockMovementDTO[]>('/stock/movements', { params: { limit } });
    return data;
  },

  // 4. Atomic Stock Operations
  adjustStock: async (payload: {
    productId: string;
    locationId: string;
    quantityDelta: number;
    reference?: string;
    notes?: string;
  }) => {
    const { data } = await apiClient.post('/stock/adjust', payload);
    return data;
  },

  receiveStock: async (payload: {
    productId: string;
    locationId: string;
    quantity: number;
    reference?: string;
    notes?: string;
  }) => {
    const { data } = await apiClient.post('/stock/receive', payload);
    return data;
  },

  transferStock: async (payload: {
    productId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    reference?: string;
    notes?: string;
  }) => {
    const { data } = await apiClient.post('/stock/transfer', payload);
    return data;
  },

  // 5. Omni-Channel & Webhooks
  triggerOrderWebhook: async (payload: {
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
  }) => {
    const { data } = await apiClient.post('/webhooks/orders', payload);
    return data;
  },

  getOrders: async (): Promise<OrderDTO[]> => {
    const { data } = await apiClient.get<OrderDTO[]>('/orders');
    return data;
  },

  getChannels: async (): Promise<ChannelSyncDTO[]> => {
    const { data } = await apiClient.get<ChannelSyncDTO[]>('/channels');
    return data;
  },

  // 6. POS Checkout
  posCheckout: async (payload: {
    locationId: string;
    items: { barcodeOrSku: string; quantity: number }[];
    paymentMethod: string;
    cashierId?: string;
  }) => {
    const { data } = await apiClient.post('/pos/checkout', payload);
    return data;
  },

  // 7. Directed WES & Wave Picking
  getWaves: async (): Promise<WaveDTO[]> => {
    const { data } = await apiClient.get<WaveDTO[]>('/wes/waves');
    return data;
  },

  getWaveById: async (id: string): Promise<WaveDTO> => {
    const { data } = await apiClient.get<WaveDTO>(`/wes/waves/${id}`);
    return data;
  },

  createWave: async (payload?: { waveNumber?: string; orderIds?: string[] }): Promise<WaveDTO> => {
    const { data } = await apiClient.post<WaveDTO>('/wes/waves/create', payload || {});
    return data;
  },

  sendScanStream: async (payload: {
    barcodeOrRfid: string;
    waveId?: string;
    scannerId?: string;
  }) => {
    const { data } = await apiClient.post('/wes/scan-stream', payload);
    return data;
  },

  // 8. AI Demand Planning & Replenishment
  getDemandPlanningVelocities: async (): Promise<SkuVelocityDTO[]> => {
    const { data } = await apiClient.get<SkuVelocityDTO[]>('/demand-planning/velocities');
    return data;
  },

  triggerReplenishmentCron: async () => {
    const { data } = await apiClient.post('/demand-planning/trigger-replenishment');
    return data;
  },

  getAiDemandForecast: async (): Promise<{
    analysis: string;
    recommendations: { sku: string; action: string; riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' }[];
    timestamp: string;
  }> => {
    const { data } = await apiClient.get('/demand-planning/ai-forecast');
    return data;
  },

  getPurchaseOrders: async (): Promise<PurchaseOrderDTO[]> => {
    const { data } = await apiClient.get<PurchaseOrderDTO[]>('/purchase-orders');
    return data;
  },

  approvePurchaseOrder: async (id: string) => {
    const { data } = await apiClient.post(`/purchase-orders/${id}/approve`);
    return data;
  },

  // 9. Manufacturing & BOM
  getBoms: async (): Promise<BillOfMaterialsDTO[]> => {
    const { data } = await apiClient.get<BillOfMaterialsDTO[]>('/manufacturing/boms');
    return data;
  },

  getWorkOrders: async (): Promise<WorkOrderDTO[]> => {
    const { data } = await apiClient.get<WorkOrderDTO[]>('/manufacturing/work-orders');
    return data;
  },

  createWorkOrder: async (payload: {
    orderNumber?: string;
    bomId: string;
    finishedProductId?: string;
    locationId?: string;
    quantityToProduce: number;
  }): Promise<WorkOrderDTO> => {
    const { data } = await apiClient.post<WorkOrderDTO>('/manufacturing/work-orders', payload);
    return data;
  },

  completeWorkOrder: async (id: string) => {
    const { data } = await apiClient.post(`/manufacturing/work-orders/${id}/complete`);
    return data;
  },

  // 10. LPN Pallets
  getPallets: async (): Promise<PalletDTO[]> => {
    const { data } = await apiClient.get<PalletDTO[]>('/pallets');
    return data;
  },

  movePallet: async (lpn: string, targetLocationId: string, targetBinId?: string) => {
    const { data } = await apiClient.post(`/pallets/${lpn}/move`, { targetLocationId, targetBinId });
    return data;
  },

  // 11. Auth & Database Multi-Tenancy (Neutralize, Clone, Switch)
  getUsers: async (): Promise<UserDTO[]> => {
    const { data } = await apiClient.get<UserDTO[]>('/auth/users');
    return data;
  },

  login: async (payload: { email?: string; badgeCode?: string }): Promise<{
    success: boolean;
    user: UserDTO;
    token: string;
    activeDatabase: string;
  }> => {
    const { data } = await apiClient.post('/auth/login', payload);
    return data;
  },

  getDatabaseInstances: async (): Promise<{
    currentDatabaseId: string;
    instances: DatabaseInstanceDTO[];
  }> => {
    const { data } = await apiClient.get('/database/instances');
    return data;
  },

  switchDatabase: async (instanceId: string): Promise<{
    success: boolean;
    message: string;
    currentDatabase: DatabaseInstanceDTO;
    instances: DatabaseInstanceDTO[];
  }> => {
    const { data } = await apiClient.post('/database/switch', { instanceId });
    return data;
  },

  cloneDatabase: async (name: string, description: string): Promise<{
    success: boolean;
    message: string;
    newInstance: DatabaseInstanceDTO;
    instances: DatabaseInstanceDTO[];
  }> => {
    const { data } = await apiClient.post('/database/clone', { name, description });
    return data;
  },

  neutralizeDatabase: async (name?: string): Promise<{
    success: boolean;
    message: string;
    newInstance: DatabaseInstanceDTO;
    instances: DatabaseInstanceDTO[];
  }> => {
    const { data } = await apiClient.post('/database/neutralize', { name });
    return data;
  },

  // 12. Multi-Tier UoM & Barcode Intelligence
  getUomCategories: async (): Promise<UoMCategoryDTO[]> => {
    const { data } = await apiClient.get<UoMCategoryDTO[]>('/uom/categories');
    return data;
  },

  getUoms: async (): Promise<UoMDTO[]> => {
    const { data } = await apiClient.get<UoMDTO[]>('/uom/units');
    return data;
  },

  createUom: async (payload: {
    name: string;
    code: string;
    categoryId: string;
    type: 'REFERENCE' | 'BIGGER' | 'SMALLER';
    ratio: number;
  }): Promise<UoMDTO> => {
    const { data } = await apiClient.post<UoMDTO>('/uom/units', payload);
    return data;
  },

  lookupBarcode: async (barcode: string): Promise<BarcodeLookupDTO> => {
    const { data } = await apiClient.get<BarcodeLookupDTO>(`/barcode/lookup/${encodeURIComponent(barcode)}`);
    return data;
  },

  patchProduct: async (id: string, patch: Partial<ProductDTO>): Promise<ProductDTO> => {
    const { data } = await apiClient.patch<ProductDTO>(`/products/${id}`, patch);
    return data;
  },

  // 13. Advanced Inbound Operations & Blind Receiving
  getReceivingPurchaseOrders: async (): Promise<PurchaseOrderDTO[]> => {
    const { data } = await apiClient.get<PurchaseOrderDTO[]>('/receiving/purchase-orders');
    return data;
  },

  getGoodsReceipts: async (): Promise<GoodsReceiptDTO[]> => {
    const { data } = await apiClient.get<GoodsReceiptDTO[]>('/receiving/receipts');
    return data;
  },

  submitBlindReceipt: async (payload: {
    poId: string;
    locationId: string;
    receivedByUserId?: string;
    receivedByUserName?: string;
    scannedItems: { productId: string; scannedBarcode: string; scannedQty: number }[];
    notes?: string;
  }): Promise<{
    receipt: GoodsReceiptDTO;
    hasVariance: boolean;
    quarantined: boolean;
    message: string;
  }> => {
    const { data } = await apiClient.post('/receiving/blind-submit', payload);
    return data;
  },

  resolveReceiptVariance: async (payload: {
    receiptId: string;
    action: 'ACCEPT_VARIANCE' | 'GENERATE_RTV' | 'TRIGGER_RECOUNT';
    managerUserId?: string;
    managerName?: string;
    notes?: string;
  }): Promise<{
    success: boolean;
    message: string;
    receipt: GoodsReceiptDTO;
  }> => {
    const { data } = await apiClient.post('/receiving/resolve-variance', payload);
    return data;
  },
};
