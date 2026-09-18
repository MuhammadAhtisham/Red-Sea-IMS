import React, { useState, useEffect } from 'react';
import {
  Factory,
  Layers,
  Play,
  CheckCircle2,
  Clock,
  Plus,
  Boxes,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  BillOfMaterialsDTO,
  WorkOrderDTO,
  LocationDTO,
  api,
} from '../services/api';

interface ManufacturingBomViewProps {
  locations: LocationDTO[];
  onOperationSuccess: () => void;
}

export const ManufacturingBomView: React.FC<ManufacturingBomViewProps> = ({
  locations,
  onOperationSuccess,
}) => {
  const [boms, setBoms] = useState<BillOfMaterialsDTO[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Work Order state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBomId, setSelectedBomId] = useState('');
  const [woLocationId, setWoLocationId] = useState(locations[0]?.id || '');
  const [woQuantity, setWoQuantity] = useState(10);

  const loadManufacturingData = async () => {
    try {
      setLoading(true);
      const [bomRes, woRes] = await Promise.all([
        api.getBoms(),
        api.getWorkOrders(),
      ]);
      setBoms(bomRes);
      setWorkOrders(woRes);
      if (bomRes.length > 0 && !selectedBomId) {
        setSelectedBomId(bomRes[0].id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManufacturingData();
  }, []);

  const handleCompleteWorkOrder = async (workOrderId: string) => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      const res = await api.completeWorkOrder(workOrderId);
      setFeedback({ text: res.message, type: 'success' });
      await loadManufacturingData();
      onOperationSuccess();
    } catch (err: any) {
      setFeedback({
        text: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setFeedback(null);
    try {
      const chosenBom = boms.find((b) => b.id === selectedBomId);
      if (!chosenBom) return;
      await api.createWorkOrder({
        orderNumber: `WO-${Date.now().toString().slice(-4)}`,
        bomId: chosenBom.id,
        finishedProductId: chosenBom.finishedGoodId,
        locationId: woLocationId,
        quantityToProduce: woQuantity,
      });
      setShowCreateModal(false);
      setFeedback({ text: 'Work Order created and scheduled for production run.', type: 'success' });
      await loadManufacturingData();
      onOperationSuccess();
    } catch (err: any) {
      setFeedback({
        text: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Bill of Materials (BOM) & Work Orders
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
              Atomic Assembly Engine
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Define multi-level recipes, track shop-floor work orders, and atomically convert raw components into finished inventory.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Work Order</span>
        </button>
      </div>

      {/* Transaction Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center space-x-2 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Bill of Materials Explorer Cards */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">Active Production Recipes (BOMs)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {boms.map((bom) => (
            <div
              key={bom.id}
              className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{bom.name}</div>
                  <div className="font-mono text-[11px] text-slate-500">
                    Finished SKU: <span className="text-indigo-600 font-bold">{bom.finishedGoodSku}</span> ({bom.finishedGoodName})
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                  {bom.bomCode}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Required Components (per 1 unit finished):
                </span>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden bg-slate-50/50">
                  {bom.items.map((c) => (
                    <div key={c.componentProductId} className="p-2.5 flex items-center justify-between font-mono">
                      <div>
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        <span className="text-slate-400 text-[10px] ml-1">({c.sku})</span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {c.quantityRequired} units
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Work Orders List with 1-Click Complete */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Manufacturing Work Order Tracker</h2>
            <p className="text-xs text-slate-500">
              Completing an order atomically decrements all required raw components and increments finished goods.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{workOrders.length} orders tracked</span>
        </div>

        <div className="space-y-3">
          {workOrders.map((wo) => {
            const isCompleted = wo.status === 'COMPLETED';
            return (
              <div
                key={wo.id}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                  isCompleted ? 'bg-slate-50/60 border-slate-200' : 'bg-white border-indigo-200 ring-1 ring-indigo-100 shadow-xs'
                }`}
              >
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-sm text-slate-900">{wo.workOrderNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {wo.status}
                    </span>
                  </div>

                  <div className="text-slate-600">
                    Producing: <span className="font-bold text-slate-900">{wo.quantityToProduce} units</span> of{' '}
                    <span className="font-semibold text-slate-900">{wo.finishedGoodName}</span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400">
                    Assembly Plant: {wo.locationName} • Created: {new Date(wo.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  {!isCompleted ? (
                    <button
                      id={`btn-complete-wo-${wo.id}`}
                      onClick={() => handleCompleteWorkOrder(wo.id)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Complete Production Run (Atomic Consumption)</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Production Completed & Stock Rebalanced</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Work Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Schedule Work Order</h3>

            <form onSubmit={handleCreateWorkOrder} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select BOM Recipe</label>
                <select
                  value={selectedBomId}
                  onChange={(e) => setSelectedBomId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {boms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Produces {b.finishedGoodSku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assembly Facility</label>
                <select
                  value={woLocationId}
                  onChange={(e) => setWoLocationId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity to Produce</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={woQuantity}
                  onChange={(e) => setWoQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-1.5 rounded bg-slate-900 text-white hover:bg-slate-800 cursor-pointer font-semibold"
                >
                  {isProcessing ? 'Scheduling...' : 'Launch Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
