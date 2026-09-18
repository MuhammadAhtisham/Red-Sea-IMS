// Enterprise Tier-1 ERP Product Master View with High-Density Grid & Sliding Right-Hand Drawer
import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import {
  ProductDTO,
  CreateProductInput,
  UoMDTO,
  UoMCategoryDTO,
  ProductPackagingDTO,
  api,
} from '../services/api';

interface ProductMasterViewProps {
  products: ProductDTO[];
  loading: boolean;
  onCreateProduct: (input: CreateProductInput) => Promise<void>;
  onRefresh?: () => void;
}

export const ProductMasterView: React.FC<ProductMasterViewProps> = ({
  products,
  loading,
  onCreateProduct,
  onRefresh,
}) => {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockHealthFilter, setStockHealthFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'HEALTHY'>('ALL');
  const [packagingLevelFilter, setPackagingLevelFilter] = useState<string>('ALL');

  // Sliding Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<
    'GENERAL' | 'PACKAGING' | 'PROCUREMENT' | 'VARIANTS' | 'STOCK'
  >('GENERAL');

  // Master UoM state
  const [uoms, setUoms] = useState<UoMDTO[]>([]);
  const [uomCategories, setUomCategories] = useState<UoMCategoryDTO[]>([]);

  // Selected or Form Product State
  const [activeProduct, setActiveProduct] = useState<Partial<ProductDTO>>({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    category: 'Smart Infrastructure',
    unitCost: 100,
    retailPrice: 250,
    trackInventory: true,
    reorderPoint: 30,
    leadTimeDays: 14,
    unitOfMeasure: 'EA',
    baseUoMId: 'uom-ea',
    purchaseUoMId: 'uom-cs24',
    salesUoMId: 'uom-ea',
    hsCode: '8517.62.0000',
    internalReference: 'NEOM-REF-01',
    defaultVendor: 'Red Sea Microelectronics Ltd',
    vendorLeadTime: 14,
    moq: 24,
    packagings: [
      {
        id: 'pkg-1',
        productId: '',
        uomId: 'uom-ea',
        uomCode: 'EA',
        packageLevel: 'EACH',
        barcode: '',
        qty: 1,
        maxWeight: 0.5,
        length: 10,
        width: 10,
        height: 5,
      },
      {
        id: 'pkg-2',
        productId: '',
        uomId: 'uom-inp6',
        uomCode: 'INP6',
        packageLevel: 'INNER_PACK',
        barcode: '',
        qty: 6,
        maxWeight: 3.0,
        length: 25,
        width: 15,
        height: 10,
      },
      {
        id: 'pkg-3',
        productId: '',
        uomId: 'uom-cs24',
        uomCode: 'CS24',
        packageLevel: 'CASE',
        barcode: '',
        qty: 24,
        maxWeight: 12.0,
        length: 45,
        width: 35,
        height: 25,
      },
      {
        id: 'pkg-4',
        productId: '',
        uomId: 'uom-pl144',
        uomCode: 'PL144',
        packageLevel: 'PALLET',
        barcode: '',
        qty: 144,
        maxWeight: 90.0,
        length: 120,
        width: 100,
        height: 140,
      },
    ],
    variants: [],
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load UoM & Packaging metadata
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [uData, cData] = await Promise.all([
          api.getUoms(),
          api.getUomCategories(),
        ]);
        setUoms(uData);
        setUomCategories(cData);
      } catch (e) {
        console.error('Failed to load UoMs', e);
      }
    };
    fetchMeta();
  }, []);

  // Keyboard Navigation Shortcuts (N for New Product, / for Search, Esc for Close Drawer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        if (e.key === 'Escape') {
          setDrawerOpen(false);
        }
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openNewProductDrawer();
      } else if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setDrawerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openNewProductDrawer = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setActiveProduct({
      sku: `NEOM-SKU-${randomSuffix}`,
      barcode: `628100${randomSuffix}01`,
      name: '',
      description: '',
      category: 'Smart Infrastructure',
      unitCost: 85,
      retailPrice: 195,
      trackInventory: true,
      reorderPoint: 25,
      leadTimeDays: 14,
      unitOfMeasure: 'EA',
      baseUoMId: 'uom-ea',
      purchaseUoMId: 'uom-cs24',
      salesUoMId: 'uom-ea',
      hsCode: '8517.62.0000',
      internalReference: `REF-NEOM-${randomSuffix}`,
      defaultVendor: 'Red Sea Microelectronics Ltd',
      vendorLeadTime: 14,
      moq: 24,
      packagings: [
        {
          id: `pkg-${Date.now()}-ea`,
          productId: '',
          uomId: 'uom-ea',
          uomCode: 'EA',
          packageLevel: 'EACH',
          barcode: `628100${randomSuffix}01`,
          qty: 1,
          maxWeight: 0.6,
          length: 12,
          width: 10,
          height: 6,
        },
        {
          id: `pkg-${Date.now()}-inp`,
          productId: '',
          uomId: 'uom-inp6',
          uomCode: 'INP6',
          packageLevel: 'INNER_PACK',
          barcode: `628100${randomSuffix}06`,
          qty: 6,
          maxWeight: 3.2,
          length: 25,
          width: 18,
          height: 12,
        },
        {
          id: `pkg-${Date.now()}-cs`,
          productId: '',
          uomId: 'uom-cs24',
          uomCode: 'CS24',
          packageLevel: 'CASE',
          barcode: `10628100${randomSuffix}24`,
          qty: 24,
          maxWeight: 13.5,
          length: 48,
          width: 38,
          height: 28,
        },
        {
          id: `pkg-${Date.now()}-pl`,
          productId: '',
          uomId: 'uom-pl144',
          uomCode: 'PL144',
          packageLevel: 'PALLET',
          barcode: `00628100${randomSuffix}144`,
          qty: 144,
          maxWeight: 92.0,
          length: 120,
          width: 100,
          height: 140,
        },
      ],
      variants: [],
    });
    setIsEditing(false);
    setActiveDrawerTab('GENERAL');
    setDrawerOpen(true);
    setSaveSuccess(null);
  };

  const openInspectDrawer = (product: ProductDTO) => {
    setActiveProduct({
      ...product,
      packagings: product.packagings || [],
      variants: product.variants || [],
    });
    setIsEditing(true);
    setActiveDrawerTab('GENERAL');
    setDrawerOpen(true);
    setSaveSuccess(null);
  };

  const handleSaveProduct = async () => {
    if (!activeProduct.sku || !activeProduct.name || !activeProduct.barcode) {
      alert('SKU, Barcode, and Product Name are mandatory.');
      return;
    }

    setSaving(true);
    setSaveSuccess(null);

    try {
      if (isEditing && activeProduct.id) {
        await api.patchProduct(activeProduct.id, activeProduct);
        setSaveSuccess('Product successfully updated in NEOM Master Catalog.');
      } else {
        await onCreateProduct(activeProduct as CreateProductInput);
        setSaveSuccess('New SKU registered in RedSea IMS with multi-tier packaging.');
      }

      if (onRefresh) onRefresh();
      setTimeout(() => {
        setSaveSuccess(null);
      }, 2500);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const updatePackagingField = (
    index: number,
    field: keyof ProductPackagingDTO,
    value: any
  ) => {
    if (!activeProduct.packagings) return;
    const updated = [...activeProduct.packagings];
    updated[index] = { ...updated[index], [field]: value };
    setActiveProduct({ ...activeProduct, packagings: updated });
  };

  // Categories list
  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  // Filtering products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm) ||
      (p.hsCode && p.hsCode.includes(searchTerm)) ||
      (p.internalReference && p.internalReference.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'ALL' || p.category === selectedCategory;

    let matchesHealth = true;
    if (stockHealthFilter === 'CRITICAL') {
      matchesHealth = p.totalStock <= p.reorderPoint * 0.5;
    } else if (stockHealthFilter === 'WARNING') {
      matchesHealth = p.totalStock > p.reorderPoint * 0.5 && p.totalStock <= p.reorderPoint;
    } else if (stockHealthFilter === 'HEALTHY') {
      matchesHealth = p.totalStock > p.reorderPoint;
    }

    let matchesPackaging = true;
    if (packagingLevelFilter !== 'ALL') {
      matchesPackaging = (p.packagings || []).some(
        (pkg) => pkg.packageLevel === packagingLevelFilter
      );
    }

    return matchesSearch && matchesCategory && matchesHealth && matchesPackaging;
  });

  // KPI Calculations
  const totalValuation = products.reduce((acc, p) => acc + p.totalStock * p.unitCost, 0);
  const lowStockCount = products.filter((p) => p.totalStock <= p.reorderPoint).length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-[#e5e1d5] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-[#122b39] tracking-tight">Product Master & Packaging Hierarchy</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-[#ede9df] text-[#8c5e15] border border-[#d8d1c1]">
              Odoo 19 / SAP Tier-1 Grid
            </span>
          </div>
          <p className="text-xs text-[#6a7d8d] mt-1">
            Multi-tier packaging schema with GTIN-14 barcodes, customs HS tariff codes, and autonomous inventory tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Keyboard Info */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-[#526677] bg-[#f8f5ee] px-3 py-1.5 rounded-xl border border-[#e5e1d5]">
            <span className="font-mono text-[#122b39] font-bold bg-white px-1.5 py-0.5 rounded border border-[#e5e1d5] text-[10px]">
              N
            </span>
            <span>New SKU</span>
            <span className="text-[#cfc9b9]">•</span>
            <span className="font-mono text-[#122b39] font-bold bg-white px-1.5 py-0.5 rounded border border-[#e5e1d5] text-[10px]">
              /
            </span>
            <span>Search</span>
            <span className="text-[#cfc9b9]">•</span>
            <span className="font-mono text-[#122b39] font-bold bg-white px-1.5 py-0.5 rounded border border-[#e5e1d5] text-[10px]">
              Esc
            </span>
            <span>Close</span>
          </div>

          <button
            onClick={openNewProductDrawer}
            className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#e5a329]" />
            <span>Register Product (N)</span>
          </button>
        </div>
      </div>

      {/* KPI Micro-Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e5e1d5] shadow-xs">
          <div className="text-[#6a7d8d] text-xs flex items-center gap-1.5 font-medium">
            <Boxes className="w-4 h-4 text-[#e5a329]" />
            Catalog Master SKUs
          </div>
          <div className="text-2xl font-mono font-bold text-[#122b39] mt-1.5">{products.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#e5e1d5] shadow-xs">
          <div className="text-[#6a7d8d] text-xs flex items-center gap-1.5 font-medium">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Active Asset Valuation
          </div>
          <div className="text-2xl font-mono font-bold text-[#122b39] mt-1.5">
            ${totalValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#e5e1d5] shadow-xs">
          <div className="text-[#6a7d8d] text-xs flex items-center gap-1.5 font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Stock Below ROP
          </div>
          <div className="text-2xl font-mono font-bold text-amber-600 mt-1.5">{lowStockCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#e5e1d5] shadow-xs">
          <div className="text-[#6a7d8d] text-xs flex items-center gap-1.5 font-medium">
            <Layers className="w-4 h-4 text-[#122b39]" />
            Multi-Tier Packaging Tiers
          </div>
          <div className="text-2xl font-mono font-bold text-[#122b39] mt-1.5">4 Levels</div>
        </div>
      </div>

      {/* Filters & Enterprise Density Table Controls */}
      <div className="bg-white rounded-2xl border border-[#e5e1d5] p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7a8b99] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search SKU, Product Name, GTIN Barcode, HS Customs Code, or Vendor (Press '/' to focus)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs text-[#122b39] placeholder-[#7a8b99] focus:outline-none focus:border-[#122b39] focus:bg-white font-mono transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7a8b99] hover:text-[#122b39] text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 lg:pb-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs text-[#152836] font-medium focus:outline-none focus:border-[#122b39]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  Category: {c}
                </option>
              ))}
            </select>

            <select
              value={stockHealthFilter}
              onChange={(e) => setStockHealthFilter(e.target.value as any)}
              className="px-3.5 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs text-[#152836] font-medium focus:outline-none focus:border-[#122b39]"
            >
              <option value="ALL">All Stock Health</option>
              <option value="HEALTHY">Healthy Buffer (&gt; ROP)</option>
              <option value="WARNING">Warning (At ROP)</option>
              <option value="CRITICAL">Critical Low (&lt; 50% ROP)</option>
            </select>

            <select
              value={packagingLevelFilter}
              onChange={(e) => setPackagingLevelFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs text-[#152836] font-medium focus:outline-none focus:border-[#122b39]"
            >
              <option value="ALL">All Packaging</option>
              <option value="EACH">Each / Single</option>
              <option value="INNER_PACK">Inner Pack (6x)</option>
              <option value="CASE">Master Case (24x)</option>
              <option value="PALLET">Logistics Pallet (144x)</option>
            </select>
          </div>
        </div>

        {/* HIGH-DENSITY ENTERPRISE DATA GRID */}
        <div className="overflow-x-auto rounded-xl border border-[#e5e1d5]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f8f5ee] text-[#526677] font-bold uppercase tracking-wider border-b border-[#e5e1d5] text-[11px]">
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">SKU / HS Code</th>
                <th className="py-3 px-3.5">Barcode (GTIN)</th>
                <th className="py-3 px-3.5">Product Name & Category</th>
                <th className="py-3 px-3.5">Packaging Tiers</th>
                <th className="py-3 px-3.5 text-center">Base UoM</th>
                <th className="py-3 px-3.5 text-right">Unit Cost</th>
                <th className="py-3 px-3.5 text-right">Retail</th>
                <th className="py-3 px-3.5 text-right">NEOM Stock</th>
                <th className="py-3 px-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ece2] font-mono">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#7a8b99]">
                    Loading enterprise catalog from NEOM Master Database...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#7a8b99]">
                    No products matched search criteria. Press 'N' to register a new SKU.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isCritical = p.totalStock <= p.reorderPoint * 0.5;
                  const isWarning = p.totalStock <= p.reorderPoint && !isCritical;
                  const packagings = p.packagings || [];

                  return (
                    <tr
                      key={p.id}
                      onClick={() => openInspectDrawer(p)}
                      className="hover:bg-[#faf9f6] transition-colors cursor-pointer group"
                    >
                      {/* Discrete Dot Status Indicator */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span
                            className={`text-[11px] font-semibold ${
                              isCritical ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-emerald-700'
                            }`}
                          >
                            {isCritical ? 'Critical' : isWarning ? 'Low' : 'Normal'}
                          </span>
                        </div>
                      </td>

                      {/* SKU & HS Code */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-[#122b39] group-hover:text-[#e5a329] transition-colors">
                          {p.sku}
                        </div>
                        {p.hsCode && (
                          <div className="text-[10px] text-[#7a8b99]">HS: {p.hsCode}</div>
                        )}
                      </td>

                      {/* Barcode */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-[#526677]">
                        <span className="bg-[#f6f4ed] px-2 py-0.5 rounded-md border border-[#e5e1d5] text-[11px]">
                          {p.barcode}
                        </span>
                      </td>

                      {/* Name & Category */}
                      <td className="py-2.5 px-3.5 font-sans">
                        <div className="font-semibold text-[#152836] line-clamp-1">{p.name}</div>
                        <div className="text-[11px] text-[#6a7d8d] flex items-center gap-2 mt-0.5 font-mono">
                          <span className="text-[#8c5e15] font-semibold">{p.category}</span>
                          {p.defaultVendor && (
                            <>
                              <span className="text-[#cfc9b9]">•</span>
                              <span className="text-[#7a8b99]">{p.defaultVendor}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Packaging Tiers Indicators */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-sans">
                        <div className="flex items-center gap-1.5">
                          <span
                            title="Each Level (1x)"
                            className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-[#ede9df] text-[#122b39] border border-[#dcd7cb]"
                          >
                            EA
                          </span>
                          {packagings.some((pkg) => pkg.packageLevel === 'INNER_PACK') && (
                            <span
                              title="Inner Pack (6x)"
                              className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-sky-100 text-sky-800 border border-sky-200"
                            >
                              INP-6
                            </span>
                          )}
                          {packagings.some((pkg) => pkg.packageLevel === 'CASE') && (
                            <span
                              title="Master Case (24x)"
                              className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-purple-100 text-purple-800 border border-purple-200"
                            >
                              CS-24
                            </span>
                          )}
                          {packagings.some((pkg) => pkg.packageLevel === 'PALLET') && (
                            <span
                              title="Logistics Pallet (144x)"
                              className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-100 text-amber-800 border border-amber-200"
                            >
                              PL-144
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Base UoM */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap text-[#526677] font-semibold">
                        {p.unitOfMeasure || 'EA'}
                      </td>

                      {/* Unit Cost */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap text-[#526677] tabular-nums">
                        ${p.unitCost.toFixed(2)}
                      </td>

                      {/* Retail Price */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-bold text-[#122b39] tabular-nums">
                        ${p.retailPrice.toFixed(2)}
                      </td>

                      {/* Total Stock */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap tabular-nums">
                        <div
                          className={`font-bold ${
                            isCritical ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-[#122b39]'
                          }`}
                        >
                          {p.totalStock} {p.unitOfMeasure || 'units'}
                        </div>
                        <div className="text-[10px] text-[#7a8b99]">ROP: {p.reorderPoint}</div>
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openInspectDrawer(p);
                          }}
                          className="px-3 py-1 rounded-lg bg-[#f6f4ed] hover:bg-[#ede9df] text-[#122b39] text-xs font-semibold border border-[#e5e1d5] transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLIDING RIGHT-HAND DRAWER (SAP / ODOO 19 STYLE) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white border-l border-[#e5e1d5] shadow-2xl flex flex-col justify-between">
              {/* Drawer Header */}
              <div className="px-6 py-4 border-b border-[#f0ece2] bg-[#faf9f6] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#8c5e15] uppercase">
                      {isEditing ? `Edit Master: ${activeProduct.sku}` : 'Register New Enterprise SKU'}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ede9df] text-[#122b39] border border-[#dcd7cb]">
                      Tier-1 ERP
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#122b39] tracking-tight mt-0.5">
                    {activeProduct.name || 'Untitled Inventory Item'}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveProduct}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-[#e5a329]" />
                    <span>{saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Register SKU'}</span>
                  </button>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 rounded-xl bg-[#f6f4ed] hover:bg-[#ede9df] text-[#6a7d8d] hover:text-[#122b39] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Tabs Navigation */}
              <div className="px-6 border-b border-[#f0ece2] bg-[#f8f5ee] flex items-center gap-4 text-xs font-semibold overflow-x-auto">
                <button
                  onClick={() => setActiveDrawerTab('GENERAL')}
                  className={`py-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeDrawerTab === 'GENERAL'
                      ? 'border-[#122b39] text-[#122b39] font-bold'
                      : 'border-transparent text-[#6a7d8d] hover:text-[#122b39]'
                  }`}
                >
                  General & Customs
                </button>
                <button
                  onClick={() => setActiveDrawerTab('PACKAGING')}
                  className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeDrawerTab === 'PACKAGING'
                      ? 'border-[#122b39] text-[#122b39] font-bold'
                      : 'border-transparent text-[#6a7d8d] hover:text-[#122b39]'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Multi-Tier Packaging ({activeProduct.packagings?.length || 0})
                </button>
                <button
                  onClick={() => setActiveDrawerTab('PROCUREMENT')}
                  className={`py-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeDrawerTab === 'PROCUREMENT'
                      ? 'border-[#122b39] text-[#122b39] font-bold'
                      : 'border-transparent text-[#6a7d8d] hover:text-[#122b39]'
                  }`}
                >
                  Procurement & Sourcing
                </button>
                <button
                  onClick={() => setActiveDrawerTab('STOCK')}
                  className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    activeDrawerTab === 'STOCK'
                      ? 'border-[#122b39] text-[#122b39] font-bold'
                      : 'border-transparent text-[#6a7d8d] hover:text-[#122b39]'
                  }`}
                >
                  <Warehouse className="w-3.5 h-3.5" />
                  Facility Stock ({activeProduct.totalStock || 0})
                </button>
              </div>

              {/* Drawer Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                {saveSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold">{saveSuccess}</span>
                  </div>
                )}

                {/* TAB 1: GENERAL & CUSTOMS */}
                {activeDrawerTab === 'GENERAL' && (
                  <div className="space-y-4.5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                          Product Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={activeProduct.name || ''}
                          onChange={(e) => setActiveProduct({ ...activeProduct, name: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-xs text-[#122b39] focus:outline-none focus:border-[#122b39] focus:bg-white"
                          placeholder="e.g. Edge AI Industrial Telemetry Gateway"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                          Master SKU Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={activeProduct.sku || ''}
                          onChange={(e) => setActiveProduct({ ...activeProduct, sku: e.target.value.toUpperCase() })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-xs text-[#122b39] font-mono font-bold focus:outline-none focus:border-[#122b39] focus:bg-white"
                          placeholder="NEOM-IOT-GW500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                          Base Barcode (EAN/GTIN-13) *
                        </label>
                        <input
                          type="text"
                          required
                          value={activeProduct.barcode || ''}
                          onChange={(e) => setActiveProduct({ ...activeProduct, barcode: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-xs text-[#122b39] font-mono focus:outline-none focus:border-[#122b39] focus:bg-white"
                          placeholder="6281002938101"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                          Category
                        </label>
                        <input
                          type="text"
                          value={activeProduct.category || ''}
                          onChange={(e) => setActiveProduct({ ...activeProduct, category: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-xs text-[#122b39] focus:outline-none focus:border-[#122b39] focus:bg-white"
                          placeholder="Smart Infrastructure"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                        Technical Product Description
                      </label>
                      <textarea
                        rows={3}
                        value={activeProduct.description || ''}
                        onChange={(e) => setActiveProduct({ ...activeProduct, description: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-xs text-[#122b39] focus:outline-none focus:border-[#122b39] focus:bg-white"
                        placeholder="Detailed specifications, temperature ratings, ingress protection..."
                      />
                    </div>

                    {/* Customs Tariff & Red Sea Authority Reference */}
                    <div className="p-4.5 rounded-2xl bg-[#f8f5ee] border border-[#e5e1d5] space-y-3">
                      <div className="text-xs font-bold text-[#122b39] flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#e5a329]" />
                        Saudi Customs & Harmonized System (HS) Code
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-[#6a7d8d] font-semibold mb-1">
                            HS Tariff Code (Zakat, Tax & Customs)
                          </label>
                          <input
                            type="text"
                            value={activeProduct.hsCode || ''}
                            onChange={(e) => setActiveProduct({ ...activeProduct, hsCode: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#e5e1d5] text-xs text-[#122b39] font-mono"
                            placeholder="8517.62.0000"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-[#6a7d8d] font-semibold mb-1">
                            Internal Reference (NEOM Asset ID)
                          </label>
                          <input
                            type="text"
                            value={activeProduct.internalReference || ''}
                            onChange={(e) =>
                              setActiveProduct({ ...activeProduct, internalReference: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#e5e1d5] text-xs text-[#122b39] font-mono"
                            placeholder="NEOM-GW-REF-26A"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: MULTI-TIER UOM & PACKAGING HIERARCHY */}
                {activeDrawerTab === 'PACKAGING' && (
                  <div className="space-y-5">
                    {/* Unit of Measure Assignment */}
                    <div className="p-4.5 rounded-2xl bg-[#f8f5ee] border border-[#e5e1d5] space-y-3">
                      <div className="text-xs font-bold text-[#122b39] flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-[#e5a329]" />
                        Base & Transactional Units of Measure (UoM)
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-[#6a7d8d] font-semibold mb-1">Base UoM (Inventory)</label>
                          <select
                            value={activeProduct.baseUoMId || 'uom-ea'}
                            onChange={(e) => setActiveProduct({ ...activeProduct, baseUoMId: e.target.value })}
                            className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#e5e1d5] text-xs text-[#122b39] font-medium"
                          >
                            {uoms.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-[#6a7d8d] font-semibold mb-1">Default Purchase UoM</label>
                          <select
                            value={activeProduct.purchaseUoMId || 'uom-cs24'}
                            onChange={(e) => setActiveProduct({ ...activeProduct, purchaseUoMId: e.target.value })}
                            className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#e5e1d5] text-xs text-[#122b39] font-medium"
                          >
                            {uoms.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-[#6a7d8d] font-semibold mb-1">Default Sales UoM</label>
                          <select
                            value={activeProduct.salesUoMId || 'uom-ea'}
                            onChange={(e) => setActiveProduct({ ...activeProduct, salesUoMId: e.target.value })}
                            className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#e5e1d5] text-xs text-[#122b39] font-medium"
                          >
                            {uoms.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 4-Tier Packaging Grid */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-[#122b39]">
                          Packaging Levels Hierarchy (GTIN & Dimensions)
                        </div>
                        <span className="text-[11px] text-[#8c5e15] font-semibold">Barcode-Scannable Tiers</span>
                      </div>

                      <div className="space-y-3">
                        {(activeProduct.packagings || []).map((pkg, idx) => (
                          <div
                            key={pkg.id || idx}
                            className="p-4 rounded-2xl bg-[#faf9f6] border border-[#e5e1d5] space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                    pkg.packageLevel === 'EACH'
                                      ? 'bg-[#ede9df] text-[#122b39]'
                                      : pkg.packageLevel === 'INNER_PACK'
                                      ? 'bg-sky-100 text-sky-800'
                                      : pkg.packageLevel === 'CASE'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  Level {idx + 1}: {pkg.packageLevel.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-[#6a7d8d] font-mono">
                                  Contains: <strong className="text-[#122b39]">{pkg.qty}</strong> base units
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-[#6a7d8d] uppercase tracking-wider mb-1">
                                  Packaging GTIN Barcode
                                </label>
                                <input
                                  type="text"
                                  value={pkg.barcode}
                                  onChange={(e) => updatePackagingField(idx, 'barcode', e.target.value)}
                                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#e5e1d5] text-xs text-[#122b39] font-mono font-semibold"
                                  placeholder="Scannable Barcode"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-[#6a7d8d] uppercase tracking-wider mb-1">
                                  Qty Contained (Units)
                                </label>
                                <input
                                  type="number"
                                  value={pkg.qty}
                                  onChange={(e) =>
                                    updatePackagingField(idx, 'qty', parseInt(e.target.value, 10) || 1)
                                  }
                                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#e5e1d5] text-xs text-[#122b39] font-mono font-bold"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2 pt-1">
                              <div>
                                <label className="block text-[10px] text-[#7a8b99]">Max Wt (kg)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={pkg.maxWeight}
                                  onChange={(e) =>
                                    updatePackagingField(idx, 'maxWeight', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full px-2 py-1 rounded-lg bg-white border border-[#e5e1d5] text-xs text-[#122b39] font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-[#7a8b99]">L (cm)</label>
                                <input
                                  type="number"
                                  value={pkg.length}
                                  onChange={(e) =>
                                    updatePackagingField(idx, 'length', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full px-2 py-1 rounded-lg bg-white border border-[#e5e1d5] text-xs text-[#122b39] font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-[#7a8b99]">W (cm)</label>
                                <input
                                  type="number"
                                  value={pkg.width}
                                  onChange={(e) =>
                                    updatePackagingField(idx, 'width', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full px-2 py-1 rounded-lg bg-white border border-[#e5e1d5] text-xs text-[#122b39] font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-[#7a8b99]">H (cm)</label>
                                <input
                                  type="number"
                                  value={pkg.height}
                                  onChange={(e) =>
                                    updatePackagingField(idx, 'height', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full px-2 py-1 rounded-lg bg-white border border-[#e5e1d5] text-xs text-[#122b39] font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: PROCUREMENT & SOURCING */}
                {activeDrawerTab === 'PROCUREMENT' && (
                  <div className="space-y-4.5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                          Unit Cost ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={activeProduct.unitCost || 0}
                          onChange={(e) =>
                            setActiveProduct({ ...activeProduct, unitCost: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-xs text-[#122b39] font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                          Retail Price ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={activeProduct.retailPrice || 0}
                          onChange={(e) =>
                            setActiveProduct({ ...activeProduct, retailPrice: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-xs text-[#122b39] font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                          Reorder Point (ROP)
                        </label>
                        <input
                          type="number"
                          value={activeProduct.reorderPoint || 15}
                          onChange={(e) =>
                            setActiveProduct({ ...activeProduct, reorderPoint: parseInt(e.target.value, 10) || 0 })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-xs text-[#122b39] font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                          Lead Time (Days)
                        </label>
                        <input
                          type="number"
                          value={activeProduct.leadTimeDays || 7}
                          onChange={(e) =>
                            setActiveProduct({ ...activeProduct, leadTimeDays: parseInt(e.target.value, 10) || 0 })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-xs text-[#122b39] font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                          Min Order Qty (MOQ)
                        </label>
                        <input
                          type="number"
                          value={activeProduct.moq || 24}
                          onChange={(e) =>
                            setActiveProduct({ ...activeProduct, moq: parseInt(e.target.value, 10) || 1 })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-xs text-[#122b39] font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                        Primary Supplier / Vendor
                      </label>
                      <input
                        type="text"
                        value={activeProduct.defaultVendor || ''}
                        onChange={(e) => setActiveProduct({ ...activeProduct, defaultVendor: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-xs text-[#122b39] font-medium"
                        placeholder="Red Sea Microelectronics Ltd"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 4: MULTI-FACILITY STOCK DISTRIBUTION */}
                {activeDrawerTab === 'STOCK' && (
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-[#122b39] flex items-center justify-between">
                      <span>Inventory Levels by NEOM Facility</span>
                      <span className="font-mono text-[#8c5e15] font-bold">Total: {activeProduct.totalStock || 0} units</span>
                    </div>

                    <div className="space-y-2.5">
                      {(activeProduct.stockByLocation || []).length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#7a8b99] bg-[#faf9f6] rounded-2xl border border-[#e5e1d5]">
                          No physical stock registered yet across NEOM warehouses.
                        </div>
                      ) : (
                        (activeProduct.stockByLocation || []).map((loc) => (
                          <div
                            key={loc.locationId}
                            className="p-3.5 rounded-2xl bg-[#faf9f6] border border-[#e5e1d5] flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-white border border-[#e5e1d5] flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-[#e5a329]" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-[#122b39]">{loc.locationName}</div>
                                <div className="text-[10px] text-[#7a8b99] font-mono">Code: {loc.locationCode}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold font-mono text-[#122b39]">
                                {loc.quantity} {activeProduct.unitOfMeasure || 'units'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Sticky Footer */}
              <div className="px-6 py-4 border-t border-[#f0ece2] bg-[#faf9f6] flex items-center justify-between text-xs text-[#6a7d8d]">
                <span>Press 'Esc' anytime to exit drawer</span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#f6f4ed] hover:bg-[#ede9df] text-[#122b39] font-bold cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProduct}
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold disabled:opacity-50 cursor-pointer shadow-xs transition"
                  >
                    {saving ? 'Saving...' : 'Apply & Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
