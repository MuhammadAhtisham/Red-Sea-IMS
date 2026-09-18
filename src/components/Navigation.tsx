import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  Barcode,
  BrainCircuit,
  ShoppingBag,
  Factory,
  FileCode2,
  Scan,
  EyeOff,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'warehouses'
  | 'products'
  | 'blind-receiving'
  | 'stock-ops'
  | 'wes-picking'
  | 'demand-planning'
  | 'omni-channel-pos'
  | 'manufacturing'
  | 'schema-viewer';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  draftPOCount: number;
  lowStockCount: number;
  quarantineCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  draftPOCount,
  lowStockCount,
  quarantineCount = 0,
}) => {
  const tabs = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Operations Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'products' as ActiveTab,
      label: 'Product Master & Packaging',
      icon: Boxes,
      badge: '4-Tier UoM',
      badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800',
    },
    {
      id: 'blind-receiving' as ActiveTab,
      label: 'Blind Inbound Receiving',
      icon: Scan,
      badge: quarantineCount > 0 ? `${quarantineCount} Quarantine` : 'Dock Scan',
      badgeColor:
        quarantineCount > 0
          ? 'bg-amber-950 text-amber-300 border-amber-800'
          : 'bg-red-950 text-red-300 border-red-800',
    },
    {
      id: 'stock-ops' as ActiveTab,
      label: 'Stock Operations',
      icon: ArrowLeftRight,
      badge: null,
    },
    {
      id: 'wes-picking' as ActiveTab,
      label: 'WES Wave Picking',
      icon: Barcode,
      badge: 'TSP Directed',
    },
    {
      id: 'demand-planning' as ActiveTab,
      label: 'AI Demand Planning',
      icon: BrainCircuit,
      badge: draftPOCount > 0 ? `${draftPOCount} Draft POs` : null,
      badgeColor: 'bg-purple-950 text-purple-300 border-purple-800',
    },
    {
      id: 'omni-channel-pos' as ActiveTab,
      label: 'Routing & POS',
      icon: ShoppingBag,
      badge: 'Split Engine',
    },
    {
      id: 'manufacturing' as ActiveTab,
      label: 'BOM & Manufacturing',
      icon: Factory,
      badge: null,
    },
    {
      id: 'schema-viewer' as ActiveTab,
      label: 'Prisma Schema',
      icon: FileCode2,
      badge: 'Postgres',
    },
  ];

  return (
    <nav className="bg-slate-900/90 border-b border-slate-800 sticky top-16 z-20 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${
                      tab.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
