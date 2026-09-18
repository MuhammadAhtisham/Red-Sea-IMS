import React, { useState } from 'react';
import {
  Search,
  Bell,
  Calendar,
  Sun,
  Moon,
  ChevronDown,
  Database,
  RefreshCw,
  LogOut,
  User,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { UserDTO, DatabaseInstanceDTO } from '../services/api';

interface TopHeaderProps {
  onOpenCommandPalette: () => void;
  onRefreshAll: () => void;
  isRefreshing: boolean;
  currentUser?: UserDTO | null;
  onLogout?: () => void;
  onOpenDbDrawer: () => void;
  currentDbName?: string;
  currentDbType?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenCommandPalette,
  onRefreshAll,
  isRefreshing,
  currentUser,
  onLogout,
  onOpenDbDrawer,
  currentDbName = 'NEOM Live',
  currentDbType = 'LIVE',
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-18 bg-[#f5f3ec] border-b border-[#e5e1d5] px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Search Input matching reference image */}
      <div className="flex-1 max-w-xl">
        <div
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between bg-white hover:bg-slate-50/80 border border-[#e4dfd3] hover:border-[#cfc9ba] rounded-2xl px-4 py-2.5 text-sm text-[#7a8b99] cursor-pointer shadow-xs transition"
          role="button"
          tabIndex={0}
          title="Open command palette (Cmd+K)"
        >
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-[#9aa9b5]" />
            <span className="text-[#607282] font-normal">
              Find inventory, orders or reports
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs bg-[#f4f1ea] text-[#6b7c8c] px-2 py-0.5 rounded-lg border border-[#e2ddd0]">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right Controls Area matching reference image */}
      <div className="flex items-center gap-3">
        {/* Database Profile Indicator Pill */}
        <button
          onClick={onOpenDbDrawer}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-[#e4dfd3] text-xs text-[#152936] font-medium shadow-xs transition cursor-pointer"
          title="Database Topology & Sandbox Controls"
        >
          <Database className="w-3.5 h-3.5 text-[#e5a329]" />
          <span className="font-mono font-bold text-[#152936]">{currentDbName}</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-[#f4f1ea] text-[#7a8b99] border border-[#e2ddd0]">
            {currentDbType}
          </span>
        </button>

        {/* Sync Telemetry */}
        <button
          onClick={onRefreshAll}
          disabled={isRefreshing}
          className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 border border-[#e4dfd3] flex items-center justify-center text-[#607282] hover:text-[#152936] transition cursor-pointer shadow-xs"
          title="Synchronize ERP State"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#e5a329]' : ''}`} />
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenCommandPalette}
          className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 border border-[#e4dfd3] flex items-center justify-center text-[#607282] hover:text-[#152936] transition cursor-pointer shadow-xs relative"
          title="Notifications & Alerts"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#e5a329] absolute top-2.5 right-2.5 ring-2 ring-white"></span>
        </button>

        {/* Calendar */}
        <button
          className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 border border-[#e4dfd3] flex items-center justify-center text-[#607282] hover:text-[#152936] transition cursor-pointer shadow-xs"
          title="Logistics Calendar"
        >
          <Calendar className="w-4 h-4" />
        </button>

        {/* Theme Toggle Pill (Sun active with warm yellow circle like reference) */}
        <div className="flex items-center bg-white border border-[#e4dfd3] rounded-2xl p-1 shadow-xs">
          <button
            onClick={() => setIsDarkMode(false)}
            className={`p-1.5 rounded-xl transition ${
              !isDarkMode ? 'bg-[#f8c646] text-[#122b39] shadow-xs' : 'text-[#7a8b99] hover:text-[#152936]'
            }`}
            title="Light Warm Beige Skin"
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsDarkMode(true)}
            className={`p-1.5 rounded-xl transition ${
              isDarkMode ? 'bg-[#122b39] text-[#f8c646] shadow-xs' : 'text-[#7a8b99] hover:text-[#152936]'
            }`}
            title="High-Contrast Terminal Dark"
          >
            <Moon className="w-4 h-4" />
          </button>
        </div>

        {/* User Profile Avatar Pill matching reference */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 bg-white hover:bg-slate-50 border border-[#e4dfd3] rounded-2xl transition shadow-xs cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#122b39] text-[#e5a329] font-bold text-xs flex items-center justify-center border-2 border-white shadow-xs">
              {currentUser?.name
                ? currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                : 'HK'}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-[#152936] leading-none">
                {currentUser?.name?.split('(')[0] || 'Henry Kaul'}
              </div>
              <div className="text-[10px] text-[#7a8b99] font-mono mt-0.5">
                {currentUser?.role || 'Operations Lead'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#7a8b99]" />
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e4dfd3] rounded-2xl shadow-xl py-2 z-50 text-xs font-medium text-[#152936]">
              <div className="px-4 py-2 border-b border-[#f0ece2]">
                <div className="font-bold text-sm text-[#152936]">{currentUser?.name || 'Henry Kaul'}</div>
                <div className="text-[#7a8b99]">{currentUser?.role || 'Warehouse Manager'}</div>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenDbDrawer();
                }}
                className="w-full text-left px-4 py-2 hover:bg-[#f7f5ef] flex items-center gap-2"
              >
                <Database className="w-3.5 h-3.5 text-[#e5a329]" />
                <span>Database Profiles & Sandbox</span>
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenCommandPalette();
                }}
                className="w-full text-left px-4 py-2 hover:bg-[#f7f5ef] flex items-center gap-2"
              >
                <Search className="w-3.5 h-3.5 text-[#607282]" />
                <span>Command Palette (Cmd+K)</span>
              </button>
              {onLogout && (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-[#f0ece2]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out / Switch Operator</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
