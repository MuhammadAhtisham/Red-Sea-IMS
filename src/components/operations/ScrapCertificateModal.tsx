import React from 'react';
import {
  X,
  Printer,
  ShieldAlert,
  Building2,
  AlertOctagon,
  FileCheck,
  Calendar,
  User,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { ProductDTO, LocationDTO, StockMovementDTO } from '../../services/api';

interface ScrapCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement?: StockMovementDTO | null;
  product?: ProductDTO | null;
  location?: LocationDTO | null;
  scrapData?: {
    reference: string;
    productSku: string;
    productName: string;
    locationName: string;
    quantity: number;
    unitCost: number;
    totalLoss: number;
    uom: string;
    reasonCode: string;
    disposalMethod: string;
    costCenter?: string;
    operatorId: string;
    witnessBadge?: string;
    notes?: string;
    timestamp: string;
  } | null;
}

export const ScrapCertificateModal: React.FC<ScrapCertificateModalProps> = ({
  isOpen,
  onClose,
  movement,
  product,
  location,
  scrapData,
}) => {
  if (!isOpen) return null;

  const ref = scrapData?.reference || movement?.reference || 'SCRAP-CERT-001';
  const sku = scrapData?.productSku || movement?.sku || product?.sku || 'SKU-000';
  const prodName = scrapData?.productName || movement?.productName || product?.name || 'Item Name';
  const locName = scrapData?.locationName || movement?.fromLocationName || location?.name || 'Storage Bay';
  const qty = scrapData?.quantity || Math.abs(movement?.quantity || 0) || 1;
  const unitCost = scrapData?.unitCost || product?.unitCost || 0;
  const totalLoss = scrapData?.totalLoss || Math.round(qty * unitCost);
  const uom = scrapData?.uom || product?.unitOfMeasure || 'EA';
  const reason = scrapData?.reasonCode || 'QC_FAILURE';
  const method = scrapData?.disposalMethod || 'CERTIFIED_DESTRUCTION';
  const costCenter = scrapData?.costCenter || 'CC-401-SCRAP-DEFECTS';
  const operator = scrapData?.operatorId || movement?.userId || 'SUPERVISOR-01';
  const witness = scrapData?.witnessBadge || 'QA-WITNESS-09';
  const notes = scrapData?.notes || movement?.notes || 'Physical handling damage during bay transport';
  const dateStr = scrapData?.timestamp
    ? new Date(scrapData.timestamp).toLocaleString()
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
        <div className="flex items-center justify-between px-6 py-4 bg-[#7a1c1c] text-white print:hidden">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-200" />
            <div>
              <h3 className="text-sm font-bold tracking-tight">Certificate of Scrap & Destruction</h3>
              <p className="text-[11px] text-red-200">Official Asset Write-Off Audit Certification</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-[#7a1c1c] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Certificate</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-red-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Body (Print-Optimized) */}
        <div className="p-8 space-y-6 text-[#122b39]">
          {/* Top Seal & Organization Header */}
          <div className="border-b-2 border-[#7a1c1c] pb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-6 h-6 text-[#7a1c1c]" />
                <span className="font-mono text-xs font-black tracking-wider uppercase text-[#7a1c1c]">
                  NEOM ASSET AUDIT & INVENTORY CONTROL
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight mt-1 text-[#122b39]">
                CERTIFICATE OF INVENTORY DESTRUCTION
              </h1>
              <div className="text-xs text-[#526677] mt-0.5">
                Financial Asset Write-Off & Permanent Ledger Depletion Record
              </div>
            </div>

            <div className="text-right">
              <div className="font-mono font-black text-lg text-[#7a1c1c] bg-red-50 px-3 py-1.5 border border-red-200 rounded-lg">
                {ref}
              </div>
              <span className="text-[10px] text-[#7a8b99] block mt-1 uppercase font-bold tracking-wider">
                Cost Center: <span className="font-mono text-[#122b39]">{costCenter}</span>
              </span>
            </div>
          </div>

          {/* Legal Compliance Attestation */}
          <div className="bg-[#faf9f6] border border-[#e5e1d5] p-3.5 rounded-xl text-xs text-[#526677] leading-relaxed">
            <div className="font-bold text-[#122b39] flex items-center gap-1.5 mb-1">
              <FileCheck className="w-4 h-4 text-emerald-700" />
              <span>Attestation of Permanent De-Inventory</span>
            </div>
            This document certifies that the serialized or bulk goods listed below have been inspected, deemed non-salvageable or non-compliant, and permanently written off from facility book inventory in accordance with environmental and financial compliance protocols.
          </div>

          {/* Scrapped Item Ledger Table */}
          <div className="border border-[#e5e1d5] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8f5ee] border-b border-[#e5e1d5] text-[11px] font-bold uppercase tracking-wider text-[#526677]">
                  <th className="py-2.5 px-3.5">SKU & Item Name</th>
                  <th className="py-2.5 px-3.5">Location Bay</th>
                  <th className="py-2.5 px-3.5 text-right">Scrapped Qty</th>
                  <th className="py-2.5 px-3.5 text-right">Unit Cost</th>
                  <th className="py-2.5 px-3.5 text-right">Loss Write-Off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ece2] font-mono">
                <tr>
                  <td className="py-3 px-3.5">
                    <div className="font-bold text-[#122b39] text-sm">{sku}</div>
                    <div className="font-sans text-xs text-[#526677] mt-0.5">{prodName}</div>
                  </td>
                  <td className="py-3 px-3.5 font-sans">
                    <span className="font-medium text-[#122b39]">{locName}</span>
                  </td>
                  <td className="py-3 px-3.5 text-right font-black text-base text-red-700">
                    -{qty.toLocaleString()} <span className="text-xs font-normal text-[#7a8b99]">{uom}</span>
                  </td>
                  <td className="py-3 px-3.5 text-right text-[#526677]">
                    ${unitCost.toFixed(2)}
                  </td>
                  <td className="py-3 px-3.5 text-right font-black text-base text-red-700">
                    ${totalLoss.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Reason & Disposal Protocol Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-[#faf9f6] p-3.5 rounded-xl border border-[#e5e1d5]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a8b99] mb-1">
                Scrap Justification Reason
              </div>
              <div className="font-bold text-[#122b39] text-sm">
                {reason.replace(/_/g, ' ')}
              </div>
              <div className="text-[11px] text-[#526677] mt-1">
                Notes: {notes}
              </div>
            </div>

            <div className="bg-[#faf9f6] p-3.5 rounded-xl border border-[#e5e1d5]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a8b99] mb-1">
                Approved Disposal Method
              </div>
              <div className="font-bold text-[#122b39] text-sm">
                {method.replace(/_/g, ' ')}
              </div>
              <div className="text-[11px] text-[#526677] mt-1">
                Executed in accordance with hazardous / industrial waste guidelines.
              </div>
            </div>
          </div>

          {/* Dual Authorization Signatures */}
          <div className="pt-4 border-t border-[#e5e1d5] grid grid-cols-2 gap-8 text-xs font-mono">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#7a8b99] mb-8">
                Authorizing Supervisor / QC Lead:
              </div>
              <div className="border-b border-[#122b39] pb-1 flex justify-between items-end">
                <span className="text-[#526677]">ID: {operator}</span>
                <span className="font-bold text-[#122b39]">Certified Valid</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-[#7a8b99] mb-8">
                Independent Destruction Witness:
              </div>
              <div className="border-b border-[#122b39] pb-1 flex justify-between items-end">
                <span className="text-[#526677]">Badge: {witness}</span>
                <span className="font-bold text-[#122b39]">Witnessed</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-center text-[#7a8b99] font-mono">
            Executed on {dateStr} • Permanent Record ID: {ref} • Audit Log Archived
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#f8f5ee] border-t border-[#e5e1d5] flex items-center justify-between text-xs print:hidden">
          <span className="text-[11px] text-[#7a8b99]">
            Official Compliance Certificate
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
