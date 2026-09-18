import React from 'react';
import {
  LayoutDashboard,
  Warehouse,
  Package,
  Truck,
  Layers,
  CircleDollarSign,
  Users,
  Radio,
  FileSpreadsheet,
  Settings,
  Headphones,
  ChevronLeft,
  ChevronRight,
  Boxes,
  BrainCircuit,
  Database,
  Tag,
  ClipboardCheck,
} from 'lucide-react';
import { ActiveTab } from './Navigation';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  draftPOCount: number;
  lowStockCount: number;
  quarantineCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  draftPOCount,
  lowStockCount,
  quarantineCount,
}) => {
  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number | null;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'warehouses',
      label: 'Warehouses & Locations',
      icon: Warehouse,
      badge: 'Manage',
      badgeColor: 'bg-[#1b3d52] text-[#e5a329]',
    },
    {
      id: 'products',
      label: 'Product Master',
      icon: Boxes,
      badge: '4-Tier UoM',
    },
    {
      id: 'categories',
      label: 'Categories & UoM',
      icon: Tag,
      badge: 'Taxonomy',
      badgeColor: 'bg-[#1b3d52] text-[#e5a329]',
    },
    {
      id: 'blind-receiving',
      label: 'Inbound & Shipments',
      icon: Truck,
      badge: quarantineCount > 0 ? `${quarantineCount} Quarantine` : null,
      badgeColor: 'bg-red-950 text-red-300',
    },
    {
      id: 'stock-ops',
      label: 'Inventory Ops',
      icon: Layers,
    },
    {
      id: 'physical-count',
      label: 'Physical Adjustment',
      icon: ClipboardCheck,
      badge: 'Cycle Count',
      badgeColor: 'bg-emerald-950 text-emerald-300',
    },
    {
      id: 'wes-picking',
      label: 'WES Tracking',
      icon: Radio,
      badge: 'TSP Directed',
    },
    {
      id: 'demand-planning',
      label: 'AI Demand Planning',
      icon: BrainCircuit,
      badge: draftPOCount > 0 ? `${draftPOCount} Draft POs` : null,
      badgeColor: 'bg-purple-900 text-purple-200',
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: FileSpreadsheet,
      badge: 'Executive',
      badgeColor: 'bg-[#1b3e54] text-[#e5a329]',
    },
  ];

  return (
    <aside
      className={`bg-[#122b39] text-white flex flex-col transition-all duration-300 ease-in-out shrink-0 select-none z-30 ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
      style={{ minHeight: '100vh' }}
    >
      {/* Top Logo Section */}
      <div className="h-18 flex items-center px-4.5 border-b border-[#1b3d52]/60 justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Geometric Emblem (like reference) */}
          <div className="w-8 h-8 rounded-xl bg-[#e5a329] flex items-center justify-center shrink-0 shadow-md shadow-amber-950/20">
            <div className="w-4 h-4 border-2 border-[#122b39] rounded-sm flex items-center justify-center font-black text-[10px] text-[#122b39]">
              R
            </div>
          </div>
          {!isCollapsed && (
            <div className="leading-tight truncate">
              <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                <span>RedSea IMS</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1b3e54] text-[#e5a329] font-mono font-semibold">
                  NEOM
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate">
                Port & Stock Command
              </div>
            </div>
          )}
        </div>

        {/* Small toggle button */}
        <button
          onClick={onToggleCollapse}
          className="w-7 h-7 rounded-lg bg-[#193a4d] hover:bg-[#204961] text-slate-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
          title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group relative cursor-pointer ${
                isActive
                  ? 'bg-[#e5a329] text-[#122b39] font-bold shadow-md shadow-amber-950/20'
                  : 'text-slate-300 hover:text-white hover:bg-[#193a4e]/70'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive ? 'text-[#122b39]' : 'text-slate-400 group-hover:text-white'
                }`}
              />

              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between truncate text-left">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isActive
                          ? 'bg-[#122b39] text-[#e5a329]'
                          : item.badgeColor || 'bg-[#1a3d52] text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Tooltip when collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#0d1f29] text-white text-xs rounded-lg shadow-xl whitespace-nowrap hidden group-hover:block z-50 pointer-events-none border border-slate-700">
                  {item.label}
                  {item.badge && ` (${item.badge})`}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Auxiliary Links */}
      <div className="p-3 border-t border-[#1b3d52]/60 space-y-1">
        <button
          onClick={() => onTabChange('schema-viewer')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#193a4e]/70 transition"
          title="Settings & System Topology"
        >
          <Settings className="w-4.5 h-4.5 shrink-0 text-slate-400" />
          {!isCollapsed && <span>Settings & System</span>}
        </button>

        <div className="px-3 py-2 text-[10px] text-slate-500 font-mono">
          {!isCollapsed ? 'RedSea v5.2 • 2026 ISO' : 'v5.2'}
        </div>
      </div>
    </aside>
  );
};
