import React, { useState, useEffect } from 'react';
import {
  Barcode,
  Navigation,
  CheckCircle2,
  Radio,
  Zap,
  RotateCcw,
  Sparkles,
  MapPin,
  Flame,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { WaveDTO, api } from '../services/api';

interface WesWavePickingViewProps {
  waves: WaveDTO[];
  onWaveUpdated: () => void;
}

export const WesWavePickingView: React.FC<WesWavePickingViewProps> = ({
  waves,
  onWaveUpdated,
}) => {
  const [selectedWaveId, setSelectedWaveId] = useState<string>(waves[0]?.id || '');
  const [activeWave, setActiveWave] = useState<WaveDTO | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState<any>(null);
  const [isStreamingRfid, setIsStreamingRfid] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sync active wave
  useEffect(() => {
    if (selectedWaveId) {
      const found = waves.find((w) => w.id === selectedWaveId);
      if (found) setActiveWave(found);
    } else if (waves.length > 0) {
      setSelectedWaveId(waves[0].id);
      setActiveWave(waves[0]);
    }
  }, [selectedWaveId, waves]);

  // Audio tone helper
  const playBeep = (freq = 880, duration = 80) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration / 1000);
    } catch (e) {
      // ignore audio context restrictions
    }
  };

  const handleScanSubmit = async (codeToScan?: string) => {
    const code = codeToScan || scanInput;
    if (!code.trim() || !activeWave) return;

    try {
      const res = await api.sendScanStream({
        barcodeOrRfid: code.trim(),
        waveId: activeWave.id,
      });

      setScanFeedback(res);
      if (res.matched) {
        playBeep(1046, 70); // High pitch confirm
      } else {
        playBeep(330, 150); // Low pitch error
      }

      setScanInput('');
      onWaveUpdated();
    } catch (err: any) {
      setScanFeedback({ matched: false, details: { error: err.message } });
      playBeep(220, 200);
    }
  };

  // Continuous Rapid RFID Array Stream Simulation
  useEffect(() => {
    let interval: any = null;
    if (isStreamingRfid && activeWave) {
      const unpicked = activeWave.items.filter((i) => !i.isComplete);
      if (unpicked.length === 0) {
        setIsStreamingRfid(false);
        return;
      }

      interval = setInterval(() => {
        // Pick next item in sequence
        const nextItem = activeWave.items.find((i) => !i.isComplete);
        if (nextItem) {
          handleScanSubmit(nextItem.sku);
        } else {
          setIsStreamingRfid(false);
        }
      }, 400); // Continuous scan every 400ms
    }

    return () => clearInterval(interval);
  }, [isStreamingRfid, activeWave]);

  const handleCreateNewWave = async () => {
    try {
      const newWave = await api.createWave({
        waveNumber: `WAVE-TSP-${Math.floor(1000 + Math.random() * 9000)}`,
      });
      setSelectedWaveId(newWave.id);
      onWaveUpdated();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Calculate completion percentage
  const totalRequired = activeWave?.items.reduce((acc, curr) => acc + curr.quantity, 0) || 1;
  const totalPicked = activeWave?.items.reduce((acc, curr) => acc + curr.pickedQty, 0) || 0;
  const progressPercent = Math.min(100, Math.round((totalPicked / totalRequired) * 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Directed Warehouse Execution (WES)</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
              TSP Algorithmic Routing
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Mobile-first scanner interface grouping orders into optimal walking waves through warehouse bins.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
            title={soundEnabled ? 'Mute RF scanner beeps' : 'Enable RF scanner beeps'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
          <button
            id="btn-create-wave"
            onClick={handleCreateNewWave}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Generate New Batch Wave</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Handheld Scanner Terminal (Mobile-first Left) + TSP Route Map (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Mobile Scanner Interface (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-800 flex flex-col space-y-4">
          {/* Top Bar of Rugged Terminal */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
                RF Terminal #802
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">WES Directed Mode</div>
          </div>

          {/* Wave Selector & Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="text-slate-400 font-semibold">Active Wave</label>
              <select
                value={selectedWaveId}
                onChange={(e) => setSelectedWaveId(e.target.value)}
                className="bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 font-mono text-xs cursor-pointer"
              >
                {waves.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.waveNumber} ({w.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Progress Meter */}
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-300">Pick Progress</span>
                <span className="text-emerald-400 font-bold">
                  {totalPicked} / {totalRequired} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                <span>TSP Distance: {activeWave?.optimalDistanceMeters || 68}m</span>
                <span className="font-semibold text-slate-300">
                  {activeWave?.status === 'COMPLETED' ? '✓ WAVE COMPLETED' : 'DIRECTED SEQUENCE ACTIVE'}
                </span>
              </div>
            </div>
          </div>

          {/* Barcode / RFID Laser Gun Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Continuous Barcode / RFID Scan Stream
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Scan SKU, Barcode, or Bin code..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScanSubmit()}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={() => handleScanSubmit()}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Scan
              </button>
            </div>

            {/* Rapid Automated RFID Stream Toggle */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setIsStreamingRfid(!isStreamingRfid)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  isStreamingRfid
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{isStreamingRfid ? 'Streaming RFID Array (Running...)' : 'Simulate Rapid RFID Array Stream'}</span>
              </button>
            </div>
          </div>

          {/* Feedback Screen */}
          {scanFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-mono transition-all ${
                scanFeedback.matched
                  ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                  : 'bg-rose-950/70 border-rose-700 text-rose-300'
              }`}
            >
              <div className="font-bold flex items-center space-x-1.5 mb-1">
                {scanFeedback.matched ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Flame className="w-4 h-4 text-rose-400" />
                )}
                <span>{scanFeedback.type}</span>
              </div>
              <div className="text-[11px] space-y-0.5 text-slate-300">
                {scanFeedback.details.sku && <div>SKU: {scanFeedback.details.sku}</div>}
                {scanFeedback.details.productName && <div>{scanFeedback.details.productName}</div>}
                {scanFeedback.details.pickedQty !== undefined && (
                  <div>
                    Picked: {scanFeedback.details.pickedQty} / {scanFeedback.details.totalQty}
                  </div>
                )}
                {scanFeedback.details.error && <div className="text-rose-400">{scanFeedback.details.error}</div>}
              </div>
            </div>
          )}

          {/* Next Required Item Quick Action Chips */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] uppercase font-bold text-slate-400">Direct Pick Quick-Scan Buttons:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {activeWave?.items
                .filter((i) => !i.isComplete)
                .slice(0, 4)
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleScanSubmit(item.sku)}
                    className="p-2 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 rounded text-left text-[11px] font-mono transition cursor-pointer"
                  >
                    <div className="text-emerald-400 font-bold truncate">{item.sku}</div>
                    <div className="text-slate-400 text-[10px]">Bin: {item.binCode}</div>
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Directed Walking Sequence & Warehouse Bin Map (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-xs border border-slate-200/90 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Traveling Salesperson Optimized Pick Path
              </h2>
              <p className="text-xs text-slate-500">
                Aisle-by-aisle traversal sequence minimizing total steps and turnaround time.
              </p>
            </div>
            <div className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 font-bold">
              {activeWave?.items.length || 0} Pick Stops
            </div>
          </div>

          {/* Stepper Table */}
          <div className="space-y-2.5">
            {activeWave?.items.map((item, idx) => {
              const isCurrent = !item.isComplete && (idx === 0 || activeWave.items[idx - 1]?.isComplete);
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                    item.isComplete
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : isCurrent
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    {/* Step Number Circle */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs font-mono ${
                        item.isComplete
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-amber-500 text-slate-900'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.isComplete ? '✓' : item.sequence}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">{item.productName}</span>
                        <span className="font-mono text-[11px] text-slate-500">[{item.sku}]</span>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                        <span className="flex items-center space-x-1 font-mono font-semibold text-slate-700">
                          <MapPin className="w-3 h-3 text-indigo-600" />
                          <span>Bin: {item.binCode}</span>
                        </span>
                        <span>• Order: {item.orderId}</span>
                        <span>• Coord: ({item.binCoordinates.x}, {item.binCoordinates.y})</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-slate-900">
                      {item.pickedQty} / {item.quantity}
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mt-1 uppercase ${
                        item.isComplete
                          ? 'bg-emerald-100 text-emerald-800'
                          : isCurrent
                          ? 'bg-amber-100 text-amber-900 font-bold'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.isComplete ? 'Picked' : isCurrent ? 'Next Target' : 'Queued'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual Warehouse Bin Layout Diagram */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Warehouse Grid Heatmap & Traversal Path
            </h3>
            <p className="text-[11px] text-slate-500">
              Path is computed dynamically using Euclidean nearest-neighbor with vertical rack climb penalties.
            </p>
            <div className="grid grid-cols-4 gap-2 pt-2">
              <div className="p-2.5 bg-white rounded border border-slate-200 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">ZONE-A</div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5">Electronics & Sensors</div>
                <div className="text-[10px] font-mono text-emerald-600 mt-1 font-bold">Aisles 01 - 02</div>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">ZONE-B</div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5">Robotics & High Value</div>
                <div className="text-[10px] font-mono text-indigo-600 mt-1 font-bold">Aisle 02</div>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">ZONE-C</div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5">LiFePO4 Hazmat</div>
                <div className="text-[10px] font-mono text-amber-600 mt-1 font-bold">Aisle 03</div>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">ZONE-R</div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5">Raw Manufacturing</div>
                <div className="text-[10px] font-mono text-purple-600 mt-1 font-bold">Aisle 04</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
