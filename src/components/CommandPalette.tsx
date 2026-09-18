import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ArrowRight,
  Boxes,
  ArrowLeftRight,
  FileText,
  Truck,
  Warehouse,
  Database,
  Barcode,
  Sparkles,
  Layers,
  X,
  CornerDownLeft,
} from 'lucide-react';
import { ProductDTO, LocationDTO, PurchaseOrderDTO } from '../services/api';
import { ActiveTab } from './Navigation';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductDTO[];
  locations: LocationDTO[];
  purchaseOrders: PurchaseOrderDTO[];
  onSelectProduct: (product: ProductDTO) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onTriggerTransfer: () => void;
  onOpenDraftPO: () => void;
  onOpenNewProductDrawer: () => void;
  onOpenDbDrawer: () => void;
  onSelectWarehouseIndex?: (idx: number) => void;
}

interface CommandItem {
  id: string;
  category: 'SKU' | 'ACTION' | 'WAREHOUSE' | 'NAVIGATION';
  title: string;
  subtitle?: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  products,
  locations,
  purchaseOrders,
  onSelectProduct,
  onNavigateTab,
  onTriggerTransfer,
  onOpenDraftPO,
  onOpenNewProductDrawer,
  onOpenDbDrawer,
  onSelectWarehouseIndex,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build command items list
  const commandItems: CommandItem[] = [];

  // Core Actions
  commandItems.push({
    id: 'act-transfer',
    category: 'ACTION',
    title: 'Trigger Warehouse Transfer (Cross-Bay / Inter-Facility)',
    subtitle: 'Shift stock between Aisle racks or facilities with auto-reserved ledger',
    badge: 'Shift+T',
    icon: ArrowLeftRight,
    action: () => {
      onTriggerTransfer();
      onClose();
    },
  });

  commandItems.push({
    id: 'act-po',
    category: 'ACTION',
    title: 'Open Draft Purchase Orders & Sourcing Queue',
    subtitle: `Review ${purchaseOrders.filter((p) => p.status === 'DRAFT').length} pending replenishment POs`,
    badge: 'PO',
    icon: FileText,
    action: () => {
      onOpenDraftPO();
      onClose();
    },
  });

  commandItems.push({
    id: 'act-new-sku',
    category: 'ACTION',
    title: 'Register New Product SKU & 4-Tier Packaging',
    subtitle: 'Define Each, Inner Pack, Case, and Pallet packaging hierarchy',
    badge: 'N',
    icon: Boxes,
    action: () => {
      onOpenNewProductDrawer();
      onClose();
    },
  });

  commandItems.push({
    id: 'act-blind-scan',
    category: 'ACTION',
    title: 'Launch Blind Inbound Receiving Dock Scanner',
    subtitle: 'Perform physical blind barcode counts against PO without showing expected quantities',
    badge: 'Scan',
    icon: Truck,
    action: () => {
      onNavigateTab('blind-receiving');
      onClose();
    },
  });

  commandItems.push({
    id: 'act-db-manage',
    category: 'ACTION',
    title: 'Manage Database Profiles (Clone to Sandbox / Neutralize)',
    subtitle: 'Switch target instance, duplicate live data, or reset to 0 inventory',
    badge: 'DB',
    icon: Database,
    action: () => {
      onOpenDbDrawer();
      onClose();
    },
  });

  // Warehouses
  const warehouseNames = [
    'Warehouse 1 (NEOM Bay Smart Hub)',
    'Warehouse 2 (Oxagon Maritime Port)',
    'Warehouse 3 (The Line Automated Spine)',
    'Warehouse 4 (Trojena Cold Logistics)',
  ];

  warehouseNames.forEach((wName, idx) => {
    commandItems.push({
      id: `wh-${idx}`,
      category: 'WAREHOUSE',
      title: `Jump to ${wName}`,
      subtitle: 'View Section Overview, rack capacity, and high-density bay matrix',
      badge: `WH-${idx + 1}`,
      icon: Warehouse,
      action: () => {
        onNavigateTab('warehouses');
        if (onSelectWarehouseIndex) onSelectWarehouseIndex(idx);
        onClose();
      },
    });
  });

  // Products / SKUs
  products.forEach((p) => {
    commandItems.push({
      id: `sku-${p.id}`,
      category: 'SKU',
      title: `${p.sku} • ${p.name}`,
      subtitle: `${p.totalStock} ${p.unitOfMeasure} available • Barcode: ${p.barcode} • Cost: $${p.unitCost}`,
      badge: `${p.totalStock} ${p.unitOfMeasure}`,
      icon: Boxes,
      action: () => {
        onSelectProduct(p);
        onClose();
      },
    });
  });

  // Filter commands by user query
  const filtered = commandItems.filter((item) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle?.toLowerCase().includes(q) ||
      item.badge?.toLowerCase().includes(q)
    );
  });

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#e2ded2] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-[#152936]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#ece8de] gap-3 bg-[#faf9f6]">
          <Search className="w-5 h-5 text-[#8c9ca8]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a SKU, command, warehouse or action... (e.g. SENS, transfer, WH-2)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent border-none outline-none text-sm text-[#152936] placeholder-[#8c9ca8] font-medium"
          />
          <kbd className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-[#7a8b99] bg-white border border-[#e2ddd0] px-2 py-0.5 rounded-lg shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[460px] scrollbar-thin"
        >
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[#7a8b99] text-xs">
              No matching SKUs, actions, or warehouses found for "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-[#122b39] text-white shadow-xs'
                      : 'hover:bg-[#f6f4ed] text-[#152936]'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#1a3a4c] text-[#e5a329]'
                          : item.category === 'SKU'
                          ? 'bg-[#edf2f7] text-[#3182ce]'
                          : item.category === 'ACTION'
                          ? 'bg-[#fef3c7] text-[#d97706]'
                          : 'bg-[#e6fffa] text-[#319795]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="truncate text-left">
                      <div className="text-xs font-bold leading-tight truncate">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? 'text-slate-300' : 'text-[#7a8b99]'
                          }`}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                          isSelected
                            ? 'bg-[#1b3d52] text-[#e5a329]'
                            : 'bg-[#f3efe6] text-[#607282] border border-[#e4dfd3]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-slate-300" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2 bg-[#f6f4ed] border-t border-[#ece8de] flex items-center justify-between text-[11px] text-[#7a8b99]">
          <div className="flex items-center gap-3">
            <span>
              Use <strong className="font-mono text-[#152936]">↑</strong>{' '}
              <strong className="font-mono text-[#152936]">↓</strong> to navigate
            </span>
            <span>•</span>
            <span>
              Press <strong className="font-mono text-[#152936]">↵</strong> to select
            </span>
          </div>
          <span>RedSea High-Speed Dispatcher</span>
        </div>
      </div>
    </div>
  );
};
