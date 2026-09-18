import React, { useState, useMemo, useRef } from 'react';
import {
  ArrowUpDown,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Package,
  Truck,
  RotateCcw,
  XCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  Search,
  Maximize2,
  ExternalLink,
  Warehouse,
  Building2,
  Settings,
  MapPin,
  Thermometer,
} from 'lucide-react';
import { ProductDTO, LocationDTO } from '../services/api';
import { WarehouseDirectoryView } from './WarehouseDirectoryView';
import { CreateWarehouseModal } from './CreateWarehouseModal';
import { EditWarehouseModal } from './EditWarehouseModal';
import { WarehouseZonesModal } from './WarehouseZonesModal';

interface WarehouseBayViewProps {
  products: ProductDTO[];
  locations: LocationDTO[];
  onOpenProductDrawer: (product: ProductDTO) => void;
  onOpenTransferDrawer: (sourceRack?: string) => void;
  onRefreshLocations?: () => void;
  initialViewMode?: 'directory' | 'topology';
}

interface RackSlot {
  id: string;
  code: string;
  isOccupied: boolean;
  sku?: string;
  productName?: string;
  quantity?: number;
  maxCapacity?: number;
  category?: string;
}

export const WarehouseBayView: React.FC<WarehouseBayViewProps> = ({
  products,
  locations,
  onOpenProductDrawer,
  onOpenTransferDrawer,
  onRefreshLocations,
  initialViewMode = 'directory',
}) => {
  const [viewMode, setViewMode] = useState<'directory' | 'topology'>(initialViewMode);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editLocationTarget, setEditLocationTarget] = useState<LocationDTO | null>(null);
  const [zonesLocationTarget, setZonesLocationTarget] = useState<LocationDTO | null>(null);

  // Dynamic Warehouse Tabs from Database
  const [activeWarehouse, setActiveWarehouse] = useState<number>(0);

  const warehouses = useMemo(() => {
    if (locations && locations.length > 0) {
      return locations.map((loc, idx) => ({
        id: idx,
        locId: loc.id,
        name: loc.name,
        code: loc.code,
        label: `${loc.city} • ${loc.name}`,
        raw: loc,
      }));
    }
    return [
      { id: 0, locId: 'loc-neom-bay-01', name: 'NEOM Bay Smart Hub', code: 'WH-01', label: 'NEOM Bay Smart Hub', raw: undefined },
      { id: 1, locId: 'loc-neom-oxa-02', name: 'Oxagon Maritime Port', code: 'WH-02', label: 'Oxagon Maritime Port', raw: undefined },
      { id: 2, locId: 'loc-neom-lin-03', name: 'The Line Automated Spine', code: 'WH-03', label: 'The Line Automated Spine', raw: undefined },
      { id: 3, locId: 'loc-neom-tro-04', name: 'Trojena Cold Logistics', code: 'WH-04', label: 'Trojena Cold Logistics', raw: undefined },
    ];
  }, [locations]);

  // Selected Rack Bay / Section
  const [selectedSection, setSelectedSection] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [selectedSlot, setSelectedSlot] = useState<RackSlot | null>(null);

  // Table filter & search
  const [tableSearch, setTableSearch] = useState('');
  const [sortField, setSortField] = useState<'sku' | 'stock' | 'cost' | 'rack'>('sku');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Generate 4 Sections of 12 slots each matching reference image
  const sectionsData = useMemo(() => {
    const makeSlots = (
      sectionKey: 'A' | 'B' | 'C' | 'D',
      occupiedIndexes: number[],
      categoryName: string
    ) => {
      const slots: RackSlot[] = [];
      for (let i = 1; i <= 12; i++) {
        const isOccupied = occupiedIndexes.includes(i);
        const code = `${sectionKey}${i}`;
        const prod = products[(i + sectionKey.charCodeAt(0)) % products.length] || products[0];

        slots.push({
          id: `slot-${sectionKey}-${i}`,
          code,
          isOccupied,
          sku: isOccupied ? prod?.sku : undefined,
          productName: isOccupied ? prod?.name : undefined,
          quantity: isOccupied ? (i * 18 + 24) : 0,
          maxCapacity: 150,
          category: categoryName,
        });
      }
      return slots;
    };

    return {
      A: {
        name: 'A-Electronics',
        count: '5/12',
        slots: makeSlots('A', [2, 5, 6, 7, 12], 'Electronics & Sensors'),
      },
      B: {
        name: 'B-Appliances',
        count: '7/12',
        slots: makeSlots('B', [1, 3, 6, 7, 8, 9, 12], 'Industrial Heavy Valves'),
      },
      C: {
        name: 'C- Home Decor',
        count: '8/12',
        slots: makeSlots('C', [2, 3, 5, 6, 7, 10, 11, 12], 'Pre-Cast Structural Modules'),
      },
      D: {
        name: 'D-Sports',
        count: '7/12',
        slots: makeSlots('D', [1, 4, 5, 6, 7, 10, 11], 'Composite Cable Spools'),
      },
    };
  }, [products]);

  // Generate simulated 10,000+ high-density dataset for virtualization demo
  const allVirtualItems = useMemo(() => {
    const list = [];
    const aisles = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const totalCount = 10000;

    for (let i = 0; i < totalCount; i++) {
      const baseProduct = products[i % products.length] || {
        sku: `SKU-${10000 + i}`,
        name: `NEOM Spec Component Grade #${i + 1}`,
        unitOfMeasure: 'EA',
        unitCost: 145.5,
        totalStock: 320,
        reorderPoint: 50,
      };

      const aisle = aisles[i % aisles.length];
      const rack = `${aisle}${(i % 24) + 1}`;
      const bin = `BIN-${(i % 12) + 1}`;
      const onHand = ((i * 37) % 840) + 12;
      const reserved = (i * 7) % 65;
      const available = onHand - reserved;
      const unitCost = baseProduct.unitCost;
      const totalVal = available * unitCost;

      let statusDot = 'bg-emerald-500';
      let statusLabel = 'Optimal';
      if (available <= 30) {
        statusDot = 'bg-rose-500';
        statusLabel = 'Critical';
      } else if (available <= 75) {
        statusDot = 'bg-amber-500';
        statusLabel = 'Low Buffer';
      }

      list.push({
        id: `virt-${i}`,
        sku: i < products.length ? products[i].sku : `${baseProduct.sku}-${i}`,
        name: i < products.length ? products[i].name : baseProduct.name,
        uom: baseProduct.unitOfMeasure,
        rack: `${rack}-${bin}`,
        warehouse: `WH-0${(i % 4) + 1}`,
        onHand,
        reserved,
        available,
        unitCost,
        totalVal,
        statusDot,
        statusLabel,
        rawProduct: products[i % products.length],
      });
    }

    return list;
  }, [products]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!tableSearch) return allVirtualItems;
    const q = tableSearch.toLowerCase();
    return allVirtualItems.filter(
      (r) =>
        r.sku.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.rack.toLowerCase().includes(q)
    );
  }, [allVirtualItems, tableSearch]);

  // Virtualization state (windowing)
  const [scrollTop, setScrollTop] = useState(0);
  const containerHeight = 360;
  const rowHeight = 36;
  const totalRows = filteredRows.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
  const endIndex = Math.min(totalRows, Math.floor((scrollTop + containerHeight) / rowHeight) + 10);
  const visibleRows = filteredRows.slice(startIndex, endIndex);

  const activeWh = warehouses[activeWarehouse] || warehouses[0];
  const activeLocation = activeWh?.raw || locations.find((l) => l.id === activeWh?.locId) || locations[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#152836] tracking-tight">
              Warehouses & Locations ({locations.length || warehouses.length})
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              {locations.filter((l) => l.active !== false).length} Active Hubs
            </span>
          </div>
          <p className="text-xs text-[#7a8b99] mt-0.5">
            NEOM Smart Logistics Network • Facility Management, Zones & High-Density Bay Topology
          </p>
        </div>

        {/* View Mode Switcher and Primary Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center bg-[#ede9df] p-1 rounded-xl border border-[#ded8cb]">
            <button
              onClick={() => setViewMode('directory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'directory'
                  ? 'bg-white text-[#152836] shadow-2xs'
                  : 'text-[#7a8b99] hover:text-[#152836]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-[#e5a329]" />
              <span>Facility Directory & Settings</span>
            </button>
            <button
              onClick={() => setViewMode('topology')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'topology'
                  ? 'bg-white text-[#152836] shadow-2xs'
                  : 'text-[#7a8b99] hover:text-[#152836]'
              }`}
            >
              <Warehouse className="w-3.5 h-3.5 text-[#e5a329]" />
              <span>Interactive Bay Topology</span>
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#122b39] hover:bg-[#1a3d52] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#e5a329]" />
            <span>Create Warehouse</span>
          </button>

          <button
            onClick={() => onOpenTransferDrawer()}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-[#faf9f6] border border-[#ded8cb] text-[#152836] rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5 text-[#7a8b99]" />
            <span>New Transfer</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE: DIRECTORY & FACILITY SETTINGS */}
      {viewMode === 'directory' && (
        <WarehouseDirectoryView
          locations={locations}
          products={products}
          onSelectWarehouseForTopology={(loc) => {
            const idx = warehouses.findIndex((w) => w.locId === loc.id || w.code === loc.code);
            if (idx !== -1) setActiveWarehouse(idx);
            setViewMode('topology');
          }}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenEditModal={(loc) => setEditLocationTarget(loc)}
          onOpenZonesModal={(loc) => setZonesLocationTarget(loc)}
          onRefresh={() => onRefreshLocations?.()}
        />
      )}

      {/* VIEW MODE: INTERACTIVE BAY TOPOLOGY */}
      {viewMode === 'topology' && (
        <div className="space-y-6">
          {/* Horizontal Warehouse Pills Selector matching reference image */}
          <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
            <div className="flex items-center gap-2.5">
              {warehouses.map((wh) => {
                const isActive = activeWarehouse === wh.id;
                return (
                  <button
                    key={wh.id}
                    onClick={() => setActiveWarehouse(wh.id)}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#132f3e] text-white shadow-sm'
                        : 'bg-[#ede9df]/80 hover:bg-[#e3ded2] text-[#3b4c58]'
                    }`}
                  >
                    {wh.name}
                  </button>
                );
              })}
            </div>

            {/* Carousel arrows + plus button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveWarehouse((prev) => (prev > 0 ? prev - 1 : warehouses.length - 1))}
                className="w-9 h-9 rounded-xl bg-[#ede9df]/80 hover:bg-[#e3ded2] text-[#3b4c58] flex items-center justify-center transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveWarehouse((prev) => (prev < warehouses.length - 1 ? prev + 1 : 0))}
                className="w-9 h-9 rounded-xl bg-[#ede9df]/80 hover:bg-[#e3ded2] text-[#3b4c58] flex items-center justify-center transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-9 h-9 rounded-xl bg-[#132f3e] hover:bg-[#1a3d52] text-white flex items-center justify-center transition cursor-pointer shadow-xs"
                title="Create New Warehouse"
              >
                <Plus className="w-4 h-4 text-[#e5a329]" />
              </button>
            </div>
          </div>

          {/* Active Facility Profile & Settings Strip */}
          <div className="bg-white border border-[#e5e1d5] rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#122b39] text-white flex items-center justify-center font-bold font-mono text-xs shadow-xs">
                {activeLocation?.code || activeWh.code}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#152836]">
                    {activeLocation?.name || activeWh.name}
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800">
                    {activeLocation?.type || 'WAREHOUSE'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                    ONLINE
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#7a8b99] mt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#e5a329]" />
                    <span>{activeLocation?.city || 'NEOM Region'} • {activeLocation?.address || 'Logistics Zone'}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-[#e5a329]" />
                    <span>{activeLocation?.temperatureZone || 'Ambient Controlled (20-24°C)'}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditLocationTarget(activeLocation || null)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f4ed] hover:bg-[#eae6dc] text-[#152836] rounded-xl text-xs font-bold border border-[#ded8cb] transition cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-[#7a8b99]" />
                <span>Facility Settings</span>
              </button>
              <button
                onClick={() => setZonesLocationTarget(activeLocation || null)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f4ed] hover:bg-[#eae6dc] text-[#152836] rounded-xl text-xs font-bold border border-[#ded8cb] transition cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-[#7a8b99]" />
                <span>Configure Zones ({activeLocation?.zones?.length || 4})</span>
              </button>
            </div>
          </div>

          {/* Controls Bar for 2D Grid */}
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[#7a8b99] uppercase tracking-wider">
              Visual 2D Rack Bays & High-Density Inventory
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-[#faf9f6] border border-[#e4dfd3] rounded-xl text-xs font-semibold text-[#152836] shadow-2xs transition cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-[#7a8b99]" />
                <span>Sort ({sortOrder})</span>
              </button>
              <button
                onClick={() => setTableSearch(tableSearch ? '' : 'VALVE')}
                className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-[#faf9f6] border border-[#e4dfd3] rounded-xl text-xs font-semibold text-[#152836] shadow-2xs transition cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#7a8b99]" />
                <span>{tableSearch ? 'Clear Filter' : 'Filter Valves'}</span>
              </button>
            </div>
          </div>

          {/* STRICT 12-COLUMN CSS GRID WITH 24PX GUTTERS */}
          <div className="grid grid-cols-12 gap-6">
        {/* LEFT COLUMN: Section Overview (20) and Virtualized Grid (8 COLUMNS) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Card: Section Overview (20) matching reference image layout */}
          <div className="bg-white border border-[#e5e1d5] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-5 border-b border-[#f0ece2]">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-[#152836]">Section Overview (20)</h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#f6f4ed] text-[#7a8b99] font-mono">
                  {warehouses[activeWarehouse].code}
                </span>
              </div>

              {/* Action buttons matching reference image */}
              <div className="flex items-center gap-2 text-xs font-semibold">
                <button
                  onClick={() => onOpenTransferDrawer(selectedSlot?.code || 'B6')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f6f4ed] hover:bg-[#eae6dc] text-[#152836] transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#e5a329]" />
                  <span>Add Request</span>
                </button>
                <button
                  onClick={() => onOpenTransferDrawer()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f6f4ed] hover:bg-[#eae6dc] text-[#152836] transition cursor-pointer"
                >
                  <Edit2 className="w-3 h-3 text-[#7a8b99]" />
                  <span>Edit Section</span>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f6f4ed] hover:bg-red-50 hover:text-red-600 text-[#7a8b99] transition cursor-pointer">
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Section</span>
                </button>
              </div>
            </div>

            {/* 4 BAY COLUMNS matching reference image */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
              {/* SECTION A: A-Electronics 5/12 */}
              <div
                onClick={() => setSelectedSection('A')}
                className={`p-3 rounded-2xl border transition cursor-pointer ${
                  selectedSection === 'A'
                    ? 'border-[#132f3e] ring-2 ring-[#132f3e]/10 bg-slate-50/40'
                    : 'border-[#f0ece2] hover:border-[#dfd9cc]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#152836] mb-4">
                  <span className="truncate">{sectionsData.A.name}</span>
                  <span className="text-[#7a8b99] font-mono text-[11px]">{sectionsData.A.count}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {sectionsData.A.slots.map((slot) => {
                    const isSelected = selectedSlot?.code === slot.code;
                    return (
                      <button
                        key={slot.code}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSlot(slot);
                        }}
                        className={`h-11 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer border ${
                          slot.isOccupied
                            ? 'bg-[#98d8aa] text-[#134e2a] border-[#84c898] hover:scale-102 shadow-2xs'
                            : 'pattern-hatched-stripes border-[#d8d3c5] text-[#95a4b0] border-dashed hover:border-solid'
                        } ${isSelected ? 'ring-2 ring-[#132f3e] ring-offset-1' : ''}`}
                        title={
                          slot.isOccupied
                            ? `${slot.code}: ${slot.productName} (${slot.quantity} EA)`
                            : `${slot.code}: Available / Empty Slot`
                        }
                      >
                        {slot.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION B: B-Appliances 7/12 (SELECTED IN REFERENCE IMAGE) */}
              <div
                onClick={() => setSelectedSection('B')}
                className={`p-3 rounded-2xl border transition cursor-pointer ${
                  selectedSection === 'B'
                    ? 'border-[#132f3e] ring-2 ring-[#132f3e]/20 bg-[#faf8f4]'
                    : 'border-[#f0ece2] hover:border-[#dfd9cc]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#152836] mb-4">
                  <span className="truncate">{sectionsData.B.name}</span>
                  <span className="text-[#7a8b99] font-mono text-[11px]">{sectionsData.B.count}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {sectionsData.B.slots.map((slot) => {
                    const isSelected = selectedSlot?.code === slot.code;
                    return (
                      <button
                        key={slot.code}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSlot(slot);
                        }}
                        className={`h-11 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer border ${
                          slot.isOccupied
                            ? 'bg-[#fed178] text-[#5c3e04] border-[#f4c259] hover:scale-102 shadow-2xs'
                            : 'pattern-hatched-stripes border-[#d8d3c5] text-[#95a4b0] border-dashed hover:border-solid'
                        } ${isSelected ? 'ring-2 ring-[#132f3e] ring-offset-1' : ''}`}
                        title={
                          slot.isOccupied
                            ? `${slot.code}: ${slot.productName} (${slot.quantity} EA)`
                            : `${slot.code}: Available / Empty Slot`
                        }
                      >
                        {slot.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION C: C- Home Decor 8/12 */}
              <div
                onClick={() => setSelectedSection('C')}
                className={`p-3 rounded-2xl border transition cursor-pointer ${
                  selectedSection === 'C'
                    ? 'border-[#132f3e] ring-2 ring-[#132f3e]/10 bg-slate-50/40'
                    : 'border-[#f0ece2] hover:border-[#dfd9cc]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#152836] mb-4">
                  <span className="truncate">{sectionsData.C.name}</span>
                  <span className="text-[#7a8b99] font-mono text-[11px]">{sectionsData.C.count}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {sectionsData.C.slots.map((slot) => {
                    const isSelected = selectedSlot?.code === slot.code;
                    return (
                      <button
                        key={slot.code}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSlot(slot);
                        }}
                        className={`h-11 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer border ${
                          slot.isOccupied
                            ? 'bg-[#d8b4e2] text-[#4a235a] border-[#ca9ed6] hover:scale-102 shadow-2xs'
                            : 'pattern-hatched-stripes border-[#d8d3c5] text-[#95a4b0] border-dashed hover:border-solid'
                        } ${isSelected ? 'ring-2 ring-[#132f3e] ring-offset-1' : ''}`}
                        title={
                          slot.isOccupied
                            ? `${slot.code}: ${slot.productName} (${slot.quantity} EA)`
                            : `${slot.code}: Available / Empty Slot`
                        }
                      >
                        {slot.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION D: D-Sports 7/12 */}
              <div
                onClick={() => setSelectedSection('D')}
                className={`p-3 rounded-2xl border transition cursor-pointer ${
                  selectedSection === 'D'
                    ? 'border-[#132f3e] ring-2 ring-[#132f3e]/10 bg-slate-50/40'
                    : 'border-[#f0ece2] hover:border-[#dfd9cc]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#152836] mb-4">
                  <span className="truncate">{sectionsData.D.name}</span>
                  <span className="text-[#7a8b99] font-mono text-[11px]">{sectionsData.D.count}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {sectionsData.D.slots.map((slot) => {
                    const isSelected = selectedSlot?.code === slot.code;
                    return (
                      <button
                        key={slot.code}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSlot(slot);
                        }}
                        className={`h-11 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer border ${
                          slot.isOccupied
                            ? 'bg-[#a0e7e5] text-[#004d40] border-[#89dcd9] hover:scale-102 shadow-2xs'
                            : 'pattern-hatched-stripes border-[#d8d3c5] text-[#95a4b0] border-dashed hover:border-solid'
                        } ${isSelected ? 'ring-2 ring-[#132f3e] ring-offset-1' : ''}`}
                        title={
                          slot.isOccupied
                            ? `${slot.code}: ${slot.productName} (${slot.quantity} EA)`
                            : `${slot.code}: Available / Empty Slot`
                        }
                      >
                        {slot.code}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selected Slot Inspector Bar */}
            {selectedSlot && (
              <div className="mt-4 p-3 bg-[#f7f5ef] border border-[#e4dfd3] rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-[#dfd9cc] text-[#152836]">
                    {selectedSlot.code}
                  </span>
                  <div>
                    {selectedSlot.isOccupied ? (
                      <div className="font-medium text-[#152836]">
                        <strong className="font-mono text-[#e5a329]">{selectedSlot.sku}</strong> •{' '}
                        {selectedSlot.productName} ({selectedSlot.quantity} Units Stored)
                      </div>
                    ) : (
                      <span className="text-[#7a8b99]">
                        Slot {selectedSlot.code} is unallocated. Max capacity: 150 EA.
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedSlot.isOccupied ? (
                    <button
                      onClick={() => onOpenTransferDrawer(selectedSlot.code)}
                      className="px-3 py-1 bg-[#132f3e] text-white rounded-lg font-bold text-[11px] hover:bg-[#1a3d52] transition cursor-pointer"
                    >
                      Shift Stock
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenTransferDrawer(selectedSlot.code)}
                      className="px-3 py-1 bg-[#e5a329] text-[#122b39] rounded-lg font-bold text-[11px] hover:bg-[#d89720] transition cursor-pointer"
                    >
                      Allocate to Slot
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* HIGH-DENSITY VIRTUALIZED DATA GRID (10,000+ ROWS) */}
          <div className="bg-white border border-[#e5e1d5] rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#f0ece2]">
              <div>
                <h3 className="text-sm font-bold text-[#152836] flex items-center gap-2">
                  <span>High-Density Inventory Ledger</span>
                  <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-[#f6f4ed] text-[#7a8b99] border border-[#e2ddd0]">
                    10,000+ Virtualized Rows
                  </span>
                </h3>
                <p className="text-[11px] text-[#7a8b99]">
                  Tabular monospaced figures • Right-aligned quantities • Click row to inspect in drawer
                </p>
              </div>

              {/* Table search filter */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#9aa9b5]" />
                  <input
                    type="text"
                    placeholder="Search 10k items by SKU, rack..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-[#f7f5ef] border border-[#e2ddd0] rounded-xl text-xs text-[#152836] placeholder-[#9aa9b5] outline-none focus:border-[#132f3e] w-48 sm:w-60"
                  />
                </div>
                <button
                  onClick={() => setTableSearch('')}
                  className="text-xs px-2 py-1.5 rounded-lg bg-[#f7f5ef] text-[#7a8b99] hover:text-[#152836]"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Virtualized Table Container */}
            <div
              className="mt-3 border border-[#f0ece2] rounded-xl overflow-auto scrollbar-thin"
              style={{ height: `${containerHeight}px` }}
              onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#f7f5ef] border-b border-[#e5e1d5] z-10 flex text-[11px] font-bold text-[#607282] uppercase tracking-wider py-2 px-3">
                <div className="w-12 text-center">Status</div>
                <div className="w-36">SKU Code</div>
                <div className="flex-1 min-w-[160px]">Product Description</div>
                <div className="w-24 text-center">Rack / Bin</div>
                <div className="w-24 text-right">On Hand</div>
                <div className="w-20 text-right">Reserved</div>
                <div className="w-24 text-right">Available</div>
                <div className="w-24 text-right">Cost ($)</div>
                <div className="w-28 text-right pr-2">Valuation ($)</div>
              </div>

              {/* Virtualized Rows Canvas */}
              <div
                style={{
                  height: `${totalRows * rowHeight}px`,
                  position: 'relative',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    transform: `translateY(${startIndex * rowHeight}px)`,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                  }}
                >
                  {visibleRows.map((row) => (
                    <div
                      key={row.id}
                      onClick={() => onOpenProductDrawer(row.rawProduct)}
                      className="h-9 flex items-center px-3 border-b border-[#f4f1ea] hover:bg-[#faf8f4] text-xs transition-colors cursor-pointer group"
                    >
                      {/* Status indicator: Simple colored dot matching requirement */}
                      <div className="w-12 flex items-center justify-center">
                        <span
                          className={`w-2 h-2 rounded-full ${row.statusDot}`}
                          title={row.statusLabel}
                        />
                      </div>

                      {/* SKU */}
                      <div className="w-36 font-mono font-bold text-[#152836] truncate group-hover:text-[#e5a329]">
                        {row.sku}
                      </div>

                      {/* Description */}
                      <div className="flex-1 min-w-[160px] truncate text-[#607282] font-medium pr-2">
                        {row.name}
                      </div>

                      {/* Rack */}
                      <div className="w-24 text-center font-mono text-[11px] text-[#7a8b99]">
                        {row.rack}
                      </div>

                      {/* Strictly Right-Aligned Numbers in Tabular Monospace font */}
                      <div className="w-24 text-right font-mono tabular-nums font-semibold text-[#152836]">
                        {row.onHand.toLocaleString()}
                      </div>

                      <div className="w-20 text-right font-mono tabular-nums text-[#7a8b99]">
                        {row.reserved.toLocaleString()}
                      </div>

                      <div className="w-24 text-right font-mono tabular-nums font-bold text-emerald-700">
                        {row.available.toLocaleString()}
                      </div>

                      <div className="w-24 text-right font-mono tabular-nums text-[#607282]">
                        {row.unitCost.toFixed(2)}
                      </div>

                      <div className="w-28 text-right pr-2 font-mono tabular-nums font-bold text-[#152836]">
                        {row.totalVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Virtual table footer stats */}
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#7a8b99] font-mono">
              <div>
                Showing visible slice {startIndex + 1}–{endIndex} of {totalRows.toLocaleString()} entries
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Optimal Buffer
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Low Stock
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Critical Shortage
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Section Usage Donut & Inventory Overview (4 COLUMNS) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Card: B-Section Usage with 56% donut gauge matching reference image */}
          <div className="bg-white border border-[#e5e1d5] rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-[#152836] mb-5">B-Section Usage</h3>

            <div className="flex items-center justify-between gap-4">
              {/* Donut Gauge matching reference image */}
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background track circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#f6f4ed"
                    strokeWidth="12"
                  />
                  {/* Active yellow-amber progress ring matching reference image */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#f6c244"
                    strokeWidth="12"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 * (1 - 0.56)}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Inner Text: 56% Location Used matching reference image */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-[#152836] tracking-tight">56%</span>
                  <span className="text-[10px] text-[#7a8b99] leading-tight font-medium">
                    Location Used
                  </span>
                </div>
              </div>

              {/* Stats Grid matching reference image: 240, 136, 84, 20 */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <div className="text-xl font-black text-[#152836] tracking-tight font-mono tabular-nums">
                    240
                  </div>
                  <div className="text-[11px] text-[#7a8b99] leading-tight">Total Shelves</div>
                </div>

                <div>
                  <div className="text-xl font-black text-[#152836] tracking-tight font-mono tabular-nums">
                    136
                  </div>
                  <div className="text-[11px] text-[#7a8b99] leading-tight">Empty Shelves</div>
                </div>

                <div>
                  <div className="text-xl font-black text-[#152836] tracking-tight font-mono tabular-nums">
                    84
                  </div>
                  <div className="text-[11px] text-[#7a8b99] leading-tight">Full Shelves</div>
                </div>

                <div>
                  <div className="text-xl font-black text-[#152836] tracking-tight font-mono tabular-nums">
                    20
                  </div>
                  <div className="text-[11px] text-[#7a8b99] leading-tight">Newly Added</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Inventory Overview matching reference image */}
          <div className="bg-white border border-[#e5e1d5] rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#152836]">Inventory Overview</h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Orders Received: 4,236 (26% ↗) */}
              <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#f0ece2]">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#e8e4da] flex items-center justify-center text-[#152836]">
                    <Package className="w-4 h-4 text-[#607282]" />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5 font-mono">
                    26% <TrendingUp className="w-3 h-3" />
                  </span>
                </div>
                <div className="text-xl font-black text-[#152836] font-mono tabular-nums tracking-tight">
                  4,236
                </div>
                <div className="text-[11px] text-[#7a8b99] mt-0.5">Orders Received</div>
              </div>

              {/* Card 2: Orders Shipped: 2,778 (20% ↘) */}
              <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#f0ece2]">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#e8e4da] flex items-center justify-center text-[#152836]">
                    <Truck className="w-4 h-4 text-[#607282]" />
                  </div>
                  <span className="text-xs font-bold text-rose-500 flex items-center gap-0.5 font-mono">
                    20% <TrendingDown className="w-3 h-3" />
                  </span>
                </div>
                <div className="text-xl font-black text-[#152836] font-mono tabular-nums tracking-tight">
                  2,778
                </div>
                <div className="text-[11px] text-[#7a8b99] mt-0.5">Orders Shipped</div>
              </div>

              {/* Card 3: Orders Returned: 147 (8% ↘) */}
              <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#f0ece2]">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#e8e4da] flex items-center justify-center text-[#152836]">
                    <RotateCcw className="w-4 h-4 text-[#607282]" />
                  </div>
                  <span className="text-xs font-bold text-rose-500 flex items-center gap-0.5 font-mono">
                    8% <TrendingDown className="w-3 h-3" />
                  </span>
                </div>
                <div className="text-xl font-black text-[#152836] font-mono tabular-nums tracking-tight">
                  147
                </div>
                <div className="text-[11px] text-[#7a8b99] mt-0.5">Orders Returned</div>
              </div>

              {/* Card 4: Orders Canceled: 537 (6% ↗) */}
              <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#f0ece2]">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#e8e4da] flex items-center justify-center text-[#152836]">
                    <XCircle className="w-4 h-4 text-[#607282]" />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5 font-mono">
                    6% <TrendingUp className="w-3 h-3" />
                  </span>
                </div>
                <div className="text-xl font-black text-[#152836] font-mono tabular-nums tracking-tight">
                  537
                </div>
                <div className="text-[11px] text-[#7a8b99] mt-0.5">Orders Canceled</div>
              </div>
            </div>

            {/* Quick Dispatch Box */}
            <div className="p-3.5 bg-[#f6f4ed] border border-[#e2ddd0] rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#152836]">Wave Dispatch Queue</div>
                <div className="text-[11px] text-[#7a8b99]">8 Directed TSP routes active</div>
              </div>
              <button
                onClick={() => onOpenTransferDrawer()}
                className="px-3 py-1.5 bg-[#132f3e] hover:bg-[#1a3d52] text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Launch Transfer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

      {/* Create Warehouse Modal */}
      <CreateWarehouseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newLoc) => {
          onRefreshLocations?.();
        }}
      />

      {/* Edit Warehouse Modal */}
      <EditWarehouseModal
        isOpen={Boolean(editLocationTarget)}
        location={editLocationTarget}
        onClose={() => setEditLocationTarget(null)}
        onSuccess={(updated) => {
          onRefreshLocations?.();
        }}
      />

      {/* Zone Configuration Modal */}
      <WarehouseZonesModal
        isOpen={Boolean(zonesLocationTarget)}
        location={zonesLocationTarget}
        onClose={() => setZonesLocationTarget(null)}
        onSuccess={(updated) => {
          onRefreshLocations?.();
        }}
      />
    </div>
  );
};
