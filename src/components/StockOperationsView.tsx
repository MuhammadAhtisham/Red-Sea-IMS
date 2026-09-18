import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Trash2,
  SlidersHorizontal,
  History,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  X,
  ShieldCheck,
  Package,
} from 'lucide-react';
import {
  ProductDTO,
  LocationDTO,
  StockMovementDTO,
  PalletDTO,
} from '../services/api';
import { InterBayTransferView } from './operations/InterBayTransferView';
import { ScrapDisposalView } from './operations/ScrapDisposalView';
import { InventoryAdjustmentView } from './operations/InventoryAdjustmentView';
import { OperationsLedgerView } from './operations/OperationsLedgerView';

interface StockOperationsViewProps {
  products: ProductDTO[];
  locations: LocationDTO[];
  movements: StockMovementDTO[];
  pallets: PalletDTO[];
  onOperationSuccess: () => void;
}

export type OperationSection = 'TRANSFER' | 'SCRAP' | 'ADJUSTMENT' | 'LEDGER';

export const StockOperationsView: React.FC<StockOperationsViewProps> = ({
  products,
  locations,
  movements,
  pallets,
  onOperationSuccess,
}) => {
  // Navigation for separated operations
  const [activeSection, setActiveSection] = useState<OperationSection>('TRANSFER');
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Calculate live summary indicators
  const totalTransfers = movements.filter((m) => m.type === 'TRANSFER').length;
  const totalScraps = movements.filter(
    (m) =>
      m.type === 'SCRAP' ||
      (m.type === 'ADJUSTMENT' && m.quantity < 0 && m.notes?.toLowerCase().includes('scrap'))
  ).length;
  const totalAdjustments = movements.filter(
    (m) =>
      m.type === 'ADJUSTMENT' &&
      !m.notes?.toLowerCase().includes('scrap') &&
      !m.notes?.toLowerCase().includes('write-off')
  ).length;

  return (
    <div className="space-y-6">
      {/* Executive Command Header */}
      <div className="bg-white rounded-2xl border border-[#e5e1d5] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black tracking-wider uppercase text-[#8c5e15]">
              WMS INTERNAL OPERATIONS • DISCRETE MODULES
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#122b39] tracking-tight mt-1">
            Warehouse Inventory Operations
          </h1>
          <p className="text-xs text-[#526677] mt-1 max-w-2xl">
            Dedicated execution modules for inter-bay stock transfers, scrap write-downs, and inventory reconciliation with audit trails and compliance documentation.
          </p>
        </div>

        {/* Facility Quick Stat Badges */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-right">
            <span className="text-[10px] uppercase font-bold text-[#7a8b99] block">
              Active Storage Bays
            </span>
            <span className="font-mono text-base font-black text-[#122b39]">
              {locations.length} Locations
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-right">
            <span className="text-[10px] uppercase font-bold text-[#7a8b99] block">
              Audited SKUs
            </span>
            <span className="font-mono text-base font-black text-[#122b39]">
              {products.length} Products
            </span>
          </div>
        </div>
      </div>

      {/* Global Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-2xs border animate-in fade-in slide-in-from-top-2 duration-200 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-red-50 text-red-900 border-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 rounded hover:bg-black/5 transition cursor-pointer text-gray-500 hover:text-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Separated Operation Tabs Navigation */}
      <div className="bg-[#faf9f6] p-1.5 rounded-2xl border border-[#e5e1d5] flex flex-wrap items-center gap-1.5 shadow-2xs">
        {/* Inter-Bay Transfer */}
        <button
          onClick={() => {
            setActiveSection('TRANSFER');
            setStatusMessage(null);
          }}
          className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer ${
            activeSection === 'TRANSFER'
              ? 'bg-[#122b39] text-white shadow-sm'
              : 'text-[#526677] hover:text-[#122b39] hover:bg-white/60'
          }`}
        >
          <ArrowRightLeft className={`w-4 h-4 ${activeSection === 'TRANSFER' ? 'text-[#e5a329]' : 'text-[#7a8b99]'}`} />
          <div className="flex items-center gap-2">
            <span>Inter-Bay Transfer</span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                activeSection === 'TRANSFER'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#e5e1d5] text-[#526677]'
              }`}
            >
              {totalTransfers}
            </span>
          </div>
        </button>

        {/* Scrap & Damaged Write-Off */}
        <button
          onClick={() => {
            setActiveSection('SCRAP');
            setStatusMessage(null);
          }}
          className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer ${
            activeSection === 'SCRAP'
              ? 'bg-red-700 text-white shadow-sm'
              : 'text-[#526677] hover:text-red-700 hover:bg-red-50/50'
          }`}
        >
          <Trash2 className={`w-4 h-4 ${activeSection === 'SCRAP' ? 'text-white' : 'text-red-600'}`} />
          <div className="flex items-center gap-2">
            <span>Scrap & Disposal</span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                activeSection === 'SCRAP'
                  ? 'bg-white/20 text-white'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {totalScraps}
            </span>
          </div>
        </button>

        {/* Inventory Adjustment */}
        <button
          onClick={() => {
            setActiveSection('ADJUSTMENT');
            setStatusMessage(null);
          }}
          className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer ${
            activeSection === 'ADJUSTMENT'
              ? 'bg-[#122b39] text-white shadow-sm'
              : 'text-[#526677] hover:text-[#122b39] hover:bg-white/60'
          }`}
        >
          <SlidersHorizontal className={`w-4 h-4 ${activeSection === 'ADJUSTMENT' ? 'text-purple-300' : 'text-purple-600'}`} />
          <div className="flex items-center gap-2">
            <span>Inventory Adjustment</span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                activeSection === 'ADJUSTMENT'
                  ? 'bg-white/20 text-white'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {totalAdjustments}
            </span>
          </div>
        </button>

        {/* Operations Ledger */}
        <button
          onClick={() => {
            setActiveSection('LEDGER');
            setStatusMessage(null);
          }}
          className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer ${
            activeSection === 'LEDGER'
              ? 'bg-[#122b39] text-white shadow-sm'
              : 'text-[#526677] hover:text-[#122b39] hover:bg-white/60'
          }`}
        >
          <History className={`w-4 h-4 ${activeSection === 'LEDGER' ? 'text-[#e5a329]' : 'text-[#7a8b99]'}`} />
          <div className="flex items-center gap-2">
            <span>Operations Ledger</span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                activeSection === 'LEDGER'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#e5e1d5] text-[#526677]'
              }`}
            >
              {movements.length}
            </span>
          </div>
        </button>
      </div>

      {/* Render Active Operation Section */}
      {activeSection === 'TRANSFER' && (
        <InterBayTransferView
          products={products}
          locations={locations}
          movements={movements}
          onOperationSuccess={onOperationSuccess}
          onSetStatusMessage={setStatusMessage}
        />
      )}

      {activeSection === 'SCRAP' && (
        <ScrapDisposalView
          products={products}
          locations={locations}
          movements={movements}
          onOperationSuccess={onOperationSuccess}
          onSetStatusMessage={setStatusMessage}
        />
      )}

      {activeSection === 'ADJUSTMENT' && (
        <InventoryAdjustmentView
          products={products}
          locations={locations}
          movements={movements}
          onOperationSuccess={onOperationSuccess}
          onSetStatusMessage={setStatusMessage}
        />
      )}

      {activeSection === 'LEDGER' && (
        <OperationsLedgerView
          products={products}
          locations={locations}
          movements={movements}
        />
      )}
    </div>
  );
};
