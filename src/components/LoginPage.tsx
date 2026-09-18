// Enterprise Professional Login & Multi-Tenant Database Profile Switcher
import React, { useState, useEffect } from 'react';
import {
  Shield,
  Database,
  Key,
  Layers,
  CheckCircle2,
  Copy,
  PlusCircle,
  Building2,
  ArrowRight,
  UserCheck,
  AlertCircle,
  Sparkles,
  Lock,
  RefreshCw,
  Server,
  Radio,
  Check,
} from 'lucide-react';
import { api, UserDTO, DatabaseInstanceDTO } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (user: UserDTO) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [dbInstances, setDbInstances] = useState<DatabaseInstanceDTO[]>([]);
  const [currentDbId, setCurrentDbId] = useState<string>('db-neom-live');
  const [selectedUser, setSelectedUser] = useState<UserDTO | null>(null);
  const [emailInput, setEmailInput] = useState('tariq.alharbi@neom.sa');
  const [passwordInput, setPasswordInput] = useState('••••••••••••');
  const [badgeCodeInput, setBadgeCodeInput] = useState('NEOM-DIR-001');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showDbModal, setShowDbModal] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [neutralName, setNeutralName] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [uData, dbData] = await Promise.all([
        api.getUsers(),
        api.getDatabaseInstances(),
      ]);
      setUsers(uData);
      setDbInstances(dbData.instances);
      setCurrentDbId(dbData.currentDatabaseId);
      if (uData.length > 0 && !selectedUser) {
        setSelectedUser(uData[0]);
        setEmailInput(uData[0].email);
        setBadgeCodeInput(uData[0].badgeCode || 'NEOM-DIR-001');
      }
    } catch (err) {
      console.error('Failed to load login meta', err);
    }
  };

  const handleSelectUser = (user: UserDTO) => {
    setSelectedUser(user);
    setEmailInput(user.email);
    setBadgeCodeInput(user.badgeCode || '');
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await api.login({
        email: emailInput,
        badgeCode: badgeCodeInput,
      });
      if (res.success) {
        setStatusMessage('Authentication successful. Initializing RedSea IMS session...');
        setTimeout(() => {
          onLoginSuccess(res.user);
        }, 350);
      }
    } catch (err: any) {
      setStatusMessage(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchDatabase = async (instanceId: string) => {
    try {
      setLoading(true);
      const res = await api.switchDatabase(instanceId);
      setCurrentDbId(instanceId);
      setDbInstances(res.instances);
      setStatusMessage(res.message);
    } catch (err: any) {
      setStatusMessage(err.response?.data?.error || 'Failed to switch database.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneDatabase = async () => {
    if (!cloneName) return;
    try {
      setLoading(true);
      const res = await api.cloneDatabase(
        cloneName,
        'Duplicated snapshot for sandbox staging and stress testing'
      );
      setDbInstances(res.instances);
      setCurrentDbId(res.newInstance.id);
      setCloneName('');
      setStatusMessage(`Database cloned: ${res.newInstance.name}`);
      setShowDbModal(false);
    } catch (err: any) {
      setStatusMessage(err.response?.data?.error || 'Failed to clone database.');
    } finally {
      setLoading(false);
    }
  };

  const handleNeutralizeDatabase = async () => {
    try {
      setLoading(true);
      const res = await api.neutralizeDatabase(neutralName || 'Neutralized Clean Slate');
      setDbInstances(res.instances);
      setCurrentDbId(res.newInstance.id);
      setNeutralName('');
      setStatusMessage(`Clean slate initialized: ${res.newInstance.name}`);
      setShowDbModal(false);
    } catch (err: any) {
      setStatusMessage(err.response?.data?.error || 'Failed to neutralize database.');
    } finally {
      setLoading(false);
    }
  };

  const currentInstance = dbInstances.find((i) => i.id === currentDbId) || dbInstances[0];

  return (
    <div className="min-h-screen bg-[#f5f3ec] text-[#152836] flex flex-col justify-between selection:bg-[#122b39] selection:text-white relative">
      {/* Background Architectural Subtle Accents */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-[#ede9df]/60 to-transparent pointer-events-none" />

      {/* Top Bar with RedSea IMS & NEOM Authority Seal */}
      <header className="px-6 py-4 border-b border-[#e5e1d5] bg-white/80 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {/* Geometric Emblem (like reference) */}
          <div className="w-10 h-10 rounded-xl bg-[#e5a329] flex items-center justify-center shrink-0 shadow-md shadow-amber-900/10">
            <div className="w-5 h-5 border-2 border-[#122b39] rounded-sm flex items-center justify-center font-black text-xs text-[#122b39]">
              R
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold tracking-tight text-[#122b39] text-base">RedSea IMS</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#ede9df] text-[#8c5e15] border border-[#d8d1c1]">
                NEOM AUTHORITY
              </span>
            </div>
            <p className="text-xs text-[#6a7d8d]">Oxagon Port Maritime & Line Automated Hub Logistics</p>
          </div>
        </div>

        {/* Database Instance Quick Switcher in Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDbModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-[#f6f4ed] hover:bg-[#ebe6dc] text-[#152836] border border-[#e5e1d5] transition-colors shadow-xs cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-[#e5a329]" />
            <span className="text-[#6a7d8d]">Target DB:</span>
            <span className="font-mono font-bold text-[#122b39]">{currentInstance?.name || 'Live NEOM Operations'}</span>
            <span className="px-1.5 py-0.5 text-[9px] rounded font-bold uppercase tracking-wider bg-[#122b39] text-white">
              {currentInstance?.type || 'LIVE'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 z-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Context & Quick Role Switcher */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#ede9df] text-[#122b39] border border-[#dcd7cb]">
                <Building2 className="w-3.5 h-3.5 text-[#e5a329]" />
                Special Economic Zone Logistical Operations
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-[#122b39] tracking-tight leading-tight">
                Enterprise Inventory & Inbound Command
              </h2>
              <p className="text-sm text-[#526677] leading-relaxed">
                Secure access gateway for managing stock distribution across Oxagon Maritime Terminal, NEOM Bay DC, The Line Automated Spine, and Trojena Regional Depots.
              </p>
            </div>

            {/* Quick-Access Authorized Personnel Cards */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#6a7d8d]">
                <span>Select Operational Profile</span>
                <span className="text-[11px] font-bold text-[#8c5e15] bg-[#f8f5ee] px-2 py-0.5 rounded border border-[#e5e1d5]">
                  One-Click Badge Auth
                </span>
              </div>

              <div className="space-y-2">
                {users.map((user) => {
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group ${
                        isSelected
                          ? 'bg-white border-[#122b39] shadow-md shadow-slate-900/5 ring-1 ring-[#122b39]'
                          : 'bg-white/80 border-[#e5e1d5] hover:bg-white hover:border-[#cfc9b9]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            user.role === 'ADMIN'
                              ? 'bg-[#122b39] text-[#e5a329]'
                              : user.role === 'MANAGER'
                              ? 'bg-[#ede9df] text-[#122b39] font-semibold'
                              : 'bg-[#f6f4ed] text-[#526677]'
                          }`}
                        >
                          {user.role === 'ADMIN' ? 'DIR' : user.role === 'MANAGER' ? 'MGR' : 'STAFF'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#122b39] group-hover:text-[#e5a329] transition-colors">
                            {user.name.split('(')[0]}
                          </div>
                          <div className="text-xs text-[#6a7d8d]">{user.jobTitle || user.role}</div>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        <span className="text-[11px] font-mono text-[#526677] bg-[#f6f4ed] px-2 py-1 rounded-md border border-[#e5e1d5]">
                          {user.badgeCode || 'NEOM-RFID'}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#122b39] text-[#e5a329] flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compliance Badges */}
            <div className="pt-3 border-t border-[#e5e1d5] flex items-center gap-5 text-xs text-[#6a7d8d]">
              <div className="flex items-center gap-1.5 font-medium">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>NCA-ECC Cybersecurity</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Lock className="w-4 h-4 text-[#122b39]" />
                <span>Zero-Trust 256-Bit</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login Panel */}
          <div className="lg:col-span-7 bg-white border border-[#e5e1d5] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-[#f0ece2] mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#122b39] tracking-tight">Operator Authentication</h3>
                  <p className="text-xs text-[#6a7d8d] mt-0.5">Verify badge or corporate Single Sign-On credentials</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#f6f4ed] text-[#122b39] flex items-center justify-center border border-[#e5e1d5]">
                  <Key className="w-5 h-5 text-[#e5a329]" />
                </div>
              </div>

              {statusMessage && (
                <div className="mb-6 p-3.5 rounded-xl bg-[#f8f5ee] border border-[#e5e1d5] text-xs text-[#122b39] flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#e5a329] shrink-0" />
                  <span className="font-medium">{statusMessage}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                    Corporate Identity / Email
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-[#122b39] text-sm focus:outline-none focus:border-[#122b39] focus:bg-white font-mono transition-colors"
                    placeholder="user@neom.sa"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#526677] mb-1.5">
                    Security Passkey / Password
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-[#122b39] text-sm focus:outline-none focus:border-[#122b39] focus:bg-white font-mono transition-colors"
                    placeholder="••••••••••••"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#526677]">
                      Terminal Badge RFID Code
                    </label>
                    <span className="text-[11px] text-[#8c5e15] font-semibold flex items-center gap-1">
                      <Radio className="w-3 h-3 text-[#e5a329] animate-pulse" /> RFID Reader Active
                    </span>
                  </div>
                  <input
                    type="text"
                    value={badgeCodeInput}
                    onChange={(e) => setBadgeCodeInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#faf9f6] border border-[#e5e1d5] text-[#122b39] text-sm focus:outline-none focus:border-[#122b39] focus:bg-white font-mono font-semibold transition-colors"
                    placeholder="NEOM-DIR-001 or scan badge"
                  />
                </div>

                {/* Target Database Selection Info inside Form */}
                <div className="p-3.5 rounded-2xl bg-[#f6f4ed] border border-[#e5e1d5] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#e5e1d5] flex items-center justify-center">
                      <Database className="w-4 h-4 text-[#e5a329]" />
                    </div>
                    <div>
                      <div className="text-xs text-[#6a7d8d] font-medium">Connected Database Instance:</div>
                      <div className="text-xs font-mono font-bold text-[#122b39]">{currentInstance?.name}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDbModal(true)}
                    className="text-xs text-[#122b39] hover:text-[#e5a329] font-bold underline cursor-pointer"
                  >
                    Change / Clone
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-5 rounded-2xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-sm tracking-wide shadow-md shadow-[#122b39]/10 flex items-center justify-center gap-2 transition-all cursor-pointer transform active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#e5a329]" />
                        <span>Authorizing Session...</span>
                      </>
                    ) : (
                      <>
                        <span>Enter RedSea IMS</span>
                        <ArrowRight className="w-4 h-4 text-[#e5a329]" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Database Clone / Neutralize Actions at Bottom of Card */}
            <div className="mt-6 pt-4 border-t border-[#f0ece2] flex items-center justify-between text-xs text-[#6a7d8d]">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ACID Transaction Storage Online
              </span>
              <button
                onClick={() => setShowDbModal(true)}
                className="text-[#122b39] hover:text-[#e5a329] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-[#e5a329]" />
                Database Profiles ({dbInstances.length})
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-[#e5e1d5] bg-white/60 text-center text-xs text-[#7a8b99] z-10">
        RedSea IMS • High-Performance Tier-1 ERP & Inbound Logistics Engine • NEOM Infrastructure v4.9
      </footer>

      {/* MODAL: DATABASE PROFILES & MULTI-TENANT MANAGEMENT */}
      {showDbModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e1d5] rounded-3xl w-full max-w-2xl p-6 sm:p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#f0ece2]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f6f4ed] text-[#122b39] flex items-center justify-center border border-[#e5e1d5]">
                  <Database className="w-4.5 h-4.5 text-[#e5a329]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#122b39]">Database Topology & Sandbox Manager</h3>
                  <p className="text-xs text-[#6a7d8d]">Switch instances, clone live dataset, or neutralize to clean slate</p>
                </div>
              </div>
              <button
                onClick={() => setShowDbModal(false)}
                className="text-[#6a7d8d] hover:text-[#122b39] text-sm font-bold w-8 h-8 rounded-xl bg-[#f6f4ed] hover:bg-[#ede9df] flex items-center justify-center cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* List Existing Instances */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#6a7d8d]">
                Available Database Profiles
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {dbInstances.map((inst) => {
                  const isCurrent = inst.id === currentDbId;
                  return (
                    <div
                      key={inst.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between transition-colors ${
                        isCurrent
                          ? 'bg-[#f8f5ee] border-[#122b39] shadow-xs'
                          : 'bg-[#faf9f6] border-[#e5e1d5] hover:border-[#cfc9b9]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#122b39]">{inst.name}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              inst.type === 'LIVE'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : inst.type === 'SANDBOX'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-[#ede9df] text-[#122b39] border border-[#dcd7cb]'
                            }`}
                          >
                            {inst.type}
                          </span>
                          {isCurrent && (
                            <span className="text-[11px] text-[#8c5e15] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#e5a329]" /> ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6a7d8d] mt-0.5">{inst.description}</p>
                        <div className="flex items-center gap-3 text-[11px] text-[#7a8b99] font-mono mt-1">
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
                            onClick={() => handleSwitchDatabase(inst.id)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#122b39] hover:bg-[#1a3d52] text-white transition-colors cursor-pointer"
                          >
                            Switch to DB
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions: Clone Current DB vs Neutralize Clean Slate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#f0ece2]">
              {/* Clone to Sandbox */}
              <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#e5e1d5] space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-800">
                  <Copy className="w-4 h-4 text-purple-600" />
                  <span>Duplicate Current DB (Clone)</span>
                </div>
                <p className="text-xs text-[#6a7d8d]">
                  Creates an exact sandbox snapshot of all SKUs, locations, and inventory without affecting live data.
                </p>
                <input
                  type="text"
                  placeholder="Sandbox Profile Name (e.g. NEOM Test Run)"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e5e1d5] text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
                />
                <button
                  type="button"
                  onClick={handleCloneDatabase}
                  disabled={!cloneName || loading}
                  className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Create Duplicated Sandbox
                </button>
              </div>

              {/* Neutralize Clean Slate */}
              <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#e5e1d5] space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#8c5e15]">
                  <Sparkles className="w-4 h-4 text-[#e5a329]" />
                  <span>Neutralized DB (Zero Data)</span>
                </div>
                <p className="text-xs text-[#6a7d8d]">
                  Preserves master NEOM locations & UoM tables, but with 0 inventory.
                </p>
                <input
                  type="text"
                  placeholder="Clean Slate Profile Name"
                  value={neutralName}
                  onChange={(e) => setNeutralName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e5e1d5] text-xs text-[#122b39] focus:outline-none focus:border-[#122b39]"
                />
                <button
                  type="button"
                  onClick={handleNeutralizeDatabase}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Initialize Clean Slate (0 SKUs)
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDbModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#f6f4ed] hover:bg-[#ede9df] text-[#122b39] text-xs font-bold cursor-pointer transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
