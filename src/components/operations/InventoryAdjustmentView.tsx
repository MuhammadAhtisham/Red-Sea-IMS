import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  AlertTriangle,
  Building2,
  DollarSign,
  CheckCircle2,
  Search,
  Check,
  History,
  ShieldCheck,
  FileCheck,
  TrendingUp,
  TrendingDown,
  Info,
  Scale,
} from 'lucide-react';
import { ProductDTO, LocationDTO, StockMovementDTO, api } from '../../services/api';

interface InventoryAdjustmentViewProps {
  products: ProductDTO[];
  locations: LocationDTO[];
  movements: StockMovementDTO[];
  onOperationSuccess: () => void;
  onSetStatusMessage: (msg: { text: string; type: 'success' | 'error' } | null) => void;
}

const ADJUSTMENT_REASONS = [
  {
    id: 'CYCLE_COUNT_VARIANCE',
    name: 'Scheduled Cycle Count Discrepancy',
    desc: 'Physical audit count differed from system book balance',
  },
  {
    id: 'FOUND_STOCK',
    name: 'Found Stock / Misplaced Inventory (+)',
    desc: 'Unregistered stock discovered during warehouse sweep',
  },
  {
    id: 'SHRINKAGE',
    name: 'Unexplained Shrinkage / Missing (-)',
    desc: 'Stock missing from bay without matching outbound ticket',
  },
  {
    id: 'UOM_DISCREPANCY',
    name: 'Packaging / UoM Conversion Correction',
    desc: 'Inner-pack or case multiplier misunderstanding resolved',
  },
  {
    id: 'DATA_ENTRY_ERROR',
    name: 'Clerical / Inbound Entry Correction',
    desc: 'Reconciliation of previous receiving typo or misplaced barcode',
  },
  {
    id: 'SAMPLE_MARKETING_PULL',
    name: 'Sample / QA Destructive Testing (-)',
    desc: 'Material extracted for lab inspection or trade exhibition',
  },
];

