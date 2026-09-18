import React, { useState } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Barcode,
  Copy,
  Check,
  Printer,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Package,
  AlertTriangle,
  Layers,
  Trash2,
} from 'lucide-react';
import { ProductDTO } from '../../services/api';

export type ProductSortField =
  | 'sku'
  | 'name'
  | 'category'
  | 'unitCost'
  | 'retailPrice'
  | 'margin'
  | 'totalStock'
  | 'reorderPoint'
  | 'status';

export type SortDirection = 'asc' | 'desc';

interface ProductGridTableProps {
  products: ProductDTO[];
  selectedProductIds: string[];
  sortField: ProductSortField;
  sortDirection: SortDirection;
  onSortChange: (field: ProductSortField) => void;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onSelectProduct: (product: ProductDTO) => void;
  onOpenBarcodeModal: (products: ProductDTO[]) => void;
  onDeleteProduct: (id: string) => void;
}

export const ProductGridTable: React.FC<ProductGridTableProps> = ({
  products,
  selectedProductIds,
  sortField,
  sortDirection,
  onSortChange,
  onToggleSelectAll,
  onToggleSelect,
  onSelectProduct,
  onOpenBarcodeModal,
  onDeleteProduct,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [columnVisibilityMenuOpen, setColumnVisibilityMenuOpen] = useState(false);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    barcode: true,
    category: true,
    cost: true,
    price: true,
    margin: true,
    stock: true,
    rop: true,
    packaging: true,
    storage: true,
    vendor: false,
    hsCode: false,
  });

  const isAllSelected = products.length > 0 && selectedProductIds.length === products.length;

  const handleCopyBarcode = (e: React.MouseEvent, barcode: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(barcode);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const renderSortIndicator = (field: ProductSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-[#a5b4be] opacity-0 group-hover:opacity-100 transition" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#122b39]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#122b39]" />
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-[#ded8cb] shadow-xs overflow-hidden flex flex-col">
      {/* Table Header Controls */}
      <div className="p-3.5 px-5 bg-[#faf9f6] border-b border-[#ded8cb] flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-[#7a8b99]">
          <span className="font-semibold text-[#152836]">{products.length}</span> Master SKUs
          <span>•</span>
          <span>{selectedProductIds.length} Selected</span>
        </div>

        {/* Column Visibility Picker */}
        <div className="relative">
          <button
            onClick={() => setColumnVisibilityMenuOpen(!columnVisibilityMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#ded8cb] rounded-xl text-xs font-bold text-[#152836] hover:bg-[#faf9f6] transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#7a8b99]" />
            <span>Columns</span>
          </button>

          {columnVisibilityMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-[#ded8cb] shadow-xl p-3 z-30 space-y-2 text-xs">
              <div className="font-bold text-[#152836] pb-1 border-b border-[#ded8cb]">
                Display Columns
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {Object.entries({
                  barcode: 'GTIN / Barcode',
                  category: 'Category',
                  cost: 'Unit Cost ($)',
                  price: 'Retail Price ($)',
                  margin: 'Gross Margin %',
                  stock: 'Total Stock',
                  rop: 'Reorder Point (ROP)',
                  packaging: 'Packaging Tiers',
                  storage: 'Storage Condition',
                  vendor: 'Primary Supplier',
                  hsCode: 'Customs HS Tariff',
                }).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 p-1 hover:bg-[#faf9f6] rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={(e) =>
                        setVisibleColumns((prev) => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))
                      }
                      className="rounded text-[#122b39]"
                    />
                    <span className="text-[#526677]">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enterprise Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#f8f5ee] text-[#526677] font-mono border-b border-[#ded8cb] sticky top-0 z-10 select-none">
            <tr>
              <th className="p-3.5 pl-5 w-10">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="rounded text-[#122b39] cursor-pointer"
                />
              </th>
              <th
                onClick={() => onSortChange('sku')}
                className="p-3.5 font-bold cursor-pointer group hover:text-[#122b39]"
              >
                <div className="flex items-center gap-1.5">
                  <span>SKU</span>
                  {renderSortIndicator('sku')}
                </div>
              </th>

              {visibleColumns.barcode && (
                <th className="p-3.5 font-bold">GTIN / Barcode</th>
              )}

              <th
                onClick={() => onSortChange('name')}
                className="p-3.5 font-bold cursor-pointer group hover:text-[#122b39] min-w-[200px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Product Title</span>
                  {renderSortIndicator('name')}
                </div>
              </th>

              {visibleColumns.category && (
                <th
                  onClick={() => onSortChange('category')}
                  className="p-3.5 font-bold cursor-pointer group hover:text-[#122b39]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Category</span>
                    {renderSortIndicator('category')}
                  </div>
                </th>
              )}

              {visibleColumns.cost && (
                <th
                  onClick={() => onSortChange('unitCost')}
                  className="p-3.5 font-bold text-right cursor-pointer group hover:text-[#122b39]"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Unit Cost</span>
                    {renderSortIndicator('unitCost')}
                  </div>
                </th>
              )}

              {visibleColumns.price && (
                <th
                  onClick={() => onSortChange('retailPrice')}
                  className="p-3.5 font-bold text-right cursor-pointer group hover:text-[#122b39]"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Retail Price</span>
                    {renderSortIndicator('retailPrice')}
                  </div>
                </th>
              )}

              {visibleColumns.margin && (
                <th
                  onClick={() => onSortChange('margin')}
                  className="p-3.5 font-bold text-center cursor-pointer group hover:text-[#122b39]"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Margin %</span>
                    {renderSortIndicator('margin')}
                  </div>
                </th>
              )}

              {visibleColumns.stock && (
                <th
                  onClick={() => onSortChange('totalStock')}
                  className="p-3.5 font-bold text-center cursor-pointer group hover:text-[#122b39]"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Total Stock</span>
                    {renderSortIndicator('totalStock')}
                  </div>
                </th>
              )}

              {visibleColumns.rop && (
                <th
                  onClick={() => onSortChange('reorderPoint')}
                  className="p-3.5 font-bold text-center cursor-pointer group hover:text-[#122b39]"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>ROP</span>
                    {renderSortIndicator('reorderPoint')}
                  </div>
                </th>
              )}

              {visibleColumns.packaging && (
                <th className="p-3.5 font-bold">UoM Hierarchy</th>
              )}

              {visibleColumns.storage && (
                <th className="p-3.5 font-bold">Storage</th>
              )}

              {visibleColumns.vendor && (
                <th className="p-3.5 font-bold">Supplier</th>
              )}

              {visibleColumns.hsCode && (
                <th className="p-3.5 font-bold">HS Code</th>
              )}

              <th className="p-3.5 pr-5 text-right font-bold w-28">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#ded8cb]">
            {products.length === 0 ? (
              <tr>
                <td colSpan={14} className="p-12 text-center text-[#7a8b99]">
                  No products found matching the criteria.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const isSelected = selectedProductIds.includes(p.id);
                const margin = p.retailPrice > 0 ? ((p.retailPrice - p.unitCost) / p.retailPrice) * 100 : 0;
                const isLow = p.totalStock <= p.reorderPoint;
                const isCritical = p.totalStock < p.reorderPoint * 0.5;

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-[#faf9f6] transition group ${
                      isSelected ? 'bg-[#f6f4ed]/80' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3.5 pl-5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(p.id)}
                        className="rounded text-[#122b39] cursor-pointer"
                      />
                    </td>

                    {/* SKU */}
                    <td className="p-3.5 font-mono font-bold text-[#122b39] whitespace-nowrap">
                      <span
                        onClick={() => onSelectProduct(p)}
                        className="cursor-pointer hover:underline bg-[#f6f4ed] px-2 py-0.5 rounded border border-[#ded8cb]"
                      >
                        {p.sku}
                      </span>
                    </td>

                    {/* Barcode */}
                    {visibleColumns.barcode && (
                      <td className="p-3.5 font-mono text-xs text-[#526677] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{p.barcode}</span>
                          <button
                            onClick={(e) => handleCopyBarcode(e, p.barcode, p.id)}
                            className="text-[#7a8b99] hover:text-[#122b39] cursor-pointer"
                            title="Copy Barcode"
                          >
                            {copiedId === p.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}

                    {/* Name */}
                    <td className="p-3.5">
                      <div
                        onClick={() => onSelectProduct(p)}
                        className="font-bold text-[#152836] hover:text-[#122b39] cursor-pointer line-clamp-1"
                      >
                        {p.name}
                      </div>
                      {p.brand && (
                        <span className="text-[10px] text-[#7a8b99]">{p.brand}</span>
                      )}
                    </td>

                    {/* Category */}
                    {visibleColumns.category && (
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-[#faf9f6] text-[#526677] border border-[#ded8cb] text-[11px] font-semibold">
                          {p.category}
                        </span>
                      </td>
                    )}

                    {/* Unit Cost */}
                    {visibleColumns.cost && (
                      <td className="p-3.5 text-right font-mono text-xs text-[#526677] whitespace-nowrap">
                        ${p.unitCost.toFixed(2)}
                      </td>
                    )}

                    {/* Retail Price */}
                    {visibleColumns.price && (
                      <td className="p-3.5 text-right font-mono text-xs font-bold text-[#152836] whitespace-nowrap">
                        ${p.retailPrice.toFixed(2)}
                      </td>
                    )}

                    {/* Margin % */}
                    {visibleColumns.margin && (
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                            margin >= 40
                              ? 'bg-emerald-50 text-emerald-800'
                              : margin >= 20
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-red-50 text-red-800'
                          }`}
                        >
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                    )}

                    {/* Total Stock */}
                    {visibleColumns.stock && (
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg ${
                            isCritical
                              ? 'bg-red-100 text-red-800 font-extrabold'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {p.totalStock} {p.unitOfMeasure || 'EA'}
                        </span>
                      </td>
                    )}

                    {/* Reorder Point */}
                    {visibleColumns.rop && (
                      <td className="p-3.5 text-center font-mono text-xs text-[#7a8b99] whitespace-nowrap">
                        {p.reorderPoint}
                      </td>
                    )}

                    {/* Packaging tiers */}
                    {visibleColumns.packaging && (
                      <td className="p-3.5 font-mono text-[10px] text-[#7a8b99] whitespace-nowrap">
                        {p.packagings && p.packagings.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {p.packagings.slice(0, 3).map((pkg, idx) => (
                              <span
                                key={pkg.id || idx}
                                className="px-1.5 py-0.5 rounded bg-[#faf9f6] border border-[#ded8cb]"
                              >
                                {pkg.packageLevel.slice(0, 4)} ({pkg.qty}x)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span>1x {p.unitOfMeasure || 'EA'}</span>
                        )}
                      </td>
                    )}

                    {/* Storage */}
                    {visibleColumns.storage && (
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                          {p.storageCondition || 'Ambient'}
                        </span>
                      </td>
                    )}

                    {/* Vendor */}
                    {visibleColumns.vendor && (
                      <td className="p-3.5 text-[#7a8b99] text-[11px] truncate max-w-[140px]">
                        {p.defaultVendor || '-'}
                      </td>
                    )}

                    {/* HS Code */}
                    {visibleColumns.hsCode && (
                      <td className="p-3.5 font-mono text-[11px] text-[#7a8b99]">
                        {p.hsCode || '-'}
                      </td>
                    )}

                    {/* Row Actions */}
                    <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenBarcodeModal([p])}
                          title="Print Barcode Label"
                          className="p-1.5 rounded-lg text-[#7a8b99] hover:text-[#122b39] hover:bg-[#ede9df] transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onSelectProduct(p)}
                          className="px-2.5 py-1 bg-[#122b39] hover:bg-[#1a3d52] text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
