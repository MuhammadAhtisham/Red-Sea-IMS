import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Calendar,
  History,
  ArrowRightLeft,
  Trash2,
  SlidersHorizontal,
  Building2,
  Boxes,
} from 'lucide-react';
import { ProductDTO, LocationDTO, StockMovementDTO } from '../../services/api';

interface OperationsLedgerViewProps {
  products: ProductDTO[];
  locations: LocationDTO[];
  movements: StockMovementDTO[];
}

export const OperationsLedgerView: React.FC<OperationsLedgerViewProps> = ({
  products,
  locations,
  movements,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [locFilter, setLocFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7DAYS'>('ALL');

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        m.reference?.toLowerCase().includes(q) ||
        m.productName?.toLowerCase().includes(q) ||
        m.sku?.toLowerCase().includes(q) ||
        m.notes?.toLowerCase().includes(q) ||
        m.userId?.toLowerCase().includes(q);

      const isScrap = Boolean(
        m.type === 'SCRAP' ||
        (m.type === 'ADJUSTMENT' && m.quantity < 0 && m.notes?.toLowerCase().includes('scrap'))
      );

      let matchesType = true;
      if (typeFilter === 'TRANSFER') matchesType = m.type === 'TRANSFER';
      else if (typeFilter === 'SCRAP') matchesType = isScrap;
      else if (typeFilter === 'ADJUSTMENT') matchesType = m.type === 'ADJUSTMENT' && !isScrap;
      else if (typeFilter !== 'ALL') matchesType = m.type === typeFilter;

      const matchesLoc =
        locFilter === 'ALL' ||
        m.fromLocationId === locFilter ||
        m.toLocationId === locFilter;

      let matchesDate = true;
      if (dateFilter === 'TODAY') {
        const todayStr = new Date().toISOString().slice(0, 10);
        matchesDate = Boolean(m.timestamp && m.timestamp.startsWith(todayStr));
      } else if (dateFilter === '7DAYS') {
        const past = Date.now() - 7 * 24 * 60 * 60 * 1000;
        matchesDate = Boolean(m.timestamp && new Date(m.timestamp).getTime() >= past);
      }

      return matchesSearch && matchesType && matchesLoc && matchesDate;
    });
  }, [movements, searchQuery, typeFilter, locFilter, dateFilter]);

  // Operational metrics for active selection
  const totalVolumeMoved = useMemo(() => {
    return filteredMovements.reduce((acc, m) => acc + Math.abs(m.quantity), 0);
  }, [filteredMovements]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Timestamp',
      'Reference',
      'Operation Type',
      'SKU',
      'Product Name',
      'Source Bay',
      'Destination Bay',
      'Quantity Delta',
      'Unit of Measure',
      'Operator Badge',
      'Audit Notes',
    ];

    const rows = filteredMovements.map((m) => {
      const prod = products.find((p) => p.id === m.productId);
      const isScrap = Boolean(
        m.type === 'SCRAP' ||
        (m.type === 'ADJUSTMENT' && m.quantity < 0 && m.notes?.toLowerCase().includes('scrap'))
      );
      const opLabel = isScrap ? 'SCRAP' : m.type;

      return [
        `"${m.timestamp}"`,
        `"${m.reference || ''}"`,
        `"${opLabel}"`,
        `"${m.sku || prod?.sku || ''}"`,
        `"${(m.productName || prod?.name || '').replace(/"/g, '""')}"`,
        `"${m.fromLocationName || ''}"`,
        `"${m.toLocationName || ''}"`,
        m.quantity,
        `"${prod?.unitOfMeasure || 'EA'}"`,
        `"${m.userId || 'SYSTEM'}"`,
        `"${(m.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `inventory_operations_ledger_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* KPI Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677] block">
            Filtered Operations
          </span>
          <div className="text-xl font-black text-[#122b39] mt-0.5">
            {filteredMovements.length}
          </div>
          <span className="text-[10px] text-[#7a8b99]">matching criteria</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677] block">
            Total Units Moved
          </span>
          <div className="text-xl font-black text-[#122b39] mt-0.5">
            {totalVolumeMoved.toLocaleString()}
          </div>
          <span className="text-[10px] text-[#7a8b99]">throughput volume</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677] block">
            Inter-Bay Transfers
          </span>
          <div className="text-xl font-black text-[#1e6091] mt-0.5">
            {filteredMovements.filter((m) => m.type === 'TRANSFER').length}
          </div>
          <span className="text-[10px] text-[#7a8b99]">rebalance movements</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#526677] block">
            Scrap Depletions
          </span>
          <div className="text-xl font-black text-red-700 mt-0.5">
            {
              filteredMovements.filter(
                (m) =>
                  m.type === 'SCRAP' ||
                  (m.type === 'ADJUSTMENT' && m.quantity < 0 && m.notes?.toLowerCase().includes('scrap'))
              ).length
            }
          </div>
          <span className="text-[10px] text-[#7a8b99]">write-off vouchers</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] flex flex-col md:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#7a8b99] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ref #, SKU, bay, notes..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
            />
          </div>

          {/* Operation Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-xs text-[#122b39] font-medium"
          >
            <option value="ALL">All Operations</option>
            <option value="TRANSFER">Inter-Bay Transfers</option>
            <option value="SCRAP">Scrap & Damaged Write-Offs</option>
            <option value="ADJUSTMENT">Cycle Count Adjustments</option>
          </select>

          {/* Location Bay Filter */}
          <select
            value={locFilter}
            onChange={(e) => setLocFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-xs text-[#122b39] font-medium"
          >
            <option value="ALL">All Storage Bays</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.code})
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-xs text-[#122b39] font-medium"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="7DAYS">Last 7 Days</option>
          </select>
        </div>

        {/* Export Button */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-lg bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-[#e5a329]" />
            <span>Export Ledger (CSV)</span>
          </button>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#e5e1d5] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f8f5ee] text-[#526677] font-bold uppercase tracking-wider border-b border-[#e5e1d5] text-[11px]">
                <th className="py-3 px-3.5">Timestamp</th>
                <th className="py-3 px-3.5">Reference ID</th>
                <th className="py-3 px-3.5">Operation Type</th>
                <th className="py-3 px-3.5">SKU & Item Name</th>
                <th className="py-3 px-3.5">Origin Bay</th>
                <th className="py-3 px-3.5">Destination Bay</th>
                <th className="py-3 px-3.5 text-right">Qty Delta</th>
                <th className="py-3 px-3.5">Operator</th>
                <th className="py-3 px-3.5">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ece2] font-mono">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#7a8b99] font-sans">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const isScrap =
                    m.type === 'SCRAP' ||
                    (m.type === 'ADJUSTMENT' && m.quantity < 0 && m.notes?.toLowerCase().includes('scrap'));
                  const delta = m.quantity;
                  const isPositive = delta > 0;

                  return (
                    <tr key={m.id} className="hover:bg-[#faf9f6] transition-colors">
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-[#7a8b99] text-[11px]">
                        {new Date(m.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-bold text-[#122b39]">
                        {m.reference || m.id.slice(0, 10)}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-sans">
                        {isScrap ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-1">
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>SCRAP</span>
                          </span>
                        ) : m.type === 'TRANSFER' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                            <ArrowRightLeft className="w-2.5 h-2.5" />
                            <span>TRANSFER</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
                            <SlidersHorizontal className="w-2.5 h-2.5" />
                            <span>ADJUSTMENT</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-sans">
                        <div className="font-mono font-bold text-[#122b39]">{m.sku}</div>
                        <div className="text-[11px] text-[#7a8b99] truncate max-w-xs">
                          {m.productName}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-sans text-[#122b39]">
                        {m.fromLocationName || '—'}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-sans text-[#122b39]">
                        {m.toLocationName || '—'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-black">
                        <span
                          className={
                            isScrap
                              ? 'text-red-700'
                              : isPositive
                              ? 'text-emerald-700'
                              : delta < 0
                              ? 'text-red-700'
                              : 'text-[#122b39]'
                          }
                        >
                          {isScrap ? `-${Math.abs(delta)}` : isPositive ? `+${delta}` : delta}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-sans text-[#7a8b99] text-[11px]">
                        {m.userId || 'OPERATOR'}
                      </td>
                      <td className="py-2.5 px-3.5 font-sans text-[11px] text-[#526677] max-w-xs truncate">
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
  );
};
