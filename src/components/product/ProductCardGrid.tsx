import React, { useState } from 'react';
import {
  Package,
  Barcode,
  Copy,
  Check,
  TrendingUp,
  AlertTriangle,
  Printer,
  ChevronRight,
  ShieldAlert,
  Layers,
  MoreVertical,
  Edit2,
  Trash2,
} from 'lucide-react';
import { ProductDTO } from '../../services/api';
import { generateBarcodeSvg } from '../../utils/barcodeGenerator';

interface ProductCardGridProps {
  products: ProductDTO[];
  selectedProductIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectProduct: (product: ProductDTO) => void;
  onOpenBarcodeModal: (products: ProductDTO[]) => void;
  onDeleteProduct: (id: string) => void;
}

export const ProductCardGrid: React.FC<ProductCardGridProps> = ({
  products,
  selectedProductIds,
  onToggleSelect,
  onSelectProduct,
  onOpenBarcodeModal,
  onDeleteProduct,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyBarcode = (e: React.MouseEvent, barcode: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(barcode);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {products.map((p) => {
        const isSelected = selectedProductIds.includes(p.id);
        const margin = p.retailPrice > 0 ? ((p.retailPrice - p.unitCost) / p.retailPrice) * 100 : 0;
        const isLow = p.totalStock <= p.reorderPoint;
        const isCritical = p.totalStock < p.reorderPoint * 0.5;

        const stockRatio = Math.min(100, Math.round((p.totalStock / (p.reorderPoint * 2.5 || 1)) * 100));

        return (
          <div
            key={p.id}
            className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden group ${
              isSelected ? 'border-[#122b39] ring-2 ring-[#122b39]/10' : 'border-[#ded8cb] hover:border-[#b8c6cf]'
            }`}
          >
            {/* Card Header */}
            <div className="p-4 border-b border-[#ded8cb]/80 bg-[#faf9f6] flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(p.id)}
                  className="mt-1 rounded text-[#122b39] cursor-pointer"
                />
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-xs text-[#122b39] bg-[#f6f4ed] px-2 py-0.5 rounded-md border border-[#ded8cb]">
                      {p.sku}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-[#7a8b99] border border-[#ded8cb]">
                      {p.category}
                    </span>
                  </div>
                  <h4
                    onClick={() => onSelectProduct(p)}
                    className="text-sm font-bold text-[#152836] mt-1.5 line-clamp-1 hover:text-[#122b39] cursor-pointer"
                  >
                    {p.name}
                  </h4>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBarcodeModal([p]);
                }}
                title="Print Barcode Label"
                className="p-1.5 rounded-lg text-[#7a8b99] hover:text-[#122b39] hover:bg-[#ede9df] transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>

            {/* Middle Section: Specs & Pricing */}
            <div className="p-4 space-y-3.5 flex-1">
              {/* Barcode & GTIN Pill */}
              <div className="flex items-center justify-between bg-[#faf9f6] p-2 rounded-xl border border-[#ded8cb]/70 text-xs">
                <div className="flex items-center gap-2 font-mono text-[#526677]">
                  <Barcode className="w-4 h-4 text-[#122b39]" />
                  <span className="font-semibold text-[11px]">{p.barcode}</span>
                </div>
                <button
                  onClick={(e) => handleCopyBarcode(e, p.barcode, p.id)}
                  className="text-[10px] text-[#7a8b99] hover:text-[#122b39] flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === p.id ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <Copy className="w-3 h-3" /> Copy
                    </span>
                  )}
                </button>
              </div>

              {/* Price & Margin Matrix */}
              <div className="grid grid-cols-3 gap-2 text-center p-2.5 bg-[#faf9f6] rounded-xl border border-[#ded8cb]/60">
                <div>
                  <div className="text-[10px] text-[#7a8b99] font-medium uppercase">Unit Cost</div>
                  <div className="font-mono text-xs font-semibold text-[#526677]">
                    ${p.unitCost.toFixed(2)}
                  </div>
                </div>
                <div className="border-x border-[#ded8cb]/80">
                  <div className="text-[10px] text-[#7a8b99] font-medium uppercase">Retail Price</div>
                  <div className="font-mono text-xs font-bold text-[#152836]">
                    ${p.retailPrice.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#7a8b99] font-medium uppercase">Gross Margin</div>
                  <div
                    className={`font-mono text-xs font-bold ${
                      margin >= 40 ? 'text-emerald-700' : margin >= 20 ? 'text-amber-700' : 'text-red-700'
                    }`}
                  >
                    {margin.toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Stock Gauge */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#7a8b99] flex items-center gap-1 text-[11px]">
                    <Package className="w-3.5 h-3.5" /> Total Stock:
                  </span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span
                      className={`font-bold ${
                        isCritical ? 'text-red-700' : isLow ? 'text-amber-700' : 'text-[#152836]'
                      }`}
                    >
                      {p.totalStock} {p.unitOfMeasure || 'EA'}
                    </span>
                    <span className="text-[10px] text-[#7a8b99]">(ROP: {p.reorderPoint})</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-[#ede9df] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isCritical ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-[#122b39]'
                    }`}
                    style={{ width: `${stockRatio}%` }}
                  />
                </div>
              </div>

              {/* Multi-tier packaging icons */}
              {p.packagings && p.packagings.length > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-[#7a8b99] font-mono">
                  <span className="font-bold text-[#526677]">UoM Hierarchy:</span>
                  {p.packagings.map((pkg, idx) => (
                    <span key={pkg.id || idx} className="px-1.5 py-0.5 rounded bg-[#faf9f6] border border-[#ded8cb]">
                      {pkg.packageLevel} ({pkg.qty}x)
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Card Footer Actions */}
            <div className="p-3 border-t border-[#ded8cb] bg-[#faf9f6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                {p.storageCondition && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                    {p.storageCondition}
                  </span>
                )}
                {p.defaultVendor && (
                  <span className="text-[10px] text-[#7a8b99] truncate max-w-[120px]">
                    {p.defaultVendor}
                  </span>
                )}
              </div>

              <button
                onClick={() => onSelectProduct(p)}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#122b39] hover:bg-[#1a3d52] text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <span>Inspect</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
