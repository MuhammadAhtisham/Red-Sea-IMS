import React, { useState, useEffect } from 'react';
import {
  X,
  Boxes,
  ArrowLeftRight,
  Database,
  CheckCircle2,
  ShieldAlert,
  Barcode,
  Save,
  Trash2,
  Copy,
  Sparkles,
  Layers,
  MapPin,
  ChevronRight,
  FileText,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import {
  ProductDTO,
  LocationDTO,
  DatabaseInstanceDTO,
  GoodsReceiptDTO,
  api,
} from '../services/api';

export type DrawerMode =
  | 'PRODUCT_EDIT'
  | 'WAREHOUSE_TRANSFER'
  | 'DATABASE_SANDBOX'
  | 'VARIANCE_RESOLUTION';

interface RightSlidingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: DrawerMode;
  product?: ProductDTO | null;
  locations: LocationDTO[];
  initialRack?: string;
  goodsReceipt?: GoodsReceiptDTO | null;
  onSaveProduct?: (product: Partial<ProductDTO>) => Promise<void>;
  onExecuteTransfer?: (data: {
    productId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    unit: string;
  }) => Promise<void>;
  onRefreshData?: () => void;
}

export const RightSlidingDrawer: React.FC<RightSlidingDrawerProps> = ({
  isOpen,
  onClose,
  mode,
  product,
  locations,
  initialRack,
  goodsReceipt,
  onSaveProduct,
  onExecuteTransfer,
  onRefreshData,
}) => {
  // Product Edit State
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [hsCode, setHsCode] = useState('8517.62.0000');
  const [unitCost, setUnitCost] = useState(100);
  const [retailPrice, setRetailPrice] = useState(250);
  const [reorderPoint, setReorderPoint] = useState(40);
  const [unitOfMeasure, setUnitOfMeasure] = useState('EA');
  const [productTab, setProductTab] = useState<'UOM' | 'GENERAL' | 'STOCK'>('UOM');

  // Transfer State
  const [transferProductId, setTransferProductId] = useState('');
  const [transferSourceLoc, setTransferSourceLoc] = useState('');
  const [transferDestLoc, setTransferDestLoc] = useState('');
  const [transferQty, setTransferQty] = useState(10);
  const [transferUnit, setTransferUnit] = useState('EA');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);

  // Database Sandbox State
  const [dbInstances, setDbInstances] = useState<DatabaseInstanceDTO[]>([]);
  const [currentDbId, setCurrentDbId] = useState('db-neom-live');
  const [cloneName, setCloneName] = useState('');
  const [neutralName, setNeutralName] = useState('');
  const [isDbSwitching, setIsDbSwitching] = useState(false);

  // Populate product details
  useEffect(() => {
    if (product) {
      setSku(product.sku || '');
      setName(product.name || '');
      setBarcode(product.barcode || '');
      setHsCode(product.hsCode || '8517.62.0000');
      setUnitCost(product.unitCost || 100);
      setRetailPrice(product.retailPrice || 250);
      setReorderPoint(product.reorderPoint || 40);
      setUnitOfMeasure(product.unitOfMeasure || 'EA');
      setTransferProductId(product.id);
    }
  }, [product]);

  // Set default locations for transfer
  useEffect(() => {
    if (locations.length > 0) {
      setTransferSourceLoc(locations[0].id);
      setTransferDestLoc(locations.length > 1 ? locations[1].id : locations[0].id);
    }
    loadDbInstances();
  }, [locations]);

  const loadDbInstances = async () => {
    try {
      const res = await api.getDatabaseInstances();
      setDbInstances(res.instances);
      setCurrentDbId(res.currentDatabaseId);
    } catch (e) {
      console.error('Failed to load DB instances', e);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle Transfer Submit
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProductId || !transferSourceLoc || !transferDestLoc) return;

    setTransferSubmitting(true);
    try {
      if (onExecuteTransfer) {
        await onExecuteTransfer({
          productId: transferProductId,
          fromLocationId: transferSourceLoc,
          toLocationId: transferDestLoc,
          quantity: Number(transferQty),
          unit: transferUnit,
        });
      } else {
        await api.transferStock({
          productId: transferProductId,
          fromLocationId: transferSourceLoc,
          toLocationId: transferDestLoc,
          quantity: Number(transferQty),
          notes: `High-Density Grid Shift (Rack ${initialRack || 'Auto'})`,
        });
      }

      setTransferSuccess(true);
      if (onRefreshData) onRefreshData();
      setTimeout(() => {
        setTransferSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Transfer failed', err);
    } finally {
      setTransferSubmitting(false);
    }
  };

  // Switch DB
  const handleSwitchDb = async (id: string) => {
    setIsDbSwitching(true);
    try {
      const res = await api.switchDatabase(id);
      setCurrentDbId(id);
      setDbInstances(res.instances);
      if (onRefreshData) onRefreshData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDbSwitching(false);
    }
  };

  const handleCloneDb = async () => {
    if (!cloneName) return;
    setIsDbSwitching(true);
    try {
      const res = await api.cloneDatabase(cloneName, 'User sandbox duplicate');
      setDbInstances(res.instances);
      setCloneName('');
      if (onRefreshData) onRefreshData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDbSwitching(false);
    }
  };

  const handleNeutralizeDb = async () => {
    setIsDbSwitching(true);
    try {
      const res = await api.neutralizeDatabase(neutralName || 'Zero Master Slate');
      setDbInstances(res.instances);
      setNeutralName('');
      if (onRefreshData) onRefreshData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDbSwitching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Semi-transparent backdrop allowing context reference */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Sliding Drawer Body (Spanning 4 to 6 grid columns ~ 560px-640px) */}
      <div className="relative w-full max-w-xl bg-white border-l border-[#e4dfd3] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 text-[#152936]">
        {/* Top Header */}
        <div className="h-18 px-6 border-b border-[#ece8de] flex items-center justify-between bg-[#faf9f6]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#122b39] text-[#e5a329] flex items-center justify-center font-bold shadow-xs">
              {mode === 'PRODUCT_EDIT' && <Boxes className="w-5 h-5" />}
              {mode === 'WAREHOUSE_TRANSFER' && <ArrowLeftRight className="w-5 h-5" />}
              {mode === 'DATABASE_SANDBOX' && <Database className="w-5 h-5" />}
              {mode === 'VARIANCE_RESOLUTION' && <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#152836] leading-tight">
                {mode === 'PRODUCT_EDIT' && 'Product Master & 4-Tier Packaging'}
                {mode === 'WAREHOUSE_TRANSFER' && 'Direct Warehouse Shift'}
                {mode === 'DATABASE_SANDBOX' && 'Database Profile & Topologies'}
                {mode === 'VARIANCE_RESOLUTION' && 'Quarantine Variance Resolution'}
              </h2>
              <p className="text-xs text-[#7a8b99]">
                {mode === 'PRODUCT_EDIT' && 'Multi-UoM ratios, barcodes & stock distribution'}
                {mode === 'WAREHOUSE_TRANSFER' && `Fast reallocation from Slot ${initialRack || 'B6'}`}
                {mode === 'DATABASE_SANDBOX' && 'Switch live/sandbox or neutralize data'}
                {mode === 'VARIANCE_RESOLUTION' && 'Accept variance, return to vendor, or recount'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#f0ece2] hover:bg-[#e4dfd2] text-[#607282] hover:text-[#152836] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* ======================================================== */}
          {/* MODE 1: PRODUCT EDIT & 4-TIER PACKAGING                  */}
          {/* ======================================================== */}
          {mode === 'PRODUCT_EDIT' && (
            <div className="space-y-5">
              {/* Drawer Tabs */}
              <div className="flex gap-2 p-1 bg-[#f6f4ed] rounded-xl border border-[#e2ded2] text-xs font-semibold">
                <button
                  onClick={() => setProductTab('UOM')}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    productTab === 'UOM' ? 'bg-white text-[#152836] shadow-xs font-bold' : 'text-[#7a8b99]'
                  }`}
                >
                  4-Tier Packaging Matrix
                </button>
                <button
                  onClick={() => setProductTab('GENERAL')}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    productTab === 'GENERAL' ? 'bg-white text-[#152836] shadow-xs font-bold' : 'text-[#7a8b99]'
                  }`}
                >
                  General & Customs
                </button>
                <button
                  onClick={() => setProductTab('STOCK')}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    productTab === 'STOCK' ? 'bg-white text-[#152836] shadow-xs font-bold' : 'text-[#7a8b99]'
                  }`}
                >
                  Location Distribution
                </button>
              </div>

              {/* UoM Tab: 4-Tier Matrix */}
              {productTab === 'UOM' && (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-[#152836] uppercase tracking-wider flex items-center gap-1.5">
                    <Barcode className="w-4 h-4 text-[#e5a329]" />
                    <span>Configured Packaging Hierarchy</span>
                  </div>

                  {/* 4 Packaging Cards: Each, Inner Pack, Case, Pallet */}
                  <div className="space-y-3">
                    {/* Tier 1: Each */}
                    <div className="p-3.5 rounded-xl border border-[#e4dfd3] bg-[#faf9f6]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#152836]">Tier 1: Each (EA)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          1 EA (Base Unit)
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-[#7a8b99] block text-[10px]">Barcode:</span>
                          <span className="text-[#152836] font-bold">{barcode || '628100234001'}</span>
                        </div>
                        <div>
                          <span className="text-[#7a8b99] block text-[10px]">Gross Weight:</span>
                          <span className="text-[#152836]">0.45 kg</span>
                        </div>
                      </div>
                    </div>

                    {/* Tier 2: Inner Pack */}
                    <div className="p-3.5 rounded-xl border border-[#e4dfd3] bg-white">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#152836]">Tier 2: Inner Pack (PK)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                          6 EA
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-[#7a8b99] block text-[10px]">Barcode:</span>
                          <span className="text-[#152836] font-bold">{barcode ? `${barcode}-PK6` : '628100234002'}</span>
                        </div>
                        <div>
                          <span className="text-[#7a8b99] block text-[10px]">Dimensions (cm):</span>
                          <span className="text-[#152836]">22 × 15 × 12 cm</span>
                        </div>
                      </div>
                    </div>

                    {/* Tier 3: Case */}
                    <div className="p-3.5 rounded-xl border border-[#e4dfd3] bg-white">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#152836]">Tier 3: Master Case (CS)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                          24 EA (4 Packs)
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-[#7a8b99] block text-[10px]">Barcode:</span>
                          <span className="text-[#152836] font-bold">{barcode ? `${barcode}-CS24` : '628100234003'}</span>
                        </div>
                        <div>
                          <span className="text-[#7a8b99] block text-[10px]">Dimensions (cm):</span>
                          <span className="text-[#152836]">45 × 32 × 28 cm</span>
                        </div>
                      </div>
                    </div>

                    {/* Tier 4: Pallet */}
                    <div className="p-3.5 rounded-xl border border-[#e4dfd3] bg-white">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#152836]">Tier 4: Euro Pallet (PL)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                          144 EA (6 Cases)
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-[#7a8b99] block text-[10px]">Barcode:</span>
                          <span className="text-[#152836] font-bold">{barcode ? `${barcode}-PL144` : '628100234004'}</span>
                        </div>
                        <div>
                          <span className="text-[#7a8b99] block text-[10px]">Gross Weight:</span>
                          <span className="text-[#152836]">82.4 kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* General Tab */}
              {productTab === 'GENERAL' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-[#152836] mb-1">SKU Code</label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="w-full px-3 py-2 bg-[#f8f6f0] border border-[#e2ddd0] rounded-xl text-[#152836] font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#152836] mb-1">Product Description</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#f8f6f0] border border-[#e2ddd0] rounded-xl text-[#152836]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#152836] mb-1">Saudi Customs HS Code</label>
                      <input
                        type="text"
                        value={hsCode}
                        onChange={(e) => setHsCode(e.target.value)}
                        className="w-full px-3 py-2 bg-[#f8f6f0] border border-[#e2ddd0] rounded-xl font-mono text-[#152836]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#152836] mb-1">Unit Cost ($)</label>
                      <input
                        type="number"
                        value={unitCost}
                        onChange={(e) => setUnitCost(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#f8f6f0] border border-[#e2ddd0] rounded-xl font-mono text-[#152836]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#152836] mb-1">Reorder Point (ROP)</label>
                      <input
                        type="number"
                        value={reorderPoint}
                        onChange={(e) => setReorderPoint(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#f8f6f0] border border-[#e2ddd0] rounded-xl font-mono text-[#152836]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#152836] mb-1">Base UoM</label>
                      <select
                        value={unitOfMeasure}
                        onChange={(e) => setUnitOfMeasure(e.target.value)}
                        className="w-full px-3 py-2 bg-[#f8f6f0] border border-[#e2ddd0] rounded-xl text-[#152836]"
                      >
                        <option value="EA">EA - Each</option>
                        <option value="PK">PK - Pack</option>
                        <option value="CS">CS - Case</option>
                        <option value="M">M - Meters</option>
                        <option value="KG">KG - Kilograms</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Stock Tab */}
              {productTab === 'STOCK' && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-[#152836]">Facility Inventory Distribution</div>
                  {locations.map((loc) => (
                    <div
                      key={loc.id}
                      className="p-3 bg-[#faf9f6] border border-[#e4dfd3] rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#152836]">{loc.name}</div>
                        <div className="text-[10px] text-[#7a8b99] font-mono">{loc.type}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-[#152836]">
                          {Math.floor(Math.random() * 200 + 40)}
                        </span>{' '}
                        <span className="text-[#7a8b99] font-mono">EA</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 2: WAREHOUSE TRANSFER FORM                          */}
          {/* ======================================================== */}
          {mode === 'WAREHOUSE_TRANSFER' && (
            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#152836] mb-1">Source Rack / Depot</label>
                <div className="px-3 py-2 bg-[#f6f4ed] border border-[#e2ded2] rounded-xl font-mono text-[#152836] flex items-center justify-between">
                  <span className="font-bold">{initialRack || 'Aisle B - Slot B6 (Heavy Valves)'}</span>
                  <span className="text-[10px] bg-[#122b39] text-[#e5a329] px-2 py-0.5 rounded font-mono">
                    ACTIVE
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#152836] mb-1">Target Facility / Destination</label>
                <select
                  value={transferDestLoc}
                  onChange={(e) => setTransferDestLoc(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8f6f0] border border-[#e2ddd0] rounded-xl text-[#152836] font-medium"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#152836] mb-1">Quantity to Shift</label>
                  <input
                    type="number"
                    min="1"
                    value={transferQty}
                    onChange={(e) => setTransferQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#f8f6f0] border border-[#e2ddd0] rounded-xl font-mono font-bold text-[#152836]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#152836] mb-1">Unit of Measure</label>
                  <select
                    value={transferUnit}
                    onChange={(e) => setTransferUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f8f6f0] border border-[#e2ddd0] rounded-xl text-[#152836] font-mono"
                  >
                    <option value="EA">EA (Each)</option>
                    <option value="CS">CS (Case 24x)</option>
                    <option value="PL">PL (Pallet 144x)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-[#faf9f6] border border-[#e4dfd3] rounded-xl space-y-1 text-[#607282]">
                <div className="flex justify-between">
                  <span>Converted Base Units:</span>
                  <strong className="font-mono text-[#152836]">
                    {transferUnit === 'PL'
                      ? transferQty * 144
                      : transferUnit === 'CS'
                      ? transferQty * 24
                      : transferQty}{' '}
                    EA
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Ledger Integrity:</span>
                  <span className="text-emerald-600 font-semibold">ACID Reserved</span>
                </div>
              </div>

              {transferSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Stock transferred & ledger updated successfully!</span>
                </div>
              )}

              <button
                type="submit"
                disabled={transferSubmitting}
                className="w-full py-2.5 bg-[#132f3e] hover:bg-[#1a3d52] text-white rounded-xl font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {transferSubmitting ? 'Committing Ledger Shift...' : 'Execute Stock Transfer'}
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* MODE 3: DATABASE TOPOLOGY & SANDBOX                      */}
          {/* ======================================================== */}
          {mode === 'DATABASE_SANDBOX' && (
            <div className="space-y-5 text-xs">
              <div>
                <div className="font-bold text-[#152836] mb-2 uppercase tracking-wider text-[11px]">
                  Available Profiles & Sandboxes
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {dbInstances.map((inst) => {
                    const isCurrent = inst.id === currentDbId;
                    return (
                      <div
                        key={inst.id}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                          isCurrent
                            ? 'bg-[#122b39] text-white border-[#122b39]'
                            : 'bg-white border-[#e4dfd3] hover:border-[#cfc9ba]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{inst.name}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                                isCurrent
                                  ? 'bg-[#e5a329] text-[#122b39]'
                                  : 'bg-[#f6f4ed] text-[#607282] border border-[#e2ded2]'
                              }`}
                            >
                              {inst.type}
                            </span>
                          </div>
                          <div className={`text-[11px] mt-0.5 ${isCurrent ? 'text-slate-300' : 'text-[#7a8b99]'}`}>
                            {inst.description}
                          </div>
                        </div>

                        <div>
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleSwitchDb(inst.id)}
                              disabled={isDbSwitching}
                              className="px-3 py-1 bg-[#e5a329] hover:bg-[#d89720] text-[#122b39] rounded-lg font-bold transition"
                            >
                              Switch
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions: Duplicate to Sandbox vs Neutralize */}
              <div className="space-y-3 pt-3 border-t border-[#ece8de]">
                <div className="p-3.5 rounded-xl bg-[#faf9f6] border border-[#e4dfd3] space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#152836]">
                    <Copy className="w-4 h-4 text-purple-600" />
                    <span>Clone Current Database to Sandbox</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Sandbox Name (e.g. NEOM Test Run)"
                    value={cloneName}
                    onChange={(e) => setCloneName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#e2ddd0] rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCloneDb}
                    disabled={!cloneName || isDbSwitching}
                    className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg font-bold disabled:opacity-50 transition"
                  >
                    Create Sandbox Clone
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-[#faf9f6] border border-[#e4dfd3] space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#152836]">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Neutralize to Clean Slate (0 Items)</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Clean Slate Profile Name"
                    value={neutralName}
                    onChange={(e) => setNeutralName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#e2ddd0] rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleNeutralizeDb}
                    disabled={isDbSwitching}
                    className="w-full py-2 bg-[#d97706] hover:bg-[#b45309] text-white rounded-lg font-bold disabled:opacity-50 transition"
                  >
                    Initialize 0-Stock Master
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#ece8de] bg-[#faf9f6] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#f0ece2] hover:bg-[#e4dfd2] text-[#152836] font-semibold text-xs transition cursor-pointer"
          >
            Close Drawer
          </button>

          {mode === 'PRODUCT_EDIT' && (
            <button
              onClick={() => {
                if (onSaveProduct) {
                  onSaveProduct({
                    sku,
                    name,
                    hsCode,
                    unitCost,
                    retailPrice,
                    reorderPoint,
                    unitOfMeasure,
                  });
                }
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-[#132f3e] hover:bg-[#1a3d52] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#e5a329]" />
              <span>Save Changes</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
