import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Barcode,
  Boxes,
  MapPin,
  Check,
  X,
  Sparkles,
  AlertCircle,
  Tag,
  DollarSign,
  TrendingDown,
  Layers,
  Package,
  Truck,
  ShieldAlert,
  ArrowRight,
  Filter,
  CheckCircle2,
  ChevronRight,
  Maximize2,
  Calendar,
  Warehouse,
  FileText,
  Sliders,
  Download,
  Upload,
  Printer,
  Table as TableIcon,
  LayoutGrid,
  Building2,
  RefreshCw,
} from 'lucide-react';
import {
  ProductDTO,
  CreateProductInput,
  LocationDTO,
  CategoryDTO,
  StockMovementDTO,
  api,
} from '../services/api';
import { ProductGridTable, ProductSortField, SortDirection } from './product/ProductGridTable';
import { ProductCardGrid } from './product/ProductCardGrid';
import { ProductMatrixView } from './product/ProductMatrixView';
import { ProductDetailDrawer } from './product/ProductDetailDrawer';
import { ProductBarcodeModal } from './product/ProductBarcodeModal';
import { ProductImportExportModal } from './product/ProductImportExportModal';
import { ProductBatchActionBar } from './product/ProductBatchActionBar';

interface ProductMasterViewProps {
  products: ProductDTO[];
  locations?: LocationDTO[];
  movements?: StockMovementDTO[];
  loading: boolean;
  onCreateProduct: (input: CreateProductInput) => Promise<void>;
  onRefresh?: () => void;
}

