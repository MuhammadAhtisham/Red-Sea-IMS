import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Barcode,
  Copy,
  Check,
  Printer,
  Sparkles,
  Layers,
  MapPin,
  FileText,
  DollarSign,
  Package,
  Thermometer,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  History,
  Building2,
  Trash2,
  Plus,
  Info,
} from 'lucide-react';
import {
  ProductDTO,
  LocationDTO,
  CategoryDTO,
  StockMovementDTO,
  api,
} from '../../services/api';
import {
  generateBarcodeSvg,
  generateValidGtin13,
} from '../../utils/barcodeGenerator';

interface ProductDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductDTO | null; // null if creating a new product
  categories: CategoryDTO[];
  locations: LocationDTO[];
  movements: StockMovementDTO[];
  onSave: (productData: Partial<ProductDTO>) => Promise<void>;
  onRefresh: () => void;
  onOpenBarcodeModal: (products: ProductDTO[]) => void;
}

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
  isOpen,
  onClose,
  product,
  categories,
  locations,
  movements,
  onSave,
  onRefresh,
  onOpenBarcodeModal,
}) => {
  const [activeTab, setActiveTab] = useState<
    'GENERAL' | 'PACKAGING' | 'LOGISTICS' | 'PRICING' | 'STOCK' | 'LABEL'
  >('GENERAL');

  // Form states
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [brand, setBrand] = useState('NEOM Logistics');
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT' | 'DISCONTINUED' | 'ARCHIVED'>('ACTIVE');
  const [unitCost, setUnitCost] = useState(50);
  const [retailPrice, setRetailPrice] = useState(120);
  const [unitOfMeasure, setUnitOfMeasure] = useState('EA');
  const [reorderPoint, setReorderPoint] = useState(20);
  const [leadTimeDays, setLeadTimeDays] = useState(14);
  const [moq, setMoq] = useState(1);
  const [storageCondition, setStorageCondition] = useState('Ambient');
  const [hsCode, setHsCode] = useState('8517.62.0000');
  const [countryOfOrigin, setCountryOfOrigin] = useState('Saudi Arabia');
  const [weight, setWeight] = useState(1.2);
  const [dimensions, setDimensions] = useState('20x15x10');
  const [defaultVendor, setDefaultVendor] = useState('Red Sea Global Procurement');

  // Packaging hierarchy
  const [packagings, setPackagings] = useState<any[]>([
    { packageLevel: 'EACH', qty: 1, uomCode: 'EA', barcode: '', maxWeight: 1 },
    { packageLevel: 'INNER_PACK', qty: 6, uomCode: 'PK6', barcode: '', maxWeight: 6 },
    { packageLevel: 'CASE', qty: 24, uomCode: 'CS24', barcode: '', maxWeight: 24 },
    { packageLevel: 'PALLET', qty: 144, uomCode: 'PLT', barcode: '', maxWeight: 150 },
  ]);

  const [saving, setSaving] = useState(false);
  const [copiedBarcode, setCopiedBarcode] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setSku(product.sku || '');
      setBarcode(product.barcode || '');
      setName(product.name || '');
      setDescription(product.description || '');
      setCategory(product.category || 'General');
      setBrand(product.brand || 'NEOM Logistics');
      setStatus((product.status as any) || 'ACTIVE');
      setUnitCost(product.unitCost || 0);
      setRetailPrice(product.retailPrice || 0);
      setUnitOfMeasure(product.unitOfMeasure || 'EA');
      setReorderPoint(product.reorderPoint || 15);
      setLeadTimeDays(product.leadTimeDays || 14);
      setMoq(product.moq || 1);
      setStorageCondition(product.storageCondition || 'Ambient');
      setHsCode(product.hsCode || '8517.62.0000');
      setCountryOfOrigin(product.countryOfOrigin || 'Saudi Arabia');
      setWeight(product.weight || 1.2);
      setDimensions(product.dimensions || '20x15x10');
      setDefaultVendor(product.defaultVendor || 'Red Sea Global Procurement');

      if (product.packagings && product.packagings.length > 0) {
        setPackagings(product.packagings);
      } else {
        setPackagings([
          { packageLevel: 'EACH', qty: 1, uomCode: 'EA', barcode: product.barcode, maxWeight: 1 },
          { packageLevel: 'INNER_PACK', qty: 6, uomCode: 'PK6', barcode: '', maxWeight: 6 },
          { packageLevel: 'CASE', qty: 24, uomCode: 'CS24', barcode: '', maxWeight: 24 },
          { packageLevel: 'PALLET', qty: 144, uomCode: 'PLT', barcode: '', maxWeight: 150 },
        ]);
      }
    } else {
      // New product default initialization
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedSku = `NEOM-SKU-${randomSuffix}`;
      const generatedGtin = generateValidGtin13(String(randomSuffix));
      setSku(generatedSku);
      setBarcode(generatedGtin);
      setName('');
      setDescription('');
      setCategory(categories[0]?.name || 'General');
      setBrand('NEOM Logistics');
      setStatus('ACTIVE');
      setUnitCost(50);
      setRetailPrice(120);
      setUnitOfMeasure('EA');
      setReorderPoint(20);
      setLeadTimeDays(14);
      setMoq(1);
      setStorageCondition('Ambient');
      setHsCode('8517.62.0000');
      setCountryOfOrigin('Saudi Arabia');
      setWeight(1.0);
      setDimensions('20x15x10');
      setDefaultVendor('Red Sea Global Procurement');
      setPackagings([
        { packageLevel: 'EACH', qty: 1, uomCode: 'EA', barcode: generatedGtin, maxWeight: 1 },
        { packageLevel: 'INNER_PACK', qty: 6, uomCode: 'PK6', barcode: '', maxWeight: 6 },
        { packageLevel: 'CASE', qty: 24, uomCode: 'CS24', barcode: '', maxWeight: 24 },
        { packageLevel: 'PALLET', qty: 144, uomCode: 'PLT', barcode: '', maxWeight: 150 },
      ]);
    }
  }, [product, categories, isOpen]);

  if (!isOpen) return null;

  const margin = retailPrice > 0 ? ((retailPrice - unitCost) / retailPrice) * 100 : 0;
  const markup = unitCost > 0 ? ((retailPrice - unitCost) / unitCost) * 100 : 0;

  const handleGenerateNewSku = () => {
    const catCode = category.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'GEN');
    const rand = Math.floor(1000 + Math.random() * 9000);
    setSku(`NEOM-${catCode}-${rand}`);
  };

  const handleGenerateNewBarcode = () => {
    const newGtin = generateValidGtin13();
    setBarcode(newGtin);
  };

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(barcode);
    setCopiedBarcode(true);
    setTimeout(() => setCopiedBarcode(false), 2000);
  };

  const handleSave = async () => {
    if (!sku.trim() || !barcode.trim() || !name.trim()) {
      alert('SKU, Barcode, and Product Name are required.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim(),
        name: name.trim(),
        description: description.trim(),
        category,
        brand,
        status: status as any,
        unitCost: Number(unitCost),
        retailPrice: Number(retailPrice),
        unitOfMeasure,
        reorderPoint: Number(reorderPoint),
        leadTimeDays: Number(leadTimeDays),
        moq: Number(moq),
        storageCondition,
        hsCode,
        countryOfOrigin,
        weight: Number(weight),
        dimensions,
        defaultVendor,
        packagings,
      });

      setFeedback('Product details saved successfully.');
      setTimeout(() => {
        setFeedback(null);
        onRefresh();
        onClose();
      }, 800);
    } catch (err: any) {
      alert(err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const productMovements = product
    ? movements.filter((m) => m.productId === product.id || m.sku === product.sku)
    : [];

  const barcodeSvg = generateBarcodeSvg(barcode || '6281001234567', {
    height: 48,
    barWidth: 2,
    showText: true,
    color: '#122b39',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col border-l border-[#ded8cb] animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#ded8cb] bg-[#faf9f6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#122b39] text-[#e5a329] flex items-center justify-center shadow-xs">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-[#122b39] bg-[#f6f4ed] px-2 py-0.5 rounded border border-[#ded8cb]">
                  {sku || 'NEW-SKU'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                  {status}
                </span>
                {product && (
                  <span className="text-xs text-[#7a8b99]">
                    Total Stock: <b className="text-[#152836] font-mono">{product.totalStock} {unitOfMeasure}</b>
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-[#152836] mt-1 line-clamp-1">
                {name || (product ? 'Product Inspection' : 'Register New Master SKU')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {product && (
              <button
                onClick={() => onOpenBarcodeModal([product])}
                className="p-2 text-[#526677] hover:text-[#122b39] hover:bg-[#ede9df] rounded-xl transition cursor-pointer"
                title="Print Barcode Label"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#122b39] hover:bg-[#1a3d52] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#e5a329]" />
              <span>{saving ? 'Saving...' : 'Save Product'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#7a8b99] hover:text-[#152836] hover:bg-[#ede9df] rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#ded8cb] bg-[#f8f5ee] px-6 overflow-x-auto">
          {[
            { id: 'GENERAL', label: '1. Identity & Specs', icon: FileText },
            { id: 'PACKAGING', label: '2. Packaging Tiers', icon: Layers },
            { id: 'LOGISTICS', label: '3. Storage & Customs', icon: Thermometer },
            { id: 'PRICING', label: '4. Pricing & Procurement', icon: DollarSign },
            { id: 'STOCK', label: '5. Stock & Moves', icon: MapPin },
            { id: 'LABEL', label: '6. Label Preview', icon: Barcode },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-3 px-3.5 font-bold text-xs border-b-2 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-[#122b39] text-[#122b39]'
                    : 'border-transparent text-[#7a8b99] hover:text-[#152836]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#ede9df]/30 space-y-6">
          {feedback && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{feedback}</span>
            </div>
          )}

          {/* TAB 1: GENERAL */}
          {activeTab === 'GENERAL' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-[#ded8cb] shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-[#526677] uppercase tracking-wider">
                  Primary Identification
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[#152836]">SKU Code *</label>
                      <button
                        type="button"
                        onClick={handleGenerateNewSku}
                        className="text-[11px] text-[#122b39] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-[#e5a329]" /> Auto-Gen
                      </button>
                    </div>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      placeholder="e.g. NEOM-SOLAR-500W"
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-mono font-bold text-[#152836]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[#152836]">GTIN / Barcode *</label>
                      <button
                        type="button"
                        onClick={handleGenerateNewBarcode}
                        className="text-[11px] text-[#122b39] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-[#e5a329]" /> Valid GTIN-13
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="e.g. 6281001234567"
                        className="w-full pl-3.5 pr-9 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-mono font-bold text-[#152836]"
                      />
                      <button
                        type="button"
                        onClick={handleCopyBarcode}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a8b99] hover:text-[#122b39] cursor-pointer"
                        title="Copy Barcode"
                      >
                        {copiedBarcode ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#152836] mb-1">
                    Product Name / Title *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Monocrystalline Photovoltaic Panel 500W Grade A"
                    className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-medium text-[#152836]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#152836] mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs text-[#152836] font-medium"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      {!categories.some((c) => c.name === category) && (
                        <option value={category}>{category}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#152836] mb-1">Brand</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-medium text-[#152836]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#152836] mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs text-[#152836] font-bold"
                    >
                      <option value="ACTIVE">Active Item</option>
                      <option value="DRAFT">Draft / Under Review</option>
                      <option value="DISCONTINUED">Discontinued</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#152836] mb-1">
                    Description & Technical Notes
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide technical attributes, compatibility specifications, or storage advisories..."
                    className="w-full px-3.5 py-2 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-medium text-[#152836]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PACKAGING TIERS */}
          {activeTab === 'PACKAGING' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-[#ded8cb] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#526677] uppercase tracking-wider">
                      Multi-Tier Logistics Packaging Structure
                    </h3>
                    <p className="text-[11px] text-[#7a8b99] mt-0.5">
                      Define automated conversion ratios from Each up to Master Pallet
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-[#faf9f6] px-2.5 py-1 rounded-lg border border-[#ded8cb]">
                    Base UoM: {unitOfMeasure}
                  </span>
                </div>

                <div className="space-y-3">
                  {packagings.map((pkg, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-[#ded8cb] bg-[#faf9f6] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#122b39] text-[#e5a329] text-[10px] font-bold flex items-center justify-center">
                            L{idx + 1}
                          </span>
                          <span className="font-bold text-xs text-[#152836]">
                            {pkg.packageLevel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#7a8b99]">Contains:</span>
                          <input
                            type="number"
                            min="1"
                            value={pkg.qty}
                            onChange={(e) => {
                              const updated = [...packagings];
                              updated[idx].qty = parseInt(e.target.value, 10) || 1;
                              setPackagings(updated);
                            }}
                            className="w-16 px-2 py-1 bg-white border border-[#ded8cb] rounded text-center text-xs font-mono font-bold"
                          />
                          <span className="text-xs font-mono font-bold text-[#152836]">
                            {unitOfMeasure}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-[#7a8b99] uppercase">
                            Level Barcode / GTIN
                          </label>
                          <input
                            type="text"
                            value={pkg.barcode || ''}
                            placeholder={idx === 0 ? barcode : `628100${idx}${Math.floor(1000 + Math.random() * 9000)}`}
                            onChange={(e) => {
                              const updated = [...packagings];
                              updated[idx].barcode = e.target.value;
                              setPackagings(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-[#ded8cb] rounded-lg text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[#7a8b99] uppercase">
                            Gross Weight (kg)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={pkg.maxWeight || 1}
                            onChange={(e) => {
                              const updated = [...packagings];
                              updated[idx].maxWeight = parseFloat(e.target.value) || 1;
                              setPackagings(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-[#ded8cb] rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-[#f8f5ee] rounded-xl border border-[#ded8cb] text-xs text-[#526677] flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#122b39]" />
                  <span>
                    When receiving purchase orders, scanning any packaging tier barcode automatically increments inventory by its multiplier!
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOGISTICS & CUSTOMS */}
          {activeTab === 'LOGISTICS' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-[#ded8cb] shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-[#526677] uppercase tracking-wider">
                  Physical Storage & Compliance Specs
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#152836] mb-1">
                      Storage Condition
                    </label>
                    <select
                      value={storageCondition}
                      onChange={(e) => setStorageCondition(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-medium text-[#152836]"
                    >
                      <option value="Ambient">Ambient Warehouse (15-30°C)</option>
                      <option value="Climate Controlled">Climate Controlled (20-22°C)</option>
                      <option value="Cold Chain">Cold Chain Pharma/Food (2-8°C)</option>
                      <option value="Deep Freeze">Deep Freeze (-20°C)</option>
                      <option value="ESD-Safe">ESD-Safe Cleanroom (Sensors & Optics)</option>
                      <option value="Hazmat">Hazardous Materials (Flammable/Chemical)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#152836] mb-1">
                      Customs HS Tariff Code
                    </label>
                    <input
                      type="text"
                      value={hsCode}
                      onChange={(e) => setHsCode(e.target.value)}
                      placeholder="e.g. 8517.62.0000"
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-mono font-bold text-[#152836]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#152836] mb-1">
                      Net Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-mono font-bold text-[#152836]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#152836] mb-1">
                      Dimensions (L×W×H cm)
                    </label>
                    <input
                      type="text"
                      value={dimensions}
                      onChange={(e) => setDimensions(e.target.value)}
                      placeholder="e.g. 30x20x15"
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-mono font-bold text-[#152836]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#152836] mb-1">
                      Country of Origin
                    </label>
                    <input
                      type="text"
                      value={countryOfOrigin}
                      onChange={(e) => setCountryOfOrigin(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-medium text-[#152836]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#152836] mb-1">
                      Base Unit of Measure
                    </label>
                    <select
                      value={unitOfMeasure}
                      onChange={(e) => setUnitOfMeasure(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-bold text-[#152836]"
                    >
                      <option value="EA">EA - Each / Individual Unit</option>
                      <option value="KG">KG - Kilogram</option>
                      <option value="MTR">MTR - Meter</option>
                      <option value="LTR">LTR - Liter</option>
                      <option value="SET">SET - Assembled Kit / Set</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRICING & PROCUREMENT */}
          {activeTab === 'PRICING' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-[#ded8cb] shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-[#526677] uppercase tracking-wider">
                  Financials & Margin Analysis
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#152836] mb-1">
                      Standard Unit Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={unitCost}
                      onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-mono font-bold text-[#152836]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#152836] mb-1">
                      Retail / Selling Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={retailPrice}
                      onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-mono font-bold text-[#152836]"
                    />
                  </div>
                </div>

                {/* Profit Margin Cards */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-[#faf9f6] rounded-xl border border-[#ded8cb]">
                  <div>
                    <div className="text-[10px] text-[#7a8b99] font-bold uppercase">Gross Profit ($)</div>
                    <div className="font-mono text-sm font-bold text-[#152836] mt-0.5">
                      ${(retailPrice - unitCost).toFixed(2)}
                    </div>
                  </div>
                  <div className="border-x border-[#ded8cb] px-3">
                    <div className="text-[10px] text-[#7a8b99] font-bold uppercase">Gross Margin %</div>
                    <div className={`font-mono text-sm font-bold mt-0.5 ${margin >= 40 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {margin.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#7a8b99] font-bold uppercase">Markup %</div>
                    <div className="font-mono text-sm font-bold text-[#122b39] mt-0.5">
                      {markup.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#ded8cb]">
                  <h4 className="text-xs font-bold text-[#526677] uppercase tracking-wider mb-3">
                    Procurement & Reorder Parameters
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#152836] mb-1">
                        Safety Stock (ROP)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={reorderPoint}
                        onChange={(e) => setReorderPoint(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-mono font-bold text-[#152836]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#152836] mb-1">
                        Min Order Qty (MOQ)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={moq}
                        onChange={(e) => setMoq(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-mono font-bold text-[#152836]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#152836] mb-1">
                        Lead Time (Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={leadTimeDays}
                        onChange={(e) => setLeadTimeDays(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-mono font-bold text-[#152836]"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-bold text-[#152836] mb-1">
                      Primary Supplier / Vendor
                    </label>
                    <input
                      type="text"
                      value={defaultVendor}
                      onChange={(e) => setDefaultVendor(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-medium text-[#152836]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: STOCK & MOVES */}
          {activeTab === 'STOCK' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-[#ded8cb] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#526677] uppercase tracking-wider">
                      Warehouse Stock Breakdown
                    </h3>
                    <p className="text-[11px] text-[#7a8b99]">
                      Physical inventory positioned across Red Sea Supply Chain Network
                    </p>
                  </div>
                  <span className="font-mono font-bold text-sm bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200">
                    Total: {product ? product.totalStock : 0} {unitOfMeasure}
                  </span>
                </div>

                <div className="border border-[#ded8cb] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#faf9f6] text-[#7a8b99] font-mono border-b border-[#ded8cb]">
                      <tr>
                        <th className="p-3">Facility / Warehouse</th>
                        <th className="p-3 text-center">Location Code</th>
                        <th className="p-3 text-right">On Hand Qty</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ded8cb]">
                      {product && product.stockByLocation && product.stockByLocation.length > 0 ? (
                        product.stockByLocation.map((s, idx) => (
                          <tr key={idx} className="hover:bg-[#faf9f6]">
                            <td className="p-3 font-bold text-[#152836] flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-[#122b39]" />
                              <span>{s.locationName}</span>
                            </td>
                            <td className="p-3 text-center font-mono text-[#7a8b99]">
                              {s.locationCode}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-[#152836]">
                              {s.quantity} {unitOfMeasure}
                            </td>
                            <td className="p-3 text-right">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                Available
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-[#7a8b99]">
                            No active warehouse inventory allocations recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Audit Ledger */}
                <div className="pt-3 border-t border-[#ded8cb]">
                  <h4 className="text-xs font-bold text-[#526677] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-[#122b39]" />
                    <span>Recent Stock Moves ({productMovements.length})</span>
                  </h4>
                  {productMovements.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {productMovements.slice(0, 6).map((m) => (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-xl border border-[#ded8cb] bg-[#faf9f6] flex items-center justify-between text-xs font-mono"
                        >
                          <div>
                            <span className="font-bold text-[#152836]">{m.type}</span>
                            <span className="text-[#7a8b99] ml-2 text-[11px]">{m.reference}</span>
                          </div>
                          <div className="font-bold text-[#122b39]">
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {unitOfMeasure}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[#7a8b99] italic p-2">
                      No stock movement events logged for this SKU yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: LABEL PREVIEW */}
          {activeTab === 'LABEL' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-[#ded8cb] shadow-xs space-y-4 text-center flex flex-col items-center">
                <h3 className="text-xs font-bold text-[#526677] uppercase tracking-wider">
                  Logistics Barcode Sticker Mockup
                </h3>

                <div className="p-6 bg-[#faf9f6] border-2 border-dashed border-[#ded8cb] rounded-2xl max-w-sm w-full space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-mono text-[#7a8b99] uppercase">
                    <span className="font-bold text-[#152836]">{brand}</span>
                    <span>{countryOfOrigin}</span>
                  </div>

                  <div className="text-left">
                    <div className="font-bold text-sm text-[#152836] line-clamp-1">{name || 'Sample Product'}</div>
                    <div className="font-mono text-xs text-[#122b39] font-bold mt-0.5">SKU: {sku}</div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-[#ded8cb] flex justify-center">
                    <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
                  </div>

                  <div className="flex justify-between items-center text-xs font-mono pt-1 border-t border-[#ded8cb]">
                    <span className="font-bold text-[#152836]">${retailPrice.toFixed(2)}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase">
                      {storageCondition}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (product) {
                        onOpenBarcodeModal([product]);
                      } else {
                        window.print();
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#122b39] hover:bg-[#1a3d52] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-[#e5a329]" />
                    <span>Print Thermal Label (50×30mm)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#ded8cb] bg-[#faf9f6] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-[#ede9df] border border-[#ded8cb] text-[#152836] text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-[#122b39] hover:bg-[#1a3d52] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#e5a329]" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
