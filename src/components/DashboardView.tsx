import React from 'react';
import {
  DollarSign,
  Package,
  Warehouse,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  Barcode,
  Truck,
} from 'lucide-react';
import { DashboardStatsDTO } from '../services/api';

interface DashboardViewProps {
  stats: DashboardStatsDTO | null;
  loading: boolean;
  onNavigate: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ stats, loading, onNavigate }) => {
  if (loading && !stats) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium">Aggregating multi-location network telemetry...</p>
      </div>
    );
  }

  if (!stats) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      val
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Title & System Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Enterprise Operations Overview</h1>
          <p className="text-sm text-slate-500">
            Real-time aggregate snapshot across 4 distribution hubs, active channels, and directed picking queues.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            id="btn-dash-quick-wave"
            onClick={() => onNavigate('wes-picking')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <Barcode className="w-4 h-4 text-amber-400" />
            <span>Open Wave Scanner</span>
          </button>
          <button
            id="btn-dash-quick-replenish"
            onClick={() => onNavigate('demand-planning')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition cursor-pointer"
          >
            <Truck className="w-4 h-4 text-slate-500" />
            <span>AI Demand Queue</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Valuation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Network Valuation</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(stats.totalValuation)}
          </div>
          <div className="mt-2 flex items-center text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
            <span>+4.2% vs last 30-day baseline</span>
          </div>
        </div>

        {/* Metric 2: Total Units On Hand */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Units On Hand</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {stats.totalUnits.toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Across <span className="font-semibold text-slate-700">{stats.productCount} SKUs</span> in 4 facilities
          </div>
        </div>

        {/* Metric 3: Low Stock Alerts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock Warnings</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 tracking-tight">
            {stats.lowStockCount} <span className="text-xs font-normal text-slate-500">SKUs below buffer</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>{stats.draftPurchaseOrdersCount} Draft POs queued</span>
            <button
              onClick={() => onNavigate('demand-planning')}
              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              Review →
            </button>
          </div>
        </div>

        {/* Metric 4: Operations Flow */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Operations</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {stats.activeWaves + stats.activeWorkOrders}{' '}
            <span className="text-xs font-normal text-slate-500">workflows live</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{stats.activeWaves} Wave</span> •{' '}
            <span className="font-semibold text-slate-700">{stats.activeWorkOrders} Work Order</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Low Stock Watchlist & Live Channel Syncs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Watchlist (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Dynamic Reorder Point Critical Items</h2>
              <p className="text-xs text-slate-500">
                Calculated dynamically via 30-day trailing sales velocity + lead times.
              </p>
            </div>
            <button
              onClick={() => onNavigate('demand-planning')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
            >
              <span>Full Planning Matrix</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2.5">Product / SKU</th>
                  <th className="pb-2.5 text-right">Available Stock</th>
                  <th className="pb-2.5 text-right">Dynamic ROP</th>
                  <th className="pb-2.5 text-right">30D Velocity</th>
                  <th className="pb-2.5 text-right">Runout Days</th>
                  <th className="pb-2.5 text-center">Urgency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {stats.lowStockAlerts.map((item) => (
                  <tr key={item.productId} className="hover:bg-slate-50/70 transition">
                    <td className="py-3">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="font-mono text-slate-400 text-[11px]">{item.sku}</div>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-800">
                      {item.currentStock}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-500">
                      {item.reorderPoint}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-700">
                      {item.dailyVelocity} / day
                    </td>
                    <td className="py-3 text-right font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          item.daysOfInventoryRemaining < 7
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.daysOfInventoryRemaining}d
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          item.urgency === 'CRITICAL'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.urgency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Omni-Channel Real-Time Integration Hub (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">E-Commerce Sync Status</h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Continuous stock sync across active storefronts and enterprise ERP channels.
            </p>

            <div className="space-y-3">
              {stats.channels.map((ch) => (
                <div
                  key={ch.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{ch.channelName}</div>
                    <div className="text-[11px] text-slate-400 font-mono truncate max-w-[180px]">
                      {ch.externalId}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {ch.status}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(ch.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              id="btn-dash-test-webhook"
              onClick={() => onNavigate('omni-channel-pos')}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition text-center cursor-pointer"
            >
              Test Inbound Order Webhook & Split Routing →
            </button>
          </div>
        </div>
      </div>

      {/* Immutable Stock Movement Audit Ledger (Latest 8 Records) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Immutable Stock Movement Audit Ledger</h2>
            <p className="text-xs text-slate-500">
              Cryptographically timestamped transaction log. Every balance adjustment is permanently recorded.
            </p>
          </div>
          <button
            onClick={() => onNavigate('stock-ops')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            Full Ledger & Transfer Console →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-2.5">Timestamp</th>
                <th className="pb-2.5">Type</th>
                <th className="pb-2.5">Product</th>
                <th className="pb-2.5 text-right">Quantity</th>
                <th className="pb-2.5">Origin / Destination</th>
                <th className="pb-2.5">Reference ID</th>
                <th className="pb-2.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {stats.recentMovements.map((mov) => {
                const isPositive = mov.type === 'RECEIPT' || (mov.toLocationId && !mov.fromLocationId);
                return (
                  <tr key={mov.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 text-slate-500 font-sans">
                      {new Date(mov.timestamp).toLocaleDateString()} {new Date(mov.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5">
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
                    <td className="py-2.5 font-sans">
                      <span className="font-semibold text-slate-900">{mov.productName}</span>
                      <span className="text-slate-400 font-mono text-[11px] ml-1.5">({mov.sku})</span>
                    </td>
                    <td
                      className={`py-2.5 text-right font-bold ${
                        isPositive ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {isPositive ? `+${mov.quantity}` : `-${mov.quantity}`}
                    </td>
                    <td className="py-2.5 font-sans text-slate-600">
                      {mov.fromLocationName ? (
                        <span className="text-slate-700">{mov.fromLocationName}</span>
                      ) : (
                        <span className="text-slate-400 italic">External Inbound</span>
                      )}
                      {mov.toLocationName && (
                        <>
                          <span className="text-slate-400 mx-1">→</span>
                          <span className="text-slate-700">{mov.toLocationName}</span>
                        </>
                      )}
                    </td>
                    <td className="py-2.5 text-slate-500 font-semibold">{mov.reference || '—'}</td>
                    <td className="py-2.5 text-slate-500 font-sans italic max-w-xs truncate">
                      {mov.notes || 'Automated record'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
