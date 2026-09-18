import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  TrendingUp,
  AlertOctagon,
  CheckCircle,
  Truck,
  RefreshCw,
  Sparkles,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  SkuVelocityDTO,
  PurchaseOrderDTO,
  api,
} from '../services/api';

interface DemandPlanningViewProps {
  onRefreshAll: () => void;
}

export const DemandPlanningView: React.FC<DemandPlanningViewProps> = ({ onRefreshAll }) => {
  const [velocities, setVelocities] = useState<SkuVelocityDTO[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronMessage, setCronMessage] = useState<string | null>(null);

  // AI Forecast state
  const [aiForecast, setAiForecast] = useState<{
    analysis: string;
    recommendations: { sku: string; action: string; riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' }[];
    timestamp: string;
  } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [velRes, poRes] = await Promise.all([
        api.getDemandPlanningVelocities(),
        api.getPurchaseOrders(),
      ]);
      setVelocities(velRes);
      setPurchaseOrders(poRes);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerCron = async () => {
    try {
      setCronRunning(true);
      setCronMessage(null);
      const res = await api.triggerReplenishmentCron();
      setCronMessage(res.message);
      await loadData();
      onRefreshAll();
    } catch (err: any) {
      setCronMessage(`Error: ${err.message}`);
    } finally {
      setCronRunning(false);
    }
  };

  const handleApprovePO = async (poId: string) => {
    try {
      await api.approvePurchaseOrder(poId);
      await loadData();
      onRefreshAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateAiForecast = async () => {
    try {
      setLoadingAi(true);
      const res = await api.getAiDemandForecast();
      setAiForecast(res);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAi(false);
    }
  };

  const criticalCount = velocities.filter((v) => v.urgency === 'CRITICAL').length;
  const warningCount = velocities.filter((v) => v.urgency === 'WARNING').length;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              AI Demand Planning & Automated Procurement
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded">
              Predictive Reordering
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Calculates 30-day trailing sales velocity, dynamic reorder points, and queues draft POs for 1-click approval.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleGenerateAiForecast}
            disabled={loadingAi}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition cursor-pointer disabled:opacity-60"
          >
            <Sparkles className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
            <span>{loadingAi ? 'Synthesizing...' : 'Gemini Demand AI'}</span>
          </button>

          <button
            id="btn-trigger-cron"
            onClick={handleTriggerCron}
            disabled={cronRunning}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cronRunning ? 'animate-spin' : ''}`} />
            <span>Run Replenishment Cron</span>
          </button>
        </div>
      </div>

      {/* Cron feedback banner */}
      {cronMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
          <span>{cronMessage}</span>
          <button onClick={() => setCronMessage(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Gemini AI Demand Forecast Section */}
      {aiForecast && (
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white p-6 rounded-2xl border border-indigo-800/80 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold tracking-wide">Gemini 3.8 Flash Supply Chain Risk Analysis</h2>
            </div>
            <span className="text-[11px] font-mono text-indigo-300">
              Generated {new Date(aiForecast.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <p className="text-xs text-indigo-100 leading-relaxed max-w-4xl">{aiForecast.analysis}</p>

          <div className="space-y-2 pt-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Actionable Replenishment Directives
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {aiForecast.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-800/60 flex items-start space-x-2.5 text-xs"
                >
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5 ${
                      rec.riskLevel === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {rec.riskLevel}
                  </span>
                  <div>
                    <span className="font-mono font-bold text-white mr-1.5">{rec.sku}:</span>
                    <span className="text-indigo-200">{rec.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trailing Sales Velocity & Dynamic Reorder Points Matrix */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">30-Day Trailing Velocity & Dynamic ROP Matrix</h2>
            <p className="text-xs text-slate-500">
              Lead time safety buffer = <code>SafetyStock + (DailyVelocity × LeadTimeDays × 1.35)</code>
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold font-mono">
              {criticalCount} Critical Stockout Risk
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold font-mono">
              {warningCount} Low Stock Warning
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3">Product / SKU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Available Stock</th>
                <th className="py-3 px-3 text-right">Dynamic ROP</th>
                <th className="py-3 px-3 text-right">30D Sales Units</th>
                <th className="py-3 px-3 text-right">Daily Velocity</th>
                <th className="py-3 px-3 text-right">Days Left (DOIR)</th>
                <th className="py-3 px-3 text-right">EOQ Restock Qty</th>
                <th className="py-3 px-3 text-right">Est. Batch Cost</th>
                <th className="py-3 px-3 text-center">Urgency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {velocities.map((item) => {
                const isCritical = item.urgency === 'CRITICAL';
                const isWarning = item.urgency === 'WARNING';
                return (
                  <tr
                    key={item.productId}
                    className={`hover:bg-slate-50/70 transition ${
                      isCritical ? 'bg-rose-50/30' : isWarning ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="font-mono text-slate-500 text-[11px] font-semibold">{item.sku}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{item.category}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {item.currentStock}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 font-semibold">
                      {item.reorderPoint}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">{item.sales30Days}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-indigo-700">
                      {item.dailyVelocity} / day
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          isCritical
                            ? 'bg-rose-100 text-rose-800'
                            : isWarning
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.daysOfInventoryRemaining}d
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {item.suggestedReorderQuantity}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      ${item.estimatedRestockCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isCritical
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : isWarning
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.urgency}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automated Purchase Orders (Draft Queue with 1-Click Approval) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Automated Purchase Order Queue</h2>
            <p className="text-xs text-slate-500">
              When SKUs breach dynamic thresholds, the cron auto-generates Draft POs awaiting Manager 1-click authorization.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{purchaseOrders.length} POs registered</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {purchaseOrders.map((po) => {
            const isDraft = po.status === 'DRAFT';
            return (
              <div
                key={po.id}
                className={`p-4 rounded-xl border transition-all ${
                  isDraft ? 'border-amber-300 bg-amber-50/30 shadow-xs' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-sm text-slate-900">{po.poNumber}</span>
                    {po.isAiAutoGenerated && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">
                        AI Generated
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isDraft
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {po.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 mb-2">
                  <div>Supplier: <span className="font-semibold text-slate-800">{po.supplier}</span></div>
                  <div>Delivery Hub: <span className="font-semibold text-slate-800">{po.locationName || po.locationId}</span></div>
                </div>

                {/* Items */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs mb-3 space-y-1">
                  {po.items.map((i) => (
                    <div key={i.productId} className="flex justify-between font-mono">
                      <span>{i.quantity}x {i.name || i.sku}</span>
                      <span className="font-bold text-slate-900">${(i.quantity * i.unitCost).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="pt-1 border-t border-slate-100 flex justify-between font-bold text-slate-900">
                    <span>Total Purchase Value:</span>
                    <span className="text-emerald-700">${po.totalCost.toLocaleString()}</span>
                  </div>
                </div>

                {po.notes && (
                  <p className="text-[11px] text-slate-500 italic mb-3">"{po.notes}"</p>
                )}

                {isDraft ? (
                  <button
                    id={`btn-approve-po-${po.id}`}
                    onClick={() => handleApprovePO(po.id)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>1-Click Authorize & Dispatch PO to Supplier</span>
                  </button>
                ) : (
                  <div className="text-center py-1.5 text-xs text-emerald-700 font-semibold flex items-center justify-center space-x-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Authorized & Dispatched to Supplier</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
