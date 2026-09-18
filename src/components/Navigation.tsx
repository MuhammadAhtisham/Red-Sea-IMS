import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  Barcode,
  BrainCircuit,
  FileSpreadsheet,
  Scan,
  Tag,
  ClipboardCheck,
  Warehouse,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'warehouses'
  | 'products'
  | 'categories'
  | 'blind-receiving'
  | 'stock-ops'
  | 'physical-count'
  | 'wes-picking'
  | 'demand-planning'
  | 'reports'
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
      id: 'warehouses' as ActiveTab,
      label: 'Warehouses & Locations',
      icon: Warehouse,
      badge: 'Facilities & Settings',
      badgeColor: 'bg-[#1b3d52] text-[#e5a329]',
    },
    {
      id: 'products' as ActiveTab,
      label: 'Product Master & Packaging',
      icon: Boxes,
      badge: '4-Tier UoM',
      badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800',
    },
    {
      id: 'categories' as ActiveTab,
      label: 'Categories & UoM',
      icon: Tag,
      badge: 'Taxonomy',
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
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
      badge: 'Import/Export',
    },
    {
      id: 'physical-count' as ActiveTab,
      label: 'Physical Adjustment Engine',
      icon: ClipboardCheck,
      badge: 'Audit',
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
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
      id: 'reports' as ActiveTab,
      label: 'Warehouse Reports & Analytics',
      icon: FileSpreadsheet,
      badge: 'Executive',
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
