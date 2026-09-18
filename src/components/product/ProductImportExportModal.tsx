import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  HelpCircle,
  ArrowRight,
  Database,
} from 'lucide-react';
import { ProductDTO, CategoryDTO, api } from '../../services/api';

interface ProductImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductDTO[];
  categories: CategoryDTO[];
  onRefresh: () => void;
}

export const ProductImportExportModal: React.FC<ProductImportExportModalProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'EXPORT' | 'IMPORT'>('EXPORT');

  // Export state
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'SKU',
    'Barcode',
    'Name',
    'Category',
    'Brand',
    'UnitCost',
    'RetailPrice',
    'MarginPercent',
    'TotalStock',
    'UnitOfMeasure',
    'ReorderPoint',
    'LeadTimeDays',
    'StorageCondition',
    'HSCode',
    'DefaultVendor',
  ]);

  // Import state
  const [importedRows, setImportedRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    updated: number;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const ALL_EXPORT_COLUMNS = [
    { id: 'SKU', label: 'SKU Code' },
    { id: 'Barcode', label: 'GTIN / Barcode' },
    { id: 'Name', label: 'Product Title' },
    { id: 'Category', label: 'Category' },
    { id: 'Brand', label: 'Brand / Manufacturer' },
    { id: 'UnitCost', label: 'Unit Cost ($)' },
    { id: 'RetailPrice', label: 'Retail Price ($)' },
    { id: 'MarginPercent', label: 'Margin %' },
    { id: 'TotalStock', label: 'Current Total Stock' },
    { id: 'UnitOfMeasure', label: 'Base Unit (UoM)' },
    { id: 'ReorderPoint', label: 'Reorder Point (ROP)' },
    { id: 'LeadTimeDays', label: 'Lead Time (Days)' },
    { id: 'StorageCondition', label: 'Storage Condition' },
    { id: 'HSCode', label: 'Customs HS Tariff' },
    { id: 'DefaultVendor', label: 'Primary Supplier' },
    { id: 'Weight', label: 'Weight (kg)' },
    { id: 'Dimensions', label: 'Dimensions (cm)' },
    { id: 'CreatedAt', label: 'Registration Date' },
  ];

  const handleToggleColumn = (colId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(colId) ? prev.filter((c) => c !== colId) : [...prev, colId]
    );
  };

  const handleExportCsv = () => {
    const headers = selectedColumns;
    const rows = products.map((p) => {
      const margin = p.retailPrice > 0 ? ((p.retailPrice - p.unitCost) / p.retailPrice) * 100 : 0;
      return selectedColumns.map((col) => {
        switch (col) {
          case 'SKU': return `"${p.sku}"`;
          case 'Barcode': return `"${p.barcode}"`;
          case 'Name': return `"${p.name.replace(/"/g, '""')}"`;
          case 'Category': return `"${p.category || ''}"`;
          case 'Brand': return `"${p.brand || ''}"`;
          case 'UnitCost': return p.unitCost;
          case 'RetailPrice': return p.retailPrice;
          case 'MarginPercent': return margin.toFixed(1);
          case 'TotalStock': return p.totalStock;
          case 'UnitOfMeasure': return `"${p.unitOfMeasure || 'EA'}"`;
          case 'ReorderPoint': return p.reorderPoint;
          case 'LeadTimeDays': return p.leadTimeDays;
          case 'StorageCondition': return `"${p.storageCondition || 'Ambient'}"`;
          case 'HSCode': return `"${p.hsCode || ''}"`;
          case 'DefaultVendor': return `"${p.defaultVendor || ''}"`;
          case 'Weight': return p.weight || 0;
          case 'Dimensions': return `"${p.dimensions || ''}"`;
          case 'CreatedAt': return `"${p.createdAt}"`;
          default: return '""';
        }
      }).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `NEOM_ProductMaster_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSampleCsv = () => {
    const sampleHeaders = 'SKU,Barcode,Name,Category,UnitCost,RetailPrice,UnitOfMeasure,ReorderPoint,LeadTimeDays,StorageCondition,HSCode,DefaultVendor';
    const sampleRows = [
      'NEOM-SOLAR-CELL-500,6281009911011,Industrial Solar Cell 500W Monocrystalline,Renewable Energy,140.00,280.00,EA,25,14,Ambient,8541.43.0010,Red Sea Solar Works',
      'NEOM-IOT-GW-X1,6281009911028,LoRaWAN Sub-GHz Industrial Gateway,Smart Infrastructure,95.00,210.00,EA,15,7,ESD-Safe,8517.62.0000,Oxagon Tech Labs',
      'NEOM-WATER-VALVE-80,6281009911035,Desalination Motorized Actuator Valve 80mm,Desalination & Water,320.00,640.00,EA,10,21,Ambient,8481.80.1000,Trojan Hydronics Corp',
    ];
    const csv = [sampleHeaders, ...sampleRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'NEOM_Product_Master_Sample_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setImportErrors(['CSV file must contain a header line and at least 1 data row.']);
      return;
    }

    const header = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    const skuIdx = header.findIndex((h) => h === 'sku' || h.includes('sku'));
    const nameIdx = header.findIndex((h) => h === 'name' || h.includes('name') || h === 'title');
    const barcodeIdx = header.findIndex((h) => h === 'barcode' || h.includes('barcode') || h === 'gtin');
    const costIdx = header.findIndex((h) => h.includes('cost') || h === 'unitcost');
    const priceIdx = header.findIndex((h) => h.includes('price') || h === 'retailprice');
    const catIdx = header.findIndex((h) => h === 'category');
    const uomIdx = header.findIndex((h) => h === 'unitofmeasure' || h === 'uom');
    const ropIdx = header.findIndex((h) => h === 'reorderpoint' || h === 'rop');

    if (skuIdx === -1 || nameIdx === -1) {
      setImportErrors(['Required columns missing: CSV must have "SKU" and "Name" column headers.']);
      return;
    }

    const parsed: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
      const sku = row[skuIdx];
      const name = row[nameIdx];

      if (!sku || !name) {
        errors.push(`Row ${i + 1}: Missing SKU or Name.`);
        continue;
      }

      parsed.push({
        sku: sku.toUpperCase(),
        name,
        barcode: barcodeIdx !== -1 ? row[barcodeIdx] : `628100${Math.floor(1000000 + Math.random() * 9000000)}`,
        unitCost: costIdx !== -1 ? parseFloat(row[costIdx]) || 50 : 50,
        retailPrice: priceIdx !== -1 ? parseFloat(row[priceIdx]) || 120 : 120,
        category: catIdx !== -1 && row[catIdx] ? row[catIdx] : 'General',
        unitOfMeasure: uomIdx !== -1 && row[uomIdx] ? row[uomIdx] : 'EA',
        reorderPoint: ropIdx !== -1 ? parseInt(row[ropIdx], 10) || 15 : 15,
      });
    }

    setImportedRows(parsed);
    setImportErrors(errors);
  };

  const handleExecuteImport = async () => {
    if (importedRows.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await api.bulkImportProducts(importedRows);
      setImportResult({
        inserted: res.inserted,
        updated: res.updated,
        message: res.message,
      });
      onRefresh();
    } catch (err: any) {
      setImportErrors([err.message || 'Failed to submit bulk product import.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#ded8cb] shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#ded8cb] bg-[#faf9f6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#122b39] text-[#e5a329] flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#152836]">
                Catalog Import & Export Engine
              </h3>
              <p className="text-xs text-[#7a8b99]">
                Full bidirectional CSV integration for master product catalog & logistics definitions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#7a8b99] hover:text-[#152836] hover:bg-[#ede9df] rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-[#ded8cb] bg-[#f8f5ee] px-6">
          <button
            onClick={() => setActiveTab('EXPORT')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'EXPORT'
                ? 'border-[#122b39] text-[#122b39]'
                : 'border-transparent text-[#7a8b99] hover:text-[#152836]'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Product Catalog ({products.length} items)</span>
          </button>
          <button
            onClick={() => setActiveTab('IMPORT')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'IMPORT'
                ? 'border-[#122b39] text-[#122b39]'
                : 'border-transparent text-[#7a8b99] hover:text-[#152836]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Batch Import Products (CSV)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'EXPORT' ? (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold text-[#526677] uppercase tracking-wider mb-2">
                  Select Columns to Include in CSV
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ALL_EXPORT_COLUMNS.map((col) => {
                    const isChecked = selectedColumns.includes(col.id);
                    return (
                      <label
                        key={col.id}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer text-xs transition ${
                          isChecked
                            ? 'bg-[#faf9f6] border-[#122b39] font-bold text-[#152836]'
                            : 'border-[#ded8cb] text-[#7a8b99] hover:bg-[#faf9f6]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleColumn(col.id)}
                          className="rounded text-[#122b39]"
                        />
                        <span>{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#faf9f6] border border-[#ded8cb] text-xs text-[#526677] space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#152836]">
                  <Database className="w-4 h-4 text-[#e5a329]" />
                  <span>Ready to Export {products.length} SKUs</span>
                </div>
                <p>
                  Exported CSV file includes complete pricing, customs tariffs, packaging levels, and stock balances. It can be re-imported into ERP or spreadsheets anytime.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-[#f6f4ed] hover:bg-[#ede9df] text-[#152836] font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportCsv}
                  disabled={selectedColumns.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#e5a329]" />
                  <span>Download Catalog CSV</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {importResult ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900">
                        Batch Import Successful!
                      </h4>
                      <p className="text-xs text-emerald-800">{importResult.message}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-2 text-xs font-mono text-emerald-900">
                    <div>
                      <span className="font-bold">{importResult.inserted}</span> New SKUs
                    </div>
                    <div>
                      <span className="font-bold">{importResult.updated}</span> Existing SKUs Updated
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setImportResult(null);
                        setImportedRows([]);
                        onClose();
                      }}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition"
                    >
                      Done & Return to Catalog
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3.5 bg-[#faf9f6] rounded-xl border border-[#ded8cb]">
                    <div className="text-xs">
                      <div className="font-bold text-[#152836]">Need the standard template?</div>
                      <div className="text-[#7a8b99]">
                        Download a pre-formatted CSV template with sample NEOM inventory rows.
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadSampleCsv}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#ede9df] border border-[#ded8cb] rounded-lg text-xs font-bold text-[#152836] transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#122b39]" />
                      <span>Download Template</span>
                    </button>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#ded8cb] hover:border-[#122b39] bg-[#faf9f6] rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-[#f6f4ed] text-[#122b39] flex items-center justify-center shadow-2xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#152836]">
                        Click to upload or drag & drop CSV file
                      </span>
                      <p className="text-[11px] text-[#7a8b99] mt-0.5">
                        Supports comma-delimited text files (.csv)
                      </p>
                    </div>
                  </div>

                  {/* Errors */}
                  {importErrors.length > 0 && (
                    <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-red-900">
                        <AlertCircle className="w-4 h-4 text-red-700" />
                        <span>Validation Warnings ({importErrors.length})</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5 font-mono text-[11px]">
                        {importErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Preview Table */}
                  {importedRows.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#152836]">
                          Preview Parsed Rows ({importedRows.length} items)
                        </span>
                        <span className="text-[#7a8b99]">
                          Existing SKUs will be updated, new SKUs will be created
                        </span>
                      </div>
                      <div className="max-h-52 overflow-y-auto border border-[#ded8cb] rounded-xl">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-[#faf9f6] text-[#7a8b99] font-mono sticky top-0 border-b border-[#ded8cb]">
                            <tr>
                              <th className="p-2.5">SKU</th>
                              <th className="p-2.5">Name</th>
                              <th className="p-2.5">Category</th>
                              <th className="p-2.5 text-right">Cost</th>
                              <th className="p-2.5 text-right">Price</th>
                              <th className="p-2.5 text-center">UoM</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ded8cb]">
                            {importedRows.slice(0, 8).map((r, i) => (
                              <tr key={i} className="hover:bg-[#faf9f6]">
                                <td className="p-2 font-mono font-bold text-[#122b39]">{r.sku}</td>
                                <td className="p-2 truncate max-w-[200px]">{r.name}</td>
                                <td className="p-2 text-[#7a8b99]">{r.category}</td>
                                <td className="p-2 text-right font-mono">${r.unitCost}</td>
                                <td className="p-2 text-right font-mono font-bold">${r.retailPrice}</td>
                                <td className="p-2 text-center font-mono">{r.unitOfMeasure}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {importedRows.length > 8 && (
                          <div className="p-2 text-center text-xs text-[#7a8b99] bg-[#faf9f6] border-t border-[#ded8cb]">
                            + {importedRows.length - 8} more rows ready to process
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-3 pt-3">
                        <button
                          onClick={() => setImportedRows([])}
                          className="px-4 py-2 bg-[#f6f4ed] hover:bg-[#ede9df] text-[#152836] font-bold text-xs rounded-xl"
                        >
                          Clear
                        </button>
                        <button
                          onClick={handleExecuteImport}
                          disabled={isSubmitting}
                          className="flex items-center gap-2 px-5 py-2.5 bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-[#e5a329]" />
                          <span>{isSubmitting ? 'Importing...' : `Execute Import (${importedRows.length} SKUs)`}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