export const ProductMasterView: React.FC<ProductMasterViewProps> = ({
  products,
  locations = [],
  movements = [],
  loading,
  onCreateProduct,
  onRefresh,
}) => {
  // View mode
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS' | 'MATRIX'>('TABLE');

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<
    'ALL' | 'CRITICAL' | 'LOW' | 'ZERO' | 'HEALTHY'
  >('ALL');
  const [storageFilter, setStorageFilter] = useState<string>('ALL');

  // Sorting
  const [sortField, setSortField] = useState<ProductSortField>('sku');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Selection
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Categories cache
  const [categories, setCategories] = useState<CategoryDTO[]>([]);

  // Modals & Drawers
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeEditingProduct, setActiveEditingProduct] = useState<ProductDTO | null>(null);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeModalProducts, setBarcodeModalProducts] = useState<ProductDTO[]>([]);
  const [importExportModalOpen, setImportExportModalOpen] = useState(false);

  // Load categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await api.getCategories();
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategories();
  }, []);

  // Filtered & Sorted Products calculation
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      // Search term
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSku = p.sku.toLowerCase().includes(query);
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesBarcode = p.barcode.toLowerCase().includes(query);
        const matchesCategory = p.category && p.category.toLowerCase().includes(query);
        const matchesBrand = p.brand && p.brand.toLowerCase().includes(query);
        const matchesHs = p.hsCode && p.hsCode.toLowerCase().includes(query);
        const matchesVendor = p.defaultVendor && p.defaultVendor.toLowerCase().includes(query);

        if (
          !matchesSku &&
          !matchesName &&
          !matchesBarcode &&
          !matchesCategory &&
          !matchesBrand &&
          !matchesHs &&
          !matchesVendor
        ) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      // Storage condition filter
      if (storageFilter !== 'ALL' && p.storageCondition !== storageFilter) {
        return false;
      }

      // Stock status filter
      if (stockStatusFilter === 'ZERO' && p.totalStock > 0) return false;
      if (stockStatusFilter === 'CRITICAL' && (p.totalStock === 0 || p.totalStock >= p.reorderPoint * 0.5))
        return false;
      if (stockStatusFilter === 'LOW' && (p.totalStock > p.reorderPoint || p.totalStock === 0))
        return false;
      if (stockStatusFilter === 'HEALTHY' && p.totalStock <= p.reorderPoint) return false;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortField as keyof ProductDTO];
      let valB: any = b[sortField as keyof ProductDTO];

      if (sortField === 'margin') {
        valA = a.retailPrice > 0 ? ((a.retailPrice - a.unitCost) / a.retailPrice) * 100 : 0;
        valB = b.retailPrice > 0 ? ((b.retailPrice - b.unitCost) / b.retailPrice) * 100 : 0;
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(String(valB))
          : String(valB).localeCompare(valA);
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [products, searchQuery, selectedCategory, storageFilter, stockStatusFilter, sortField, sortDirection]);

  // Executive KPI summary calculations
  const kpis = useMemo(() => {
    let totalValuation = 0;
    let totalCostValuation = 0;
    let lowStockCount = 0;
    let zeroStockCount = 0;

    products.forEach((p) => {
      const stock = p.totalStock || 0;
      totalValuation += (p.retailPrice || 0) * stock;
      totalCostValuation += (p.unitCost || 0) * stock;
      if (stock === 0) {
        zeroStockCount++;
      } else if (stock <= p.reorderPoint) {
        lowStockCount++;
      }
    });

    const averageMargin =
      totalValuation > 0
        ? ((totalValuation - totalCostValuation) / totalValuation) * 100
        : 0;

    return {
      totalProducts: products.length,
      totalValuation,
      totalCostValuation,
      averageMargin,
      lowStockCount,
      zeroStockCount,
    };
  }, [products]);

  // Unique categories in catalog
  const catalogCategories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return cats.sort();
  }, [products]);

  // Unique storage conditions in catalog
  const catalogStorageConditions = useMemo(() => {
    const storages = Array.from(
      new Set(products.map((p) => p.storageCondition).filter(Boolean))
    );
    return storages.sort();
  }, [products]);

  // Handlers
  const handleSortChange = (field: ProductSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectProduct = (product: ProductDTO) => {
    setActiveEditingProduct(product);
    setDrawerOpen(true);
  };

  const handleOpenCreateDrawer = () => {
    setActiveEditingProduct(null);
    setDrawerOpen(true);
  };

  const handleSaveProduct = async (productData: Partial<ProductDTO>) => {
    if (activeEditingProduct) {
      // Update existing
      await api.updateProduct(activeEditingProduct.id, productData);
    } else {
      // Create new
      await onCreateProduct(productData as CreateProductInput);
    }
    if (onRefresh) onRefresh();
  };

  const handleDeleteProduct = async (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    if (
      confirm(
        `Are you sure you want to permanently delete product "${product.name}" (${product.sku})? This will purge its stock levels.`
      )
    ) {
      try {
        await api.deleteProduct(id);
        if (onRefresh) onRefresh();
      } catch (err: any) {
        alert(err.message || 'Failed to delete product.');
      }
    }
  };

  const handleOpenBarcodeModal = (prods: ProductDTO[]) => {
    setBarcodeModalProducts(prods);
    setBarcodeModalOpen(true);
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setStockStatusFilter('ALL');
    setStorageFilter('ALL');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'ALL' ||
    stockStatusFilter !== 'ALL' ||
    storageFilter !== 'ALL';

  return (
    <div className="space-y-6">
      {/* 1. Header & Primary Operations Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#152836]">Product Master & Catalog</h1>
            <span className="px-2 py-0.5 rounded-md bg-[#ede9df] text-[#122b39] font-mono text-xs font-bold">
              {products.length} SKUs
            </span>
          </div>
          <p className="text-xs text-[#7a8b99] mt-0.5">
            Centralized item master catalog, unit conversions, customs tariffs, and warehouse positioning
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setImportExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-bold text-[#152836] shadow-2xs transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#122b39]" />
            <span>Import / Export CSV</span>
          </button>

          <button
            onClick={() => handleOpenBarcodeModal(selectedProductIds.length > 0 ? products.filter(p => selectedProductIds.includes(p.id)) : products.slice(0, 10))}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-bold text-[#152836] shadow-2xs transition cursor-pointer"
          >
            <Barcode className="w-3.5 h-3.5 text-[#e5a329]" />
            <span>Print Labels</span>
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Refresh Catalog Data"
              className="p-2 bg-white hover:bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-[#526677] transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}

          <button
            onClick={handleOpenCreateDrawer}
            className="flex items-center gap-2 px-4 py-2 bg-[#122b39] hover:bg-[#1a3d52] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#e5a329]" />
            <span>Register New SKU</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Inventory KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-[#ded8cb] shadow-xs">
          <div className="text-[10px] text-[#7a8b99] font-bold uppercase tracking-wider">
            Total Catalog SKUs
          </div>
          <div className="font-mono text-xl font-bold text-[#152836] mt-1">
            {kpis.totalProducts}
          </div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Active items in ERP</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#ded8cb] shadow-xs">
          <div className="text-[10px] text-[#7a8b99] font-bold uppercase tracking-wider">
            Retail Asset Valuation
          </div>
          <div className="font-mono text-xl font-bold text-[#152836] mt-1">
            ${(kpis.totalValuation / 1000).toFixed(1)}k
          </div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Based on selling price</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#ded8cb] shadow-xs">
          <div className="text-[10px] text-[#7a8b99] font-bold uppercase tracking-wider">
            COGS Inventory Cost
          </div>
          <div className="font-mono text-xl font-bold text-[#526677] mt-1">
            ${(kpis.totalCostValuation / 1000).toFixed(1)}k
          </div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Baseline purchase cost</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#ded8cb] shadow-xs">
          <div className="text-[10px] text-[#7a8b99] font-bold uppercase tracking-wider">
            Average Catalog Margin
          </div>
          <div className="font-mono text-xl font-bold text-emerald-700 mt-1">
            {kpis.averageMargin.toFixed(1)}%
          </div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Weighted gross margin</div>
        </div>

        <div
          onClick={() => setStockStatusFilter(stockStatusFilter === 'LOW' ? 'ALL' : 'LOW')}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition ${
            stockStatusFilter === 'LOW'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-300/30'
              : 'bg-white border-[#ded8cb] hover:bg-[#faf9f6]'
          }`}
        >
          <div className="text-[10px] text-amber-800 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Reorder Attention</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="font-mono text-xl font-bold text-amber-900 mt-1">
            {kpis.lowStockCount}
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5">Stock below safety ROP</div>
        </div>

        <div
          onClick={() => setStockStatusFilter(stockStatusFilter === 'ZERO' ? 'ALL' : 'ZERO')}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition ${
            stockStatusFilter === 'ZERO'
              ? 'bg-red-50 border-red-300 ring-2 ring-red-300/30'
              : 'bg-white border-[#ded8cb] hover:bg-[#faf9f6]'
          }`}
        >
          <div className="text-[10px] text-red-800 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Stock-Out Depleted</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="font-mono text-xl font-bold text-red-900 mt-1">
            {kpis.zeroStockCount}
          </div>
          <div className="text-[11px] text-red-700 mt-0.5">0 units available</div>
        </div>
      </div>

      {/* 3. Filter Bar & View Switcher */}
      <div className="bg-white p-4 rounded-2xl border border-[#ded8cb] shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a8b99]" />
            <input
              type="text"
              placeholder="Search by SKU, GTIN, product name, brand, or HS tariff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-medium text-[#152836] focus:outline-none focus:border-[#122b39]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a8b99] hover:text-[#152836]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Storage Filter & View Modes */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Storage condition dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-[#526677]">
              <span className="font-bold">Storage:</span>
              <select
                value={storageFilter}
                onChange={(e) => setStorageFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-medium text-[#152836]"
              >
                <option value="ALL">All Environments</option>
                {catalogStorageConditions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock status filter buttons */}
            <div className="flex items-center bg-[#faf9f6] p-1 rounded-xl border border-[#ded8cb] text-xs">
              <button
                onClick={() => setStockStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  stockStatusFilter === 'ALL'
                    ? 'bg-[#122b39] text-white shadow-2xs'
                    : 'text-[#7a8b99] hover:text-[#152836]'
                }`}
              >
                All Stock
              </button>
              <button
                onClick={() => setStockStatusFilter('HEALTHY')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  stockStatusFilter === 'HEALTHY'
                    ? 'bg-[#122b39] text-white shadow-2xs'
                    : 'text-[#7a8b99] hover:text-[#152836]'
                }`}
              >
                Healthy
              </button>
              <button
                onClick={() => setStockStatusFilter('LOW')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  stockStatusFilter === 'LOW'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-[#7a8b99] hover:text-[#152836]'
                }`}
              >
                Low (≤ ROP)
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-[#faf9f6] p-1 rounded-xl border border-[#ded8cb]">
              <button
                onClick={() => setViewMode('TABLE')}
                title="Enterprise Data Grid"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-[#122b39] text-white shadow-2xs'
                    : 'text-[#7a8b99] hover:text-[#152836]'
                }`}
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('CARDS')}
                title="Visual Catalog Cards"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'CARDS'
                    ? 'bg-[#122b39] text-white shadow-2xs'
                    : 'text-[#7a8b99] hover:text-[#152836]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('MATRIX')}
                title="Cross-Warehouse Stock Matrix"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'MATRIX'
                    ? 'bg-[#122b39] text-white shadow-2xs'
                    : 'text-[#7a8b99] hover:text-[#152836]'
                }`}
              >
                <Building2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-[#ded8cb]/60 text-xs">
          <span className="text-[11px] font-bold text-[#7a8b99] uppercase mr-1 whitespace-nowrap">
            Categories:
          </span>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-[#122b39] text-white shadow-2xs'
                : 'bg-[#faf9f6] text-[#526677] hover:bg-[#ede9df]'
            }`}
          >
            All ({products.length})
          </button>
          {catalogCategories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-semibold transition whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[#122b39] text-white shadow-2xs font-bold'
                    : 'bg-[#faf9f6] text-[#526677] hover:bg-[#ede9df]'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              onClick={handleClearAllFilters}
              className="ml-auto text-xs font-bold text-red-700 hover:text-red-900 underline whitespace-nowrap cursor-pointer px-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Main Views: Table vs Cards vs Matrix */}
      {viewMode === 'TABLE' && (
        <ProductGridTable
          products={filteredProducts}
          selectedProductIds={selectedProductIds}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleSelect={handleToggleSelect}
          onSelectProduct={handleSelectProduct}
          onOpenBarcodeModal={handleOpenBarcodeModal}
          onDeleteProduct={handleDeleteProduct}
        />
      )}

      {viewMode === 'CARDS' && (
        <ProductCardGrid
          products={filteredProducts}
          selectedProductIds={selectedProductIds}
          onToggleSelect={handleToggleSelect}
          onSelectProduct={handleSelectProduct}
          onOpenBarcodeModal={handleOpenBarcodeModal}
          onDeleteProduct={handleDeleteProduct}
        />
      )}

      {viewMode === 'MATRIX' && (
        <ProductMatrixView
          products={filteredProducts}
          locations={locations}
          onSelectProduct={handleSelectProduct}
        />
      )}

      {/* 5. Floating Bulk Actions Toolbar */}
      <ProductBatchActionBar
        selectedProductIds={selectedProductIds}
        products={products}
        categories={categories}
        onClearSelection={() => setSelectedProductIds([])}
        onRefresh={() => {
          if (onRefresh) onRefresh();
        }}
        onOpenBarcodeModal={handleOpenBarcodeModal}
      />

      {/* 6. Comprehensive Product Detail / Create Drawer */}
      <ProductDetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        product={activeEditingProduct}
        categories={categories}
        locations={locations}
        movements={movements}
        onSave={handleSaveProduct}
        onRefresh={() => {
          if (onRefresh) onRefresh();
        }}
        onOpenBarcodeModal={handleOpenBarcodeModal}
      />

      {/* 7. Barcode & Thermal Label Modal */}
      <ProductBarcodeModal
        isOpen={barcodeModalOpen}
        onClose={() => setBarcodeModalOpen(false)}
        products={barcodeModalProducts}
      />

      {/* 8. CSV Import & Export Modal */}
      <ProductImportExportModal
        isOpen={importExportModalOpen}
        onClose={() => setImportExportModalOpen(false)}
        products={products}
        categories={categories}
        onRefresh={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};
