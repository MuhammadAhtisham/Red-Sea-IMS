import React, { useState } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  QrCode,
  Barcode,
  Layers,
  Thermometer,
  ShieldAlert,
  Info,
  Package,
} from 'lucide-react';
import { ProductDTO } from '../../services/api';
import { generateBarcodeSvg } from '../../utils/barcodeGenerator';

interface ProductBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductDTO[];
}

export const ProductBarcodeModal: React.FC<ProductBarcodeModalProps> = ({
  isOpen,
  onClose,
  products,
}) => {
  const [labelFormat, setLabelFormat] = useState<'SHELF' | 'CARTON' | 'PALLET'>('SHELF');
  const [copies, setCopies] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen || products.length === 0) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#ded8cb] shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#ded8cb] bg-[#faf9f6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#122b39] text-[#e5a329] flex items-center justify-center shadow-xs">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#152836]">
                  Print Logistics & Barcode Labels
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-[#ede9df] text-[#152836] font-mono text-[10px] font-bold">
                  {products.length} SKU{products.length > 1 ? 's' : ''} Selected
                </span>
              </div>
              <p className="text-xs text-[#7a8b99] mt-0.5">
                Standard thermal barcode labels with GTIN-13 / Code 128, QR traceability, and storage specs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-[#122b39] hover:bg-[#1a3d52] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#e5a329]" />
              <span>Print {products.length * copies} Label{products.length * copies > 1 ? 's' : ''}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#7a8b99] hover:text-[#152836] hover:bg-[#ede9df] rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="p-4 bg-[#f8f5ee] border-b border-[#ded8cb] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#152836]">Label Standard:</span>
            <div className="flex items-center bg-white p-1 rounded-xl border border-[#ded8cb]">
              <button
                onClick={() => setLabelFormat('SHELF')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  labelFormat === 'SHELF' ? 'bg-[#122b39] text-white shadow-2xs' : 'text-[#7a8b99] hover:text-[#152836]'
                }`}
              >
                50×30mm Bin & Shelf
              </button>
              <button
                onClick={() => setLabelFormat('CARTON')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  labelFormat === 'CARTON' ? 'bg-[#122b39] text-white shadow-2xs' : 'text-[#7a8b99] hover:text-[#152836]'
                }`}
              >
                100×50mm Master Carton
              </button>
              <button
                onClick={() => setLabelFormat('PALLET')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  labelFormat === 'PALLET' ? 'bg-[#122b39] text-white shadow-2xs' : 'text-[#7a8b99] hover:text-[#152836]'
                }`}
              >
                150×100mm Pallet SSCC
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-[#152836]">Copies per SKU:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={copies}
              onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-16 px-2.5 py-1 bg-white border border-[#ded8cb] rounded-lg text-center font-mono font-bold text-xs text-[#152836]"
            />
          </div>
        </div>

        {/* Labels Preview Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#ede9df]/40 space-y-6 print:p-0 print:bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
            {products.map((p) => {
              const barcodeSvg = generateBarcodeSvg(p.barcode || '6281001234567', {
                height: labelFormat === 'SHELF' ? 44 : 56,
                barWidth: 2,
                showText: true,
                color: '#0f2430',
              });

              return (
                <div
                  key={p.id}
                  className="bg-white border-2 border-[#ded8cb] rounded-xl p-4 shadow-sm relative flex flex-col justify-between print:border-black print:shadow-none print:break-inside-avoid"
                  style={{
                    minHeight: labelFormat === 'SHELF' ? '180px' : labelFormat === 'CARTON' ? '220px' : '280px',
                  }}
                >
                  {/* Top Row: Brand, Category, Country */}
                  <div className="flex items-center justify-between border-b border-dashed border-[#ded8cb] pb-2 text-[10px] font-mono uppercase text-[#7a8b99]">
                    <div className="flex items-center gap-1.5 font-bold text-[#152836]">
                      <span className="px-1.5 py-0.5 rounded bg-[#f6f4ed] text-[#122b39] border border-[#e4dfd3]">
                        {p.brand || 'NEOM GLOBAL'}
                      </span>
                      <span>•</span>
                      <span>{p.category}</span>
                    </div>
                    <span>{p.countryOfOrigin || 'KSA / NEOM'}</span>
                  </div>

                  {/* Product Identity */}
                  <div className="my-2.5">
                    <h4 className="text-sm font-bold text-[#152836] leading-tight line-clamp-2">
                      {p.name}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-xs font-mono">
                      <span className="font-bold text-[#122b39] bg-[#faf9f6] px-2 py-0.5 rounded border border-[#ded8cb]">
                        SKU: {p.sku}
                      </span>
                      {p.hsCode && (
                        <span className="text-[#7a8b99] text-[11px]">
                          HS: {p.hsCode}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* High Precision Barcode Vector */}
                  <div className="my-1.5 flex flex-col items-center justify-center p-2 bg-[#faf9f6] rounded-lg border border-[#ded8cb]/60">
                    <div
                      dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                      className="max-w-full overflow-hidden flex justify-center"
                    />
                  </div>

                  {/* Bottom Footer Details */}
                  <div className="pt-2 border-t border-dashed border-[#ded8cb] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#152836]">
                        ${p.retailPrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-[#7a8b99]">
                        ({p.unitOfMeasure || 'EA'})
                      </span>
                      {p.storageCondition && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold uppercase">
                          {p.storageCondition}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(p.barcode, p.id)}
                        className="p-1 text-[#7a8b99] hover:text-[#152836] hover:bg-[#ede9df] rounded transition print:hidden cursor-pointer"
                        title="Copy Barcode"
                      >
                        {copiedId === p.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#ded8cb] bg-[#faf9f6] flex items-center justify-between text-xs text-[#7a8b99]">
          <span>
            Compatible with Zebra, Honeywell, Brother, and standard A4/Letter thermal label printers.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-[#f6f4ed] border border-[#ded8cb] text-[#152836] rounded-xl font-bold cursor-pointer transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