export const InventoryAdjustmentView: React.FC<InventoryAdjustmentViewProps> = ({
  products,
  locations,
  movements,
  onOperationSuccess,
  onSetStatusMessage,
}) => {
  // Mode: Count Reconcile vs Direct Delta
  const [adjustMode, setAdjustMode] = useState<'COUNT_RECONCILE' | 'DIRECT_DELTA'>('COUNT_RECONCILE');

  // Form State
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [locationId, setLocationId] = useState<string>(locations[0]?.id || '');
  const [physicalCountInput, setPhysicalCountInput] = useState<number>(50);
  const [directDeltaInput, setDirectDeltaInput] = useState<number>(0);
  const [reference, setReference] = useState<string>(`ADJ-${Date.now().toString().slice(-6)}`);
  const [reasonCode, setReasonCode] = useState<string>('CYCLE_COUNT_VARIANCE');
  const [operatorId, setOperatorId] = useState<string>('OPS-SUPERVISOR-01');
  const [supervisorSignoff, setSupervisorSignoff] = useState<string>('MGR-AUDIT-04');
  const [notes, setNotes] = useState<string>('Routine bay cycle count reconciliation');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Selected Product
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

  // Current Book Stock at chosen location
  const bookStockAtLocation = useMemo(() => {
    if (!currentProduct || !locationId) return 0;
    const loc = currentProduct.stockByLocation?.find((l) => l.locationId === locationId);
    return loc ? loc.quantity : 0;
  }, [currentProduct, locationId]);

  // Computed Delta
  const calculatedDelta = useMemo(() => {
    if (adjustMode === 'COUNT_RECONCILE') {
      return physicalCountInput - bookStockAtLocation;
    }
    return directDeltaInput;
  }, [adjustMode, physicalCountInput, bookStockAtLocation, directDeltaInput]);

  // Ending Stock
  const computedEndingStock = useMemo(() => {
    return Math.max(0, bookStockAtLocation + calculatedDelta);
  }, [bookStockAtLocation, calculatedDelta]);

  // Valuation Impact
  const unitCost = currentProduct?.unitCost || 0;
  const valuationImpact = Math.round(calculatedDelta * unitCost);

  // High variance threshold: delta magnitude > 20 or valuation magnitude > $500
  const isHighVariance = useMemo(() => {
    return Math.abs(calculatedDelta) >= 20 || Math.abs(valuationImpact) >= 500;
  }, [calculatedDelta, valuationImpact]);

  // Historical Adjustment movements (excluding scrap write-offs)
  const historicalAdjustments = useMemo(() => {
    return movements.filter(
      (m) =>
        m.type === 'ADJUSTMENT' &&
        !m.notes?.toLowerCase().includes('scrap') &&
        !m.notes?.toLowerCase().includes('write-off')
    );
  }, [movements]);

  // Aggregate stats
  const totalPositiveSurplus = useMemo(() => {
    return historicalAdjustments.filter((m) => m.quantity > 0).reduce((acc, m) => acc + m.quantity, 0);
  }, [historicalAdjustments]);

  const totalNegativeShrinkage = useMemo(() => {
    return historicalAdjustments.filter((m) => m.quantity < 0).reduce((acc, m) => acc + Math.abs(m.quantity), 0);
  }, [historicalAdjustments]);

  // Sync physical count input whenever location or product changes
  React.useEffect(() => {
    setPhysicalCountInput(bookStockAtLocation);
  }, [bookStockAtLocation]);

  // Execute Adjustment
  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || calculatedDelta === 0) {
      onSetStatusMessage({
        text: 'Zero delta: counted stock matches book stock. No reconciliation required.',
        type: 'error',
      });
      return;
    }

    if (computedEndingStock < 0) {
      onSetStatusMessage({
        text: 'Negative stock constraint: adjustment would result in stock below zero.',
        type: 'error',
      });
      return;
    }

    if (isHighVariance && !supervisorSignoff.trim()) {
      onSetStatusMessage({
        text: 'High-variance adjustment requires Senior Supervisor sign-off badge.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    onSetStatusMessage(null);

    try {
      const formattedNotes = `[Reason: ${reasonCode}] [Mode: ${adjustMode}] [Pre: ${bookStockAtLocation} -> Post: ${computedEndingStock}] [Op: ${operatorId}] ${
        isHighVariance ? `[Sup Signoff: ${supervisorSignoff}] ` : ''
      }${notes.trim()}`.trim();

      const res = await api.adjustStock({
        productId: selectedProductId,
        locationId,
        quantityDelta: calculatedDelta,
        reference: reference.trim(),
        notes: formattedNotes,
        type: 'ADJUSTMENT',
        userId: operatorId,
      });

      onSetStatusMessage({
        text:
          res.message ||
          `Inventory adjustment ${reference} committed: delta of ${
            calculatedDelta > 0 ? `+${calculatedDelta}` : calculatedDelta
          } applied.`,
        type: 'success',
      });

      onOperationSuccess();
      setReference(`ADJ-${Date.now().toString().slice(-6)}`);
      setDirectDeltaInput(0);
    } catch (err: any) {
      onSetStatusMessage({
        text: err.response?.data?.error || err.message || 'Inventory adjustment failed.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677]">Reconciliations</span>
            <Scale className="w-4 h-4 text-[#8c5e15]" />
          </div>
          <div className="text-2xl font-black text-[#122b39] mt-1">{historicalAdjustments.length}</div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Audit events recorded</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677]">Surplus Discovered</span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">+{totalPositiveSurplus}</div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Found untracked inventory</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677]">Shrinkage Discrepancy</span>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-700 mt-1">-{totalNegativeShrinkage}</div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Missing or lost stock</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677]">Threshold Control</span>
            <ShieldCheck className="w-4 h-4 text-[#1e6091]" />
          </div>
          <div className="text-sm font-black text-[#122b39] mt-2">Active (+/-20 or $500)</div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Dual-approval safeguard</div>
        </div>
      </div>

      {/* Main Grid: Form Left (8 cols) & Live Balance Matrix Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Adjustment Form */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#e5e1d5] p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0ece2] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                  <SlidersHorizontal className="w-4 h-4" />
                </span>
                <h2 className="text-lg font-black text-[#122b39] tracking-tight">
                  Inventory Reconciliation & Adjustment
                </h2>
              </div>
              <p className="text-xs text-[#526677] mt-0.5">
                Adjust stock levels following cycle counts, packaging recounts, or variance investigations.
              </p>
            </div>

            {/* Adjustment Mode Selector */}
            <div className="flex items-center p-1 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setAdjustMode('COUNT_RECONCILE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  adjustMode === 'COUNT_RECONCILE'
                    ? 'bg-[#122b39] text-white shadow-xs'
                    : 'text-[#526677] hover:text-[#122b39]'
                }`}
              >
                Physical Count Reconcile
              </button>
              <button
                type="button"
                onClick={() => setAdjustMode('DIRECT_DELTA')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  adjustMode === 'DIRECT_DELTA'
                    ? 'bg-[#122b39] text-white shadow-xs'
                    : 'text-[#526677] hover:text-[#122b39]'
                }`}
              >
                Direct Delta (+/-)
              </button>
            </div>
          </div>

          <form onSubmit={handleExecuteAdjustment} className="space-y-5 text-xs">
            {/* SKU Search & Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold uppercase tracking-wider text-[#526677]">
                  Product / SKU *
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
                    placeholder="Search SKU or name..."
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

            {/* Storage Bay & Count Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location Bay */}
              <div className="bg-[#faf9f6] p-4 rounded-xl border border-[#e5e1d5] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold uppercase tracking-wider text-[#8c5e15]">
                    Storage Bay Location *
                  </label>
                  <span className="font-mono text-xs font-bold text-[#122b39]">
                    System Book: {bookStockAtLocation} {currentProduct?.unitOfMeasure || 'EA'}
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

              {/* Quantity Input based on Mode */}
              <div className="bg-[#faf9f6] p-4 rounded-xl border border-[#e5e1d5] space-y-2">
                {adjustMode === 'COUNT_RECONCILE' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="font-bold uppercase tracking-wider text-[#526677]">
                        Actual Physical Count on Shelf *
                      </label>
                      <span
                        className={`font-mono text-xs font-bold ${
                          calculatedDelta > 0
                            ? 'text-emerald-700'
                            : calculatedDelta < 0
                            ? 'text-red-700'
                            : 'text-[#7a8b99]'
                        }`}
                      >
                        Delta: {calculatedDelta > 0 ? `+${calculatedDelta}` : calculatedDelta}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        required
                        value={physicalCountInput}
                        onChange={(e) => setPhysicalCountInput(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 bg-white border border-[#e5e1d5] rounded-lg font-mono font-bold text-[#122b39] text-sm focus:outline-none focus:border-[#122b39]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7a8b99]">
                        {currentProduct?.unitOfMeasure || 'EA'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="font-bold uppercase tracking-wider text-[#526677]">
                        Direct Adjustment Delta (+ / -) *
                      </label>
                      <span className="font-mono text-xs text-[#7a8b99]">
                        e.g. +5 or -3
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        value={directDeltaInput}
                        onChange={(e) => setDirectDeltaInput(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 bg-white border border-[#e5e1d5] rounded-lg font-mono font-bold text-[#122b39] text-sm focus:outline-none focus:border-[#122b39]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7a8b99]">
                        {currentProduct?.unitOfMeasure || 'EA'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* High Variance Warning Alert */}
            {isHighVariance && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-bold block">
                    High-Variance Reconciliation Detected (Variance: {calculatedDelta > 0 ? `+${calculatedDelta}` : calculatedDelta} units | ${Math.abs(valuationImpact).toLocaleString()})
                  </span>
                  <p className="text-[11px] text-amber-800">
                    Discrepancy exceeds standard operational tolerance. A mandatory Senior Supervisor Sign-off badge is required below.
                  </p>
                </div>
              </div>
            )}

            {/* Standard Reason Code Taxonomy */}
            <div>
              <label className="block font-bold uppercase tracking-wider text-[#526677] mb-2">
                Audit Reason Code *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {ADJUSTMENT_REASONS.map((rc) => {
                  const isSelected = reasonCode === rc.id;
                  return (
                    <button
                      key={rc.id}
                      type="button"
                      onClick={() => setReasonCode(rc.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs'
                          : 'border-[#e5e1d5] bg-[#faf9f6] text-[#122b39] hover:bg-[#f0ece2]'
                      }`}
                    >
                      <div className="font-bold text-xs mb-1">{rc.name}</div>
                      <span className={`text-[10px] ${isSelected ? 'text-purple-800' : 'text-[#7a8b99]'}`}>
                        {rc.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reference, Operator, Supervisor Signoff */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1">
                  Reconciliation Ref # *
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
                  Operator Badge ID
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
                  Supervisor Sign-off {isHighVariance ? '*' : ''}
                </label>
                <input
                  type="text"
                  value={supervisorSignoff}
                  onChange={(e) => setSupervisorSignoff(e.target.value)}
                  placeholder="Required for high variance"
                  className={`w-full px-3 py-2 bg-[#faf9f6] border rounded-lg font-mono ${
                    isHighVariance && !supervisorSignoff.trim()
                      ? 'border-red-400 bg-red-50 text-red-900'
                      : 'border-[#e5e1d5] text-[#122b39]'
                  }`}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1">
                Audit Reconciliation Notes & Justification
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain the cause of variance, recount findings, or shelf conditions..."
                className="w-full px-3 py-2 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
              />
            </div>

            {/* Submit Row */}
            <div className="pt-4 border-t border-[#f0ece2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[11px] text-[#7a8b99]">
                Ending Bay Balance: <span className="font-mono font-bold text-[#122b39]">{computedEndingStock} units</span> ({calculatedDelta > 0 ? `+${calculatedDelta}` : calculatedDelta})
              </div>

              <button
                type="submit"
                disabled={isSubmitting || calculatedDelta === 0 || (isHighVariance && !supervisorSignoff.trim())}
                className="px-5 py-2.5 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 transition"
              >
                <Check className="w-4 h-4 text-[#e5a329]" />
                <span>{isSubmitting ? 'Posting Adjustment...' : 'Commit Inventory Adjustment'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Balance Reconciliation Matrix */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-[#e5e1d5] p-5 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#f0ece2] pb-3">
              <span className="font-bold uppercase tracking-wider text-[#526677] text-[10px]">
                Reconciliation Matrix
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f6f4ed] text-[#7a8b99] border border-[#e2ded2]">
                Live Delta
              </span>
            </div>

            {/* Balance Impact */}
            <div className="p-4 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] space-y-2.5 font-mono">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#7a8b99]">Pre-Audit Book Stock:</span>
                <span className="font-bold text-[#122b39]">{bookStockAtLocation} units</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#7a8b99]">Reconciled Count / Delta:</span>
                <span
                  className={`font-black ${
                    calculatedDelta > 0
                      ? 'text-emerald-700'
                      : calculatedDelta < 0
                      ? 'text-red-700'
                      : 'text-[#122b39]'
                  }`}
                >
                  {calculatedDelta > 0 ? `+${calculatedDelta}` : calculatedDelta} units
                </span>
              </div>
              <div className="pt-2 border-t border-[#e5e1d5] flex justify-between items-center text-sm font-bold">
                <span className="text-[#122b39]">Post-Audit Ending Stock:</span>
                <span className="font-black text-[#122b39]">{computedEndingStock} units</span>
              </div>
            </div>

            {/* Financial Valuation Impact */}
            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5 font-mono">
              <div className="text-[10px] uppercase font-bold text-purple-900">
                Inventory Valuation Variance
              </div>
              <div className="text-2xl font-black text-purple-900">
                {valuationImpact > 0 ? `+$${valuationImpact.toLocaleString()}` : `-$${Math.abs(valuationImpact).toLocaleString()}`}
              </div>
              <div className="text-[11px] text-purple-800 flex justify-between pt-1 border-t border-purple-200">
                <span>Unit Cost: ${unitCost.toFixed(2)}</span>
                <span>Impact: {calculatedDelta >= 0 ? 'Surplus Credit' : 'Shrinkage Write-Down'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] flex items-start gap-2 text-[11px] text-[#526677]">
              <Info className="w-4 h-4 text-[#8c5e15] shrink-0 mt-0.5" />
              <div>
                Adjustments directly update bay stock snapshots and generate an immutable ledger record.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Inventory Adjustments Table */}
      <div className="bg-white rounded-2xl border border-[#e5e1d5] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-purple-700" />
            <h3 className="font-black text-sm text-[#122b39]">
              Recent Inventory Adjustments ({historicalAdjustments.length})
            </h3>
          </div>
          <span className="text-xs text-[#7a8b99]">Audited stock reconciliation records</span>
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
                  <th className="py-2.5 px-3.5 text-right">Adjustment Delta</th>
                  <th className="py-2.5 px-3.5">Operator</th>
                  <th className="py-2.5 px-3.5">Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ece2] font-mono">
                {historicalAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#7a8b99] font-sans">
                      No adjustments logged in this ledger period.
                    </td>
                  </tr>
                ) : (
                  historicalAdjustments.map((m) => {
                    const isPositive = m.quantity > 0;
                    return (
                      <tr key={m.id} className="hover:bg-[#faf9f6]">
                        <td className="py-2.5 px-3.5 whitespace-nowrap text-[#7a8b99] text-[11px]">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap font-bold text-purple-800">
                          {m.reference || m.id.slice(0, 10)}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap font-sans">
                          <div className="font-mono font-bold text-[#122b39]">{m.sku}</div>
                          <div className="text-[11px] text-[#7a8b99] truncate max-w-xs">{m.productName}</div>
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap font-sans text-[#122b39]">
                          {m.fromLocationName || m.toLocationName || '—'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-black">
                          <span className={isPositive ? 'text-emerald-700' : 'text-red-700'}>
                            {isPositive ? `+${m.quantity}` : m.quantity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap text-[#7a8b99] text-[11px] font-sans">
                          {m.userId || 'OPERATOR'}
                        </td>
                        <td className="py-2.5 px-3.5 font-sans text-[11px] text-[#526677] truncate max-w-xs">
                          {m.notes || '—'}
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
    </div>
  );
};
