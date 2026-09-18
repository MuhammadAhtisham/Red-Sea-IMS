import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRightLeft,
  SlidersHorizontal,
  Layers,
  History,
  CheckCircle2,
  AlertTriangle,
  Building2,
  PackageCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  ProductDTO,
  LocationDTO,
  StockMovementDTO,
  PalletDTO,
  api,
} from '../services/api';

interface StockOperationsViewProps {
  products: ProductDTO[];
  locations: LocationDTO[];
  movements: StockMovementDTO[];
  pallets: PalletDTO[];
  onOperationSuccess: () => void;
}

export const StockOperationsView: React.FC<StockOperationsViewProps> = ({
  products,
  locations,
  movements,
  pallets,
  onOperationSuccess,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'receive' | 'transfer' | 'adjust' | 'lpn' | 'ledger'>(
    'receive'
  );

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // Receive form state
  const [receiveData, setReceiveData] = useState({
    productId: products[0]?.id || '',
    locationId: locations[0]?.id || '',
    quantity: 50,
    reference: 'PO-INBOUND-2026',
    notes: 'Dock container delivery QC approved',
  });

  // Transfer form state
  const [transferData, setTransferData] = useState({
    productId: products[0]?.id || '',
    fromLocationId: locations[0]?.id || '',
    toLocationId: locations[1]?.id || '',
    quantity: 15,
    reference: 'TRF-INTER-WH',
    notes: 'Regional inventory rebalancing',
  });

  // Adjust / Cycle count form state
  const [adjustData, setAdjustData] = useState({
    productId: products[0]?.id || '',
    locationId: locations[0]?.id || '',
    quantityDelta: -5,
    reference: 'CYC-COUNT-AUDIT',
    notes: 'Physical audit variance correction',
  });

  // LPN move state
  const [selectedLpn, setSelectedLpn] = useState(pallets[0]?.lpnCode || '');
  const [targetLpnLocation, setTargetLpnLocation] = useState(locations[1]?.id || '');

  // Helper to get available stock for a product at location
  const getStockAtLoc = (prodId: string, locId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return 0;
    const item = prod.stockByLocation.find((l) => l.locationId === locId);
    return item ? item.quantity : 0;
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await api.receiveStock(receiveData);
      setStatusMessage({ text: res.message, type: 'success' });
      onOperationSuccess();
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await api.transferStock(transferData);
      setStatusMessage({ text: res.message, type: 'success' });
      onOperationSuccess();
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await api.adjustStock(adjustData);
      setStatusMessage({ text: res.message, type: 'success' });
      onOperationSuccess();
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLpnMove = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await api.movePallet(selectedLpn, targetLpnLocation);
      setStatusMessage({ text: res.message, type: 'success' });
      onOperationSuccess();
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Operations & Audit Ledger</h1>
        <p className="text-sm text-slate-500">
          Execute atomic inventory modifications with automated rollback and strict negative-stock guards.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => {
            setActiveSubTab('receive');
            setStatusMessage(null);
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
            activeSubTab === 'receive'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>Inbound Goods Receiving</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('transfer');
            setStatusMessage(null);
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
            activeSubTab === 'transfer'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Inter-Facility Transfer</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('adjust');
            setStatusMessage(null);
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
            activeSubTab === 'adjust'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Cycle Count & Adjustment</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('lpn');
            setStatusMessage(null);
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
            activeSubTab === 'lpn'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Pallet LPN Relocation</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('ledger');
            setStatusMessage(null);
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
            activeSubTab === 'ledger'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Full Audit Ledger</span>
        </button>
      </div>

      {/* Transaction Result / Rollback Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-bold text-sm">
              {statusMessage.type === 'success' ? 'Atomic Transaction Committed' : 'Transaction Rolled Back'}
            </div>
            <div className="mt-0.5 leading-relaxed">{statusMessage.text}</div>
          </div>
        </div>
      )}

      {/* 1. INBOUND RECEIVING */}
      {activeSubTab === 'receive' && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs max-w-2xl">
          <div className="flex items-center space-x-2 text-slate-900 font-bold mb-1">
            <PackageCheck className="w-5 h-5 text-emerald-600" />
            <h2>Receive Supplier Purchase Goods</h2>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Atomically increments on-hand stock and writes immutable RECEIPT ledger record.
          </p>

          <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product to Receive</label>
              <select
                value={receiveData.productId}
                onChange={(e) => setReceiveData({ ...receiveData, productId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.sku}] — Total On Hand: {p.totalStock}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Destination Facility</label>
                <select
                  value={receiveData.locationId}
                  onChange={(e) => setReceiveData({ ...receiveData, locationId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity Received</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={receiveData.quantity}
                  onChange={(e) => setReceiveData({ ...receiveData, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PO / Bill of Lading Reference</label>
                <input
                  type="text"
                  value={receiveData.reference}
                  onChange={(e) => setReceiveData({ ...receiveData, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Notes</label>
                <input
                  type="text"
                  value={receiveData.notes}
                  onChange={(e) => setReceiveData({ ...receiveData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? 'Processing Receipt...' : 'Confirm Inbound Stock Receipt'}
            </button>
          </form>
        </div>
      )}

      {/* 2. INTER-LOCATION TRANSFER */}
      {activeSubTab === 'transfer' && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs max-w-2xl">
          <div className="flex items-center space-x-2 text-slate-900 font-bold mb-1">
            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            <h2>Inter-Location Stock Transfer</h2>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Atomically decrements origin and increments destination. Throws error and rolls back if origin has insufficient units.
          </p>

          <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Product</label>
              <select
                value={transferData.productId}
                onChange={(e) => setTransferData({ ...transferData, productId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.sku}]
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source Origin Location</label>
                <select
                  value={transferData.fromLocationId}
                  onChange={(e) => setTransferData({ ...transferData, fromLocationId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} (Avail: {getStockAtLoc(transferData.productId, l.id)})
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-slate-500">
                  Current stock at origin:{' '}
                  <span className="font-bold text-slate-900">
                    {getStockAtLoc(transferData.productId, transferData.fromLocationId)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Destination Location</label>
                <select
                  value={transferData.toLocationId}
                  onChange={(e) => setTransferData({ ...transferData, toLocationId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {locations
                    .filter((l) => l.id !== transferData.fromLocationId)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} (Current: {getStockAtLoc(transferData.productId, l.id)})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transfer Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferData.quantity}
                  onChange={(e) =>
                    setTransferData({ ...transferData, quantity: parseInt(e.target.value, 10) || 1 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transfer Manifest Ref</label>
                <input
                  type="text"
                  value={transferData.reference}
                  onChange={(e) => setTransferData({ ...transferData, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? 'Executing Transfer...' : 'Commit Atomic Inter-Warehouse Transfer'}
            </button>
          </form>
        </div>
      )}

      {/* 3. CYCLE COUNT & ADJUSTMENT (TESTING NEGATIVE STOCK RULE) */}
      {activeSubTab === 'adjust' && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs max-w-2xl">
          <div className="flex items-center space-x-2 text-slate-900 font-bold mb-1">
            <SlidersHorizontal className="w-5 h-5 text-amber-600" />
            <h2>Manual Cycle Count / Adjustment (Negative Stock Guard Test)</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Test the constraint middleware. If you attempt to deduct more than available quantity for a tracked SKU,
            the transaction will be cleanly aborted.
          </p>

          <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product</label>
              <select
                value={adjustData.productId}
                onChange={(e) => setAdjustData({ ...adjustData, productId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.sku}]
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location</label>
                <select
                  value={adjustData.locationId}
                  onChange={(e) => setAdjustData({ ...adjustData, locationId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-slate-500">
                  Current stock:{' '}
                  <span className="font-bold text-slate-900">
                    {getStockAtLoc(adjustData.productId, adjustData.locationId)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quantity Delta (+ or -)
                </label>
                <input
                  type="number"
                  required
                  value={adjustData.quantityDelta}
                  onChange={(e) =>
                    setAdjustData({ ...adjustData, quantityDelta: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Tip: enter a number larger than current stock to test negative stock rejection!
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Adjustment Reason Note</label>
              <input
                type="text"
                required
                value={adjustData.notes}
                onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? 'Validating...' : 'Apply Snapshot Adjustment'}
            </button>
          </form>
        </div>
      )}

      {/* 4. PALLET LPN RELOCATION */}
      {activeSubTab === 'lpn' && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs max-w-2xl">
          <div className="flex items-center space-x-2 text-slate-900 font-bold mb-1">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2>License Plate Number (LPN) Pallet Bulk Relocation</h2>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Move an entire pallet container containing multiple SKUs simultaneously with a single atomic transaction.
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-2">Select Active Pallet</label>
              <div className="space-y-2">
                {pallets.map((plt) => {
                  const isSelected = selectedLpn === plt.lpnCode;
                  return (
                    <div
                      key={plt.id}
                      onClick={() => setSelectedLpn(plt.lpnCode)}
                      className={`p-3 rounded-lg border cursor-pointer transition ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-mono font-bold text-slate-900">{plt.lpnCode}</div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {plt.locationName}
                        </span>
                      </div>
                      <div className="mt-2 text-slate-600">
                        {plt.items.map((i) => (
                          <span key={i.productId} className="inline-block mr-3">
                            • {i.quantity}x {i.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleLpnMove} className="space-y-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Destination Hub</label>
                <select
                  value={targetLpnLocation}
                  onChange={(e) => setTargetLpnLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} [{l.code}]
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isProcessing || !selectedLpn}
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Moving Pallet...' : `Atomically Relocate Pallet [${selectedLpn}]`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. IMMUTABLE MOVEMENT AUDIT LEDGER */}
      {activeSubTab === 'ledger' && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Complete Immutable Audit Ledger</h2>
              <p className="text-xs text-slate-500">
                Shows all historical atomic transactions across all facilities.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">{movements.length} total events logged</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date / Time</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">SKU & Description</th>
                  <th className="py-2.5 px-3 text-right">Units</th>
                  <th className="py-2.5 px-3">From Facility</th>
                  <th className="py-2.5 px-3">To Facility</th>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {movements.map((mov) => {
                  const isAdd = mov.type === 'RECEIPT' || (mov.toLocationId && !mov.fromLocationId);
                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 font-sans text-slate-500 whitespace-nowrap">
                        {new Date(mov.timestamp).toLocaleDateString()} {new Date(mov.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            mov.type === 'RECEIPT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : mov.type === 'TRANSFER'
                              ? 'bg-blue-100 text-blue-800'
                              : mov.type === 'SALE'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {mov.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-semibold text-slate-900">{mov.productName}</div>
                        <div className="font-mono text-slate-400 text-[11px]">{mov.sku}</div>
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          isAdd ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {isAdd ? `+${mov.quantity}` : `-${mov.quantity}`}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        {mov.fromLocationName || <span className="text-slate-400 italic">Inbound / Dock</span>}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        {mov.toLocationName || <span className="text-slate-400 italic">Outbound Order</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-semibold">{mov.reference || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">{mov.userId || 'system'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
