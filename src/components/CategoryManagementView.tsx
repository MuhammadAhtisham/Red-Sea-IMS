import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Search,
  Download,
  Boxes,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Package,
  Settings2,
  Scale,
  RefreshCw,
  Eye,
  ExternalLink,
} from 'lucide-react';
import {
  CategoryDTO,
  ProductDTO,
  UoMDTO,
  UoMCategoryDTO,
  api,
} from '../services/api';

interface CategoryManagementViewProps {
  products: ProductDTO[];
  onRefreshProducts?: () => void;
  onNavigateToProduct?: (productId: string) => void;
}

export const CategoryManagementView: React.FC<CategoryManagementViewProps> = ({
  products,
  onRefreshProducts,
  onNavigateToProduct,
}) => {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryDTO | null>(null);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catColor, setCatColor] = useState('#122b39');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // UoM Management State
  const [isUomModalOpen, setIsUomModalOpen] = useState(false);
  const [uoms, setUoms] = useState<UoMDTO[]>([]);
  const [uomCategories, setUomCategories] = useState<UoMCategoryDTO[]>([]);
  const [newUomName, setNewUomName] = useState('');
  const [newUomCode, setNewUomCode] = useState('');
  const [newUomCatId, setNewUomCatId] = useState('');
  const [newUomType, setNewUomType] = useState<'REFERENCE' | 'BIGGER' | 'SMALLER'>('BIGGER');
  const [newUomRatio, setNewUomRatio] = useState('10');
  const [uomSubmitting, setUomSubmitting] = useState(false);

  // Load categories and UoMs
  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, uomList, uomCatList] = await Promise.all([
        api.getCategories(),
        api.getUoms(),
        api.getUomCategories(),
      ]);
      setCategories(cats);
      setUoms(uomList);
      setUomCategories(uomCatList);
      if (uomCatList.length > 0 && !newUomCatId) {
        setNewUomCatId(uomCatList[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load categories or UoMs:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Error loading categories' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditCategoryId('');
    setCatName('');
    setCatCode('');
    setCatDesc('');
    setCatColor('#122b39');
    setIsCategoryModalOpen(true);
  };

  const openEditModal = (cat: CategoryDTO) => {
    setIsEditing(true);
    setEditCategoryId(cat.id);
    setCatName(cat.name);
    setCatCode(cat.code);
    setCatDesc(cat.description || '');
    setCatColor(cat.color || '#122b39');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !catCode.trim()) return;

    setSubmitting(true);
    try {
      if (isEditing) {
        await api.updateCategory(editCategoryId, {
          name: catName.trim(),
          code: catCode.toUpperCase().trim(),
          description: catDesc.trim(),
          color: catColor,
        });
        setStatusMessage({ type: 'success', text: `Category "${catName}" updated successfully.` });
      } else {
        await api.createCategory({
          name: catName.trim(),
          code: catCode.toUpperCase().trim(),
          description: catDesc.trim(),
          color: catColor,
        });
        setStatusMessage({ type: 'success', text: `Category "${catName}" registered successfully.` });
      }
      setIsCategoryModalOpen(false);
      await loadData();
      if (onRefreshProducts) onRefreshProducts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: CategoryDTO) => {
    const count = cat.productCount || 0;
    if (
      !window.confirm(
        `Are you sure you want to delete category "${cat.name}"? ${
          count > 0 ? `It currently has ${count} associated products.` : ''
        }`
      )
    ) {
      return;
    }

    try {
      await api.deleteCategory(cat.id);
      setStatusMessage({ type: 'success', text: `Category "${cat.name}" removed.` });
      if (selectedCategory?.id === cat.id) {
        setSelectedCategory(null);
      }
      await loadData();
      if (onRefreshProducts) onRefreshProducts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  };

  const handleCreateUom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUomName.trim() || !newUomCode.trim() || !newUomCatId) return;

    setUomSubmitting(true);
    try {
      await api.createUom({
        name: newUomName.trim(),
        code: newUomCode.toUpperCase().trim(),
        categoryId: newUomCatId,
        type: newUomType,
        ratio: parseFloat(newUomRatio) || 1.0,
      });
      setNewUomName('');
      setNewUomCode('');
      setNewUomRatio('10');
      setStatusMessage({ type: 'success', text: `Unit of Measure "${newUomCode}" registered.` });
      const updatedUoms = await api.getUoms();
      setUoms(updatedUoms);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setUomSubmitting(false);
    }
  };

  const handleDeleteUom = async (id: string, code: string) => {
    if (!window.confirm(`Delete Unit of Measure "${code}"?`)) return;
    try {
      await api.deleteUom(id);
      setStatusMessage({ type: 'success', text: `Unit "${code}" removed.` });
      const updatedUoms = await api.getUoms();
      setUoms(updatedUoms);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  };

  // Export products for a single category or all categories
  const exportCategoryProducts = (categoryName?: string) => {
    let prodsToExport = products;
    let filename = 'neom_products_all_categories.csv';

    if (categoryName) {
      prodsToExport = products.filter(
        (p) => p.category && p.category.toLowerCase().trim() === categoryName.toLowerCase().trim()
      );
      filename = `neom_products_${categoryName.toLowerCase().replace(/\s+/g, '_')}.csv`;
    }

    const headers = [
      'SKU',
      'Barcode',
      'Name',
      'Category',
      'Base UoM',
      'Total Stock',
      'Unit Cost ($)',
      'Retail Price ($)',
      'Inventory Valuation ($)',
      'Reorder Point',
      'Lead Time (Days)',
      'HS Code',
      'Brand',
      'Weight (kg)',
      'Storage Condition',
    ];

    const rows = prodsToExport.map((p) => [
      `"${p.sku}"`,
      `"${p.barcode}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.category || ''}"`,
      `"${p.unitOfMeasure || 'EA'}"`,
      p.totalStock,
      p.unitCost,
      p.retailPrice,
      Math.round(p.totalStock * p.unitCost * 100) / 100,
      p.reorderPoint,
      p.leadTimeDays,
      `"${p.hsCode || ''}"`,
      `"${p.brand || ''}"`,
      p.weight || '',
      `"${p.storageCondition || 'Ambient'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered categories
  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Products belonging to the currently inspected category
  const activeProducts = selectedCategory
    ? products.filter(
        (p) =>
          p.category &&
          p.category.toLowerCase().trim() === selectedCategory.name.toLowerCase().trim()
      )
    : [];

  // Totals across all categories
  const totalCategoriesCount = categories.length;
  const totalProductsCount = products.length;
  const totalInventoryUnits = categories.reduce((sum, c) => sum + (c.totalUnits || 0), 0);
  const totalValuation = categories.reduce((sum, c) => sum + (c.totalValuation || 0), 0);

  const presetColors = [
    '#122b39', // Navy
    '#0284c7', // Sky blue
    '#e5a329', // Amber
    '#d97706', // Warm orange
    '#059669', // Emerald
    '#dc2626', // Crimson
    '#7c3aed', // Purple
    '#4f46e5', // Indigo
    '#0d9488', // Teal
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5e1d5] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-[#8c5e15] uppercase tracking-wider">
              Master Taxonomy & Unit Standards
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#122b39] text-[#e5a329]">
              RedSea IMS
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#122b39] tracking-tight mt-1">
            Category & UoM Management
          </h1>
          <p className="text-xs text-[#6a7d8d] mt-0.5">
            Organize warehouse SKUs by operational classification, track category-level valuation, and configure custom Units of Measure.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => loadData()}
            className="px-3 py-2 rounded-xl bg-white border border-[#e5e1d5] text-[#122b39] hover:bg-[#faf9f6] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Refresh categories"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => setIsUomModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#e5e1d5] text-[#122b39] hover:bg-[#faf9f6] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Scale className="w-3.5 h-3.5 text-[#e5a329]" />
            <span>Manage UoMs ({uoms.length})</span>
          </button>

          <button
            onClick={() => exportCategoryProducts()}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#e5e1d5] text-[#122b39] hover:bg-[#faf9f6] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export All Catalog (CSV)</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm shadow-[#122b39]/20"
          >
            <Plus className="w-4 h-4 text-[#e5a329]" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 hover:opacity-75 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* High-Level Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a8b99]">
              Categories
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#f0ece2] flex items-center justify-center text-[#122b39]">
              <Tag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#122b39] font-mono mt-1">
            {totalCategoriesCount}
          </div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Active warehouse taxonomies</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a8b99]">
              Classified SKUs
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#f0ece2] flex items-center justify-center text-[#0284c7]">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#122b39] font-mono mt-1">
            {totalProductsCount}
          </div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Across all storage bays</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a8b99]">
              Total Stored Units
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#f0ece2] flex items-center justify-center text-[#e5a329]">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#122b39] font-mono mt-1">
            {totalInventoryUnits.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Base UoM inventory count</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a8b99]">
              Catalog Valuation
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#f0ece2] flex items-center justify-center text-emerald-600">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#122b39] font-mono mt-1">
            ${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">Asset replacement cost</div>
        </div>
      </div>

      {/* Main Two-Column Layout: Categories List / Grid + Detail Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Category Cards & Search (8 columns on xl) */}
        <div className={`${selectedCategory ? 'xl:col-span-7' : 'xl:col-span-12'} space-y-4`}>
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#7a8b99] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories by name, code, or description..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#e5e1d5] rounded-xl text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
              />
            </div>
            <span className="text-xs font-mono text-[#7a8b99]">
              Showing {filteredCategories.length} of {categories.length} categories
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCategories.map((cat) => {
              const isSelected = selectedCategory?.id === cat.id;
              const matchingCount = cat.productCount || 0;
              const units = cat.totalUnits || 0;
              const val = cat.totalValuation || 0;

              return (
                <div
                  key={cat.id}
                  className={`bg-white rounded-xl border transition-all p-4.5 cursor-pointer relative ${
                    isSelected
                      ? 'border-[#122b39] shadow-md ring-2 ring-[#122b39]/10'
                      : 'border-[#e5e1d5] hover:border-[#122b39]/40 hover:shadow-xs'
                  }`}
                  onClick={() => setSelectedCategory(isSelected ? null : cat)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: cat.color || '#122b39' }}
                      />
                      <div>
                        <h3 className="text-sm font-bold text-[#122b39] tracking-tight leading-tight">
                          {cat.name}
                        </h3>
                        <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#f6f4ed] text-[#526677] border border-[#e2ddd0] mt-0.5">
                          {cat.code}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportCategoryProducts(cat.name);
                        }}
                        title="Export products in this category"
                        className="p-1.5 rounded-lg text-[#7a8b99] hover:text-[#122b39] hover:bg-[#faf9f6] transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(cat);
                        }}
                        title="Edit category"
                        className="p-1.5 rounded-lg text-[#7a8b99] hover:text-[#122b39] hover:bg-[#faf9f6] transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat);
                        }}
                        title="Delete category"
                        className="p-1.5 rounded-lg text-[#7a8b99] hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {cat.description && (
                    <p className="text-xs text-[#6a7d8d] mt-2.5 line-clamp-2">
                      {cat.description}
                    </p>
                  )}

                  {/* Summary Bar */}
                  <div className="mt-4 pt-3 border-t border-[#f0ece2] grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-[#7a8b99] block">Products</span>
                      <span className="font-mono font-bold text-[#122b39]">{matchingCount} SKUs</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#7a8b99] block">Stock Units</span>
                      <span className="font-mono font-bold text-[#122b39]">{units.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#7a8b99] block">Valuation</span>
                      <span className="font-mono font-bold text-emerald-700">
                        ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-right">
                    <span className="text-[10px] text-[#e5a329] font-bold inline-flex items-center gap-1 group">
                      {isSelected ? 'Viewing Products' : 'Click to inspect products'}
                      <ChevronRight className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Inspect Products Inside Selected Category (5 columns on xl) */}
        {selectedCategory && (
          <div className="xl:col-span-5 bg-white rounded-xl border border-[#e5e1d5] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0ece2] pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedCategory.color || '#122b39' }}
                  />
                  <h2 className="text-base font-bold text-[#122b39]">
                    {selectedCategory.name}
                  </h2>
                </div>
                <p className="text-xs text-[#7a8b99] mt-0.5">
                  {activeProducts.length} registered products linked to this category
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportCategoryProducts(selectedCategory.name)}
                  className="px-3 py-1.5 rounded-lg bg-[#faf9f6] hover:bg-[#f0ece2] border border-[#e5e1d5] text-xs font-bold text-[#122b39] flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-emerald-600" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="p-1 rounded-lg text-[#7a8b99] hover:text-[#122b39] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {activeProducts.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#7a8b99]">
                <Boxes className="w-8 h-8 text-[#dcd7cb] mx-auto mb-2" />
                <p>No products currently assigned to this category.</p>
                <p className="text-[11px] text-[#a0afba] mt-1">
                  Assign this category when creating or editing a product in Product Master.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {activeProducts.map((p) => {
                  const isCritical = p.totalStock <= p.reorderPoint * 0.5;
                  const isWarning = p.totalStock <= p.reorderPoint && !isCritical;

                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-[#faf9f6] border border-[#f0ece2] hover:border-[#122b39]/30 transition text-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono font-bold text-[#122b39] hover:text-[#e5a329] cursor-pointer">
                            {p.sku}
                          </span>
                          <h4 className="font-semibold text-[#152836] line-clamp-1">{p.name}</h4>
                        </div>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                            isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          title={`Stock status: ${isCritical ? 'Critical' : isWarning ? 'Low' : 'Healthy'}`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#7a8b99] pt-1 border-t border-[#ede9df]">
                        <span className="font-mono">
                          Stock: <b className="text-[#122b39]">{p.totalStock} {p.unitOfMeasure || 'EA'}</b>
                        </span>
                        <span className="font-mono">
                          Cost: <b className="text-[#122b39]">${p.unitCost}</b>
                        </span>
                        <span className="font-mono text-emerald-700 font-bold">
                          Val: ${Math.round(p.totalStock * p.unitCost).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE / EDIT CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl border border-[#e5e1d5] shadow-2xl max-w-md w-full p-6 text-[#122b39]">
            <div className="flex items-center justify-between border-b border-[#f0ece2] pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#e5a329]" />
                <h3 className="text-base font-bold text-[#122b39]">
                  {isEditing ? 'Edit Category' : 'Register New Category'}
                </h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg text-[#7a8b99] hover:text-[#122b39] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#526677] uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Smart Infrastructure"
                  className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#526677] uppercase tracking-wider mb-1">
                  Category Code (Taxonomy Key) *
                </label>
                <input
                  type="text"
                  required
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                  placeholder="e.g. INFRA"
                  className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs font-mono font-bold text-[#122b39] focus:outline-none focus:border-[#122b39]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#526677] uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Scope of products classified under this category..."
                  className="w-full px-3.5 py-2 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#526677] uppercase tracking-wider mb-1.5">
                  Visual Color Accent
                </label>
                <div className="flex items-center gap-2">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCatColor(color)}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer border ${
                        catColor === color ? 'scale-125 border-[#122b39] shadow-sm' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-6 h-6 p-0 border-0 rounded cursor-pointer ml-1"
                    title="Custom hex color"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#f0ece2] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#f6f4ed] hover:bg-[#ede9df] text-[#122b39] font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5 text-[#e5a329]" />
                  <span>{submitting ? 'Saving...' : isEditing ? 'Update Category' : 'Register Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UoM MANAGEMENT MODAL */}
      {isUomModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl border border-[#e5e1d5] shadow-2xl max-w-2xl w-full p-6 text-[#122b39] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#f0ece2] pb-3.5 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#e5a329]" />
                <div>
                  <h3 className="text-base font-bold text-[#122b39]">
                    Unit of Measure (UoM) Master Configuration
                  </h3>
                  <p className="text-[11px] text-[#7a8b99]">
                    Configure enterprise packaging units, volumetric drums, pallets, and conversion ratios.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUomModalOpen(false)}
                className="p-1 rounded-lg text-[#7a8b99] hover:text-[#122b39] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-6 pr-1">
              {/* Form to Add New UoM */}
              <div className="bg-[#faf9f6] p-4 rounded-xl border border-[#e5e1d5]">
                <h4 className="text-xs font-bold text-[#122b39] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#e5a329]" />
                  <span>Register Custom Unit of Measure</span>
                </h4>
                <form onSubmit={handleCreateUom} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#526677] mb-1">
                      UoM Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Industrial Drum"
                      value={newUomName}
                      onChange={(e) => setNewUomName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#e5e1d5] rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#526677] mb-1">
                      Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DRM"
                      value={newUomCode}
                      onChange={(e) => setNewUomCode(e.target.value.toUpperCase())}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#e5e1d5] rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#526677] mb-1">
                      Class / Domain
                    </label>
                    <select
                      value={newUomCatId}
                      onChange={(e) => setNewUomCatId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#e5e1d5] rounded-lg text-xs"
                    >
                      {uomCategories.map((uc) => (
                        <option key={uc.id} value={uc.id}>
                          {uc.name} ({uc.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#526677] mb-1">
                      Conversion Ratio
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="200"
                        value={newUomRatio}
                        onChange={(e) => setNewUomRatio(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#e5e1d5] rounded-lg text-xs font-mono"
                      />
                      <button
                        type="submit"
                        disabled={uomSubmitting}
                        className="px-3 py-1.5 rounded-lg bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Current Active UoMs Table */}
              <div>
                <h4 className="text-xs font-bold text-[#122b39] uppercase tracking-wider mb-2">
                  Active Units of Measure ({uoms.length})
                </h4>
                <div className="border border-[#e5e1d5] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8f5ee] border-b border-[#e5e1d5] text-[#526677] font-bold text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Code</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Domain</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-right">Base Ratio</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0ece2] font-mono">
                      {uoms.map((u) => (
                        <tr key={u.id} className="hover:bg-[#faf9f6]">
                          <td className="py-2 px-3 font-bold text-[#122b39]">{u.code}</td>
                          <td className="py-2 px-3 font-sans text-[#152836]">{u.name}</td>
                          <td className="py-2 px-3 text-[#7a8b99]">{u.categoryCode || 'COUNT'}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                u.type === 'REFERENCE'
                                  ? 'bg-blue-50 text-blue-700'
                                  : u.type === 'BIGGER'
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {u.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-[#122b39] font-bold">
                            {u.ratio}x
                          </td>
                          <td className="py-2 px-3 text-center">
                            {u.code !== 'EA' ? (
                              <button
                                onClick={() => handleDeleteUom(u.id, u.code)}
                                className="p-1 text-[#7a8b99] hover:text-red-600 rounded cursor-pointer"
                                title="Remove UoM"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-[#a0afba]">Primary</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#f0ece2] flex justify-end shrink-0 mt-4">
              <button
                onClick={() => setIsUomModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#122b39] text-white font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
