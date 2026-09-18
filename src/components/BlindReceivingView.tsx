// Enterprise Blind Inbound Receiving Engine & Virtual Quarantine Variance Manager
import React, { useState, useEffect } from 'react';
import {
  Package,
  Barcode,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Truck,
  EyeOff,
  Search,
  Scan,
  Warehouse,
  History,
  Check,
  XCircle,
  ExternalLink,
  Layers,
  Sparkles,
  ClipboardCheck,
  FileCheck2,
  FileX,
  UserCheck,
} from 'lucide-react';
import {
  api,
  PurchaseOrderDTO,
  GoodsReceiptDTO,
  BarcodeLookupDTO,
  LocationDTO,
  UserDTO,
} from '../services/api';

interface BlindReceivingViewProps {
  currentUser?: UserDTO | null;
  locations: LocationDTO[];
}

export const BlindReceivingView: React.FC<BlindReceivingViewProps> = ({
  currentUser,
  locations,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'DOCK_SCANNER' | 'QUARANTINE_DESK'>('DOCK_SCANNER');

  // Purchase Orders & Inbound data
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDTO[]>([]);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrderDTO | null>(null);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceiptDTO[]>([]);
  const [loading, setLoading] = useState(false);

  // Scanner State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [packageQtyInput, setPackageQtyInput] = useState<number>(1);
  const [lookupResult, setLookupResult] = useState<BarcodeLookupDTO | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Scanned lines in current dock session
  const [scannedItems, setScannedItems] = useState<
    {
      productId: string;
      productName: string;
      productSku: string;
      scannedBarcode: string;
      scannedQty: number; // packages counted
      packageLevel: 'EACH' | 'INNER_PACK' | 'CASE' | 'PALLET';
      conversionRatio: number;
      baseQtyConverted: number; // e.g. 5 cases * 24 = 120 eaches
    }[]
  >([]);

  // Submission & Resolution State
  const [submitting, setSubmitting] = useState(false);
  const [receiptFeedback, setReceiptFeedback] = useState<{
    receipt: GoodsReceiptDTO;
    hasVariance: boolean;
    quarantined: boolean;
    message: string;
  } | null>(null);

  // Manager Resolution State
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionAction, setResolutionAction] = useState<'ACCEPT_VARIANCE' | 'GENERATE_RTV' | 'TRIGGER_RECOUNT'>('ACCEPT_VARIANCE');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pos, receipts] = await Promise.all([
        api.getReceivingPurchaseOrders(),
        api.getGoodsReceipts(),
      ]);
      setPurchaseOrders(pos);
      setGoodsReceipts(receipts);
      if (pos.length > 0 && !selectedPo) {
        setSelectedPo(pos[0]);
      }
    } catch (e) {
      console.error('Failed to load receiving data', e);
    } finally {
      setLoading(false);
    }
  };

  // Perform dynamic barcode lookup across base product & packaging tiers
  const handleBarcodeLookup = async (code: string) => {
    if (!code) return;
    setIsLookingUp(true);
    try {
      const result = await api.lookupBarcode(code);
      setLookupResult(result);
    } catch (e) {
      console.error('Barcode lookup failed', e);
    } finally {
      setIsLookingUp(false);
    }
  };

  // Add line to staging table
  const handleAddScannedLine = () => {
    if (!lookupResult || !lookupResult.found || !lookupResult.product) {
      alert('Please scan a valid barcode first.');
      return;
    }

    const ratio = lookupResult.conversionRatio || 1;
    const baseConverted = packageQtyInput * ratio;

    const existingIndex = scannedItems.findIndex(
      (item) => item.scannedBarcode === barcodeInput
    );

    if (existingIndex >= 0) {
      const updated = [...scannedItems];
      updated[existingIndex].scannedQty += packageQtyInput;
      updated[existingIndex].baseQtyConverted += baseConverted;
      setScannedItems(updated);
    } else {
      setScannedItems([
        ...scannedItems,
        {
          productId: lookupResult.product.id,
          productName: lookupResult.product.name,
          productSku: lookupResult.product.sku,
          scannedBarcode: barcodeInput,
          scannedQty: packageQtyInput,
          packageLevel: lookupResult.detectedPackageLevel || 'EACH',
          conversionRatio: ratio,
          baseQtyConverted: baseConverted,
        },
      ]);
    }

    // Reset scanner inputs
    setBarcodeInput('');
    setPackageQtyInput(1);
    setLookupResult(null);
  };

  // Submit Blind Receipt to Backend Reconciliation Engine
  const handleSubmitBlindReceipt = async () => {
    if (!selectedPo) {
      alert('Please select an active Purchase Order.');
      return;
    }

    if (scannedItems.length === 0) {
      alert('Cannot submit an empty physical tally sheet. Scan at least one item.');
      return;
    }

    setSubmitting(true);
    setReceiptFeedback(null);

    try {
      const response = await api.submitBlindReceipt({
        poId: selectedPo.id,
        locationId: selectedPo.locationId || locations[0]?.id || 'loc-01',
        receivedByUserId: currentUser?.id,
        receivedByUserName: currentUser?.name,
        notes: `Blind Receiving audit executed at dock terminal by ${currentUser?.name || 'Operator'}.`,
        scannedItems: scannedItems.map((item) => ({
          productId: item.productId,
          scannedBarcode: item.scannedBarcode,
          scannedQty: item.scannedQty,
        })),
      });

      setReceiptFeedback(response);
      setScannedItems([]);
      loadData(); // refresh receipts list
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Blind receipt reconciliation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Managerial Resolution of Quarantined Variance
  const handleResolveVariance = async (receiptId: string) => {
    setResolving(true);
    try {
      await api.resolveReceiptVariance({
        receiptId,
        action: resolutionAction,
        notes: resolutionNotes || 'Manager verified physical tally variance resolution.',
        managerUserId: currentUser?.id,
        managerName: currentUser?.name,
      });

      setResolvingId(null);
      setResolutionNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to resolve quarantine receipt.');
    } finally {
      setResolving(false);
    }
  };

  // Quarantined receipts list
  const quarantinedReceipts = goodsReceipts.filter(
    (gr) => gr.status === 'QUARANTINED' || gr.hasVariance
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-[#e5e1d5] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-[#122b39] tracking-tight">Blind Inbound Receiving Engine</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-[#ede9df] text-[#8c5e15] border border-[#d8d1c1]">
              SOP-INB-04 Enforced
            </span>
          </div>
          <p className="text-xs text-[#6a7d8d] mt-1">
            Zero-bias physical count auditing with multi-tier packaging detection (Each, Inner Pack, Case, Pallet) and automated quarantine hold routing.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 bg-[#f6f4ed] p-1.5 rounded-2xl border border-[#e5e1d5]">
          <button
            onClick={() => setActiveTab('DOCK_SCANNER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'DOCK_SCANNER'
                ? 'bg-[#122b39] text-white shadow-xs'
                : 'text-[#526677] hover:text-[#122b39] hover:bg-[#ede9df]'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Blind Receiving Dock</span>
          </button>

          <button
            onClick={() => setActiveTab('QUARANTINE_DESK')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative cursor-pointer ${
              activeTab === 'QUARANTINE_DESK'
                ? 'bg-[#e5a329] text-[#122b39] font-bold shadow-xs'
                : 'text-[#526677] hover:text-[#122b39] hover:bg-[#ede9df]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Quarantine Variance Desk</span>
            {quarantinedReceipts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-bold">
                {quarantinedReceipts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: DOCK RECEIVING SCANNER (BLIND COUNT ENFORCED) */}
      {activeTab === 'DOCK_SCANNER' && (
        <div className="space-y-6">
          {/* Strict Blind Count Warning Callout */}
          <div className="p-4.5 rounded-2xl bg-[#f8f5ee] border border-[#e5e1d5] flex items-start gap-3.5 text-xs text-[#122b39] shadow-xs">
            <div className="p-2.5 rounded-xl bg-white text-[#122b39] border border-[#e5e1d5] shrink-0">
              <EyeOff className="w-5 h-5 text-[#e5a329]" />
            </div>
            <div>
              <div className="font-bold text-[#122b39] text-sm">Blind Count Protocol Active</div>
              <p className="mt-0.5 text-[#526677] leading-relaxed">
                Purchase Order expected quantities are <strong>strictly hidden</strong> from dock operators to mandate authentic physical tallying. Count every package physically. Any overage or shortage detected by the backend reconciliation engine will automatically divert items into Quarantine.
              </p>
            </div>
          </div>

          {/* Feedback banner after submission */}
          {receiptFeedback && (
            <div
              className={`p-4.5 rounded-2xl border text-xs flex items-start justify-between gap-3 shadow-xs ${
                receiptFeedback.hasVariance
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {receiptFeedback.hasVariance ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-sm text-[#122b39]">{receiptFeedback.message}</div>
                  <div className="mt-1 font-mono text-[11px] text-[#526677]">
                    Receipt No: <strong>{receiptFeedback.receipt.receiptNumber}</strong> • Status:{' '}
                    <strong>{receiptFeedback.receipt.status}</strong>
                    {receiptFeedback.quarantined && (
                      <span className="ml-2 text-red-700 font-bold">
                        [ROUTED TO QUARANTINE: QUAR-01]
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {receiptFeedback.hasVariance && (
                <button
                  onClick={() => setActiveTab('QUARANTINE_DESK')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs whitespace-nowrap shadow-xs cursor-pointer"
                >
                  Review in Quarantine Desk →
                </button>
              )}
            </div>
          )}

          {/* STRICT 12-COLUMN CSS GRID FOR INBOUND TERMINAL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: PO Selector & Interactive Scanner (6 COLUMNS) */}
            <div className="lg:col-span-6 space-y-6">
              {/* Select Incoming PO */}
              <div className="p-5 rounded-2xl bg-white border border-[#e5e1d5] shadow-xs space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#526677] flex items-center justify-between">
                  <span>1. Select Inbound Purchase Order</span>
                  <span className="text-[11px] text-[#8c5e15] font-semibold">{purchaseOrders.length} Pending Inbound</span>
                </div>

                <select
                  value={selectedPo?.id || ''}
                  onChange={(e) => {
                    const found = purchaseOrders.find((po) => po.id === e.target.value);
                    setSelectedPo(found || null);
                    setScannedItems([]);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-xs text-[#122b39] font-mono focus:outline-none focus:border-[#122b39] focus:bg-white"
                >
                  {purchaseOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} • Vendor: {po.vendorName || po.supplier || 'Global Supplier'} • Dest: {po.locationName || 'NEOM Port'}
                    </option>
                  ))}
                </select>

                {selectedPo && (
                  <div className="p-3 rounded-xl bg-[#f8f5ee] border border-[#e5e1d5] text-xs flex items-center justify-between font-mono">
                    <div>
                      <span className="text-[#6a7d8d]">Expected SKUs in PO: </span>
                      <strong className="text-[#122b39]">{selectedPo.lines?.length || 0} Line Items</strong>
                    </div>
                    <div className="text-amber-700 font-bold text-[10px] bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                      BLIND AUDIT ACTIVE
                    </div>
                  </div>
                )}
              </div>

              {/* Barcode & Packaging Scanner */}
              <div className="p-5 rounded-2xl bg-white border border-[#e5e1d5] shadow-xs space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[#526677] flex items-center justify-between">
                  <span>2. Barcode & Packaging Intelligence Scanner</span>
                  <span className="text-[11px] text-[#8c5e15] font-semibold">Tier-1 Dynamic Resolution</span>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Barcode className="w-4 h-4 text-[#7a8b99] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Scan or enter Barcode (GTIN-13 / GTIN-14 / Case / Pallet)..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleBarcodeLookup(barcodeInput);
                          }
                        }}
                        className="w-full pl-9.5 pr-4 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-xs text-[#122b39] font-mono focus:outline-none focus:border-[#122b39] focus:bg-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBarcodeLookup(barcodeInput)}
                      disabled={isLookingUp || !barcodeInput}
                      className="px-4 py-2.5 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isLookingUp ? 'Decoding...' : 'Lookup'}
                    </button>
                  </div>

                  {/* Simulator Quick Buttons for Multi-Tier Packaging */}
                  <div className="p-3.5 rounded-2xl bg-[#f8f5ee] border border-[#e5e1d5] space-y-2">
                    <div className="text-[11px] font-bold text-[#526677]">
                      Quick Dock Simulator Barcodes (Packaging Levels):
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setBarcodeInput('10628100100124');
                          handleBarcodeLookup('10628100100124');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#e5e1d5] hover:border-[#122b39] text-[#122b39] font-mono text-[11px] transition-colors cursor-pointer"
                      >
                        📦 Case (24x): 10628100100124
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBarcodeInput('628100100106');
                          handleBarcodeLookup('628100100106');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#e5e1d5] hover:border-[#122b39] text-[#122b39] font-mono text-[11px] transition-colors cursor-pointer"
                      >
                        📁 Inner Pack (6x): 628100100106
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBarcodeInput('628100100101');
                          handleBarcodeLookup('628100100101');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#e5e1d5] hover:border-[#122b39] text-[#122b39] font-mono text-[11px] transition-colors cursor-pointer"
                      >
                        🔹 Each (1x): 628100100101
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBarcodeInput('00628100100144');
                          handleBarcodeLookup('00628100100144');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#e5e1d5] hover:border-[#122b39] text-[#122b39] font-mono text-[11px] transition-colors cursor-pointer"
                      >
                        🏗️ Pallet (144x): 00628100100144
                      </button>
                    </div>
                  </div>

                  {/* Scanned Lookup Result Card */}
                  {lookupResult && lookupResult.found && (
                    <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#e5e1d5] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-xs text-[#122b39]">
                            {lookupResult.product?.name}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-[#526677]">{lookupResult.product?.sku}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-white border border-[#e5e1d5]">
                          <span className="text-[10px] text-[#7a8b99]">Detected Level:</span>
                          <div className="font-bold text-[#122b39] uppercase">
                            {lookupResult.detectedPackageLevel} ({lookupResult.conversionRatio}x)
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-[#e5e1d5]">
                          <span className="text-[10px] text-[#7a8b99]">Base Inventory UoM:</span>
                          <div className="font-bold text-[#122b39] font-mono">
                            {lookupResult.product?.unitOfMeasure || 'EA'}
                          </div>
                        </div>
                      </div>

                      {/* Quantity of scanned package units */}
                      <div className="flex items-center gap-3 pt-2 border-t border-[#f0ece2]">
                        <div className="w-32">
                          <label className="block text-[10px] font-bold text-[#526677] uppercase tracking-wider mb-1">
                            Physical Pack Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={packageQtyInput}
                            onChange={(e) => setPackageQtyInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#e5e1d5] text-xs text-[#122b39] font-mono font-bold"
                          />
                        </div>

                        <div className="flex-1">
                          <div className="text-[10px] text-[#7a8b99]">Total Converted Units:</div>
                          <div className="text-base font-bold font-mono text-[#122b39]">
                            {packageQtyInput * lookupResult.conversionRatio} {lookupResult.product?.unitOfMeasure || 'units'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddScannedLine}
                          className="px-4 py-2 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs shadow-xs transition-all self-end cursor-pointer"
                        >
                          + Add Line
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Dock Staging Manifest & Final Submission (6 COLUMNS) */}
            <div className="lg:col-span-6 bg-white border border-[#e5e1d5] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#f0ece2]">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-[#122b39] uppercase tracking-wider">
                      Physical Staging Tally Sheet
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[#8c5e15] font-bold">
                    {scannedItems.length} Scanned Items
                  </span>
                </div>

                {scannedItems.length === 0 ? (
                  <div className="py-16 text-center text-[#7a8b99] text-xs space-y-2">
                    <Package className="w-8 h-8 text-[#cfc9b9] mx-auto" />
                    <p>No items added to staging sheet yet.</p>
                    <p className="text-[11px] text-[#7a8b99]">Scan barcodes on the left dock terminal to populate.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {scannedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] flex items-center justify-between text-xs font-mono"
                      >
                        <div>
                          <div className="font-bold text-[#122b39] font-sans">{item.productName}</div>
                          <div className="text-[#6a7d8d] text-[11px]">
                            {item.productSku} • Barcode: {item.scannedBarcode}
                          </div>
                          <div className="text-[10px] text-[#8c5e15] font-semibold mt-0.5">
                            Level: {item.packageLevel} ({item.conversionRatio}x)
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[#122b39] font-bold">
                            {item.scannedQty} pkgs ({item.packageLevel})
                          </div>
                          <div className="text-emerald-700 font-bold text-[11px]">
                            = {item.baseQtyConverted} Base Units
                          </div>
                          <button
                            type="button"
                            onClick={() => setScannedItems(scannedItems.filter((_, i) => i !== idx))}
                            className="text-[10px] text-red-600 hover:text-red-700 mt-1 cursor-pointer font-sans"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total Units and Submit Button */}
              <div className="pt-4 border-t border-[#f0ece2] space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-[#6a7d8d]">Total Physical Count Verified:</span>
                  <span className="text-base font-bold text-[#122b39]">
                    {scannedItems.reduce((acc, i) => acc + i.baseQtyConverted, 0)} Total Base Units
                  </span>
                </div>

                <button
                  type="button"
                  disabled={submitting || scannedItems.length === 0}
                  onClick={handleSubmitBlindReceipt}
                  className="w-full py-3.5 rounded-2xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 disabled:opacity-40 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <span>Reconciling against Secret PO Master...</span>
                  ) : (
                    <>
                      <FileCheck2 className="w-4 h-4 text-[#e5a329]" />
                      <span>Submit Inbound Verification & Reconcile</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUARANTINE DISCREPANCY REVIEW & RESOLUTION DESK */}
      {activeTab === 'QUARANTINE_DESK' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#122b39] tracking-tight">
                Quarantine Holding Depot (QUAR-01) & Discrepancies
              </h3>
              <p className="text-xs text-[#6a7d8d]">
                All inbound receipts where Actual physical count ≠ PO Expected quantity are sequestered here pending managerial resolution.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
              {quarantinedReceipts.length} Active Variances
            </span>
          </div>

          {quarantinedReceipts.length === 0 ? (
            <div className="p-12 text-center bg-white border border-[#e5e1d5] rounded-2xl space-y-2 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <div className="text-sm font-bold text-[#122b39]">Quarantine Depot Clear</div>
              <p className="text-xs text-[#6a7d8d]">
                All recent inbound receipts matched expected Purchase Order manifests exactly.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {quarantinedReceipts.map((receipt) => {
                const isSelectedForResolve = resolvingId === receipt.id;

                return (
                  <div
                    key={receipt.id}
                    className="p-6 rounded-2xl bg-white border border-[#e5e1d5] shadow-xs space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#f0ece2]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#122b39] text-sm">
                            {receipt.receiptNumber}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-red-100 text-red-800 border border-red-200">
                            {receipt.status}
                          </span>
                          <span className="text-xs text-[#6a7d8d]">
                            PO: <strong className="text-[#122b39]">{receipt.poNumber}</strong>
                          </span>
                        </div>
                        <div className="text-xs text-[#6a7d8d] mt-0.5">
                          Vendor: <strong className="text-[#122b39]">{receipt.vendorName}</strong> • Received by:{' '}
                          <strong className="text-[#122b39]">{receipt.receivedByUserName}</strong>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono text-[#6a7d8d]">
                          {new Date(receipt.timestamp).toLocaleString()}
                        </span>
                        <div className="text-xs text-[#8c5e15] font-semibold mt-0.5">
                          Location: {receipt.locationName}
                        </div>
                      </div>
                    </div>

                    {/* Discrepancy Breakdown Table */}
                    <div className="overflow-x-auto rounded-xl border border-[#e5e1d5]">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[#f8f5ee] text-[#526677] font-bold uppercase text-[10px] border-b border-[#e5e1d5]">
                            <th className="py-2.5 px-3">Product SKU / Name</th>
                            <th className="py-2.5 px-3">Package Scanned</th>
                            <th className="py-2.5 px-3 text-right">Physical Count</th>
                            <th className="py-2.5 px-3 text-right">Expected Secret PO</th>
                            <th className="py-2.5 px-3 text-right">Variance Delta</th>
                            <th className="py-2.5 px-3 text-center">Audit Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0ece2] font-mono text-[11px]">
                          {receipt.lines.map((line) => (
                            <tr key={line.id} className="hover:bg-[#faf9f6]">
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-[#122b39]">{line.productSku}</div>
                                <div className="text-[10px] text-[#6a7d8d] font-sans">{line.productName}</div>
                              </td>
                              <td className="py-2.5 px-3 text-[#526677]">
                                {line.scannedQty} pkgs ({line.scannedPackageLevel})
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-[#122b39]">
                                {line.baseQtyConverted} units
                              </td>
                              <td className="py-2.5 px-3 text-right text-[#6a7d8d]">
                                {line.expectedBaseQty} units
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold">
                                <span
                                  className={
                                    line.varianceDelta > 0
                                      ? 'text-purple-700'
                                      : line.varianceDelta < 0
                                      ? 'text-red-700'
                                      : 'text-emerald-700'
                                  }
                                >
                                  {line.varianceDelta > 0 ? `+${line.varianceDelta}` : line.varianceDelta} units
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                    line.status === 'OVERAGE'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : line.status === 'SHORTAGE'
                                      ? 'bg-red-100 text-red-800 border border-red-200'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {line.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Managerial Resolution Actions */}
                    <div className="p-4.5 rounded-2xl bg-[#faf9f6] border border-[#e5e1d5] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-[#122b39] flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-[#e5a329]" />
                          <span>Managerial Variance Disposition Protocol</span>
                        </div>
                        <span className="text-[10px] text-[#7a8b99]">Authorized: Manager & Director Roles</span>
                      </div>

                      {isSelectedForResolve ? (
                        <div className="space-y-3 pt-2">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <button
                              type="button"
                              onClick={() => setResolutionAction('ACCEPT_VARIANCE')}
                              className={`p-3 rounded-xl border text-xs font-bold text-left transition-colors cursor-pointer ${
                                resolutionAction === 'ACCEPT_VARIANCE'
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                                  : 'bg-white border-[#e5e1d5] text-[#526677] hover:border-[#cfc9b9]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 text-emerald-700">
                                <Check className="w-3.5 h-3.5" />
                                1. Accept Variance
                              </div>
                              <div className="text-[10px] text-[#6a7d8d] font-normal mt-1">
                                Release stock from Quarantine into Active Warehouse.
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setResolutionAction('GENERATE_RTV')}
                              className={`p-3 rounded-xl border text-xs font-bold text-left transition-colors cursor-pointer ${
                                resolutionAction === 'GENERATE_RTV'
                                  ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs'
                                  : 'bg-white border-[#e5e1d5] text-[#526677] hover:border-[#cfc9b9]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 text-purple-700">
                                <RotateCcw className="w-3.5 h-3.5" />
                                2. Generate RTV
                              </div>
                              <div className="text-[10px] text-[#6a7d8d] font-normal mt-1">
                                Return overage/rejected stock to supplier & issue debit memo.
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setResolutionAction('TRIGGER_RECOUNT')}
                              className={`p-3 rounded-xl border text-xs font-bold text-left transition-colors cursor-pointer ${
                                resolutionAction === 'TRIGGER_RECOUNT'
                                  ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                                  : 'bg-white border-[#e5e1d5] text-[#526677] hover:border-[#cfc9b9]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 text-amber-700">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                3. Trigger Recount
                              </div>
                              <div className="text-[10px] text-[#6a7d8d] font-normal mt-1">
                                Send recount mandate to senior dock inspector.
                              </div>
                            </button>
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="Resolution rationale / approval justification notes..."
                              value={resolutionNotes}
                              onChange={(e) => setResolutionNotes(e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#e5e1d5] text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setResolvingId(null)}
                              className="px-4 py-2 rounded-xl bg-[#f6f4ed] hover:bg-[#ede9df] text-[#526677] text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={resolving}
                              onClick={() => handleResolveVariance(receipt.id)}
                              className="px-5 py-2 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                              {resolving ? 'Executing Protocol...' : 'Execute Resolution'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#6a7d8d]">
                            Hold location: <strong className="text-[#122b39]">NEOM Port Customs & Quarantine Depot (QUAR-01)</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setResolvingId(receipt.id);
                              setResolutionAction('ACCEPT_VARIANCE');
                            }}
                            className="px-4 py-2 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            Resolve Variance →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
