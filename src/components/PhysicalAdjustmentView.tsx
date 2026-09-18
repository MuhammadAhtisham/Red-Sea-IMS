import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  Search,
  Barcode,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Upload,
  Download,
  Filter,
  Warehouse,
  Boxes,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import {
  ProductDTO,
  LocationDTO,
  CategoryDTO,
  api,
} from '../services/api';

interface PhysicalAdjustmentViewProps {
  products: ProductDTO[];
  locations: LocationDTO[];
  onAdjustmentCommitted: () => void;
}

interface CountRow {
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  uom: string;
  unitCost: number;
  systemQty: number;
  countedQty: number | string;
  isEdited: boolean;
  notes: string;
}

export const PhysicalAdjustmentView: React.FC<PhysicalAdjustmentViewProps> = ({
  products,
  locations,
  onAdjustmentCommitted,
}) => {
  // Selected warehouse location for count
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    locations.length > 0 ? locations[0].id : ''
  );
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [discrepancyFilter, setDiscrepancyFilter] = useState<'ALL' | 'DISCREPANCIES' | 'MATCHES'>('ALL');

  // Reason & Audit metadata
  const [auditReason, setAuditReason] = useState<string>('PERIODIC_CYCLE_COUNT');
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [auditorName, setAuditorName] = useState<string>('Audit Supervisor #402');

  // Fast Barcode Scanner input
  const [quickScanCode, setQuickScanCode] = useState('');
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // Status feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    message: string;
    reference?: string;
    count?: number;
  } | null>(null);

  // Initialize count rows based on location
  const [countState, setCountState] = useState<{ [productId: string]: { counted: number; isEdited: boolean; notes: string } }>({});

  // Compute table rows based on selected location
  const tableRows: CountRow[] = useMemo(() => {
    return products.map((p) => {
      // Find stock at selected location
      const locStock = p.stockByLocation?.find((sl) => sl.locationId === selectedLocationId);
      const systemQty = locStock ? locStock.quantity : 0;

      const state = countState[p.id];
      const countedQty = state ? state.counted : systemQty;
      const isEdited = state ? state.isEdited : false;
      const notes = state ? state.notes : '';

      return {
        productId: p.id,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        category: p.category || 'General',
        uom: p.unitOfMeasure || 'EA',
        unitCost: p.unitCost || 0,
        systemQty,
        countedQty,
        isEdited,
        notes,
      };
    });
  }, [products, selectedLocationId, countState]);

  // Categories present in product list
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Update physical count for a single SKU
  const handleCountChange = (productId: string, val: string) => {
    const num = val === '' ? 0 : parseInt(val, 10);
    setCountState((prev) => ({
      ...prev,
      [productId]: {
        counted: isNaN(num) ? 0 : num,
        isEdited: true,
        notes: prev[productId]?.notes || '',
      },
    }));
  };

  // Quick increment/decrement
  const handleAdjustStep = (productId: string, currentVal: number, step: number) => {
    const newVal = Math.max(0, currentVal + step);
    setCountState((prev) => ({
      ...prev,
      [productId]: {
        counted: newVal,
        isEdited: true,
        notes: prev[productId]?.notes || '',
      },
    }));
  };

  // Barcode rapid scan handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickScanCode.trim()) return;

    const trimmed = quickScanCode.trim().toLowerCase();
    const match = products.find(
      (p) =>
        p.barcode.toLowerCase() === trimmed ||
        p.sku.toLowerCase() === trimmed ||
        (p.packagings && p.packagings.some((pkg) => pkg.barcode && pkg.barcode.toLowerCase() === trimmed))
    );

    if (match) {
      const locStock = match.stockByLocation?.find((sl) => sl.locationId === selectedLocationId);
      const systemQty = locStock ? locStock.quantity : 0;
      const currentCounted = countState[match.id]?.counted ?? systemQty;
      const updated = currentCounted + 1;

      setCountState((prev) => ({
        ...prev,
        [match.id]: {
          counted: updated,
          isEdited: true,
          notes: prev[match.id]?.notes || '',
        },
      }));

      setScanFeedback(`Scanned ${match.sku} (+1) -> Count: ${updated}`);
      setTimeout(() => setScanFeedback(null), 3500);
      setQuickScanCode('');
    } else {
      setScanFeedback(`SKU or Barcode "${quickScanCode}" not found.`);
      setTimeout(() => setScanFeedback(null), 3500);
    }
  };

  // Reset count rows to system quantities
  const handleResetToSystem = () => {
    if (window.confirm('Reset all physical counts back to current system quantities?')) {
      setCountState({});
      setSubmissionResult(null);
    }
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return tableRows.filter((r) => {
      const matchesSearch =
        r.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.barcode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = filterCategory === 'ALL' || r.category === filterCategory;

      const delta = Number(r.countedQty) - r.systemQty;
      const matchesDiscrepancy =
        discrepancyFilter === 'ALL' ||
        (discrepancyFilter === 'DISCREPANCIES' && delta !== 0) ||
        (discrepancyFilter === 'MATCHES' && delta === 0);

      return matchesSearch && matchesCat && matchesDiscrepancy;
    });
  }, [tableRows, searchQuery, filterCategory, discrepancyFilter]);

  // Discrepancy Analytics
  const analytics = useMemo(() => {
    let totalItems = tableRows.length;
    let discrepanciesCount = 0;
    let totalNetVarianceUnits = 0;
    let totalFinancialVariance = 0;
    let shortageCount = 0;
    let overageCount = 0;

    tableRows.forEach((r) => {
      const counted = Number(r.countedQty);
      const delta = counted - r.systemQty;
      if (delta !== 0) {
        discrepanciesCount++;
        totalNetVarianceUnits += delta;
        totalFinancialVariance += delta * r.unitCost;
        if (delta < 0) shortageCount++;
        else overageCount++;
      }
    });

    return {
      totalItems,
      discrepanciesCount,
      matchesCount: totalItems - discrepanciesCount,
      totalNetVarianceUnits,
      totalFinancialVariance,
      shortageCount,
      overageCount,
    };
  }, [tableRows]);

  // Export physical count worksheet CSV
  const handleExportWorksheet = () => {
    const headers = [
      'SKU',
      'Barcode',
      'Product Name',
      'Category',
      'Base UoM',
      'Location ID',
      'System Qty',
      'Counted Qty',
      'Variance Units',
      'Unit Cost ($)',
      'Valuation Impact ($)',
    ];

    const rows = filteredRows.map((r) => {
      const delta = Number(r.countedQty) - r.systemQty;
      return [
        `"${r.sku}"`,
        `"${r.barcode}"`,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.category}"`,
        `"${r.uom}"`,
        `"${selectedLocationId}"`,
        r.systemQty,
        r.countedQty,
        delta,
        r.unitCost,
        Math.round(delta * r.unitCost * 100) / 100,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `physical_count_${selectedLocationId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Commit physical reconciliation to ERP database
  const handleCommitAdjustments = async () => {
    // Collect all discrepancies
    const adjustmentsToPost = tableRows
      .filter((r) => Number(r.countedQty) !== r.systemQty)
      .map((r) => ({
        productId: r.productId,
        systemQty: r.systemQty,
        countedQty: Number(r.countedQty),
        notes: r.notes || `${auditReason}: Discrepancy of ${Number(r.countedQty) - r.systemQty} ${r.uom}`,
      }));

    if (adjustmentsToPost.length === 0) {
      alert('No discrepancies detected between physical counted stock and system stock. Nothing to reconcile.');
      return;
    }

    if (
      !window.confirm(
        `Commit physical count reconciliation for ${adjustmentsToPost.length} SKU discrepancies? This will execute an atomic database transaction adjusting stock levels.`
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const res = await api.postPhysicalCount({
        locationId: selectedLocationId,
        reason: auditReason,
        notes: auditNotes || `Physical audit conducted by ${auditorName}`,
        userId: auditorName,
        adjustments: adjustmentsToPost,
      });

      setSubmissionResult({
        success: true,
        message: res.message,
        reference: res.reference,
        count: res.adjustedCount,
      });

      // Clear local state and trigger refresh
      setCountState({});
      onAdjustmentCommitted();
    } catch (err: any) {
      setSubmissionResult({
        success: false,
        message: err.response?.data?.error || err.message || 'Failed to commit reconciliation.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedLoc = locations.find((l) => l.id === selectedLocationId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5e1d5] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-[#8c5e15] uppercase tracking-wider">
              Warehouse Inventory Reconciliation
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#122b39] text-[#e5a329]">
              Atomic Audit Engine
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#122b39] tracking-tight mt-1">
            Physical Quantity Adjustment Engine
          </h1>
          <p className="text-xs text-[#6a7d8d] mt-0.5">
            Conduct cycle counts, reconcile system records against physical floor tallies, and atomically commit discrepancy write-offs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleResetToSystem}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#e5e1d5] text-[#122b39] hover:bg-[#faf9f6] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#7a8b99]" />
            <span>Reset Counts</span>
          </button>

          <button
            onClick={handleExportWorksheet}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#e5e1d5] text-[#122b39] hover:bg-[#faf9f6] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Worksheet (CSV)</span>
          </button>

          <button
            onClick={handleCommitAdjustments}
            disabled={isSubmitting || analytics.discrepanciesCount === 0}
            className="px-4 py-2 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm shadow-[#122b39]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 text-[#e5a329]" />
            <span>
              {isSubmitting
                ? 'Committing Transaction...'
                : `Commit Reconciliation (${analytics.discrepanciesCount})`}
            </span>
          </button>
        </div>
      </div>

      {/* Submission Feedback Banner */}
      {submissionResult && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between text-xs ${
            submissionResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {submissionResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="font-bold text-sm">
                {submissionResult.success
                  ? 'Inventory Discrepancy Reconciliation Committed'
                  : 'Reconciliation Failed'}
              </h4>
              <p className="mt-0.5">{submissionResult.message}</p>
              {submissionResult.reference && (
                <div className="mt-2 font-mono text-[11px] font-bold text-[#122b39]">
                  Audit Reference ID: <span className="bg-white/80 px-2 py-0.5 rounded border border-emerald-300">{submissionResult.reference}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setSubmissionResult(null)}
            className="p-1 text-current opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI / Analytics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a8b99] block">
            Audited SKUs
          </span>
          <div className="text-xl font-black text-[#122b39] font-mono mt-1">
            {analytics.totalItems}
          </div>
          <div className="text-[10px] text-[#7a8b99] mt-0.5">Location: {selectedLoc?.code}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a8b99] block">
            Exact Matches
          </span>
          <div className="text-xl font-black text-emerald-700 font-mono mt-1">
            {analytics.matchesCount}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">
            {Math.round((analytics.matchesCount / (analytics.totalItems || 1)) * 100)}% accuracy
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a8b99] block">
            Discrepancies
          </span>
          <div className="text-xl font-black text-red-600 font-mono mt-1">
            {analytics.discrepanciesCount}
          </div>
          <div className="text-[10px] text-red-700 mt-0.5">
            {analytics.shortageCount} Short / {analytics.overageCount} Surplus
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a8b99] block">
            Net Unit Variance
          </span>
          <div
            className={`text-xl font-black font-mono mt-1 ${
              analytics.totalNetVarianceUnits < 0
                ? 'text-red-600'
                : analytics.totalNetVarianceUnits > 0
                ? 'text-amber-600'
                : 'text-emerald-700'
            }`}
          >
            {analytics.totalNetVarianceUnits > 0 ? `+${analytics.totalNetVarianceUnits}` : analytics.totalNetVarianceUnits}
          </div>
          <div className="text-[10px] text-[#7a8b99] mt-0.5">Discrepancy delta sum</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#e5e1d5] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a8b99] block">
            Financial Impact
          </span>
          <div
            className={`text-xl font-black font-mono mt-1 ${
              analytics.totalFinancialVariance < 0
                ? 'text-red-600'
                : analytics.totalFinancialVariance > 0
                ? 'text-amber-600'
                : 'text-emerald-700'
            }`}
          >
            {analytics.totalFinancialVariance < 0 ? '-' : '+'}$
            {Math.abs(Math.round(analytics.totalFinancialVariance)).toLocaleString()}
          </div>
          <div className="text-[10px] text-[#7a8b99] mt-0.5">Asset net variance valuation</div>
        </div>
      </div>

      {/* Control Console: Location Picker, Barcode Scanner, Audit Config */}
      <div className="bg-white p-5 rounded-2xl border border-[#e5e1d5] shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Location Selector */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5 flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5 text-[#e5a329]" />
              <span>Target Warehouse Bay *</span>
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => {
                setSelectedLocationId(e.target.value);
                setCountState({});
              }}
              className="w-full px-3 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs text-[#122b39] font-semibold focus:outline-none focus:border-[#122b39]"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code}) — {loc.type}
                </option>
              ))}
            </select>
          </div>

          {/* Audit Reason */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5">
              Audit Reason
            </label>
            <select
              value={auditReason}
              onChange={(e) => setAuditReason(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
            >
              <option value="PERIODIC_CYCLE_COUNT">Routine Weekly Cycle Count</option>
              <option value="ANNUAL_PHYSICAL_AUDIT">Annual Wall-to-Wall Physical Audit</option>
              <option value="DAMAGED_STOCK_WRITEDOWN">Damaged Stock / Expiry Write-Off</option>
              <option value="RECEIVING_DISCREPANCY">Inbound Receiving Variance</option>
              <option value="SECURITY_SHRINKAGE">Security / Shrinkage Investigation</option>
            </select>
          </div>

          {/* Auditor Name */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5">
              Auditor / Inspector
            </label>
            <input
              type="text"
              value={auditorName}
              onChange={(e) => setAuditorName(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
            />
          </div>

          {/* Rapid Barcode Scanner */}
          <div className="md:col-span-3">
            <form onSubmit={handleBarcodeSubmit}>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Barcode className="w-3.5 h-3.5 text-[#e5a329]" />
                  <span>Rapid Barcode Scanner</span>
                </span>
                <span className="text-[10px] text-[#7a8b99]">Enter to +1</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={quickScanCode}
                  onChange={(e) => setQuickScanCode(e.target.value)}
                  placeholder="Scan SKU / Barcode..."
                  className="w-full px-3 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs font-mono text-[#122b39] focus:outline-none focus:border-[#122b39]"
                />
                <button
                  type="submit"
                  className="px-3 py-2.5 rounded-xl bg-[#122b39] text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  Scan
                </button>
              </div>
            </form>
          </div>
        </div>

        {scanFeedback && (
          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs font-mono font-bold flex items-center gap-2">
            <Barcode className="w-4 h-4 text-blue-600" />
            <span>{scanFeedback}</span>
          </div>
        )}

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#f0ece2]">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-[#7a8b99] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU, name, barcode..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-xs text-[#122b39] font-medium"
            >
              <option value="ALL">All Categories</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Quick Discrepancy Filter Buttons */}
            <div className="flex items-center gap-1 p-0.5 bg-[#f6f4ed] rounded-lg border border-[#e2ded2] text-xs">
              <button
                type="button"
                onClick={() => setDiscrepancyFilter('ALL')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  discrepancyFilter === 'ALL'
                    ? 'bg-white font-bold text-[#122b39] shadow-2xs'
                    : 'text-[#7a8b99]'
                }`}
              >
                All ({tableRows.length})
              </button>
              <button
                type="button"
                onClick={() => setDiscrepancyFilter('DISCREPANCIES')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                  discrepancyFilter === 'DISCREPANCIES'
                    ? 'bg-red-50 text-red-800 font-bold border border-red-200'
                    : 'text-[#7a8b99]'
                }`}
              >
                <span>Discrepancies</span>
                <span className="bg-red-600 text-white rounded-full px-1.5 py-0.2 text-[9px] font-mono">
                  {analytics.discrepanciesCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDiscrepancyFilter('MATCHES')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  discrepancyFilter === 'MATCHES'
                    ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                    : 'text-[#7a8b99]'
                }`}
              >
                Matches ({analytics.matchesCount})
              </button>
            </div>
          </div>

          <span className="text-xs font-mono text-[#7a8b99]">
            Showing {filteredRows.length} of {tableRows.length} items
          </span>
        </div>
      </div>

      {/* Main Reconciliation Data Grid */}
      <div className="bg-white rounded-2xl border border-[#e5e1d5] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f8f5ee] text-[#526677] font-bold uppercase tracking-wider border-b border-[#e5e1d5] text-[11px]">
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">SKU & Barcode</th>
                <th className="py-3 px-3.5">Product Name & Category</th>
                <th className="py-3 px-3 text-center">UoM</th>
                <th className="py-3 px-3 text-right">System Qty</th>
                <th className="py-3 px-3.5 text-center min-w-[150px]">Physical Count</th>
                <th className="py-3 px-3 text-right">Discrepancy</th>
                <th className="py-3 px-3.5 text-right">Valuation Impact</th>
                <th className="py-3 px-3.5">Notes / Audit Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ece2] font-mono">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#7a8b99] font-sans">
                    No items match the active filters for {selectedLoc?.name}.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const counted = Number(r.countedQty);
                  const delta = counted - r.systemQty;
                  const valImpact = delta * r.unitCost;
                  const isMatch = delta === 0;
                  const isShortage = delta < 0;
                  const isOverage = delta > 0;

                  return (
                    <tr
                      key={r.productId}
                      className={`hover:bg-[#faf9f6] transition-colors ${
                        r.isEdited ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Status Dot / Indicator */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-sans font-bold text-[11px]">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isMatch
                                ? 'bg-emerald-500'
                                : isShortage
                                ? 'bg-red-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span
                            className={
                              isMatch
                                ? 'text-emerald-700'
                                : isShortage
                                ? 'text-red-700'
                                : 'text-amber-700'
                            }
                          >
                            {isMatch ? 'Match' : isShortage ? 'Short' : 'Surplus'}
                          </span>
                        </div>
                      </td>

                      {/* SKU & Barcode */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-[#122b39]">{r.sku}</div>
                        <div className="text-[10px] text-[#7a8b99]">{r.barcode}</div>
                      </td>

                      {/* Name & Category */}
                      <td className="py-2.5 px-3.5 font-sans">
                        <div className="font-semibold text-[#152836] max-w-xs truncate">{r.name}</div>
                        <span className="text-[10px] text-[#7a8b99]">{r.category}</span>
                      </td>

                      {/* UoM */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-[#f6f4ed] border border-[#e2ddd0] text-[#526677] text-[10px] font-bold">
                          {r.uom}
                        </span>
                      </td>

                      {/* System Qty */}
                      <td className="py-2.5 px-3 text-right font-bold text-[#122b39]">
                        {r.systemQty}
                      </td>

                      {/* Physical Count Input with Quick Increment Controls */}
                      <td className="py-2 px-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustStep(r.productId, counted, -1)}
                            className="w-6 h-6 rounded bg-[#f0ece2] hover:bg-[#e4dfd2] text-[#122b39] font-bold flex items-center justify-center transition cursor-pointer text-xs"
                            title="Decrease by 1"
                          >
                            -
                          </button>

                          <input
                            type="number"
                            min={0}
                            value={r.countedQty}
                            onChange={(e) => handleCountChange(r.productId, e.target.value)}
                            className={`w-20 px-2 py-1 text-center rounded-lg border font-mono font-bold text-xs focus:outline-none ${
                              !isMatch
                                ? isShortage
                                  ? 'bg-red-50/60 border-red-300 text-red-900'
                                  : 'bg-amber-50/60 border-amber-300 text-amber-900'
                                : 'bg-white border-[#e5e1d5] text-[#122b39] focus:border-[#122b39]'
                            }`}
                          />

                          <button
                            type="button"
                            onClick={() => handleAdjustStep(r.productId, counted, 1)}
                            className="w-6 h-6 rounded bg-[#f0ece2] hover:bg-[#e4dfd2] text-[#122b39] font-bold flex items-center justify-center transition cursor-pointer text-xs"
                            title="Increase by 1"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Discrepancy Delta */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            isMatch
                              ? 'text-emerald-700 bg-emerald-50'
                              : isShortage
                              ? 'text-red-700 bg-red-50'
                              : 'text-amber-700 bg-amber-50'
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      </td>

                      {/* Valuation Impact */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            isMatch
                              ? 'text-[#7a8b99]'
                              : isShortage
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {valImpact < 0 ? '-' : valImpact > 0 ? '+' : ''}$
                          {Math.abs(Math.round(valImpact * 100) / 100).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Row Notes */}
                      <td className="py-2 px-3.5 font-sans">
                        <input
                          type="text"
                          placeholder="Reason or notes..."
                          value={r.notes}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCountState((prev) => ({
                              ...prev,
                              [r.productId]: {
                                counted: Number(r.countedQty),
                                isEdited: true,
                                notes: val,
                              },
                            }));
                          }}
                          className="w-full px-2 py-1 bg-[#faf9f6] border border-[#e5e1d5] rounded text-[11px] text-[#122b39] focus:outline-none focus:bg-white focus:border-[#122b39]"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Reconciliation Summary */}
        <div className="p-4 bg-[#f8f5ee] border-t border-[#e5e1d5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-[#526677]">
            <span>
              Bay Location: <strong className="text-[#122b39] font-mono">{selectedLoc?.name}</strong>
            </span>
            <span>•</span>
            <span>
              Discrepancies: <strong className="text-red-700 font-mono">{analytics.discrepanciesCount}</strong>
            </span>
            <span>•</span>
            <span>
              Net Impact:{' '}
              <strong
                className={`font-mono ${
                  analytics.totalFinancialVariance < 0 ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {analytics.totalFinancialVariance < 0 ? '-' : '+'}$
                {Math.abs(Math.round(analytics.totalFinancialVariance)).toLocaleString()}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCommitAdjustments}
              disabled={isSubmitting || analytics.discrepanciesCount === 0}
              className="px-4 py-2 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#e5a329]" />
              <span>Commit Discrepancy Adjustments</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
