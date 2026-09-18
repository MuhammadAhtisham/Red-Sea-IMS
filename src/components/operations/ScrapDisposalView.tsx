import React, { useState, useMemo } from 'react';
import {
  Trash2,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Building2,
  DollarSign,
  FileCheck,
  Search,
  Check,
  Printer,
  History,
  Info,
  Layers,
  Flame,
  Droplet,
  PackageX,
  XCircle,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import { ProductDTO, LocationDTO, StockMovementDTO, api } from '../../services/api';
import { ScrapCertificateModal } from './ScrapCertificateModal';

interface ScrapDisposalViewProps {
  products: ProductDTO[];
  locations: LocationDTO[];
  movements: StockMovementDTO[];
  onOperationSuccess: () => void;
  onSetStatusMessage: (msg: { text: string; type: 'success' | 'error' } | null) => void;
}

const REASON_CODES = [
  {
    id: 'PACKAGING_DAMAGE',
    name: 'Packaging Compromised / Crushed',
    desc: 'Outer casing or inner vacuum seal broken in handling',
    icon: PackageX,
  },
  {
    id: 'HANDLING_ACCIDENT',
    name: 'Forklift / Handling Impact',
    desc: 'Physical drop, collision, or rack impact damage',
    icon: AlertTriangle,
  },
  {
    id: 'QC_FAILURE',
    name: 'Quality Inspection Failure',
    desc: 'Failed testing tolerances, defective components',
    icon: XCircle,
  },
  {
    id: 'EXPIRATION_OBSOLETE',
    name: 'Shelf Life Exceeded / Obsolete',
    desc: 'Expired batch or superseded product revision',
    icon: BadgeAlert,
  },
  {
    id: 'WATER_ENVIRONMENTAL',
    name: 'Water / Moisture Intrusion',
    desc: 'Rain, sprinkler, or excessive humidity exposure',
    icon: Droplet,
  },
  {
    id: 'CHEMICAL_CONTAMINATION',
    name: 'Hazardous / Chemical Spill',
    desc: 'Cross-contamination requiring strict quarantine disposal',
    icon: Flame,
  },
];

const DISPOSAL_METHODS = [
  {
    id: 'CERTIFIED_DESTRUCTION',
    name: 'Certified Physical Destruction',
    desc: 'Crushed/shredded on-site with certificate of disposal',
  },
  {
    id: 'HAZMAT_PROTOCOL',
    name: 'Authorized Hazmat Contractor',
    desc: 'Collected by licensed chemical/battery disposal service',
  },
  {
    id: 'ECO_RECYCLING',
    name: 'E-Waste & Material Reclamation',
    desc: 'Disassembled for component copper/gold salvage',
  },
  {
    id: 'VENDOR_RMA',
    name: 'Vendor Return for Salvage Credit',
    desc: 'RMA write-off shipped back to original supplier',
  },
  {
    id: 'SECURE_LANDFILL',
    name: 'Controlled Non-Hazardous Waste',
    desc: 'Authorized municipal disposal for inert materials',
  },
];

export const ScrapDisposalView: React.FC<ScrapDisposalViewProps> = ({
  products,
  locations,
  movements,
  onOperationSuccess,
  onSetStatusMessage,
}) => {
  // Form State
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [locationId, setLocationId] = useState<string>(locations[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(2);
  const [reference, setReference] = useState<string>(`SCRAP-${Date.now().toString().slice(-6)}`);
  const [reasonCode, setReasonCode] = useState<string>('PACKAGING_DAMAGE');
  const [disposalMethod, setDisposalMethod] = useState<string>('CERTIFIED_DESTRUCTION');
  const [costCenter, setCostCenter] = useState<string>('CC-401-SCRAP-DEFECTS');
  const [operatorId, setOperatorId] = useState<string>('OPS-SUPERVISOR-01');
  const [witnessBadge, setWitnessBadge] = useState<string>('QA-WITNESS-09');
  const [notes, setNotes] = useState<string>('Damaged during forklift pallet transport');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Certificate Modal State
  const [activeCertModal, setActiveCertModal] = useState<boolean>(false);
  const [selectedCertData, setSelectedCertData] = useState<any>(null);

  // Current Product
  const currentProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  // Available stock at selected location
  const currentStockAtLocation = useMemo(() => {
    if (!currentProduct || !locationId) return 0;
    const loc = currentProduct.stockByLocation?.find((l) => l.locationId === locationId);
    return loc ? loc.quantity : 0;
  }, [currentProduct, locationId]);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === locationId),
    [locations, locationId]
  );

  // Financial impact calculation
  const unitCost = currentProduct?.unitCost || 0;
  const totalFinancialLoss = Math.round(quantity * unitCost);

  // Historical scrap records (type === 'SCRAP' or notes include scrap)
  const historicalScraps = useMemo(() => {
    return movements.filter(
      (m) =>
        m.type === 'SCRAP' ||
        (m.type === 'ADJUSTMENT' && m.quantity < 0 && m.notes?.toLowerCase().includes('scrap'))
    );
  }, [movements]);

  // Aggregate stats
  const totalScrappedUnitsAllTime = useMemo(() => {
    return historicalScraps.reduce((acc, m) => acc + Math.abs(m.quantity), 0);
  }, [historicalScraps]);

  const totalScrappedValueAllTime = useMemo(() => {
    return historicalScraps.reduce((acc, m) => {
      const prod = products.find((p) => p.id === m.productId);
      const cost = prod?.unitCost || 50;
      return acc + Math.abs(m.quantity) * cost;
    }, 0);
  }, [historicalScraps, products]);

  // Submit Scrap Write-Off
  const handleExecuteScrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) return;

    if (currentStockAtLocation < quantity) {
      onSetStatusMessage({
        text: `Cannot scrap ${quantity} units: only ${currentStockAtLocation} ${currentProduct?.unitOfMeasure || 'EA'} available in this bay.`,
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    onSetStatusMessage(null);

    try {
      const res = await api.scrapStock({
        productId: selectedProductId,
        locationId,
        quantity,
        reference: reference.trim(),
        notes: notes.trim(),
        reasonCode,
        disposalMethod,
        userId: operatorId,
        witnessBadge,
      });

      // Prepare certificate preview data
      setSelectedCertData({
        reference: reference.trim(),
        productSku: currentProduct?.sku || '',
        productName: currentProduct?.name || '',
        locationName: selectedLocation?.name || 'Storage Bay',
        quantity,
        unitCost,
        totalLoss: totalFinancialLoss,
        uom: currentProduct?.unitOfMeasure || 'EA',
        reasonCode,
        disposalMethod,
        costCenter,
        operatorId,
        witnessBadge,
        notes: notes.trim(),
        timestamp: new Date().toISOString(),
      });

      onSetStatusMessage({
        text: res.message || `Scrap write-off ${reference} committed: ${quantity} units depleted from inventory ledger.`,
        type: 'success',
      });

      onOperationSuccess();
      setReference(`SCRAP-${Date.now().toString().slice(-6)}`);
    } catch (err: any) {
      onSetStatusMessage({
        text: err.response?.data?.error || err.message || 'Scrap write-off operation failed.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Financial & Risk Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677]">Total Units Scrapped</span>
            <Trash2 className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-700 mt-1">{totalScrappedUnitsAllTime.toLocaleString()}</div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Permanent book write-downs</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677]">Financial Loss Write-Off</span>
            <DollarSign className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-700 mt-1">
            ${totalScrappedValueAllTime.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Asset depreciation total</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677]">Scrap Incidents</span>
            <ShieldAlert className="w-4 h-4 text-[#8c5e15]" />
          </div>
          <div className="text-2xl font-black text-[#122b39] mt-1">{historicalScraps.length}</div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Compliance records</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677]">Audit Status</span>
            <FileCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-sm font-black text-emerald-700 mt-2">Dual Witness Active</div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">GAAP/IFRS Compliant</div>
        </div>
      </div>

      {/* Main Grid: Form Left (8 cols) & Financial Valuation Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scrap Form */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#e5e1d5] p-6 shadow-xs space-y-6">
          <div className="border-b border-[#f0ece2] pb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200">
                <Trash2 className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-black text-[#122b39] tracking-tight">
                Damaged & Scrap Inventory Write-Off
              </h2>
            </div>
            <p className="text-xs text-[#526677] mt-0.5">
              Permanently write down damaged, expired, or non-compliant inventory with dual-witness audit certification.
            </p>
          </div>

          <form onSubmit={handleExecuteScrap} className="space-y-5 text-xs">
            {/* SKU Search & Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold uppercase tracking-wider text-[#526677]">
                  Product / SKU to Scrap *
                </label>
                <span className="text-[11px] text-[#7a8b99]">
                  {filteredProducts.length} items cataloged
                </span>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#7a8b99] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Filter by SKU or description..."
                    className="w-full pl-8 pr-3 py-1.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
                  />
                </div>

                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs text-[#122b39] font-medium focus:outline-none focus:border-[#122b39]"
                >
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name} (${p.unitCost}/ea) [Total: {p.totalStock} {p.unitOfMeasure || 'EA'}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Storage Bay & Quantity to Scrap */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#faf9f6] p-4 rounded-xl border border-[#e5e1d5] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold uppercase tracking-wider text-[#8c5e15]">
                    Storage Bay Location *
                  </label>
                  <span className="font-mono text-xs font-bold text-[#8c5e15]">
                    On-Hand: {currentStockAtLocation} {currentProduct?.unitOfMeasure || 'EA'}
                  </span>
                </div>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#e5e1d5] rounded-lg text-xs text-[#122b39] font-medium focus:outline-none focus:border-[#122b39]"
                >
                  {locations.map((loc) => {
                    const stock = currentProduct?.stockByLocation?.find((l) => l.locationId === loc.id)?.quantity || 0;
                    return (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code}) — {stock} units
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="bg-[#faf9f6] p-4 rounded-xl border border-[#e5e1d5] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold uppercase tracking-wider text-[#526677]">
                    Quantity to Scrap *
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuantity(currentStockAtLocation)}
                    disabled={currentStockAtLocation <= 0}
                    className="text-[10px] font-bold text-red-700 hover:underline cursor-pointer"
                  >
                    SCRAP ALL ({currentStockAtLocation})
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={currentStockAtLocation || undefined}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 bg-white border border-[#e5e1d5] rounded-lg font-mono font-bold text-red-700 text-sm focus:outline-none focus:border-[#122b39]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7a8b99]">
                    {currentProduct?.unitOfMeasure || 'EA'}
                  </span>
                </div>
              </div>
            </div>

            {/* Enterprise Scrap Reason Taxonomy */}
            <div>
              <label className="block font-bold uppercase tracking-wider text-[#526677] mb-2">
                Scrap / Defect Reason Code *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {REASON_CODES.map((rc) => {
                  const Icon = rc.icon;
                  const isSelected = reasonCode === rc.id;
                  return (
                    <button
                      key={rc.id}
                      type="button"
                      onClick={() => setReasonCode(rc.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-red-600 bg-red-50 text-red-900 shadow-xs'
                          : 'border-[#e5e1d5] bg-[#faf9f6] text-[#122b39] hover:bg-[#f0ece2]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-red-700' : 'text-[#7a8b99]'}`} />
                        <span className="font-bold text-xs">{rc.name}</span>
                      </div>
                      <span className={`text-[10px] ${isSelected ? 'text-red-800' : 'text-[#7a8b99]'}`}>
                        {rc.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Approved Disposal Method */}
            <div>
              <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                Authorized Disposal Method *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DISPOSAL_METHODS.map((dm) => {
                  const isSelected = disposalMethod === dm.id;
                  return (
                    <label
                      key={dm.id}
                      className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                        isSelected
                          ? 'border-[#122b39] bg-[#f8f5ee]'
                          : 'border-[#e5e1d5] bg-[#faf9f6] hover:bg-[#f0ece2]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="disposalMethod"
                        value={dm.id}
                        checked={isSelected}
                        onChange={() => setDisposalMethod(dm.id)}
                        className="mt-0.5 text-[#122b39]"
                      />
                      <div>
                        <div className="font-bold text-xs text-[#122b39]">{dm.name}</div>
                        <div className="text-[10px] text-[#7a8b99]">{dm.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Reference, Cost Center, Supervisors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1">
                  Scrap Reference # *
                </label>
                <input
                  type="text"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg font-mono font-bold text-[#122b39]"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1">
                  GL Cost Center
                </label>
                <select
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-[#122b39] font-mono text-xs font-semibold"
                >
                  <option value="CC-401-SCRAP-DEFECTS">CC-401 (Factory Defects)</option>
                  <option value="CC-402-HANDLING-LOSS">CC-402 (Logistics Handling)</option>
                  <option value="CC-403-OBSOLETE-INVENTORY">CC-403 (Obsolete Stock)</option>
                  <option value="CC-404-ENVIRONMENTAL">CC-404 (Water/Spill Damage)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1">
                  Authorizing Supervisor
                </label>
                <input
                  type="text"
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-[#122b39] font-mono"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1">
                  Destruction Witness Badge
                </label>
                <input
                  type="text"
                  value={witnessBadge}
                  onChange={(e) => setWitnessBadge(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-[#122b39] font-mono"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1">
                Incident Description & Destruction Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detail the cause of damage, inspection findings, or containment actions..."
                className="w-full px-3 py-2 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-[#f0ece2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[11px] text-[#7a8b99]">
                This action <span className="font-bold text-red-700">permanently writes down -{quantity} units</span> from bay inventory.
              </div>

              <button
                type="submit"
                disabled={isSubmitting || quantity <= 0 || currentStockAtLocation < quantity}
                className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 transition"
              >
                <Trash2 className="w-4 h-4 text-white" />
                <span>{isSubmitting ? 'Writing Down Inventory...' : 'Authorize & Commit Scrap Write-Off'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Financial Valuation & Risk Notice */}
        <div className="lg:col-span-4 space-y-4">
          {/* Financial Loss Impact Card */}
          <div className="bg-white rounded-2xl border border-[#e5e1d5] p-5 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#f0ece2] pb-3">
              <span className="font-bold uppercase tracking-wider text-[#526677] text-[10px]">
                Financial Loss Impact
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                P&L Depreciation
              </span>
            </div>

            <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 space-y-2">
              <div className="text-[10px] font-bold uppercase text-red-700">
                Total Scrap Loss Valuation
              </div>
              <div className="text-3xl font-black text-red-700 font-mono">
                ${totalFinancialLoss.toLocaleString()}
              </div>
              <div className="text-[11px] text-red-800 flex justify-between font-mono pt-1 border-t border-red-200">
                <span>Unit Cost: ${unitCost.toFixed(2)}</span>
                <span>Qty: {quantity} {currentProduct?.unitOfMeasure || 'EA'}</span>
              </div>
            </div>

            {/* Bay Stock Impact */}
            <div className="bg-[#faf9f6] p-3 rounded-xl border border-[#e5e1d5] space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#7a8b99]">Bay Pre-Scrap:</span>
                <span className="font-bold text-[#122b39]">{currentStockAtLocation} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7a8b99]">Deducted:</span>
                <span className="font-bold text-red-600">-{quantity} units</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#f0ece2]">
                <span className="text-[#122b39] font-bold">Bay Post-Scrap:</span>
                <span className="font-bold text-[#122b39]">{currentStockAtLocation - quantity} units</span>
              </div>
            </div>

            {/* Environmental / Hazmat Notice */}
            <div className="p-3 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] flex items-start gap-2 text-[11px] text-[#526677]">
              <Info className="w-4 h-4 text-[#8c5e15] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#122b39] block">Regulatory Notice:</span>
                All electronics and lithium materials must follow strict e-waste certified destruction protocols.
              </div>
            </div>
          </div>

          {/* Current SKU Info */}
          {currentProduct && (
            <div className="bg-white rounded-2xl border border-[#e5e1d5] p-5 shadow-xs space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#f0ece2] pb-2.5">
                <span className="font-mono font-bold text-[#122b39] text-sm">
                  {currentProduct.sku}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#faf9f6] border border-[#e5e1d5] text-[10px] font-bold text-[#7a8b99]">
                  {currentProduct.category || 'General'}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-[#122b39] leading-tight">{currentProduct.name}</h4>
                <div className="text-[11px] text-[#7a8b99] mt-1">
                  Total Facility Stock: <span className="font-mono font-bold text-[#122b39]">{currentProduct.totalStock} units</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historical Scrap Registry */}
      <div className="bg-white rounded-2xl border border-[#e5e1d5] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-red-700" />
            <h3 className="font-black text-sm text-[#122b39]">
              Scrap & Disposal Audit Log ({historicalScraps.length})
            </h3>
          </div>
          <span className="text-xs text-[#7a8b99]">Permanent inventory write-off ledger</span>
        </div>

        <div className="border border-[#e5e1d5] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8f5ee] border-b border-[#e5e1d5] text-[11px] font-bold uppercase tracking-wider text-[#526677]">
                  <th className="py-2.5 px-3.5">Timestamp</th>
                  <th className="py-2.5 px-3.5">Reference #</th>
                  <th className="py-2.5 px-3.5">SKU & Item</th>
                  <th className="py-2.5 px-3.5">Bay Location</th>
                  <th className="py-2.5 px-3.5 text-right">Written Down</th>
                  <th className="py-2.5 px-3.5 text-right">Est. Loss ($)</th>
                  <th className="py-2.5 px-3.5">Operator</th>
                  <th className="py-2.5 px-3.5 text-center">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ece2] font-mono">
                {historicalScraps.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#7a8b99] font-sans">
                      No scrap write-offs recorded in this ledger period.
                    </td>
                  </tr>
                ) : (
                  historicalScraps.map((m) => {
                    const prod = products.find((p) => p.id === m.productId);
                    const cost = prod?.unitCost || 50;
                    const loss = Math.abs(m.quantity) * cost;

                    return (
                      <tr key={m.id} className="hover:bg-[#faf9f6]">
                        <td className="py-2.5 px-3.5 whitespace-nowrap text-[#7a8b99] text-[11px]">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap font-bold text-red-700">
                          {m.reference || m.id.slice(0, 10)}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap font-sans">
                          <div className="font-mono font-bold text-[#122b39]">{m.sku}</div>
                          <div className="text-[11px] text-[#7a8b99] truncate max-w-xs">{m.productName}</div>
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap font-sans text-[#122b39]">
                          {m.fromLocationName || m.toLocationName || '—'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-black text-red-700">
                          -{Math.abs(m.quantity)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-bold text-red-700">
                          ${loss.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap text-[#7a8b99] text-[11px] font-sans">
                          {m.userId || 'SUPERVISOR'}
                        </td>
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedCertData(null);
                              setActiveCertModal(true);
                            }}
                            className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer font-sans"
                          >
                            <FileText className="w-3 h-3 text-red-700" />
                            <span>Certificate</span>
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
      </div>

      {/* Certificate Modal */}
      <ScrapCertificateModal
        isOpen={activeCertModal || Boolean(selectedCertData)}
        onClose={() => {
          setActiveCertModal(false);
          setSelectedCertData(null);
        }}
        scrapData={selectedCertData}
        movement={historicalScraps[0]}
        product={currentProduct}
        location={selectedLocation}
      />
    </div>
  );
};
