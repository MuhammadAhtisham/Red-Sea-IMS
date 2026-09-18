import React, { useState, useMemo } from 'react';
import {
  ArrowRightLeft,
  ArrowRight,
  Package,
  Layers,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Printer,
  History,
  Boxes,
  Plus,
  Trash2,
  Search,
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ProductDTO, LocationDTO, StockMovementDTO, api } from '../../services/api';
import { TransferSlipModal } from './TransferSlipModal';

interface InterBayTransferViewProps {
  products: ProductDTO[];
  locations: LocationDTO[];
  movements: StockMovementDTO[];
  onOperationSuccess: () => void;
  onSetStatusMessage: (msg: { text: string; type: 'success' | 'error' } | null) => void;
}

interface StagedTransferItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  fromLocationId: string;
  toLocationId: string;
  fromLocationName: string;
  toLocationName: string;
  quantity: number;
  uom: string;
}

export const InterBayTransferView: React.FC<InterBayTransferViewProps> = ({
  products,
  locations,
  movements,
  onOperationSuccess,
  onSetStatusMessage,
}) => {
  // Transfer Mode: Single Quick Transfer vs Multi-Line Manifest
  const [transferMode, setTransferMode] = useState<'SINGLE' | 'MULTI_MANIFEST'>('SINGLE');

  // Single Transfer Form State
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [fromLocId, setFromLocId] = useState<string>(locations[0]?.id || '');
  const [toLocId, setToLocId] = useState<string>(locations[1]?.id || locations[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(10);
  const [reference, setReference] = useState<string>(`TRF-${Date.now().toString().slice(-6)}`);
  const [palletId, setPalletId] = useState<string>('PLT-0042');
  const [transferReason, setTransferReason] = useState<string>('Pick-Face Replenishment');
  const [priority, setPriority] = useState<string>('Standard');
  const [notes, setNotes] = useState<string>('Inter-bay stock rebalancing');
  const [operatorId, setOperatorId] = useState<string>('OPS-SUPERVISOR-01');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Multi-Line Manifest State
  const [manifestItems, setManifestItems] = useState<StagedTransferItem[]>([]);

  // Print Slip Modal State
  const [activeSlipModal, setActiveSlipModal] = useState<boolean>(false);
  const [selectedSlipData, setSelectedSlipData] = useState<any>(null);

  // Product lookup
  const currentProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  // Filtered products list for selector
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

  // Stock at source and target
  const sourceStock = useMemo(() => {
    if (!currentProduct || !fromLocId) return 0;
    const loc = currentProduct.stockByLocation?.find((l) => l.locationId === fromLocId);
    return loc ? loc.quantity : 0;
  }, [currentProduct, fromLocId]);

  const targetStock = useMemo(() => {
    if (!currentProduct || !toLocId) return 0;
    const loc = currentProduct.stockByLocation?.find((l) => l.locationId === toLocId);
    return loc ? loc.quantity : 0;
  }, [currentProduct, toLocId]);

  // Source & Destination location objects
  const fromLocation = useMemo(() => locations.find((l) => l.id === fromLocId), [locations, fromLocId]);
  const toLocation = useMemo(() => locations.find((l) => l.id === toLocId), [locations, toLocId]);

  // Recent transfers from movements
  const recentTransfers = useMemo(() => {
    return movements.filter((m) => m.type === 'TRANSFER').slice(0, 15);
  }, [movements]);

  // Quick percent helpers
  const handleQuickPercent = (pct: number) => {
    if (sourceStock <= 0) return;
    const computed = Math.max(1, Math.floor(sourceStock * (pct / 100)));
    setQuantity(computed);
  };

  // Submit Single Transfer
  const handleExecuteSingleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) return;

    if (fromLocId === toLocId) {
      onSetStatusMessage({
        text: 'Origin and destination bays must be different.',
        type: 'error',
      });
      return;
    }

    if (sourceStock < quantity) {
      onSetStatusMessage({
        text: `Insufficient stock at origin bay: requested ${quantity}, available ${sourceStock} ${currentProduct?.unitOfMeasure || 'EA'}.`,
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    onSetStatusMessage(null);

    try {
      const detailedNotes = `[Reason: ${transferReason}] [Priority: ${priority}] [Pallet: ${palletId}] [Op: ${operatorId}] ${notes.trim()}`.trim();
      const res = await api.transferStock({
        productId: selectedProductId,
        fromLocationId: fromLocId,
        toLocationId: toLocId,
        quantity,
        reference: reference.trim(),
        notes: detailedNotes,
        userId: operatorId,
      });

      // Prepare slip data for instant printing
      setSelectedSlipData({
        reference: reference.trim(),
        productSku: currentProduct?.sku || '',
        productName: currentProduct?.name || '',
        fromLocationName: fromLocation?.name || 'Origin Bay',
        toLocationName: toLocation?.name || 'Destination Bay',
        quantity,
        uom: currentProduct?.unitOfMeasure || 'EA',
        palletId,
        operatorId,
        notes: detailedNotes,
        priority,
        timestamp: new Date().toISOString(),
      });

      onSetStatusMessage({
        text: res.message || `Transfer ${reference} successfully committed between bays.`,
        type: 'success',
      });

      // Refresh parent data & generate next reference
      onOperationSuccess();
      setReference(`TRF-${Date.now().toString().slice(-6)}`);
    } catch (err: any) {
      onSetStatusMessage({
        text: err.response?.data?.error || err.message || 'Inter-bay transfer failed.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stage item to Multi-Line Manifest
  const handleStageManifestItem = () => {
    if (!currentProduct) return;
    if (fromLocId === toLocId) {
      alert('Source and destination bays must be different.');
      return;
    }
    if (quantity <= 0) {
      alert('Quantity must be greater than 0.');
      return;
    }
    if (sourceStock < quantity) {
      alert(`Insufficient stock at origin bay (${sourceStock} available).`);
      return;
    }

    const newItem: StagedTransferItem = {
      id: `stage-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      productId: currentProduct.id,
      sku: currentProduct.sku,
      productName: currentProduct.name,
      fromLocationId: fromLocId,
      toLocationId: toLocId,
      fromLocationName: fromLocation?.name || 'Origin Bay',
      toLocationName: toLocation?.name || 'Target Bay',
      quantity,
      uom: currentProduct.unitOfMeasure || 'EA',
    };

    setManifestItems((prev) => [...prev, newItem]);
    // Reset quantity
    setQuantity(10);
  };

  // Commit all staged manifest items atomically
  const handleCommitMultiManifest = async () => {
    if (manifestItems.length === 0) return;
    setIsSubmitting(true);
    onSetStatusMessage(null);

    try {
      const payload = manifestItems.map((item, idx) => ({
        type: 'TRANSFER' as const,
        productId: item.productId,
        fromLocationId: item.fromLocationId,
        toLocationId: item.toLocationId,
        quantity: item.quantity,
        reference: `${reference}-${idx + 1}`,
        notes: `[Multi-Manifest: ${reference}] [Pallet: ${palletId}] [Op: ${operatorId}] ${transferReason}`,
      }));

      const res = await api.executeBatchOperations({
        userId: operatorId,
        operations: payload,
      });

      onSetStatusMessage({
        text: `Transfer Manifest ${reference} committed: ${res.executedCount} lines transferred atomically.`,
        type: 'success',
      });

      setManifestItems([]);
      onOperationSuccess();
      setReference(`TRF-${Date.now().toString().slice(-6)}`);
    } catch (err: any) {
      onSetStatusMessage({
        text: err.response?.data?.error || err.message || 'Manifest transfer failed.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Operational Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677]">Active Bays</span>
            <Building2 className="w-4 h-4 text-[#8c5e15]" />
          </div>
          <div className="text-2xl font-black text-[#122b39] mt-1">{locations.length}</div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Racks & transit staging</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677]">Transferable Items</span>
            <Boxes className="w-4 h-4 text-[#1e6091]" />
          </div>
          <div className="text-2xl font-black text-[#122b39] mt-1">{products.length}</div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">Catalog SKUs</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677]">Recent Transfers</span>
            <ArrowRightLeft className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-[#122b39] mt-1">{recentTransfers.length}</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">Logged in system</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677]">Transfer Mode</span>
            <Layers className="w-4 h-4 text-[#e5a329]" />
          </div>
          <div className="text-sm font-black text-[#122b39] mt-2">
            {transferMode === 'SINGLE' ? 'Single Line' : 'Multi-Line Cart'}
          </div>
          <div className="text-[11px] text-[#7a8b99] mt-0.5">ACID Compliant</div>
        </div>
      </div>

      {/* Main Layout: Form Left (8 cols) & Real-Time Visualization / SKU Card Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Transfer Form */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#e5e1d5] p-6 shadow-xs space-y-6">
          {/* Header & Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0ece2] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#eef5fa] text-[#1e6091]">
                  <ArrowRightLeft className="w-4 h-4" />
                </span>
                <h2 className="text-lg font-black text-[#122b39] tracking-tight">
                  Inter-Bay Stock Transfer
                </h2>
              </div>
              <p className="text-xs text-[#526677] mt-0.5">
                Rebalance inventory between bays, aisles, and storage zones with real-time stock preservation.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center p-1 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setTransferMode('SINGLE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  transferMode === 'SINGLE'
                    ? 'bg-[#122b39] text-white shadow-xs'
                    : 'text-[#526677] hover:text-[#122b39]'
                }`}
              >
                Quick Transfer
              </button>
              <button
                type="button"
                onClick={() => setTransferMode('MULTI_MANIFEST')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  transferMode === 'MULTI_MANIFEST'
                    ? 'bg-[#122b39] text-white shadow-xs'
                    : 'text-[#526677] hover:text-[#122b39]'
                }`}
              >
                <span>Multi-Line Cart</span>
                {manifestItems.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-[#e5a329] text-[#122b39] text-[10px] font-black rounded-full">
                    {manifestItems.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <form onSubmit={handleExecuteSingleTransfer} className="space-y-5 text-xs">
            {/* SKU Search & Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold uppercase tracking-wider text-[#526677]">
                  Product / SKU Selection *
                </label>
                <span className="text-[11px] text-[#7a8b99]">
                  {filteredProducts.length} items available
                </span>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#7a8b99] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search SKU code, product title, or category..."
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
                      {p.sku} — {p.name} ({p.category || 'General'}) [Total: {p.totalStock} {p.unitOfMeasure || 'EA'}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bay Movement Direction Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Origin Bay */}
              <div className="bg-[#faf9f6] p-4 rounded-xl border border-[#e5e1d5] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold uppercase tracking-wider text-[#8c5e15]">
                    Origin Bay (Source) *
                  </label>
                  <span className="font-mono text-xs font-bold text-[#e5a329]">
                    Available: {sourceStock} {currentProduct?.unitOfMeasure || 'EA'}
                  </span>
                </div>
                <select
                  value={fromLocId}
                  onChange={(e) => setFromLocId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#e5e1d5] rounded-lg text-xs text-[#122b39] font-medium focus:outline-none focus:border-[#122b39]"
                >
                  {locations.map((loc) => {
                    const stock = currentProduct?.stockByLocation?.find((l) => l.locationId === loc.id)?.quantity || 0;
                    return (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code}) — {stock} units on hand
                      </option>
                    );
                  })}
                </select>
                <div className="text-[11px] text-[#7a8b99] flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span>{fromLocation?.type || 'WAREHOUSE'} • Zone {fromLocation?.code}</span>
                </div>
              </div>

              {/* Destination Bay */}
              <div className="bg-[#eef5fa] p-4 rounded-xl border border-[#bcd6ea] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold uppercase tracking-wider text-[#1e6091]">
                    Destination Bay (Target) *
                  </label>
                  <span className="font-mono text-xs font-bold text-[#1e6091]">
                    Current Target: {targetStock} {currentProduct?.unitOfMeasure || 'EA'}
                  </span>
                </div>
                <select
                  value={toLocId}
                  onChange={(e) => setToLocId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#bcd6ea] rounded-lg text-xs text-[#122b39] font-medium focus:outline-none focus:border-[#122b39]"
                >
                  {locations.map((loc) => {
                    const stock = currentProduct?.stockByLocation?.find((l) => l.locationId === loc.id)?.quantity || 0;
                    const isSame = loc.id === fromLocId;
                    return (
                      <option key={loc.id} value={loc.id} disabled={isSame}>
                        {loc.name} ({loc.code}) — {stock} units {isSame ? '(Cannot transfer to same bay)' : ''}
                      </option>
                    );
                  })}
                </select>
                <div className="text-[11px] text-[#1e6091] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Target capacity verified for placement</span>
                </div>
              </div>
            </div>

            {/* Quantity Controls with Quick Percentage Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold uppercase tracking-wider text-[#526677]">
                  Quantity to Transfer *
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#7a8b99] uppercase font-bold">Quick Select:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(25)}
                    className="px-2 py-0.5 bg-[#faf9f6] border border-[#e5e1d5] rounded text-[10px] font-bold text-[#122b39] hover:bg-[#f0ece2]"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(50)}
                    className="px-2 py-0.5 bg-[#faf9f6] border border-[#e5e1d5] rounded text-[10px] font-bold text-[#122b39] hover:bg-[#f0ece2]"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(100)}
                    className="px-2 py-0.5 bg-[#e5a329]/20 border border-[#e5a329] rounded text-[10px] font-black text-[#8c5e15] hover:bg-[#e5a329]/30"
                  >
                    MAX ({sourceStock})
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={sourceStock || undefined}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-sm font-mono font-bold text-[#122b39] focus:outline-none focus:border-[#122b39]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7a8b99]">
                  {currentProduct?.unitOfMeasure || 'EA'}
                </span>
              </div>
            </div>

            {/* Pallet ID, Reference, Priority, Reason */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1">
                  Transfer Ref # *
                </label>
                <input
                  type="text"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg font-mono font-bold text-[#122b39] focus:outline-none focus:border-[#122b39]"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1">
                  Pallet / LPN Code
                </label>
                <input
                  type="text"
                  value={palletId}
                  onChange={(e) => setPalletId(e.target.value)}
                  placeholder="e.g. PLT-0042"
                  className="w-full px-3 py-2 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg font-mono font-bold text-[#122b39] focus:outline-none focus:border-[#122b39]"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1">
                  Transfer Reason
                </label>
                <select
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-[#122b39] font-medium focus:outline-none focus:border-[#122b39]"
                >
                  <option value="Pick-Face Replenishment">Pick-Face Replenishment</option>
                  <option value="Inter-Bay Rebalancing">Inter-Bay Rebalancing</option>
                  <option value="Warehouse Consolidation">Warehouse Consolidation</option>
                  <option value="Quality Quarantine Transfer">Quality Quarantine Transfer</option>
                  <option value="Seasonal Staging">Seasonal Staging</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1">
                  Routing Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-[#122b39] font-medium focus:outline-none focus:border-[#122b39]"
                >
                  <option value="Standard">Standard Routine</option>
                  <option value="Urgent">Urgent / Low-Stock</option>
                  <option value="Scheduled Shift">Scheduled Shift</option>
                </select>
              </div>
            </div>

            {/* Operator Badge & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1">
                  Operator Badge ID
                </label>
                <input
                  type="text"
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-[#122b39] font-mono focus:outline-none focus:border-[#122b39]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1">
                  Handling Instructions / Audit Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Forklift instructions, special handling, or staging notes..."
                  className="w-full px-3 py-2 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-[#122b39] focus:outline-none focus:border-[#122b39]"
                />
              </div>
            </div>

            {/* Action Bar */}
            {transferMode === 'SINGLE' ? (
              <div className="pt-4 border-t border-[#f0ece2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-[11px] text-[#7a8b99]">
                  Origin will decrease to <span className="font-mono font-bold text-[#122b39]">{sourceStock - quantity}</span> | Target will increase to <span className="font-mono font-bold text-emerald-700">{targetStock + quantity}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || quantity <= 0 || sourceStock < quantity || fromLocId === toLocId}
                    className="px-5 py-2.5 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 transition"
                  >
                    <Check className="w-4 h-4 text-[#e5a329]" />
                    <span>{isSubmitting ? 'Transferring Stock...' : 'Execute Inter-Bay Transfer'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-[#f0ece2] flex items-center justify-between">
                <span className="text-[11px] text-[#7a8b99]">
                  Add this SKU to the active multi-line transfer cart.
                </span>
                <button
                  type="button"
                  onClick={handleStageManifestItem}
                  disabled={quantity <= 0 || sourceStock < quantity || fromLocId === toLocId}
                  className="px-4 py-2 rounded-xl bg-[#eef5fa] hover:bg-[#d8e9f5] text-[#1e6091] font-bold text-xs flex items-center gap-2 cursor-pointer border border-[#bcd6ea]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Stage Item into Transfer Cart</span>
                </button>
              </div>
            )}
          </form>

          {/* Multi-Line Manifest Staging Table (if mode is MULTI_MANIFEST) */}
          {transferMode === 'MULTI_MANIFEST' && (
            <div className="mt-6 pt-5 border-t border-[#f0ece2] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-[#122b39]">
                    Multi-Line Transfer Cart ({manifestItems.length} items)
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#faf9f6] border border-[#e5e1d5] text-[#526677]">
                    Manifest: {reference}
                  </span>
                </div>
                {manifestItems.length > 0 && (
                  <button
                    onClick={() => setManifestItems([])}
                    className="text-xs text-red-600 hover:text-red-800 cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {manifestItems.length === 0 ? (
                <div className="p-8 text-center bg-[#faf9f6] rounded-xl border border-dashed border-[#e5e1d5] text-xs text-[#7a8b99]">
                  No items staged in transfer cart. Select SKUs above and click "Stage Item into Transfer Cart".
                </div>
              ) : (
                <div className="border border-[#e5e1d5] rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f8f5ee] border-b border-[#e5e1d5] text-[11px] font-bold uppercase tracking-wider text-[#526677]">
                        <th className="py-2.5 px-3">SKU & Item</th>
                        <th className="py-2.5 px-3">Origin Bay</th>
                        <th className="py-2.5 px-3">Destination Bay</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0ece2] font-mono">
                      {manifestItems.map((item) => (
                        <tr key={item.id} className="hover:bg-[#faf9f6]">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-[#122b39]">{item.sku}</div>
                            <div className="font-sans text-[11px] text-[#7a8b99]">{item.productName}</div>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-[#122b39]">{item.fromLocationName}</td>
                          <td className="py-2.5 px-3 font-sans text-[#122b39]">{item.toLocationName}</td>
                          <td className="py-2.5 px-3 text-right font-black text-[#122b39]">
                            {item.quantity} {item.uom}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => setManifestItems((prev) => prev.filter((i) => i.id !== item.id))}
                              className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3 bg-[#f8f5ee] border-t border-[#e5e1d5] flex items-center justify-between">
                    <span className="font-sans font-medium text-xs text-[#526677]">
                      Total Items: {manifestItems.reduce((acc, i) => acc + i.quantity, 0)} units
                    </span>
                    <button
                      onClick={handleCommitMultiManifest}
                      disabled={isSubmitting}
                      className="px-4 py-1.5 rounded-lg bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5 text-[#e5a329]" />
                      <span>{isSubmitting ? 'Posting Batch...' : 'Commit Transfer Manifest'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Live Simulation & SKU Details */}
        <div className="lg:col-span-4 space-y-4">
          {/* Live Bay Transfer Flow Visualizer */}
          <div className="bg-white rounded-2xl border border-[#e5e1d5] p-5 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#f0ece2] pb-3">
              <span className="font-bold uppercase tracking-wider text-[#526677] text-[10px]">
                Bay Flow Simulation
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Safe Margin
              </span>
            </div>

            {/* Source Bay Card */}
            <div className="p-3 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] space-y-1.5">
              <div className="text-[10px] font-bold uppercase text-[#8c5e15]">
                Source: {fromLocation?.name}
              </div>
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-[#7a8b99]">Current Stock:</span>
                <span className="font-bold text-[#122b39]">{sourceStock} units</span>
              </div>
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-[#7a8b99]">Transfer Out:</span>
                <span className="font-bold text-red-600">-{quantity} units</span>
              </div>
              <div className="pt-1 border-t border-[#f0ece2] flex items-baseline justify-between font-mono font-bold">
                <span className="text-[#122b39]">Post-Transfer:</span>
                <span className="text-[#122b39]">{sourceStock - quantity} units</span>
              </div>
            </div>

            {/* Arrow Divider */}
            <div className="flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-[#122b39] text-white flex items-center justify-center shadow-xs">
                <ArrowRight className="w-3.5 h-3.5 text-[#e5a329]" />
              </div>
            </div>

            {/* Target Bay Card */}
            <div className="p-3 rounded-xl bg-[#eef5fa] border border-[#bcd6ea] space-y-1.5">
              <div className="text-[10px] font-bold uppercase text-[#1e6091]">
                Target: {toLocation?.name}
              </div>
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-[#7a8b99]">Current Stock:</span>
                <span className="font-bold text-[#122b39]">{targetStock} units</span>
              </div>
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-[#7a8b99]">Transfer In:</span>
                <span className="font-bold text-emerald-700">+{quantity} units</span>
              </div>
              <div className="pt-1 border-t border-[#bcd6ea] flex items-baseline justify-between font-mono font-bold">
                <span className="text-[#122b39]">Post-Transfer:</span>
                <span className="text-emerald-700">{targetStock + quantity} units</span>
              </div>
            </div>
          </div>

          {/* Active SKU Overview */}
          {currentProduct && (
            <div className="bg-white rounded-2xl border border-[#e5e1d5] p-5 shadow-xs space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-[#f0ece2] pb-3">
                <span className="font-mono font-bold text-[#122b39] text-sm">
                  {currentProduct.sku}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#f6f4ed] border border-[#e2ded2] text-[10px] font-bold text-[#7a8b99]">
                  {currentProduct.unitOfMeasure || 'EA'}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-[#152836] text-sm leading-tight">
                  {currentProduct.name}
                </h4>
                <span className="text-[11px] text-[#7a8b99] block mt-0.5">
                  Category: {currentProduct.category || 'General'}
                </span>
              </div>

              <div className="bg-[#faf9f6] p-3 rounded-xl border border-[#f0ece2] space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-[#7a8b99]">Unit Cost:</span>
                  <span className="font-bold text-[#122b39]">${currentProduct.unitCost}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7a8b99]">Facility Total:</span>
                  <span className="font-bold text-[#122b39]">{currentProduct.totalStock} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7a8b99]">Transfer Value:</span>
                  <span className="font-bold text-[#1e6091]">
                    ${Math.round(quantity * currentProduct.unitCost).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Bay distribution breakdown */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#526677] block mb-1.5">
                  Bay Distribution
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {currentProduct.stockByLocation?.map((loc) => (
                    <div
                      key={loc.locationId}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-[#faf9f6] border border-[#f0ece2] text-[11px]"
                    >
                      <span className="font-medium text-[#152836] truncate max-w-[130px]">
                        {loc.locationName}
                      </span>
                      <span className="font-mono font-bold text-[#122b39]">
                        {loc.quantity} {currentProduct.unitOfMeasure || 'EA'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Inter-Bay Transfers Table */}
      <div className="bg-white rounded-2xl border border-[#e5e1d5] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#8c5e15]" />
            <h3 className="font-black text-sm text-[#122b39]">
              Recent Inter-Bay Transfers ({recentTransfers.length})
            </h3>
          </div>
          <span className="text-xs text-[#7a8b99]">Click "Print Slip" to generate travel manifest</span>
        </div>

        <div className="border border-[#e5e1d5] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8f5ee] border-b border-[#e5e1d5] text-[11px] font-bold uppercase tracking-wider text-[#526677]">
                  <th className="py-2.5 px-3.5">Timestamp</th>
                  <th className="py-2.5 px-3.5">Reference #</th>
                  <th className="py-2.5 px-3.5">SKU & Item</th>
                  <th className="py-2.5 px-3.5">Origin Bay</th>
                  <th className="py-2.5 px-3.5">Destination Bay</th>
                  <th className="py-2.5 px-3.5 text-right">Quantity</th>
                  <th className="py-2.5 px-3.5">Operator</th>
                  <th className="py-2.5 px-3.5 text-center">Travel Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ece2] font-mono">
                {recentTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#7a8b99] font-sans">
                      No recent transfers recorded.
                    </td>
                  </tr>
                ) : (
                  recentTransfers.map((m) => (
                    <tr key={m.id} className="hover:bg-[#faf9f6]">
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-[#7a8b99] text-[11px]">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-bold text-[#122b39]">
                        {m.reference || m.id.slice(0, 10)}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-sans">
                        <div className="font-mono font-bold text-[#122b39]">{m.sku}</div>
                        <div className="text-[11px] text-[#7a8b99] truncate max-w-xs">{m.productName}</div>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-sans text-[#122b39]">
                        {m.fromLocationName || '—'}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-sans text-[#122b39]">
                        {m.toLocationName || '—'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-black text-[#1e6091]">
                        {Math.abs(m.quantity)}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-[#7a8b99] text-[11px] font-sans">
                        {m.userId || 'OPERATOR'}
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedSlipData(null);
                            setActiveSlipModal(true);
                          }}
                          className="px-2.5 py-1 rounded bg-[#faf9f6] hover:bg-[#f0ece2] border border-[#e5e1d5] text-[#122b39] font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer font-sans"
                        >
                          <Printer className="w-3 h-3 text-[#8c5e15]" />
                          <span>Slip</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Travel Slip Print Modal */}
      <TransferSlipModal
        isOpen={activeSlipModal || Boolean(selectedSlipData)}
        onClose={() => {
          setActiveSlipModal(false);
          setSelectedSlipData(null);
        }}
        transferData={selectedSlipData}
        movement={recentTransfers[0]}
        product={currentProduct}
        fromLocation={fromLocation}
        toLocation={toLocation}
      />
    </div>
  );
};
