import React, { useState, useEffect } from 'react';
import {
  Layers,
  ShieldCheck,
  Database,
  RefreshCw,
  Radio,
  UserCheck,
  LogOut,
  Copy,
  Sparkles,
  CheckCircle2,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { UserDTO, DatabaseInstanceDTO, api } from '../services/api';

interface HeaderProps {
  onRefreshAll: () => void;
  isRefreshing: boolean;
  systemHealth: string;
  currentUser?: UserDTO | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRefreshAll,
  isRefreshing,
  systemHealth,
  currentUser,
  onLogout,
}) => {
  const [dbInstances, setDbInstances] = useState<DatabaseInstanceDTO[]>([]);
  const [currentDbId, setCurrentDbId] = useState<string>('db-neom-live');
  const [showDbModal, setShowDbModal] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [neutralName, setNeutralName] = useState('');
  const [isDbSwitching, setIsDbSwitching] = useState(false);

  useEffect(() => {
    loadDbMeta();
  }, []);

  const loadDbMeta = async () => {
    try {
      const res = await api.getDatabaseInstances();
      setDbInstances(res.instances);
      setCurrentDbId(res.currentDatabaseId);
    } catch (e) {
      console.error('Failed to load DB instances', e);
    }
  };

  const handleSwitchDb = async (id: string) => {
    setIsDbSwitching(true);
    try {
      const res = await api.switchDatabase(id);
      setCurrentDbId(id);
      setDbInstances(res.instances);
      setShowDbModal(false);
      onRefreshAll();
    } catch (e) {
      console.error('Failed to switch DB', e);
    } finally {
      setIsDbSwitching(false);
    }
  };

  const handleCloneDb = async () => {
    if (!cloneName) return;
    setIsDbSwitching(true);
    try {
      const res = await api.cloneDatabase(cloneName, 'User-initiated sandbox copy');
      setDbInstances(res.instances);
      setCloneName('');
      onRefreshAll();
    } catch (e) {
      console.error('Failed to clone DB', e);
    } finally {
      setIsDbSwitching(false);
    }
  };

  const handleNeutralizeDb = async () => {
    setIsDbSwitching(true);
    try {
      const res = await api.neutralizeDatabase(neutralName || 'Zero Data Master');
      setDbInstances(res.instances);
      setNeutralName('');
      onRefreshAll();
    } catch (e) {
      console.error('Failed to neutralize DB', e);
    } finally {
      setIsDbSwitching(false);
    }
  };

  const currentInstance = dbInstances.find((i) => i.id === currentDbId) || dbInstances[0];

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 flex items-center justify-center font-black text-white text-base tracking-wider shadow-lg shadow-red-950/50 border border-red-500/30">
              RS
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white text-lg tracking-tight font-mono">RedSea IMS</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-red-950 text-red-300 rounded border border-red-800 tracking-wider">
                  NEOM Zone
                </span>
                <span className="hidden md:inline px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-800 text-slate-300 rounded border border-slate-700 tracking-wider">
                  Tier-1 ERP
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Oxagon Maritime Port • Bay Hub • Line Automated Spine • Trojena Depots
              </p>
            </div>
          </div>

          {/* Database Profile Switcher, User Badge, and Quick Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Database Instance Selector Button */}
            <button
              id="btn-header-db"
              onClick={() => setShowDbModal(true)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-200 transition-colors shadow-sm cursor-pointer"
              title="Switch or clone database instance"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline text-slate-400 text-[11px]">DB:</span>
              <span className="font-mono font-semibold text-white max-w-[120px] truncate">
                {currentInstance?.name || 'NEOM Live'}
              </span>
              <span className="text-[9px] px-1 py-0.2 rounded font-bold uppercase bg-cyan-950 text-cyan-300 border border-cyan-800">
                {currentInstance?.type || 'LIVE'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Sync All Button */}
            <button
              id="btn-header-refresh"
              onClick={onRefreshAll}
              disabled={isRefreshing}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-800 active:scale-95 transition cursor-pointer disabled:opacity-60"
              title="Sync network telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            {/* Current User Badge & Logout */}
            {currentUser && (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="hidden lg:block text-right">
                  <div className="text-xs font-bold text-white leading-none">
                    {currentUser.name.split('(')[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {currentUser.role}
                  </div>
                </div>

                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-red-950 text-red-400 border border-red-800'
                      : currentUser.role === 'MANAGER'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                  }`}
                  title={`${currentUser.name} (${currentUser.role})`}
                >
                  {currentUser.role === 'ADMIN' ? 'DIR' : currentUser.role === 'MANAGER' ? 'MGR' : 'STF'}
                </div>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950 hover:text-red-400 text-slate-400 border border-slate-800 transition-colors"
                    title="Sign Out / Switch Operator"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DATABASE INSTANCES MODAL */}
      {showDbModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center border border-cyan-800/50">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Database Profiles & Topology</h3>
                  <p className="text-xs text-slate-400">Switch target database, create sandbox duplicates, or neutralize inventory</p>
                </div>
              </div>
              <button
                onClick={() => setShowDbModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            {/* List Existing Instances */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Available Database Profiles
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {dbInstances.map((inst) => {
                  const isCurrent = inst.id === currentDbId;
                  return (
                    <div
                      key={inst.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                        isCurrent
                          ? 'bg-cyan-950/40 border-cyan-600/70 shadow-sm'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{inst.name}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              inst.type === 'LIVE'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : inst.type === 'SANDBOX'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {inst.type}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{inst.description}</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-1">
                          <span>{inst.productCount} SKUs</span>
                          <span>•</span>
                          <span>{inst.stockCount} Total Units</span>
                          <span>•</span>
                          <span>{inst.locationCount} Depots</span>
                        </div>
                      </div>

                      <div>
                        {!isCurrent && (
                          <button
                            type="button"
                            disabled={isDbSwitching}
                            onClick={() => handleSwitchDb(inst.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50"
                          >
                            Switch to This DB
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions: Clone Current DB vs Neutralize Clean Slate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              {/* Clone to Sandbox */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                  <Copy className="w-4 h-4" />
                  <span>Duplicate Current Database (Clone)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Creates an exact sandbox snapshot of all SKUs, locations, and inventory without affecting live data.
                </p>
                <input
                  type="text"
                  placeholder="Sandbox Profile Name (e.g. NEOM Test Run)"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={handleCloneDb}
                  disabled={!cloneName || isDbSwitching}
                  className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold disabled:opacity-40 transition-colors"
                >
                  Create Duplicated Sandbox
                </button>
              </div>

              {/* Neutralize Clean Slate */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Neutralized Database (Zero Data)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Creates a pristine database preserving master NEOM locations & UoM tables, but with 0 inventory.
                </p>
                <input
                  type="text"
                  placeholder="Clean Slate Profile Name"
                  value={neutralName}
                  onChange={(e) => setNeutralName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleNeutralizeDb}
                  disabled={isDbSwitching}
                  className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold disabled:opacity-40 transition-colors"
                >
                  Initialize Clean Slate (0 SKUs)
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDbModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
