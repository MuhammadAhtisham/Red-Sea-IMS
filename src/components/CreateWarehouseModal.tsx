import React, { useState } from 'react';
import {
  X,
  Warehouse,
  MapPin,
  Building2,
  Thermometer,
  ShieldCheck,
  Phone,
  User,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Navigation,
} from 'lucide-react';
import { api, LocationDTO } from '../services/api';

interface CreateWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLoc: LocationDTO) => void;
}

const REGION_PRESETS = [
  { name: 'NEOM Bay', city: 'NEOM Bay', lat: 28.006, lng: 35.214, prefix: 'WH-BAY' },
  { name: 'Oxagon Port', city: 'Oxagon', lat: 27.812, lng: 35.301, prefix: 'WH-OXA' },
  { name: 'The Line Spine', city: 'The Line', lat: 28.189, lng: 35.431, prefix: 'WH-LIN' },
  { name: 'Trojena Alpine', city: 'Trojena', lat: 28.528, lng: 35.394, prefix: 'WH-TRJ' },
  { name: 'Sindalah Marina', city: 'Sindalah', lat: 27.915, lng: 34.872, prefix: 'WH-SIN' },
];

export const CreateWarehouseModal: React.FC<CreateWarehouseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'WAREHOUSE' | 'STOREFRONT' | 'QUARANTINE' | 'TRANSIT_HUB'>('WAREHOUSE');
  const [city, setCity] = useState('NEOM Bay');
  const [state, setState] = useState('Tabuk Province');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('49643');
  const [latitude, setLatitude] = useState('28.0060');
  const [longitude, setLongitude] = useState('35.2140');
  const [nominalCapacity, setNominalCapacity] = useState('15000');
  const [temperatureZone, setTemperatureZone] = useState('Ambient Climate Controlled (20-24°C)');
  const [managerName, setManagerName] = useState('Logistics Operations Lead');
  const [contactPhone, setContactPhone] = useState('+966 14 555 0192');

  const [zones, setZones] = useState<string[]>([
    'Zone A - Inbound Receiving & Staging',
    'Zone B - Automated High-Bay Racks',
    'Zone C - Pick-to-Light Sorting',
    'Zone D - Outbound Freight Docks',
  ]);
  const [newZoneInput, setNewZoneInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof REGION_PRESETS[0]) => {
    setCity(preset.city);
    setLatitude(preset.lat.toFixed(4));
    setLongitude(preset.lng.toFixed(4));
    if (!code) {
      setCode(`${preset.prefix}-${Math.floor(10 + Math.random() * 90)}`);
    }
    if (!name) {
      setName(`${preset.name} Logistics Center`);
    }
  };

  const handleAddZone = () => {
    const trimmed = newZoneInput.trim();
    if (trimmed && !zones.includes(trimmed)) {
      setZones([...zones, trimmed]);
      setNewZoneInput('');
    }
  };

  const handleRemoveZone = (idx: number) => {
    setZones(zones.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Facility Name is required.');
      return;
    }
    if (!code.trim()) {
      setErrorMsg('Facility Code is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Partial<LocationDTO> = {
        name: name.trim(),
        code: code.toUpperCase().trim(),
        type,
        address: address.trim() || `${city} Logistics Sector 04`,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        latitude: parseFloat(latitude) || 28.0,
        longitude: parseFloat(longitude) || 35.2,
        nominalCapacity: parseInt(nominalCapacity, 10) || 12000,
        zones,
        temperatureZone,
        managerName: managerName.trim(),
        contactPhone: contactPhone.trim(),
        active: true,
      };

      const res = await api.createLocation(payload);
      if (res && res.location) {
        onSuccess(res.location);
        onClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to create warehouse location.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#fcfbf9] border border-[#e2ddd0] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-[#122b39] text-white flex items-center justify-between border-b border-[#1b3d52]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#e5a329]/20 border border-[#e5a329]/40 flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-[#e5a329]" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Create New Warehouse / Location</h2>
              <p className="text-xs text-slate-300">
                Register a storage facility, transit hub, or storefront in the NEOM logistics network
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Region Presets */}
          <div>
            <label className="block text-xs font-bold text-[#152836] mb-2 uppercase tracking-wider">
              Quick Region Presets (GPS & City)
            </label>
            <div className="flex flex-wrap gap-2">
              {REGION_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-3 py-1.5 rounded-lg border border-[#ded8cb] bg-white hover:bg-[#ede9df] text-xs font-semibold text-[#152836] flex items-center gap-1.5 transition cursor-pointer"
                >
                  <MapPin className="w-3 h-3 text-[#e5a329]" />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Basic Facility Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#152836] mb-1">
                Facility Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. NEOM Trojena High-Altitude Depot"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#152836] mb-1">
                Facility Code (Unique Identifier) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. WH-TRJ-05"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white font-mono text-xs text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
              />
            </div>
          </div>

          {/* Facility Type & Nominal Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#152836] mb-1">
                Facility Classification
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs font-semibold text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
              >
                <option value="WAREHOUSE">Automated Distribution Center (WAREHOUSE)</option>
                <option value="TRANSIT_HUB">Intermodal Port / Air Cross-Dock (TRANSIT_HUB)</option>
                <option value="STOREFRONT">Urban Retail Storefront & Micro-Fulfilment (STOREFRONT)</option>
                <option value="QUARANTINE">Bio-Security & QA Quarantine Bay (QUARANTINE)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#152836] mb-1">
                Nominal Storage Capacity (Physical Units)
              </label>
              <input
                type="number"
                min="100"
                max="500000"
                step="500"
                value={nominalCapacity}
                onChange={(e) => setNominalCapacity(e.target.value)}
                placeholder="15000"
                className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs text-[#152836] font-mono focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
              />
            </div>
          </div>

          {/* Geographic Location & Address */}
          <div className="border-t border-[#e2ddd0] pt-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a8b99] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#e5a329]" />
              <span>Location & Geographic Coordinates</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#152836] mb-1">City / Region</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="NEOM Bay"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#152836] mb-1">State / Province</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Tabuk Province"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#152836] mb-1">Postal Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="49643"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs font-mono text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-[#152836] mb-1">Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Logistic Spine Ave, Gate 4"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#152836] mb-1">Latitude</label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="28.0060"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs font-mono text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#152836] mb-1">Longitude</label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="35.2140"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs font-mono text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                />
              </div>
            </div>
          </div>

          {/* Climate & Operations Contact */}
          <div className="border-t border-[#e2ddd0] pt-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a8b99] flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-[#e5a329]" />
              <span>Atmospheric Specs & Personnel</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#152836] mb-1">Temperature Zone</label>
                <select
                  value={temperatureZone}
                  onChange={(e) => setTemperatureZone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs font-semibold text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                >
                  <option value="Ambient Climate Controlled (20-24°C)">Ambient Climate Controlled (20-24°C)</option>
                  <option value="Cold Storage Logistics (-20°C to 4°C)">Cold Storage Logistics (-20°C to 4°C)</option>
                  <option value="Ultra-Cold Vaccine/Pharma (-80°C to -20°C)">Ultra-Cold Vaccine/Pharma (-80°C to -20°C)</option>
                  <option value="Hazardous / Chemical Material Isolation">Hazardous / Chemical Material Isolation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#152836] mb-1">Facility Manager</label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Operations Lead"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#152836] mb-1">Emergency Contact Phone</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+966 14 555 0192"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs font-mono text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                />
              </div>
            </div>
          </div>

          {/* Internal Zones & Layout */}
          <div className="border-t border-[#e2ddd0] pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a8b99] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#e5a329]" />
                <span>Configured Storage Zones ({zones.length})</span>
              </h3>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newZoneInput}
                onChange={(e) => setNewZoneInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddZone();
                  }
                }}
                placeholder="Add zone name (e.g. Zone E - Mezzanine Fast-Pick)"
                className="flex-1 px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
              />
              <button
                type="button"
                onClick={handleAddZone}
                className="px-4 py-2 bg-[#122b39] hover:bg-[#1a3d52] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#e5a329]" />
                <span>Add Zone</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {zones.map((zone, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-[#e2ddd0] text-xs font-medium text-[#152836]"
                >
                  <span className="truncate">{zone}</span>
                  {zones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveZone(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                      title="Remove zone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#f4f1ea] border-t border-[#ded8cb] flex items-center justify-between">
          <div className="text-xs text-[#7a8b99]">
            Active Hub ID: <span className="font-mono font-bold text-[#152836]">{code || 'WH-AUTO'}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs font-semibold text-[#152836] hover:bg-[#eae5d8] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white text-xs font-bold shadow-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-[#e5a329]" />
              <span>{isSubmitting ? 'Registering Facility...' : 'Create Warehouse'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
