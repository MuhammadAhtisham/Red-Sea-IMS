import React from 'react';
import {
  X,
  Printer,
  FileText,
  Building2,
  ArrowRight,
  Package,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  Barcode,
} from 'lucide-react';
import { ProductDTO, LocationDTO, StockMovementDTO } from '../../services/api';

interface TransferSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement?: StockMovementDTO | null;
  product?: ProductDTO | null;
  fromLocation?: LocationDTO | null;
  toLocation?: LocationDTO | null;
  transferData?: {
    reference: string;
    productSku: string;
    productName: string;
    fromLocationName: string;
    toLocationName: string;
    quantity: number;
    uom: string;
    palletId?: string;
    operatorId: string;
    notes?: string;
    priority?: string;
    timestamp: string;
  } | null;
}

export const TransferSlipModal: React.FC<TransferSlipModalProps> = ({
  isOpen,
  onClose,
  movement,
  product,
  fromLocation,
  toLocation,
  transferData,
}) => {
  if (!isOpen) return null;

  // Resolve fields from either movement or transferData
  const ref = transferData?.reference || movement?.reference || 'TRF-DEMO-001';
  const sku = transferData?.productSku || movement?.sku || product?.sku || 'SKU-000';
  const prodName = transferData?.productName || movement?.productName || product?.name || 'Product Item';
  const fromName = transferData?.fromLocationName || movement?.fromLocationName || fromLocation?.name || 'Origin Bay';
  const toName = transferData?.toLocationName || movement?.toLocationName || toLocation?.name || 'Destination Bay';
  const qty = transferData?.quantity || Math.abs(movement?.quantity || 0) || 1;
  const uom = transferData?.uom || product?.unitOfMeasure || 'EA';
  const pallet = transferData?.palletId || 'PLT-STD-01';
  const operator = transferData?.operatorId || movement?.userId || 'OPERATOR-01';
  const notes = transferData?.notes || movement?.notes || 'Scheduled warehouse bay rebalance';
  const priority = transferData?.priority || 'Standard';
  const dateStr = transferData?.timestamp
    ? new Date(transferData.timestamp).toLocaleString()
    : movement?.timestamp
    ? new Date(movement.timestamp).toLocaleString()
    : new Date().toLocaleString();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-[#e5e1d5] overflow-hidden my-8">
        {/* Modal Toolbar (hidden in print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#122b39] text-white print:hidden">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#e5a329]" />
            <div>
              <h3 className="text-sm font-bold tracking-tight">Inter-Bay Transfer Manifest Slip</h3>
              <p className="text-[11px] text-gray-300">Internal Material Handling Document</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-[#e5a329] hover:bg-[#d4921f] text-[#122b39] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body (Print-optimized) */}
        <div className="p-8 space-y-6 text-[#122b39]">
          {/* Header */}
          <div className="border-b-2 border-[#122b39] pb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-[#122b39]" />
                <span className="font-mono text-xs font-black tracking-wider uppercase text-[#8c5e15]">
                  NEOM LOGISTICS HUB • TIER-1 WMS
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight mt-1">
                INTER-BAY TRANSFER TRAVEL SLIP
              </h1>
              <div className="text-xs text-[#526677] mt-0.5">
                Official Chain of Custody & Material Routing Voucher
              </div>
            </div>

            <div className="text-right">
              <div className="font-mono font-black text-lg text-[#122b39] bg-[#faf9f6] px-3 py-1.5 border border-[#e5e1d5] rounded-lg">
                {ref}
              </div>
              <span className="text-[10px] text-[#7a8b99] block mt-1 uppercase font-bold tracking-wider">
                Priority: <span className="text-[#122b39]">{priority}</span>
              </span>
            </div>
          </div>

          {/* Barcode Graphic */}
          <div className="bg-[#faf9f6] border border-[#e5e1d5] p-3 rounded-xl flex flex-col items-center justify-center">
            <div className="font-mono text-2xl tracking-[0.35em] font-black text-[#122b39]">
              *{ref}*
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#7a8b99] font-mono mt-1">
              <Barcode className="w-3.5 h-3.5" />
              <span>SCAN AT DESTINATION BAY TO CONFIRM PUTAWAY</span>
            </div>
          </div>

          {/* Bay Movement Direction Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#faf9f6] border border-[#e5e1d5] p-4 rounded-xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8c5e15] mb-1">
                SOURCE / ORIGIN BAY
              </div>
              <div className="text-base font-black text-[#122b39] leading-snug">
                {fromName}
              </div>
              <div className="text-[11px] text-[#526677] mt-1 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-[#7a8b99]" />
                <span>Pick Bay / Storage Zone</span>
              </div>
            </div>

            <div className="bg-[#eef5fa] border border-[#bcd6ea] p-4 rounded-xl relative">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#1e6091] mb-1 flex items-center justify-between">
                <span>DESTINATION / TARGET BAY</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#1e6091]" />
              </div>
              <div className="text-base font-black text-[#122b39] leading-snug">
                {toName}
              </div>
              <div className="text-[11px] text-[#526677] mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1e6091]" />
                <span>Verified Available Capacity</span>
              </div>
            </div>
          </div>

          {/* Cargo Item Specifications Table */}
          <div className="border border-[#e5e1d5] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8f5ee] border-b border-[#e5e1d5] text-[11px] font-bold uppercase tracking-wider text-[#526677]">
                  <th className="py-2.5 px-3.5">SKU & Item Description</th>
                  <th className="py-2.5 px-3.5">Pallet / LPN</th>
                  <th className="py-2.5 px-3.5 text-right">Quantity</th>
                  <th className="py-2.5 px-3.5 text-center">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ece2] font-mono">
                <tr>
                  <td className="py-3 px-3.5">
                    <div className="font-bold text-[#122b39] text-sm">{sku}</div>
                    <div className="font-sans text-xs text-[#526677] mt-0.5">{prodName}</div>
                  </td>
                  <td className="py-3 px-3.5">
                    <span className="px-2 py-0.5 bg-[#f0ece2] rounded text-[11px] font-bold text-[#122b39]">
                      {pallet}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-right font-black text-base text-[#122b39]">
                    {qty.toLocaleString()}
                  </td>
                  <td className="py-3 px-3.5 text-center font-sans font-bold text-[#7a8b99]">
                    {uom}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Operational Notes & Meta */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-[#faf9f6] p-3.5 rounded-xl border border-[#f0ece2]">
            <div>
              <span className="text-[#7a8b99] block text-[10px] uppercase font-bold">Created Timestamp:</span>
              <span className="font-bold text-[#122b39]">{dateStr}</span>
            </div>
            <div>
              <span className="text-[#7a8b99] block text-[10px] uppercase font-bold">Material Handler:</span>
              <span className="font-bold text-[#122b39]">{operator}</span>
            </div>
            <div className="col-span-2 font-sans pt-2 border-t border-[#f0ece2]">
              <span className="text-[#7a8b99] block text-[10px] uppercase font-bold">Routing Instructions / Notes:</span>
              <span className="text-[#152836] text-xs italic">{notes}</span>
            </div>
          </div>

          {/* Sign-off Blocks */}
          <div className="pt-4 border-t border-[#e5e1d5] grid grid-cols-2 gap-8 text-xs font-mono">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#7a8b99] mb-8">
                Dispatched By (Forklift / Operator):
              </div>
              <div className="border-b border-[#122b39] pb-1 flex justify-between items-end">
                <span className="text-[#526677]">Signature:</span>
                <span className="font-bold text-[#122b39]">{operator}</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-[#7a8b99] mb-8">
                Received & Shelved At Destination Bay:
              </div>
              <div className="border-b border-[#122b39] pb-1 flex justify-between items-end">
                <span className="text-[#526677]">Signature:</span>
                <span className="text-[#7a8b99] italic">____________________</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#f8f5ee] border-t border-[#e5e1d5] flex items-center justify-between text-xs print:hidden">
          <span className="text-[11px] text-[#7a8b99]">
            Certified WMS Travel Document • Tamper Evident
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white border border-[#e5e1d5] text-[#122b39] font-bold hover:bg-[#f0ece2] transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
