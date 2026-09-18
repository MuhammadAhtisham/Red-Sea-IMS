import React, { useState, useEffect } from 'react';
import {
  X,
  Warehouse,
  MapPin,
  Thermometer,
  ShieldCheck,
  Phone,
  User,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { api, LocationDTO } from '../services/api';

interface EditWarehouseModalProps {
  isOpen: boolean;
  location: LocationDTO | null;
  onClose: () => void;
  onSuccess: (updatedLoc: LocationDTO) => void;
}

export const EditWarehouseModal: React.FC<EditWarehouseModalProps> = ({
  isOpen,
  location,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'WAREHOUSE' | 'STOREFRONT' | 'QUARANTINE' | 'TRANSIT_HUB'>('WAREHOUSE');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [nominalCapacity, setNominalCapacity] = useState('15000');
  const [temperatureZone, setTemperatureZone] = useState('');
  const [managerName, setManagerName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [active, setActive] = useState(true);

  const [zones, setZones] = useState<string[]>([]);
  const [newZoneInput, setNewZoneInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (location) {
      setName(location.name || '');
      setCode(location.code || '');
      setType((location.type as any) || 'WAREHOUSE');
      setCity(location.city || '');
      setState(location.state || '');
      setAddress(location.address || '');
      setPostalCode(location.postalCode || '');
      setLatitude(location.latitude !== undefined ? String(location.latitude) : '');
      setLongitude(location.longitude !== undefined ? String(location.longitude) : '');
      setNominalCapacity(String(location.nominalCapacity || 12000));
      setTemperatureZone(location.temperatureZone || 'Ambient Climate Controlled (20-24°C)');
      setManagerName(location.managerName || 'Logistics Operations Lead');
      setContactPhone(location.contactPhone || '+966 14 555 0192');
      setActive(location.active !== false);
      setZones(
        location.zones && location.zones.length > 0
          ? [...location.zones]
          : [
              'Zone A - Inbound Receiving & Staging',
              'Zone B - High-Bay Racks',
              'Zone C - Pick & Pack Sorting',
              'Zone D - Outbound Shipping Dock',
            ]
      );
      setErrorMsg(null);
    }
  }, [location]);

  if (!isOpen || !location) return null;

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
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        latitude: parseFloat(latitude) || location.latitude,
        longitude: parseFloat(longitude) || location.longitude,
        nominalCapacity: parseInt(nominalCapacity, 10) || 12000,
        zones,
        temperatureZone,
        managerName: managerName.trim(),
        contactPhone: contactPhone.trim(),
        active,
      };

      const updated = await api.updateLocation(location.id, payload);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to update warehouse location.';
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
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Edit Warehouse Settings</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-[#e5a329] border border-slate-700">
                  {location.code}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Update storage parameters, capacity, and operational configuration
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Operational Status Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-white border border-[#e2ddd0] rounded-xl">
            <div>
              <div className="text-xs font-bold text-[#152836]">Operational Status</div>
              <div className="text-[11px] text-[#7a8b99]">
                Inactive warehouses reject new inbound receipts and transfers.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                active
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-300'
              }`}
            >
              {active ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5" />}
              <span>{active ? 'ACTIVE HUB' : 'INACTIVE / STANDBY'}</span>
            </button>
          </div>

          {/* Basic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#152836] mb-1">Facility Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#152836] mb-1">Facility Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white font-mono text-xs text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
              />
            </div>
          </div>

          {/* Type & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#152836] mb-1">Facility Type</label>
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
              <label className="block text-xs font-bold text-[#152836] mb-1">Nominal Storage Capacity (Units)</label>
              <input
                type="number"
                min="100"
                max="500000"
                step="500"
                value={nominalCapacity}
                onChange={(e) => setNominalCapacity(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs text-[#152836] font-mono focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
              />
            </div>
          </div>

          {/* Geographic Location & Address */}
          <div className="border-t border-[#e2ddd0] pt-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a8b99] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#e5a329]" />
              <span>Location & Coordinates</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#152836] mb-1">City / Region</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#152836] mb-1">State / Province</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#152836] mb-1">Postal Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
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
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#152836] mb-1">Latitude</label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs font-mono text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#152836] mb-1">Longitude</label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs font-mono text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                />
              </div>
            </div>
          </div>

          {/* Temperature & Personnel */}
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
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#152836] mb-1">Emergency Contact Phone</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs font-mono text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
                />
              </div>
            </div>
          </div>

          {/* Zones */}
          <div className="border-t border-[#e2ddd0] pt-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a8b99] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#e5a329]" />
              <span>Configured Storage Zones ({zones.length})</span>
            </h3>

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
                placeholder="Add zone name"
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
            Facility ID: <span className="font-mono font-bold text-[#152836]">{location.id}</span>
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
              <span>{isSubmitting ? 'Saving Settings...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
