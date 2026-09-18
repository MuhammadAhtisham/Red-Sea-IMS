// Directed Warehouse Execution System (WES) - Wave Picking & Traveling Salesperson Routing
import { db } from './store.js';
import { Wave, WaveItem } from './types.js';

// Calculate 3D Euclidean distance between two warehouse bin coordinates
function distance3D(p1: { x: number; y: number; z: number }, p2: { x: number; y: number; z: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z - p2.z) * 1.5; // Penalty weight for vertical shelf climbs
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Traveling Salesperson Problem (TSP) Nearest-Neighbor Heuristic for Warehouse Walking Path
export function optimizePickingPath(items: Omit<WaveItem, 'sequence'>[]): WaveItem[] {
  if (items.length <= 1) {
    return items.map((it, idx) => ({ ...it, sequence: idx + 1 }));
  }

  const unvisited = [...items];
  const route: WaveItem[] = [];

  // Warehouse picking staging depot start origin (x=0, y=0, z=0)
  let currentPos = { x: 0, y: 0, z: 0 };
  let sequence = 1;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let shortestDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = distance3D(currentPos, unvisited[i].binCoordinates);
      if (dist < shortestDist) {
        shortestDist = dist;
        nearestIdx = i;
      }
    }

    const [chosen] = unvisited.splice(nearestIdx, 1);
    route.push({
      ...chosen,
      sequence: sequence++,
    });
    currentPos = chosen.binCoordinates;
  }

  return route;
}

// Continuous RFID / Barcode Stream Ingestion Engine
export interface ScanStreamEvent {
  barcodeOrRfid: string;
  waveId?: string;
  scannerId?: string;
  timestamp: string;
}

export interface ScanProcessingResult {
  matched: boolean;
  type: 'WAVE_ITEM_PICKED' | 'PALLET_LPN' | 'BIN_CHECKIN' | 'PRODUCT_FOUND' | 'UNRECOGNIZED';
  details: any;
  updatedWave?: Wave;
}

export function processScannerStream(scan: ScanStreamEvent): ScanProcessingResult {
  const cleanCode = scan.barcodeOrRfid.trim();

  // 1. Check if scan matches active Wave Item SKU or Barcode
  const activeWave = scan.waveId
    ? db.waves.find((w) => w.id === scan.waveId)
    : db.waves.find((w) => w.status === 'IN_PROGRESS');

  if (activeWave) {
    const matchingItem = activeWave.items.find(
      (item) =>
        !item.isComplete &&
        (item.sku.toLowerCase() === cleanCode.toLowerCase() ||
          db.products.find((p) => p.id === item.productId)?.barcode === cleanCode ||
          item.binCode.toLowerCase() === cleanCode.toLowerCase())
    );

    if (matchingItem) {
      matchingItem.pickedQty += 1;
      if (matchingItem.pickedQty >= matchingItem.quantity) {
        matchingItem.pickedQty = matchingItem.quantity;
        matchingItem.isComplete = true;
      }

      // Check if entire wave is now complete
      const allDone = activeWave.items.every((i) => i.isComplete);
      if (allDone) {
        activeWave.status = 'COMPLETED';
      }

      return {
        matched: true,
        type: 'WAVE_ITEM_PICKED',
        details: {
          waveId: activeWave.id,
          sku: matchingItem.sku,
          productName: matchingItem.productName,
          pickedQty: matchingItem.pickedQty,
          totalQty: matchingItem.quantity,
          isItemComplete: matchingItem.isComplete,
          waveCompleted: allDone,
        },
        updatedWave: activeWave,
      };
    }
  }

  // 2. Check if scan matches Pallet LPN
  const pallet = db.pallets.find((p) => p.lpnCode.toLowerCase() === cleanCode.toLowerCase());
  if (pallet) {
    return {
      matched: true,
      type: 'PALLET_LPN',
      details: {
        palletId: pallet.id,
        lpnCode: pallet.lpnCode,
        locationId: pallet.locationId,
        status: pallet.status,
        itemCount: pallet.items.length,
      },
    };
  }

  // 3. Check if scan matches a Warehouse Bin Code
  const bin = db.bins.find((b) => b.binCode.toLowerCase() === cleanCode.toLowerCase());
  if (bin) {
    return {
      matched: true,
      type: 'BIN_CHECKIN',
      details: {
        binId: bin.id,
        binCode: bin.binCode,
        zone: bin.zone,
        coordinates: { x: bin.xCoord, y: bin.yCoord, z: bin.zCoord },
      },
    };
  }

  // 4. Check if scan matches any Product SKU or Barcode
  const product = db.products.find(
    (p) => p.sku.toLowerCase() === cleanCode.toLowerCase() || p.barcode === cleanCode
  );
  if (product) {
    const totalStock = db.stockLevels
      .filter((sl) => sl.productId === product.id)
      .reduce((sum, sl) => sum + sl.quantity, 0);

    return {
      matched: true,
      type: 'PRODUCT_FOUND',
      details: {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        retailPrice: product.retailPrice,
        totalStock,
      },
    };
  }

  return {
    matched: false,
    type: 'UNRECOGNIZED',
    details: { code: cleanCode, error: 'Barcode/RFID token not cataloged in system.' },
  };
}
