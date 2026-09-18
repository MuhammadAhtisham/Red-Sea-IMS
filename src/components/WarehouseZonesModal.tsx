import React, { useState } from 'react';
import {
  X,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  Grid,
  Box,
  MapPin,
  Warehouse,
  Info,
} from 'lucide-react';
import { api, LocationDTO } from '../services/api';

interface WarehouseZonesModalProps {
  isOpen: boolean;
  location: LocationDTO | null;
  onClose: () => void;
  onSuccess: (updatedLoc: LocationDTO) => void;
}

export const WarehouseZonesModal: React.FC<WarehouseZonesModalProps> = ({
  isOpen,
  location,
  onClose,
  onSuccess,
}) => {
  const [zones, setZones] = useState<string[]>([]);
  const [newZoneName, setNewZoneName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (location) {
      setZones(
        location.zones && location.zones.length > 0
          ? [...location.zones]
          : [
              'Zone A - Inbound Receiving & Staging',
              'Zone B - Automated High-Bay Racks',
              'Zone C - Pick-to-Light Sorting',
              'Zone D - Outbound Shipping Dock',
            ]
      );
    }
  }, [location]);

  if (!isOpen || !location) return null;

  const handleAddZone = () => {
    const trimmed = newZoneName.trim();
    if (trimmed && !zones.includes(trimmed)) {
      setZones([...zones, trimmed]);
      setNewZoneName('');
    }
  };

  const handleRemoveZone = (idx: number) => {
    setZones(zones.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      const updated = await api.updateLocation(location.id, { zones });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to update warehouse zones.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#fcfbf9] border border-[#e2ddd0] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-[#122b39] text-white flex items-center justify-between border-b border-[#1b3d52]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#e5a329]/20 border border-[#e5a329]/40 flex items-center justify-center">
              <Layers className="w-5 h-5 text-[#e5a329]" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Zone & Storage Topology Configuration</h2>
              <p className="text-xs text-slate-300">
                Manage storage zones, staging areas, and layout for <span className="font-mono text-[#e5a329] font-bold">{location.name}</span>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Topology Mapping:</span> Zones group related aisles, racks, and bins within the warehouse. Inbound receipts, cross-dock waves, and cycle counts route inventory directly through these configured zones.
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#152836] uppercase tracking-wider">
              Add New Storage Zone or Sector
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddZone();
                  }
                }}
                placeholder="e.g. Zone E - Hazardous Chem Isolation or Vault 02"
                className="flex-1 px-3.5 py-2 rounded-xl border border-[#ded8cb] bg-white text-xs text-[#152836] focus:outline-hidden focus:ring-2 focus:ring-[#132f3e]"
              />
              <button
                type="button"
                onClick={handleAddZone}
                className="px-4 py-2 bg-[#122b39] hover:bg-[#1a3d52] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#e5a329]" />
                <span>Add</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#152836] uppercase tracking-wider">
              Active Facility Zones ({zones.length})
            </label>

            <div className="space-y-2">
              {zones.map((zone, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#e2ddd0] shadow-2xs hover:border-[#cfc9ba] transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#ede9df] text-[#152836] flex items-center justify-center font-mono font-bold text-xs">
                      Z{idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#152836]">{zone}</div>
                      <div className="text-[11px] text-[#7a8b99]">
                        Auto-assigned 12 rack bays • Aisle {String.fromCharCode(65 + (idx % 26))}
                      </div>
                    </div>
                  </div>

                  {zones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveZone(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      title="Remove zone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#f4f1ea] border-t border-[#ded8cb] flex items-center justify-between">
          <div className="text-xs text-[#7a8b99]">
            Total Storage Sectors: <span className="font-bold text-[#152836]">{zones.length}</span>
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
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white text-xs font-bold shadow-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-[#e5a329]" />
              <span>{isSubmitting ? 'Saving Zones...' : 'Save Zone Topology'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
