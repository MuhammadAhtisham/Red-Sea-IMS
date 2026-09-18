import React, { useState } from 'react';
import {
  CheckSquare,
  X,
  Tag,
  DollarSign,
  Barcode,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { ProductDTO, CategoryDTO, api } from '../../services/api';

interface ProductBatchActionBarProps {
  selectedProductIds: string[];
  products: ProductDTO[];
  categories: CategoryDTO[];
  onClearSelection: () => void;
  onRefresh: () => void;
  onOpenBarcodeModal: (selected: ProductDTO[]) => void;
}

export const ProductBatchActionBar: React.FC<ProductBatchActionBarProps> = ({
  selectedProductIds,
  products,
  categories,
  onClearSelection,
  onRefresh,
  onOpenBarcodeModal,
}) => {
  const [activeActionModal, setActiveActionModal] = useState<
    'CATEGORY' | 'PRICE' | 'STATUS' | 'DELETE' | null
  >(null);

  const [targetCategory, setTargetCategory] = useState<string>(
    categories[0]?.name || 'Smart Infrastructure'
  );
  const [targetStatus, setTargetStatus] = useState<string>('ACTIVE');
  const [priceAdjustmentType, setPriceAdjustmentType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [priceDelta, setPriceDelta] = useState<number>(5);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (selectedProductIds.length === 0) return null;

  const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));

  const handleApplyCategory = async () => {
    setProcessing(true);
    try {
      await api.bulkActionProducts('SET_CATEGORY', selectedProductIds, {
        category: targetCategory,
      });
      setFeedback(`Reassigned ${selectedProductIds.length} items to "${targetCategory}".`);
      setTimeout(() => {
        setFeedback(null);
        setActiveActionModal(null);
        onClearSelection();
        onRefresh();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to update categories.');
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyStatus = async () => {
    setProcessing(true);
    try {
      await api.bulkActionProducts('SET_STATUS', selectedProductIds, {
        status: targetStatus,
      });
      setFeedback(`Updated status of ${selectedProductIds.length} items to "${targetStatus}".`);
      setTimeout(() => {
        setFeedback(null);
        setActiveActionModal(null);
        onClearSelection();
        onRefresh();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to update statuses.');
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyPrice = async () => {
    setProcessing(true);
    try {
      const payload =
        priceAdjustmentType === 'PERCENT'
          ? { percentChange: priceDelta }
          : { fixedDelta: priceDelta };

      await api.bulkActionProducts('ADJUST_PRICE', selectedProductIds, payload);
      setFeedback(
        `Applied ${priceAdjustmentType === 'PERCENT' ? `${priceDelta}%` : `$${priceDelta}`} price adjustment to ${selectedProductIds.length} products.`
      );
      setTimeout(() => {
        setFeedback(null);
        setActiveActionModal(null);
        onClearSelection();
        onRefresh();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to adjust prices.');
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyDelete = async () => {
    setProcessing(true);
    try {
      await api.bulkActionProducts('DELETE', selectedProductIds);
      setFeedback(`Purged ${selectedProductIds.length} items from inventory database.`);
      setTimeout(() => {
        setFeedback(null);
        setActiveActionModal(null);
        onClearSelection();
        onRefresh();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to delete products.');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportSelectedCsv = () => {
    const headers = [
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
    ];

    const rows = selectedProducts.map((p) => {
      const margin = p.retailPrice > 0 ? ((p.retailPrice - p.unitCost) / p.retailPrice) * 100 : 0;
      return [
        `"${p.sku}"`,
        `"${p.barcode}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category || ''}"`,
        `"${p.brand || ''}"`,
        p.unitCost,
        p.retailPrice,
        margin.toFixed(1),
        p.totalStock,
        `"${p.unitOfMeasure || 'EA'}"`,
        p.reorderPoint,
        p.leadTimeDays,
        `"${p.storageCondition || 'Ambient'}"`,
        `"${p.hsCode || ''}"`,
        `"${p.defaultVendor || ''}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `NEOM_Product_Batch_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Floating Action Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-[#122b39] text-white rounded-2xl shadow-2xl border border-[#2b4c60] p-2.5 px-5 flex items-center flex-wrap gap-4 animate-in slide-in-from-bottom-5 duration-200">
        <div className="flex items-center gap-2.5 border-r border-[#2b4c60] pr-4">
          <div className="w-7 h-7 rounded-lg bg-[#e5a329] text-[#122b39] flex items-center justify-center font-bold text-xs">
            {selectedProductIds.length}
          </div>
          <span className="text-xs font-bold whitespace-nowrap">
            Product{selectedProductIds.length > 1 ? 's' : ''} Selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-[11px] text-[#93a9b8] hover:text-white underline cursor-pointer"
          >
            Deselect
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveActionModal('CATEGORY')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a3d52] hover:bg-[#234d66] rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5 text-[#e5a329]" />
            <span>Set Category</span>
          </button>

          <button
            onClick={() => setActiveActionModal('PRICE')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a3d52] hover:bg-[#234d66] rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Adjust Price</span>
          </button>

          <button
            onClick={() => setActiveActionModal('STATUS')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a3d52] hover:bg-[#234d66] rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Set Status</span>
          </button>

          <button
            onClick={() => onOpenBarcodeModal(selectedProducts)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a3d52] hover:bg-[#234d66] rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Barcode className="w-3.5 h-3.5 text-[#e5a329]" />
            <span>Print Labels</span>
          </button>

          <button
            onClick={handleExportSelectedCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a3d52] hover:bg-[#234d66] rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#93a9b8]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setActiveActionModal('DELETE')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/70 hover:bg-red-900 border border-red-700/60 rounded-xl text-xs font-semibold text-red-200 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Submodal for Category Reassignment */}
      {activeActionModal === 'CATEGORY' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ded8cb] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#152836]">
                Bulk Assign Category ({selectedProductIds.length} SKUs)
              </h3>
              <button
                onClick={() => setActiveActionModal(null)}
                className="text-[#7a8b99] hover:text-[#152836]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{feedback}</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#7a8b99]">
                  Select the master classification to apply across all selected items.
                </p>

                <div>
                  <label className="block text-xs font-bold text-[#526677] uppercase tracking-wider mb-1.5">
                    Target Category
                  </label>
                  <select
                    value={targetCategory}
                    onChange={(e) => setTargetCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs text-[#152836] font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => setActiveActionModal(null)}
                    className="px-4 py-2 bg-[#f6f4ed] hover:bg-[#ede9df] text-[#152836] text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyCategory}
                    disabled={processing}
                    className="px-4 py-2 bg-[#122b39] hover:bg-[#1a3d52] text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    {processing ? 'Applying...' : 'Apply Category'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Submodal for Price Adjustment */}
      {activeActionModal === 'PRICE' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ded8cb] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#152836]">
                Bulk Retail Price Adjustment
              </h3>
              <button
                onClick={() => setActiveActionModal(null)}
                className="text-[#7a8b99] hover:text-[#152836]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{feedback}</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#7a8b99]">
                  Adjust selling prices across {selectedProductIds.length} selected products simultaneously.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPriceAdjustmentType('PERCENT')}
                    className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition ${
                      priceAdjustmentType === 'PERCENT'
                        ? 'bg-[#122b39] text-white border-[#122b39]'
                        : 'bg-[#faf9f6] text-[#152836] border-[#ded8cb]'
                    }`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceAdjustmentType('FIXED')}
                    className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition ${
                      priceAdjustmentType === 'FIXED'
                        ? 'bg-[#122b39] text-white border-[#122b39]'
                        : 'bg-[#faf9f6] text-[#152836] border-[#ded8cb]'
                    }`}
                  >
                    Fixed Delta ($)
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#526677] uppercase tracking-wider mb-1.5">
                    {priceAdjustmentType === 'PERCENT'
                      ? 'Change by (+/- %)'
                      : 'Change by (+/- $)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={priceDelta}
                      onChange={(e) => setPriceDelta(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 bg-[#faf9f6] border border-[#ded8cb] rounded-xl text-xs font-mono font-bold text-[#152836]"
                    />
                    <span className="text-xs font-bold text-[#7a8b99]">
                      {priceAdjustmentType === 'PERCENT' ? '%' : '$'}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#7a8b99] mt-1 block">
                    Use positive numbers to markup prices, negative to discount.
                  </span>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => setActiveActionModal(null)}
                    className="px-4 py-2 bg-[#f6f4ed] hover:bg-[#ede9df] text-[#152836] text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyPrice}
                    disabled={processing}
                    className="px-4 py-2 bg-[#122b39] hover:bg-[#1a3d52] text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    {processing ? 'Applying...' : 'Apply Price Changes'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Submodal for Status Update */}
      {activeActionModal === 'STATUS' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ded8cb] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#152836]">
                Bulk Status Change ({selectedProductIds.length} SKUs)
              </h3>
              <button
                onClick={() => setActiveActionModal(null)}
                className="text-[#7a8b99] hover:text-[#152836]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{feedback}</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#7a8b99]">
                  Select the lifecycle status to assign across all selected catalog items.
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'ACTIVE', label: 'Active Catalog Item', desc: 'Available for sales, POS, and automated reorders' },
                    { id: 'DRAFT', label: 'Draft / In Engineering Review', desc: 'Hidden from customer fulfillment' },
                    { id: 'DISCONTINUED', label: 'Discontinued / End of Life', desc: 'Sell off existing stock, no new POs' },
                    { id: 'ARCHIVED', label: 'Archived / Inactive', desc: 'Deprecate from active inventory view' },
                  ].map((s) => (
                    <label
                      key={s.id}
                      onClick={() => setTargetStatus(s.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        targetStatus === s.id
                          ? 'border-[#122b39] bg-[#faf9f6]'
                          : 'border-[#ded8cb] hover:bg-[#faf9f6]'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-[#152836]">{s.label}</div>
                        <div className="text-[11px] text-[#7a8b99]">{s.desc}</div>
                      </div>
                      <input
                        type="radio"
                        checked={targetStatus === s.id}
                        onChange={() => setTargetStatus(s.id)}
                        className="text-[#122b39]"
                      />
                    </label>
                  ))}
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => setActiveActionModal(null)}
                    className="px-4 py-2 bg-[#f6f4ed] hover:bg-[#ede9df] text-[#152836] text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyStatus}
                    disabled={processing}
                    className="px-4 py-2 bg-[#122b39] hover:bg-[#1a3d52] text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    {processing ? 'Applying...' : 'Apply Status'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Submodal for Delete Confirmation */}
      {activeActionModal === 'DELETE' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-red-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-900">
                  Delete {selectedProductIds.length} Products?
                </h3>
                <p className="text-xs text-[#7a8b99]">
                  This action is permanent and purges warehouse stock records for these items.
                </p>
              </div>
            </div>

            {feedback ? (
              <div className="p-3 bg-red-50 text-red-800 text-xs font-bold rounded-xl border border-red-200">
                {feedback}
              </div>
            ) : (
              <>
                <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 text-xs text-red-800 space-y-1">
                  <div className="font-bold">Items to be removed:</div>
                  <div className="max-h-24 overflow-y-auto space-y-0.5 font-mono text-[11px]">
                    {selectedProducts.map((p) => (
                      <div key={p.id} className="flex justify-between">
                        <span>{p.sku}</span>
                        <span className="text-red-700">{p.totalStock} units</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => setActiveActionModal(null)}
                    className="px-4 py-2 bg-[#f6f4ed] hover:bg-[#ede9df] text-[#152836] text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyDelete}
                    disabled={processing}
                    className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    {processing ? 'Deleting...' : 'Confirm Purge'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
