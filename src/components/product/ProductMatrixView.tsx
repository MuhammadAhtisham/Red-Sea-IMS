import React, { useState } from 'react';
import {
  Building2,
  Package,
  ArrowLeftRight,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Layers,
  MapPin,
} from 'lucide-react';
import { ProductDTO, LocationDTO } from '../../services/api';

interface ProductMatrixViewProps {
  products: ProductDTO[];
  locations: LocationDTO[];
  onSelectProduct: (product: ProductDTO) => void;
  onOpenTransfer?: (product: ProductDTO, fromLocId?: string) => void;
}

export const ProductMatrixView: React.FC<ProductMatrixViewProps> = ({
  products,
  locations,
  onSelectProduct,
  onOpenTransfer,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);

  // Group locations to represent unique facility warehouses
  const warehouseFacilities = locations.filter(
    (loc) => loc.type === 'WAREHOUSE' || loc.type === 'TRANSIT_HUB' || loc.type === 'STOREFRONT'
  );

  // Fallback if no specific facilities filtered
  const activeFacilities =
    warehouseFacilities.length > 0 ? warehouseFacilities.slice(0, 7) : locations.slice(0, 5);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.sku.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(filterQuery.toLowerCase());

    const isLow = p.totalStock <= p.reorderPoint;
    if (showOnlyLowStock && !isLow) return false;

    return matchesSearch;
  });

  return (
    <div className="bg-white rounded-2xl border border-[#ded8cb] shadow-xs overflow-hidden flex flex-col">
      {/* Matrix Controls */}
      <div className="p-4 border-b border-[#ded8cb] bg-[#faf9f6] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#122b39] text-[#e5a329] flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#152836]">
              Multi-Facility Stock Distribution Matrix
            </h3>
            <p className="text-[11px] text-[#7a8b99]">
              Cross-nodal warehouse inventory positioning across Red Sea Logistics facilities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8b99]" />
            <input
              type="text"
              placeholder="Search matrix SKUs..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-[#ded8cb] rounded-xl text-xs text-[#152836] w-48 focus:outline-none focus:border-[#122b39]"
            />
          </div>

          <button
            onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
              showOnlyLowStock
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-white border-[#ded8cb] text-[#526677] hover:bg-[#faf9f6]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Low Stock Only</span>
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#f8f5ee] text-[#526677] font-mono border-b border-[#ded8cb] sticky top-0 z-10">
            <tr>
              <th className="p-3.5 pl-5 font-bold min-w-[220px]">Product / Master SKU</th>
              <th className="p-3.5 font-bold text-center w-28">Total On Hand</th>
              <th className="p-3.5 font-bold text-center w-24">Safety (ROP)</th>
              {activeFacilities.map((fac) => (
                <th key={fac.id} className="p-3.5 font-bold text-center min-w-[130px] border-l border-[#ded8cb]/80">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[#152836] font-bold truncate max-w-[120px]">{fac.name}</span>
                    <span className="text-[10px] text-[#7a8b99]">{fac.code}</span>
                  </div>
                </th>
              ))}
              <th className="p-3.5 pr-5 text-right font-bold w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ded8cb]">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={4 + activeFacilities.length} className="p-12 text-center text-[#7a8b99]">
                  No products matched the matrix filter criteria.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const isBelowRop = p.totalStock <= p.reorderPoint;
                const isCritical = p.totalStock < p.reorderPoint * 0.5;

                return (
                  <tr key={p.id} className="hover:bg-[#faf9f6] transition group">
                    {/* SKU info */}
                    <td className="p-3.5 pl-5">
                      <div
                        onClick={() => onSelectProduct(p)}
                        className="cursor-pointer group-hover:text-[#122b39]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#122b39] bg-[#f6f4ed] px-1.5 py-0.5 rounded border border-[#ded8cb]">
                            {p.sku}
                          </span>
                          <span className="text-[11px] px-2 py-0.2 rounded-full bg-[#faf9f6] text-[#7a8b99] border border-[#ded8cb]">
                            {p.category}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-[#152836] mt-1 line-clamp-1">
                          {p.name}
                        </div>
                      </div>
                    </td>

                    {/* Total Stock */}
                    <td className="p-3.5 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-lg ${
                            isCritical
                              ? 'bg-red-100 text-red-800'
                              : isBelowRop
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {p.totalStock} {p.unitOfMeasure || 'EA'}
                        </span>
                      </div>
                    </td>

                    {/* Reorder Point */}
                    <td className="p-3.5 text-center font-mono text-xs text-[#7a8b99]">
                      {p.reorderPoint}
                    </td>

                    {/* Facility breakdown cells */}
                    {activeFacilities.map((fac) => {
                      // Find stock at this specific facility or its child racks
                      const match = p.stockByLocation?.find(
                        (s) => s.locationId === fac.id || s.locationCode.startsWith(fac.code)
                      );
                      const qty = match ? match.quantity : 0;

                      return (
                        <td
                          key={fac.id}
                          className="p-3 text-center border-l border-[#ded8cb]/80 font-mono text-xs"
                        >
                          {qty > 0 ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#faf9f6] border border-[#ded8cb] font-bold text-[#152836]">
                              <span>{qty}</span>
                              <span className="text-[9px] text-[#7a8b99]">
                                {p.unitOfMeasure || 'EA'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#a5b4be]">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Actions */}
                    <td className="p-3.5 pr-5 text-right">
                      <button
                        onClick={() => onSelectProduct(p)}
                        className="px-2.5 py-1 bg-[#122b39] hover:bg-[#1a3d52] text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                      >
                        Inspect
                      </button>
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
