import React, { useState, useMemo, useRef } from 'react';
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
  Download,
  Upload,
  Search,
  Filter,
  FileSpreadsheet,
  Trash2,
  FileText,
  Clock,
  ArrowRight,
  Boxes,
  Warehouse,
  Check,
  X,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  TrendingDown,
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

type OpType = 'TRANSFER' | 'RECEIPT' | 'SCRAP' | 'ADJUSTMENT';

interface BatchImportRow {
  id: string;
  type: OpType;
  sku: string;
  quantity: number;
  fromLocationCode: string;
  toLocationCode: string;
  reference: string;
  notes: string;
  status: 'VALID' | 'ERROR';
  errorMessage?: string;
  productId?: string;
  fromLocationId?: string;
  toLocationId?: string;
}

export const StockOperationsView: React.FC<StockOperationsViewProps> = ({
  products,
  locations,
  movements,
  pallets,
  onOperationSuccess,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'NEW_OPERATION' | 'AUDIT_LEDGER' | 'BATCH_IMPORT'>('NEW_OPERATION');

  // Operation Form State
  const [opType, setOpType] = useState<OpType>('TRANSFER');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [fromLocId, setFromLocId] = useState<string>(locations[0]?.id || '');
  const [toLocId, setToLocId] = useState<string>(locations[1]?.id || locations[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(10);
  const [reference, setReference] = useState<string>(`TRF-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState<string>('Standard inventory movement');
  const [operatorId, setOperatorId] = useState<string>('OPS-SUPERVISOR-01');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Audit Ledger Filters
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('ALL');
  const [ledgerLocFilter, setLedgerLocFilter] = useState<string>('ALL');

  // Batch Import State
  const [importCsvText, setImportCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<BatchImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected Product details
  const currentProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

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

  // Update default reference prefix when type changes
  const handleTypeChange = (type: OpType) => {
    setOpType(type);
    const suffix = Date.now().toString().slice(-6);
    if (type === 'TRANSFER') setReference(`TRF-${suffix}`);
    else if (type === 'RECEIPT') setReference(`RCV-${suffix}`);
    else if (type === 'SCRAP') setReference(`SCRAP-${suffix}`);
    else if (type === 'ADJUSTMENT') setReference(`ADJ-${suffix}`);
  };

  // Submit Single Operation Form
  const handleSubmitOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) return;

    if (opType === 'TRANSFER' && fromLocId === toLocId) {
      setStatusMessage({ text: 'Source and destination locations must be different for transfers.', type: 'error' });
      return;
    }

    if ((opType === 'TRANSFER' || opType === 'SCRAP') && sourceStock < quantity) {
      setStatusMessage({
        text: `Insufficient stock at source: requested ${quantity}, available ${sourceStock} ${currentProduct?.unitOfMeasure || 'EA'}.`,
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      if (opType === 'TRANSFER') {
        const res = await api.transferStock({
          productId: selectedProductId,
          fromLocationId: fromLocId,
          toLocationId: toLocId,
          quantity,
          reference: reference.trim(),
          notes: notes.trim() ? `${notes.trim()} (Op: ${operatorId})` : `Op: ${operatorId}`,
        });
        setStatusMessage({ text: res.message || 'Inter-facility transfer completed successfully.', type: 'success' });
      } else if (opType === 'RECEIPT') {
        const res = await api.receiveStock({
          productId: selectedProductId,
          locationId: toLocId || fromLocId,
          quantity,
          reference: reference.trim(),
          notes: notes.trim() ? `${notes.trim()} (Op: ${operatorId})` : `Op: ${operatorId}`,
        });
        setStatusMessage({ text: res.message || 'Inbound stock receipt committed.', type: 'success' });
      } else if (opType === 'SCRAP') {
        const res = await api.adjustStock({
          productId: selectedProductId,
          locationId: fromLocId,
          quantityDelta: -quantity,
          reference: reference.trim(),
          notes: `Damaged/Scrap Write-Off: ${notes.trim()} (Op: ${operatorId})`,
        });
        setStatusMessage({ text: res.message || 'Scrap write-off committed.', type: 'success' });
      } else if (opType === 'ADJUSTMENT') {
        const res = await api.adjustStock({
          productId: selectedProductId,
          locationId: fromLocId,
          quantityDelta: quantity,
          reference: reference.trim(),
          notes: notes.trim() ? `${notes.trim()} (Op: ${operatorId})` : `Op: ${operatorId}`,
        });
        setStatusMessage({ text: res.message || 'Inventory adjustment committed.', type: 'success' });
      }

      onOperationSuccess();
      // Generate new reference ID
      handleTypeChange(opType);
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.error || err.message || 'Operation failed.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered ledger rows
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const q = ledgerSearch.toLowerCase();
      const matchesSearch =
        m.reference?.toLowerCase().includes(q) ||
        m.productName?.toLowerCase().includes(q) ||
        m.sku?.toLowerCase().includes(q) ||
        m.notes?.toLowerCase().includes(q);

      const matchesType = ledgerTypeFilter === 'ALL' || m.type === ledgerTypeFilter;

      const matchesLoc =
        ledgerLocFilter === 'ALL' ||
        m.fromLocationId === ledgerLocFilter ||
        m.toLocationId === ledgerLocFilter;

      return matchesSearch && matchesType && matchesLoc;
    });
  }, [movements, ledgerSearch, ledgerTypeFilter, ledgerLocFilter]);

  // Export Operations Ledger CSV
  const handleExportOperations = () => {
    const headers = [
      'Timestamp',
      'Reference',
      'Type',
      'SKU',
      'Product Name',
      'Source Location',
      'Destination Location',
      'Quantity Delta',
      'Unit',
      'Operator User ID',
      'Notes / Reason',
    ];

    const rows = filteredMovements.map((m) => {
      const prod = products.find((p) => p.id === m.productId);
      return [
        `"${m.timestamp}"`,
        `"${m.reference || ''}"`,
        `"${m.type}"`,
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
    link.setAttribute('download', `inventory_operations_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Sample Batch CSV Template
  const handleDownloadTemplate = () => {
    const sample = `type,sku,quantity,fromLocationCode,toLocationCode,reference,notes
TRANSFER,NEOM-IOT-GW500,10,LOC-NEOM-MAIN,LOC-TABUK-XFER,BATCH-TRF-01,Scheduled cross-dock replenishment
RECEIPT,NEOM-SOL-INV50K,25,,LOC-NEOM-MAIN,BATCH-RCV-01,Bulk supplier inbound receipt
SCRAP,NEOM-LIDAR-V4,2,LOC-NEOM-MAIN,,BATCH-SCRAP-01,Damaged during transit inspection
ADJUSTMENT,NEOM-PPE-HARN01,5,LOC-NEOM-MAIN,,BATCH-ADJ-01,Physical count reconciliation difference`;

    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'inventory_operations_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV text into validated preview rows
  const handleParseCsv = (text: string) => {
    setImportCsvText(text);
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      setParsedRows([]);
      return;
    }

    const rows: BatchImportRow[] = [];
    const startIndex = lines[0].toLowerCase().includes('sku') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      const rawType = (parts[0] || 'TRANSFER').toUpperCase() as OpType;
      const sku = parts[1] || '';
      const qty = Math.abs(parseInt(parts[2] || '0', 10));
      const fromCode = parts[3] || '';
      const toCode = parts[4] || '';
      const ref = parts[5] || `BATCH-${Date.now().toString().slice(-4)}-${i}`;
      const rowNotes = parts[6] || 'Batch imported inventory operation';

      // Validation
      const product = products.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
      const fromLoc = locations.find((l) => l.code.toLowerCase() === fromCode.toLowerCase());
      const toLoc = locations.find((l) => l.code.toLowerCase() === toCode.toLowerCase());

      let status: 'VALID' | 'ERROR' = 'VALID';
      let errorMessage = '';

      if (!product) {
        status = 'ERROR';
        errorMessage = `SKU "${sku}" not recognized in catalog.`;
      } else if (qty <= 0) {
        status = 'ERROR';
        errorMessage = 'Quantity must be greater than 0.';
      } else if (rawType === 'TRANSFER') {
        if (!fromLoc) {
          status = 'ERROR';
          errorMessage = `Source location "${fromCode}" invalid.`;
        } else if (!toLoc) {
          status = 'ERROR';
          errorMessage = `Target location "${toCode}" invalid.`;
        } else if (fromLoc.id === toLoc.id) {
          status = 'ERROR';
          errorMessage = 'Source and destination cannot be identical.';
        }
      } else if (rawType === 'RECEIPT' && !toLoc && !fromLoc) {
        status = 'ERROR';
        errorMessage = 'Destination location code is required for receipt.';
      } else if (rawType === 'SCRAP' && !fromLoc) {
        status = 'ERROR';
        errorMessage = 'Source location code required for scrap.';
      }

      rows.push({
        id: `row-${i}-${Date.now()}`,
        type: rawType,
        sku,
        quantity: qty,
        fromLocationCode: fromCode,
        toLocationCode: toCode,
        reference: ref,
        notes: rowNotes,
        status,
        errorMessage,
        productId: product?.id,
        fromLocationId: fromLoc?.id,
        toLocationId: toLoc?.id,
      });
    }

    setParsedRows(rows);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParseCsv(content);
    };
    reader.readAsText(file);
  };

  // Commit valid batch rows
  const handleExecuteBatchImport = async () => {
    const validRows = parsedRows.filter((r) => r.status === 'VALID' && r.productId);
    if (validRows.length === 0) {
      alert('No valid rows available to execute.');
      return;
    }

    setIsImporting(true);
    setStatusMessage(null);

    try {
      const payload = validRows.map((r) => ({
        type: r.type,
        productId: r.productId!,
        fromLocationId: r.fromLocationId,
        toLocationId: r.toLocationId,
        locationId: r.toLocationId || r.fromLocationId,
        quantity: r.quantity,
        reference: r.reference,
        notes: r.notes,
      }));

      const res = await api.executeBatchOperations({
        userId: operatorId,
        operations: payload,
      });

      setStatusMessage({
        text: `Batch executed successfully: ${res.executedCount} operations posted atomically.`,
        type: 'success',
      });
      setParsedRows([]);
      setImportCsvText('');
      onOperationSuccess();
      setActiveTab('AUDIT_LEDGER');
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.error || err.message || 'Batch operation import failed.',
        type: 'error',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const validRowCount = parsedRows.filter((r) => r.status === 'VALID').length;
  const errorRowCount = parsedRows.filter((r) => r.status === 'ERROR').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5e1d5] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-[#8c5e15] uppercase tracking-wider">
              Warehouse Transaction Engine
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#122b39] text-[#e5a329]">
              ACID Compliant
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#122b39] tracking-tight mt-1">
            Inventory Operations & Stock Ledger
          </h1>
          <p className="text-xs text-[#6a7d8d] mt-0.5">
            Execute inter-warehouse rebalancing, log supplier receipts, track scrap write-offs, and batch import bulk operations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-white border border-[#e5e1d5] rounded-xl shadow-2xs">
          <button
            onClick={() => setActiveTab('NEW_OPERATION')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'NEW_OPERATION'
                ? 'bg-[#122b39] text-white shadow-xs'
                : 'text-[#526677] hover:text-[#122b39]'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#e5a329]" />
            <span>Execute Operation</span>
          </button>
          <button
            onClick={() => setActiveTab('AUDIT_LEDGER')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'AUDIT_LEDGER'
                ? 'bg-[#122b39] text-white shadow-xs'
                : 'text-[#526677] hover:text-[#122b39]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Operations Ledger ({movements.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('BATCH_IMPORT')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'BATCH_IMPORT'
                ? 'bg-[#122b39] text-white shadow-xs'
                : 'text-[#526677] hover:text-[#122b39]'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>Batch Import (CSV)</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 hover:opacity-75 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: PROFESSIONAL SINGLE INVENTORY OPERATION FORM                       */}
      {/* ========================================================================= */}
      {activeTab === 'NEW_OPERATION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form (8 cols on lg) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#e5e1d5] p-6 shadow-xs space-y-5">
            {/* Operation Type Switcher */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-2">
                Operation Type *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange('TRANSFER')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    opType === 'TRANSFER'
                      ? 'border-[#122b39] bg-[#122b39] text-white shadow-xs'
                      : 'border-[#e5e1d5] bg-[#faf9f6] text-[#122b39] hover:bg-[#f0ece2]'
                  }`}
                >
                  <ArrowRightLeft className={`w-4 h-4 mb-1.5 ${opType === 'TRANSFER' ? 'text-[#e5a329]' : 'text-[#7a8b99]'}`} />
                  <div className="font-bold text-xs">Inter-Bay Transfer</div>
                  <div className={`text-[10px] ${opType === 'TRANSFER' ? 'text-gray-300' : 'text-[#7a8b99]'}`}>
                    Rebalance between facilities
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeChange('RECEIPT')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    opType === 'RECEIPT'
                      ? 'border-[#122b39] bg-[#122b39] text-white shadow-xs'
                      : 'border-[#e5e1d5] bg-[#faf9f6] text-[#122b39] hover:bg-[#f0ece2]'
                  }`}
                >
                  <ArrowDownLeft className={`w-4 h-4 mb-1.5 ${opType === 'RECEIPT' ? 'text-[#e5a329]' : 'text-emerald-600'}`} />
                  <div className="font-bold text-xs">Direct Inbound Receipt</div>
                  <div className={`text-[10px] ${opType === 'RECEIPT' ? 'text-gray-300' : 'text-[#7a8b99]'}`}>
                    Add received supplier stock
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeChange('SCRAP')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    opType === 'SCRAP'
                      ? 'border-[#122b39] bg-[#122b39] text-white shadow-xs'
                      : 'border-[#e5e1d5] bg-[#faf9f6] text-[#122b39] hover:bg-[#f0ece2]'
                  }`}
                >
                  <TrendingDown className={`w-4 h-4 mb-1.5 ${opType === 'SCRAP' ? 'text-[#e5a329]' : 'text-red-600'}`} />
                  <div className="font-bold text-xs">Scrap & Damaged Write-Off</div>
                  <div className={`text-[10px] ${opType === 'SCRAP' ? 'text-gray-300' : 'text-[#7a8b99]'}`}>
                    Deduct damaged or lost stock
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeChange('ADJUSTMENT')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    opType === 'ADJUSTMENT'
                      ? 'border-[#122b39] bg-[#122b39] text-white shadow-xs'
                      : 'border-[#e5e1d5] bg-[#faf9f6] text-[#122b39] hover:bg-[#f0ece2]'
                  }`}
                >
                  <SlidersHorizontal className={`w-4 h-4 mb-1.5 ${opType === 'ADJUSTMENT' ? 'text-[#e5a329]' : 'text-[#7a8b99]'}`} />
                  <div className="font-bold text-xs">Inventory Adjustment</div>
                  <div className={`text-[10px] ${opType === 'ADJUSTMENT' ? 'text-gray-300' : 'text-[#7a8b99]'}`}>
                    Direct audit reconciliation
                  </div>
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmitOperation} className="space-y-4 text-xs">
              {/* Product SKU Selector */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1.5 flex items-center justify-between">
                  <span>Product / Item Master *</span>
                  <span className="text-[11px] text-[#7a8b99] font-normal">
                    {products.length} products available
                  </span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs text-[#122b39] font-medium focus:outline-none focus:border-[#122b39]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name} ({p.category || 'General'}) [Total: {p.totalStock} {p.unitOfMeasure || 'EA'}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Source Location (if Transfer, Scrap, or Adjustment) */}
                {(opType === 'TRANSFER' || opType === 'SCRAP' || opType === 'ADJUSTMENT') && (
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1.5 flex items-center justify-between">
                      <span>Source Warehouse Location *</span>
                      <span className="font-mono text-[#e5a329] font-bold">
                        On-Hand: {sourceStock} {currentProduct?.unitOfMeasure || 'EA'}
                      </span>
                    </label>
                    <select
                      value={fromLocId}
                      onChange={(e) => setFromLocId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs text-[#122b39] font-medium focus:outline-none focus:border-[#122b39]"
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
                )}

                {/* Target Location (if Transfer or Receipt) */}
                {(opType === 'TRANSFER' || opType === 'RECEIPT') && (
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1.5 flex items-center justify-between">
                      <span>Destination Warehouse Location *</span>
                      <span className="font-mono text-emerald-700 font-bold">
                        Target Current: {targetStock} {currentProduct?.unitOfMeasure || 'EA'}
                      </span>
                    </label>
                    <select
                      value={toLocId}
                      onChange={(e) => setToLocId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs text-[#122b39] font-medium focus:outline-none focus:border-[#122b39]"
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
                )}
              </div>

              {/* Quantity, Unit & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                    Quantity to Move *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs font-mono font-bold text-[#122b39] focus:outline-none focus:border-[#122b39]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7a8b99]">
                      {currentProduct?.unitOfMeasure || 'EA'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                    Document Reference # *
                  </label>
                  <input
                    type="text"
                    required
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs font-mono font-bold text-[#122b39] focus:outline-none focus:border-[#122b39]"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                    Operator / Badge ID
                  </label>
                  <input
                    type="text"
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                  Audit Notes & Commercial Reason
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide audit justification, purchase order reference, or bay notes..."
                  className="w-full px-3.5 py-2 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
                />
              </div>

              {/* Submit Row */}
              <div className="pt-3 border-t border-[#f0ece2] flex items-center justify-between">
                <div className="text-[11px] text-[#7a8b99]">
                  {opType === 'TRANSFER' && `Simulated outcome: Source: ${sourceStock} → ${sourceStock - quantity} | Target: ${targetStock} → ${targetStock + quantity}`}
                  {opType === 'RECEIPT' && `Simulated outcome: Location stock increases by +${quantity} units`}
                  {opType === 'SCRAP' && `Simulated outcome: Source stock written down from ${sourceStock} → ${sourceStock - quantity}`}
                  {opType === 'ADJUSTMENT' && `Simulated outcome: Delta adjustment of +${quantity} applied`}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-[#e5a329]" />
                  <span>{isSubmitting ? 'Posting Transaction...' : 'Commit Operation'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Summary / Live SKU Card (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-4">
            {currentProduct && (
              <div className="bg-white rounded-2xl border border-[#e5e1d5] p-5 shadow-xs space-y-4 text-xs">
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

                <div className="bg-[#faf9f6] p-3 rounded-xl border border-[#f0ece2] space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-[#7a8b99]">Unit Cost:</span>
                    <span className="font-bold text-[#122b39]">${currentProduct.unitCost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7a8b99]">Total Facility Stock:</span>
                    <span className="font-bold text-[#122b39]">{currentProduct.totalStock} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7a8b99]">Total Stock Valuation:</span>
                    <span className="font-bold text-emerald-700">
                      ${Math.round(currentProduct.totalStock * currentProduct.unitCost).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Stock distribution breakdown */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#526677] block mb-2">
                    Stock Across Storage Bays
                  </span>
                  <div className="space-y-1.5">
                    {currentProduct.stockByLocation?.map((loc) => (
                      <div
                        key={loc.locationId}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#faf9f6] border border-[#f0ece2] text-[11px]"
                      >
                        <span className="font-medium text-[#152836] truncate max-w-[140px]">
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPLETE AUDIT OPERATIONS LEDGER WITH EXPORT                       */}
      {/* ========================================================================= */}
      {activeTab === 'AUDIT_LEDGER' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-[#e5e1d5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#7a8b99] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Search ref #, SKU, product, notes..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
                />
              </div>

              <select
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-xs text-[#122b39]"
              >
                <option value="ALL">All Types</option>
                <option value="TRANSFER">Transfers</option>
                <option value="RECEIPT">Receipts</option>
                <option value="ADJUSTMENT">Adjustments</option>
                <option value="SHIPMENT">Shipments</option>
                <option value="POS_SALE">POS / Sales</option>
              </select>

              <select
                value={ledgerLocFilter}
                onChange={(e) => setLedgerLocFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-lg text-xs text-[#122b39]"
              >
                <option value="ALL">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportOperations}
                className="px-3.5 py-1.5 rounded-lg bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-[#e5a329]" />
                <span>Export Operations (CSV)</span>
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-[#e5e1d5] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f5ee] text-[#526677] font-bold uppercase tracking-wider border-b border-[#e5e1d5] text-[11px]">
                    <th className="py-3 px-3.5">Timestamp</th>
                    <th className="py-3 px-3.5">Reference ID</th>
                    <th className="py-3 px-3.5">Type</th>
                    <th className="py-3 px-3.5">SKU & Item</th>
                    <th className="py-3 px-3.5">Origin Facility</th>
                    <th className="py-3 px-3.5">Destination Facility</th>
                    <th className="py-3 px-3.5 text-right">Quantity Delta</th>
                    <th className="py-3 px-3.5">Operator</th>
                    <th className="py-3 px-3.5">Audit Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ece2] font-mono">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#7a8b99] font-sans">
                        No transactions recorded matching the active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((m) => {
                      const delta = m.quantity;
                      const isPositive = delta > 0;

                      return (
                        <tr key={m.id} className="hover:bg-[#faf9f6] transition-colors">
                          <td className="py-2.5 px-3.5 whitespace-nowrap text-[#7a8b99] text-[11px]">
                            {new Date(m.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap font-bold text-[#122b39]">
                            {m.reference || m.id.slice(0, 10)}
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-sans ${
                                m.type === 'TRANSFER'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : m.type === 'RECEIPT'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : m.type === 'ADJUSTMENT'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {m.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap font-sans">
                            <div className="font-mono font-bold text-[#122b39]">{m.sku}</div>
                            <div className="text-[11px] text-[#7a8b99] truncate max-w-xs">{m.productName}</div>
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap font-sans text-[#152836]">
                            {m.fromLocationName || '—'}
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap font-sans text-[#152836]">
                            {m.toLocationName || '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-bold">
                            <span
                              className={
                                isPositive
                                  ? 'text-emerald-700'
                                  : delta < 0
                                  ? 'text-red-700'
                                  : 'text-[#122b39]'
                              }
                            >
                              {isPositive ? `+${delta}` : delta}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap font-sans text-[#7a8b99] text-[11px]">
                            {m.userId || 'SYSTEM'}
                          </td>
                          <td className="py-2.5 px-3.5 font-sans text-[#7a8b99] text-[11px] max-w-xs truncate">
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
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BATCH OPERATIONS IMPORT ENGINE                                     */}
      {/* ========================================================================= */}
      {activeTab === 'BATCH_IMPORT' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-[#e5e1d5] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0ece2] pb-3.5">
              <div>
                <h3 className="text-sm font-bold text-[#122b39]">
                  Bulk Batch Inventory Operations Import
                </h3>
                <p className="text-xs text-[#7a8b99] mt-0.5">
                  Upload or paste multiple movements (Transfers, Receipts, Scrap, Adjustments) and execute in a single ACID transaction.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 rounded-lg bg-[#faf9f6] border border-[#e5e1d5] text-[#122b39] text-xs font-bold hover:bg-[#f0ece2] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download CSV Template</span>
                </button>

                <input
                  type="file"
                  accept=".csv,.txt"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-lg bg-[#122b39] text-white text-xs font-bold hover:bg-[#1a3d52] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#e5a329]" />
                  <span>Upload CSV File</span>
                </button>
              </div>
            </div>

            {/* Paste Box */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5 flex items-center justify-between">
                <span>Or Paste CSV Data Directly</span>
                <span className="text-[10px] text-[#7a8b99]">Format: type,sku,quantity,fromLocCode,toLocCode,ref,notes</span>
              </label>
              <textarea
                rows={4}
                value={importCsvText}
                onChange={(e) => handleParseCsv(e.target.value)}
                placeholder="type,sku,quantity,fromLocationCode,toLocationCode,reference,notes
TRANSFER,NEOM-IOT-GW500,10,LOC-NEOM-MAIN,LOC-TABUK-XFER,TRF-001,Weekly rebalance
RECEIPT,NEOM-SOL-INV50K,25,,LOC-NEOM-MAIN,RCV-001,Supplier delivery"
                className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#e5e1d5] rounded-xl text-xs font-mono text-[#122b39] focus:outline-none focus:border-[#122b39]"
              />
            </div>
          </div>

          {/* Validation Preview Table */}
          {parsedRows.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#e5e1d5] shadow-xs overflow-hidden space-y-3">
              <div className="p-4 border-b border-[#f0ece2] flex items-center justify-between bg-[#faf9f6]">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-[#122b39]">
                    Validation Preview: {parsedRows.length} rows detected
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono text-[10px]">
                    {validRowCount} Ready
                  </span>
                  {errorRowCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold font-mono text-[10px]">
                      {errorRowCount} Invalid
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleExecuteBatchImport}
                  disabled={isImporting || validRowCount === 0}
                  className="px-4 py-2 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5 text-[#e5a329]" />
                  <span>{isImporting ? 'Executing Batch...' : `Execute ${validRowCount} Operations`}</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#f8f5ee] text-[#526677] font-bold uppercase tracking-wider text-[11px] border-b border-[#e5e1d5]">
                    <tr>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3">From Code</th>
                      <th className="py-2.5 px-3">To Code</th>
                      <th className="py-2.5 px-3">Ref</th>
                      <th className="py-2.5 px-3">Validation Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ece2] font-mono">
                    {parsedRows.map((r) => (
                      <tr
                        key={r.id}
                        className={r.status === 'ERROR' ? 'bg-red-50/40' : 'hover:bg-[#faf9f6]'}
                      >
                        <td className="py-2 px-3">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-sans ${
                              r.status === 'VALID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-[#122b39]">{r.type}</td>
                        <td className="py-2 px-3 font-bold">{r.sku}</td>
                        <td className="py-2 px-3 text-right font-bold text-[#122b39]">{r.quantity}</td>
                        <td className="py-2 px-3 text-[#7a8b99]">{r.fromLocationCode || '—'}</td>
                        <td className="py-2 px-3 text-[#7a8b99]">{r.toLocationCode || '—'}</td>
                        <td className="py-2 px-3 text-[#122b39]">{r.reference}</td>
                        <td className="py-2 px-3 font-sans text-xs">
                          {r.status === 'ERROR' ? (
                            <span className="text-red-700 font-semibold">{r.errorMessage}</span>
                          ) : (
                            <span className="text-emerald-700">Validated OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
