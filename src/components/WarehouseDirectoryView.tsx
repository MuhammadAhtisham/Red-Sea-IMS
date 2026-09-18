import React, { useState, useMemo } from 'react';
import {
  Warehouse,
  Plus,
  Search,
  SlidersHorizontal,
  MapPin,
  Thermometer,
  ShieldCheck,
  Building2,
  Boxes,
  Layers,
  Edit2,
  Trash2,
  ExternalLink,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Phone,
  User,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { LocationDTO, ProductDTO, api } from '../services/api';

interface WarehouseDirectoryViewProps {
  locations: LocationDTO[];
  products: ProductDTO[];
  onSelectWarehouseForTopology: (location: LocationDTO) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (location: LocationDTO) => void;
  onOpenZonesModal: (location: LocationDTO) => void;
  onRefresh: () => void;
}

export const WarehouseDirectoryView: React.FC<WarehouseDirectoryViewProps> = ({
  locations,
  products,
  onSelectWarehouseForTopology,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenZonesModal,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [decommissionTarget, setDecommissionTarget] = useState<LocationDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Compute Network KPIs
  const networkKPIs = useMemo(() => {
    const totalFacilities = locations.length;
    const activeFacilities = locations.filter((l) => l.active !== false).length;
    const totalUnits = locations.reduce((acc, l) => acc + (l.totalUnits || 0), 0);
    const totalCapacity = locations.reduce((acc, l) => acc + (l.nominalCapacity || 12000), 0);
    const aggregateUtilization = totalCapacity > 0 ? Math.round((totalUnits / totalCapacity) * 1000) / 10 : 0;
    const totalZones = locations.reduce((acc, l) => acc + (l.zones ? l.zones.length : 4), 0);

    return {
      totalFacilities,
      activeFacilities,
      totalUnits,
      totalCapacity,
      aggregateUtilization,
      totalZones,
    };
  }, [locations]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesType =
        typeFilter === 'ALL' ||
        loc.type === typeFilter ||
        (typeFilter === 'STOREFRONT' && (loc.type as string) === 'STORE');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        loc.name.toLowerCase().includes(q) ||
        loc.code.toLowerCase().includes(q) ||
        loc.city.toLowerCase().includes(q) ||
        (loc.managerName && loc.managerName.toLowerCase().includes(q));

      return matchesType && matchesSearch;
    });
  }, [locations, searchQuery, typeFilter]);

  const handleDeleteLocation = async () => {
    if (!decommissionTarget) return;

    if ((decommissionTarget.totalUnits || 0) > 0) {
      setFeedbackMsg({
        type: 'error',
        text: `Cannot decommission ${decommissionTarget.name}. It currently holds ${decommissionTarget.totalUnits} on-hand units. Reallocate or transfer stock first.`,
      });
      setDecommissionTarget(null);
      return;
    }

    try {
      setIsDeleting(true);
      await api.deleteLocation(decommissionTarget.id);
      setFeedbackMsg({
        type: 'success',
        text: `Facility "${decommissionTarget.name}" successfully decommissioned from the network.`,
      });
      setDecommissionTarget(null);
      onRefresh();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to decommission facility.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Network Stats / Header KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5e1d5] rounded-2xl p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7a8b99] uppercase tracking-wider">Network Facilities</span>
            <div className="w-8 h-8 rounded-lg bg-[#122b39]/10 flex items-center justify-center">
              <Warehouse className="w-4 h-4 text-[#122b39]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#152836] mt-2 font-mono">{networkKPIs.totalFacilities} Hubs</div>
          <div className="text-xs text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{networkKPIs.activeFacilities} online & fully operational</span>
          </div>
        </div>

        <div className="bg-white border border-[#e5e1d5] rounded-2xl p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7a8b99] uppercase tracking-wider">Storage Capacity</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Boxes className="w-4 h-4 text-emerald-700" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#152836] mt-2 font-mono">
            {networkKPIs.totalUnits.toLocaleString()} / {networkKPIs.totalCapacity.toLocaleString()}
          </div>
          <div className="text-xs text-[#7a8b99] mt-0.5">Physical items currently stored</div>
        </div>

        <div className="bg-white border border-[#e5e1d5] rounded-2xl p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7a8b99] uppercase tracking-wider">Network Utilization</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Activity className="w-4 h-4 text-[#e5a329]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#152836] mt-2 font-mono">
            {networkKPIs.aggregateUtilization}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                networkKPIs.aggregateUtilization > 85
                  ? 'bg-rose-500'
                  : networkKPIs.aggregateUtilization > 65
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, networkKPIs.aggregateUtilization)}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-[#e5e1d5] rounded-2xl p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7a8b99] uppercase tracking-wider">Active Storage Zones</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Layers className="w-4 h-4 text-blue-700" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#152836] mt-2 font-mono">{networkKPIs.totalZones} Sectors</div>
          <div className="text-xs text-[#7a8b99] mt-0.5">Automated bays, cold vaults & docks</div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between font-medium ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-bold underline hover:opacity-75 cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Bar & Search / Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#e5e1d5] rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7a8b99] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search warehouses by name, code, city, or manager..."
              className="w-full pl-9.5 pr-4 py-2 bg-[#fcfbf9] border border-[#e2ddd0] rounded-xl text-xs text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-[#fcfbf9] border border-[#e2ddd0] rounded-xl text-xs font-semibold text-[#152836] focus:outline-hidden"
          >
            <option value="ALL">All Facility Types</option>
            <option value="WAREHOUSE">Automated DC / Warehouse</option>
            <option value="TRANSIT_HUB">Transit & Intermodal Hub</option>
            <option value="STOREFRONT">Storefront / Urban Micro-Hub</option>
            <option value="QUARANTINE">Quarantine & QA Bay</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#122b39] hover:bg-[#1a3d52] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#e5a329]" />
            <span>Create Warehouse</span>
          </button>
        </div>
      </div>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredLocations.map((loc) => {
          const totalUnits = loc.totalUnits || 0;
          const capacity = loc.nominalCapacity || (loc.type === 'WAREHOUSE' ? 12000 : 3500);
          const utilRate = capacity > 0 ? Math.min(100, Math.round((totalUnits / capacity) * 1000) / 10) : 0;
          const skuCount = loc.skuCount || 0;

          let typeColor = 'bg-blue-50 text-blue-800 border-blue-200';
          let typeLabel = 'Automated Warehouse';
          if (loc.type === 'STOREFRONT' || (loc.type as string) === 'STORE') {
            typeColor = 'bg-purple-50 text-purple-800 border-purple-200';
            typeLabel = 'Retail Storefront';
          } else if (loc.type === 'QUARANTINE') {
            typeColor = 'bg-rose-50 text-rose-800 border-rose-200';
            typeLabel = 'Quarantine & QA';
          } else if (loc.type === 'TRANSIT_HUB') {
            typeColor = 'bg-amber-50 text-amber-800 border-amber-200';
            typeLabel = 'Intermodal Hub';
          }

          return (
            <div
              key={loc.id}
              className="bg-white border border-[#e5e1d5] hover:border-[#cfc9ba] rounded-2xl p-5 shadow-2xs transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#ede9df] text-[#152836]">
                        {loc.code}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${typeColor}`}>
                        {typeLabel}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#152836] mt-2 group-hover:text-[#122b39]">
                      {loc.name}
                    </h3>
                  </div>

                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${
                      loc.active !== false ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-slate-300'
                    }`}
                    title={loc.active !== false ? 'Active Facility' : 'Inactive'}
                  />
                </div>

                {/* Address & GPS */}
                <div className="mt-3 text-xs text-[#7a8b99] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#e5a329] shrink-0" />
                    <span className="truncate">
                      {loc.city}, {loc.state || 'Tabuk'} • {loc.address || 'Logistics Sector'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 pl-5">
                    GPS: {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                  </div>
                </div>

                {/* Utilization Progress Bar */}
                <div className="mt-4 p-3 rounded-xl bg-[#fcfbf9] border border-[#eee9df]">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-[#152836]">Storage Utilization</span>
                    <span className="font-mono font-bold text-[#152836]">{utilRate}%</span>
                  </div>
                  <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        utilRate > 85 ? 'bg-rose-500' : utilRate > 65 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, utilRate)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#7a8b99] mt-2">
                    <span>
                      <strong className="text-[#152836] font-mono">{totalUnits.toLocaleString()}</strong> on-hand units
                    </span>
                    <span>
                      <strong className="text-[#152836] font-mono">{skuCount}</strong> unique SKUs
                    </span>
                  </div>
                </div>

                {/* Specs & Lead */}
                <div className="mt-3.5 pt-3 border-t border-[#f0ece2] space-y-2 text-xs text-[#7a8b99]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-[#e5a329]" />
                      <span>Atmosphere</span>
                    </span>
                    <span className="text-[#152836] font-medium text-[11px] truncate max-w-[170px]">
                      {loc.temperatureZone || 'Ambient (20-24°C)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#7a8b99]" />
                      <span>Operations Lead</span>
                    </span>
                    <span className="text-[#152836] font-medium text-[11px]">
                      {loc.managerName || 'Logistics Lead'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#7a8b99]" />
                      <span>Storage Zones</span>
                    </span>
                    <button
                      onClick={() => onOpenZonesModal(loc)}
                      className="text-xs font-bold text-[#132f3e] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{loc.zones?.length || 4} configured</span>
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-[#f0ece2] flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectWarehouseForTopology(loc)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#122b39] hover:bg-[#1a3d52] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                >
                  <span>2D Bay Topology</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#e5a329]" />
                </button>

                <button
                  onClick={() => onOpenEditModal(loc)}
                  className="p-2 bg-[#f6f4ed] hover:bg-[#eae6dc] text-[#152836] rounded-xl transition cursor-pointer border border-[#ded8cb]"
                  title="Edit Facility Settings"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setDecommissionTarget(loc)}
                  className="p-2 bg-[#f6f4ed] hover:bg-rose-50 hover:text-rose-600 text-[#7a8b99] rounded-xl transition cursor-pointer border border-[#ded8cb]"
                  title="Decommission Facility"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredLocations.length === 0 && (
        <div className="text-center py-12 bg-white border border-[#e5e1d5] rounded-2xl p-8 shadow-xs">
          <Warehouse className="w-12 h-12 text-[#7a8b99] mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-[#152836]">No Facilities Found</h3>
          <p className="text-xs text-[#7a8b99] max-w-md mx-auto mt-1 mb-4">
            No warehouses matched your search query or type filters. Register a new facility to expand the grid.
          </p>
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 bg-[#122b39] hover:bg-[#1a3d52] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#e5a329]" />
            <span>Create New Warehouse</span>
          </button>
        </div>
      )}

      {/* Decommission Confirmation Dialog */}
      {decommissionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-[#e2ddd0] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-[#152836]">
                Decommission {decommissionTarget.name}?
              </h3>
              <p className="text-xs text-[#7a8b99] mt-1.5">
                Facility code: <span className="font-mono font-bold text-[#152836]">{decommissionTarget.code}</span>.
                Decommissioning will remove this facility from all active receiving docks, WES picking, and inventory transfers.
              </p>
              {(decommissionTarget.totalUnits || 0) > 0 && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold">
                  Warning: Facility currently holds {decommissionTarget.totalUnits} on-hand units. Decommissioning is blocked until stock is transferred.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDecommissionTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs font-semibold text-[#152836] hover:bg-[#ede9df] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteLocation}
                disabled={isDeleting || (decommissionTarget.totalUnits || 0) > 0}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Decommissioning...' : 'Confirm Decommission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
