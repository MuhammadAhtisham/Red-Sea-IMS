import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { CommandPalette } from './components/CommandPalette';
import { WarehouseBayView } from './components/WarehouseBayView';
import { RightSlidingDrawer, DrawerMode } from './components/RightSlidingDrawer';
import { DashboardView } from './components/DashboardView';
import { ProductMasterView } from './components/ProductMasterView';
import { BlindReceivingView } from './components/BlindReceivingView';
import { StockOperationsView } from './components/StockOperationsView';
import { WesWavePickingView } from './components/WesWavePickingView';
import { DemandPlanningView } from './components/DemandPlanningView';
import { CategoryManagementView } from './components/CategoryManagementView';
import { PhysicalAdjustmentView } from './components/PhysicalAdjustmentView';
import { ReportsAndIntelligenceView } from './components/ReportsAndIntelligenceView';
import { LoginPage } from './components/LoginPage';
import { ActiveTab } from './components/Navigation';
import {
  api,
  DashboardStatsDTO,
  ProductDTO,
  LocationDTO,
  StockMovementDTO,
  PalletDTO,
  WaveDTO,
  OrderDTO,
  PurchaseOrderDTO,
  UserDTO,
  GoodsReceiptDTO,
  DatabaseInstanceDTO,
} from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('warehouses');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);

  // Sidebar Collapse State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Global Command Palette State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global Right Sliding Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('WAREHOUSE_TRANSFER');
  const [selectedProduct, setSelectedProduct] = useState<ProductDTO | null>(null);
  const [drawerInitialRack, setDrawerInitialRack] = useState<string>('B6');

  // Database Instance State
  const [currentDbName, setCurrentDbName] = useState('NEOM Live');
  const [currentDbType, setCurrentDbType] = useState('LIVE');

  // Global State Stores
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [movements, setMovements] = useState<StockMovementDTO[]>([]);
  const [pallets, setPallets] = useState<PalletDTO[]>([]);
  const [waves, setWaves] = useState<WaveDTO[]>([]);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDTO[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceiptDTO[]>([]);

  // Keyboard Shortcuts Hook: Cmd+K / Ctrl+K and Ctrl+B
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Toggle Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Press '/' to search when not typing in an input
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      // Toggle Sidebar with Ctrl+B or Cmd+B
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Auto-login or check default user
  useEffect(() => {
    const initAuth = async () => {
      try {
        const users = await api.getUsers();
        if (users.length > 0) {
          setCurrentUser(users[0]);
        }
      } catch (e) {
        console.error('Failed to init users', e);
      }
    };
    initAuth();
  }, []);

  // Fetch all state from centralized API service
  const fetchAllData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsRefreshing(true);
      setSystemError(null);

      const [
        statsData,
        productsData,
        locationsData,
        movementsData,
        palletsData,
        wavesData,
        ordersData,
        poData,
        receiptsData,
        dbData,
      ] = await Promise.all([
        api.getDashboardStats(),
        api.getProducts(),
        api.getLocations(),
        api.getStockMovements(),
        api.getPallets(),
        api.getWaves(),
        api.getOrders(),
        api.getPurchaseOrders(),
        api.getGoodsReceipts(),
        api.getDatabaseInstances().catch(() => ({ currentDatabaseId: 'db-neom-live', instances: [] })),
      ]);

      setStats(statsData);
      setProducts(productsData);
      setLocations(locationsData);
      setMovements(movementsData);
      setPallets(palletsData);
      setWaves(wavesData);
      setOrders(ordersData);
      setPurchaseOrders(poData);
      setGoodsReceipts(receiptsData);

      if (dbData && dbData.instances) {
        const activeInst = dbData.instances.find((i: DatabaseInstanceDTO) => i.id === dbData.currentDatabaseId);
        if (activeInst) {
          setCurrentDbName(activeInst.name);
          setCurrentDbType(activeInst.type);
        }
      }
    } catch (err: any) {
      console.error('Failed to sync network state:', err);
      setSystemError(
        err.response?.data?.error || err.message || 'Failed to connect to Enterprise Core Server.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchAllData();
    }
  }, [currentUser, fetchAllData]);

  // Product Creation Handler
  const handleCreateProduct = async (input: any) => {
    await api.createProduct(input);
    await fetchAllData(true);
  };

  // Open Drawer Helpers
  const handleOpenProductDrawer = (prod: ProductDTO) => {
    setSelectedProduct(prod);
    setDrawerMode('PRODUCT_EDIT');
    setDrawerOpen(true);
  };

  const handleOpenNewProductDrawer = () => {
    setSelectedProduct(null);
    setDrawerMode('PRODUCT_EDIT');
    setDrawerOpen(true);
  };

  const handleOpenTransferDrawer = (sourceRack?: string) => {
    if (sourceRack) setDrawerInitialRack(sourceRack);
    setDrawerMode('WAREHOUSE_TRANSFER');
    setDrawerOpen(true);
  };

  const handleOpenDbDrawer = () => {
    setDrawerMode('DATABASE_SANDBOX');
    setDrawerOpen(true);
  };

  const draftPOCount = purchaseOrders.filter((po) => po.status === 'DRAFT').length;
  const lowStockCount = stats?.lowStockCount || 0;
  const quarantineCount = goodsReceipts.filter(
    (r) => r.status === 'PENDING_REVIEW' || r.status === 'QUARANTINED'
  ).length;

  // If not logged in, show Enterprise Login & Database Switcher
  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-[#f5f3ec] text-[#152936] flex font-sans antialiased selection:bg-[#e5a329] selection:text-[#122b39]">
      {/* 256px Collapsible Sidebar Navigation matching reference image */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        draftPOCount={draftPOCount}
        lowStockCount={lowStockCount}
        quarantineCount={quarantineCount}
      />

      {/* Main Application Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header matching reference image */}
        <TopHeader
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onRefreshAll={() => fetchAllData()}
          isRefreshing={isRefreshing}
          currentUser={currentUser}
          onLogout={() => setCurrentUser(null)}
          onOpenDbDrawer={handleOpenDbDrawer}
          currentDbName={currentDbName}
          currentDbType={currentDbType}
        />

        {/* Global Error Banner */}
        {systemError && (
          <div className="bg-red-500 text-white text-xs px-6 py-2.5 font-medium flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold uppercase tracking-wider bg-red-700 px-2 py-0.5 rounded text-[10px]">
                Server Degraded:
              </span>
              <span>{systemError}</span>
            </div>
            <button
              onClick={() => fetchAllData()}
              className="underline hover:text-red-100 cursor-pointer text-xs font-semibold"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Main Content View with Strict 12-Column Grid capability */}
        <main className="flex-1 p-6 md:p-8 max-w-[1720px] w-full mx-auto">
          {/* Active Tab Views */}
          {activeTab === 'warehouses' && (
            <WarehouseBayView
              products={products}
              locations={locations}
              onOpenProductDrawer={handleOpenProductDrawer}
              onOpenTransferDrawer={handleOpenTransferDrawer}
              onRefreshLocations={() => fetchAllData(true)}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              loading={isLoading}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'products' && (
            <ProductMasterView
              products={products}
              locations={locations}
              movements={movements}
              loading={isLoading}
              onCreateProduct={handleCreateProduct}
              onRefresh={() => fetchAllData(true)}
            />
          )}

          {activeTab === 'categories' && (
            <CategoryManagementView
              products={products}
              onRefreshProducts={() => fetchAllData(true)}
            />
          )}

          {activeTab === 'blind-receiving' && (
            <BlindReceivingView
              currentUser={currentUser}
              locations={locations}
            />
          )}

          {activeTab === 'stock-ops' && (
            <StockOperationsView
              products={products}
              locations={locations}
              movements={movements}
              pallets={pallets}
              onOperationSuccess={() => fetchAllData(true)}
            />
          )}

          {activeTab === 'physical-count' && (
            <PhysicalAdjustmentView
              products={products}
              locations={locations}
              onAdjustmentCommitted={() => fetchAllData(true)}
            />
          )}

          {activeTab === 'wes-picking' && (
            <WesWavePickingView
              waves={waves}
              onWaveUpdated={() => fetchAllData(true)}
            />
          )}

          {activeTab === 'demand-planning' && (
            <DemandPlanningView
              onRefreshAll={() => fetchAllData(true)}
            />
          )}

          {(activeTab === 'reports' || activeTab === 'schema-viewer') && (
            <ReportsAndIntelligenceView
              products={products}
              locations={locations}
              movements={movements}
            />
          )}
        </main>

        {/* Enterprise System Footer */}
        <footer className="border-t border-[#e5e1d5] bg-[#ede9df]/50 py-3.5 px-6 md:px-8 text-xs text-[#7a8b99]">
          <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-[#152836] font-mono">RedSea IMS v5.2</span>
              <span>•</span>
              <span className="text-[#e5a329] font-semibold">NEOM Special Economic Zone</span>
              <span>•</span>
              <span className="font-mono text-emerald-700 font-bold">10,000+ Row High-Density Engine</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono">
                Press <kbd className="bg-white border border-[#e2ddd0] px-1.5 py-0.5 rounded font-bold text-[#152836]">⌘K</kbd> for Command Palette • <kbd className="bg-white border border-[#e2ddd0] px-1.5 py-0.5 rounded font-bold text-[#152836]">Ctrl+B</kbd> Sidebar
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        products={products}
        locations={locations}
        purchaseOrders={purchaseOrders}
        onSelectProduct={(p) => {
          handleOpenProductDrawer(p);
        }}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
        }}
        onTriggerTransfer={() => {
          handleOpenTransferDrawer();
        }}
        onOpenDraftPO={() => {
          setActiveTab('demand-planning');
        }}
        onOpenNewProductDrawer={handleOpenNewProductDrawer}
        onOpenDbDrawer={handleOpenDbDrawer}
      />

      {/* Sliding Right-Hand Drawer (Progressive Disclosure spanning 4-6 grid columns) */}
      <RightSlidingDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode}
        product={selectedProduct}
        locations={locations}
        initialRack={drawerInitialRack}
        onRefreshData={() => fetchAllData(true)}
      />
    </div>
  );
}
