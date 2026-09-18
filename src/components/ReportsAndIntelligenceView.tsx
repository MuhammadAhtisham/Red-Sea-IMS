import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  TrendingUp,
  AlertTriangle,
  Boxes,
  Warehouse,
  DollarSign,
  PieChart,
  BarChart3,
  Calendar,
  CheckCircle2,
  Database,
  Copy,
  Check,
  ShieldCheck,
  FileCode2,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Scale,
} from 'lucide-react';
import {
  ProductDTO,
  LocationDTO,
  StockMovementDTO,
  CategoryDTO,
  api,
} from '../services/api';

interface ReportsAndIntelligenceViewProps {
  products: ProductDTO[];
  locations: LocationDTO[];
  movements: StockMovementDTO[];
  categories?: CategoryDTO[];
}

export const ReportsAndIntelligenceView: React.FC<ReportsAndIntelligenceViewProps> = ({
  products,
  locations,
  movements,
  categories = [],
}) => {
  const [activeReportTab, setActiveReportTab] = useState<
    'VALUATION' | 'HEALTH' | 'FACILITY' | 'MOVEMENTS' | 'TECHNICAL_SCHEMA'
  >('VALUATION');

  const [copied, setCopied] = useState(false);

  // Raw Prisma definition (for technical database review)
  const schemaPrismaCode = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  MANAGER
  STAFF
}

enum LocationType {
  WAREHOUSE
  STOREFRONT
  DISTRIBUTION_CENTER
  RETURN_CENTER
}

enum MovementType {
  RECEIPT
  TRANSFER
  ADJUSTMENT
  SHIPMENT
  QUARANTINE_HOLD
}

model Category {
  id          String    @id @default(uuid())
  code        String    @unique
  name        String
  description String?
  color       String?
  products    Product[]
  createdAt   DateTime  @default(now())
}

model Product {
  id               String          @id @default(uuid())
  sku              String          @unique
  barcode          String          @unique
  name             String
  description      String?
  category         String
  unitCost         Float
  retailPrice      Float
  reorderPoint     Int
  unitOfMeasure    String
  weight           Float?
  dimensions       String?
  storageCondition String?
  brand            String?
  movements        StockMovement[]
  stockByLocation  StockLevel[]
}

model StockLevel {
  id         String   @id @default(uuid())
  productId  String
  locationId String
  quantity   Int
  product    Product  @relation(fields: [productId], references: [id])
  location   Location @relation(fields: [locationId], references: [id])
}`;

  // Computations for Executive Valuation Report
  const valuationStats = useMemo(() => {
    let totalStockUnits = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;

    const categoryMap: { [cat: string]: { count: number; units: number; val: number } } = {};

    products.forEach((p) => {
      const units = p.totalStock || 0;
      const cost = p.unitCost || 0;
      const retail = p.retailPrice || 0;

      totalStockUnits += units;
      totalCostValuation += units * cost;
      totalRetailValuation += units * retail;

      const cat = p.category || 'General';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { count: 0, units: 0, val: 0 };
      }
      categoryMap[cat].count++;
      categoryMap[cat].units += units;
      categoryMap[cat].val += units * cost;
    });

    const marginDollars = totalRetailValuation - totalCostValuation;
    const marginPct = totalRetailValuation > 0 ? (marginDollars / totalRetailValuation) * 100 : 0;

    const categoryList = Object.entries(categoryMap).map(([name, data]) => ({
      name,
      ...data,
      sharePct: totalCostValuation > 0 ? (data.val / totalCostValuation) * 100 : 0,
    })).sort((a, b) => b.val - a.val);

    return {
      totalStockUnits,
      totalCostValuation,
      totalRetailValuation,
      marginDollars,
      marginPct,
      categoryList,
    };
  }, [products]);

  // Inventory Health / Risk Analysis
  const healthStats = useMemo(() => {
    const criticalItems = products.filter((p) => p.totalStock <= (p.reorderPoint || 30) * 0.5);
    const lowStockItems = products.filter(
      (p) => p.totalStock <= (p.reorderPoint || 30) && p.totalStock > (p.reorderPoint || 30) * 0.5
    );
    const healthyItems = products.filter((p) => p.totalStock > (p.reorderPoint || 30));

    // Estimated reorder replenishment cost to bring low items back to reorderPoint * 2
    const replenishmentCost = [...criticalItems, ...lowStockItems].reduce((sum, p) => {
      const target = (p.reorderPoint || 30) * 2;
      const deficit = Math.max(0, target - p.totalStock);
      return sum + deficit * (p.unitCost || 0);
    }, 0);

    return {
      criticalItems,
      lowStockItems,
      healthyItems,
      replenishmentCost,
    };
  }, [products]);

  // Facility Capacity / Occupancy
  const facilityStats = useMemo(() => {
    return locations.map((loc) => {
      let locUnits = 0;
      let locValuation = 0;

      products.forEach((p) => {
        const item = p.stockByLocation?.find((sl) => sl.locationId === loc.id);
        if (item) {
          locUnits += item.quantity;
          locValuation += item.quantity * (p.unitCost || 0);
        }
      });

      // Estimated nominal bay capacity
      const capacity = loc.type === 'WAREHOUSE' ? 12000 : 5000;
      const utilization = Math.min(100, Math.round((locUnits / capacity) * 100));

      return {
        ...loc,
        totalUnits: locUnits,
        totalValuation: locValuation,
        capacity,
        utilization,
      };
    });
  }, [locations, products]);

  // Copy Schema code
  const handleCopySchema = () => {
    navigator.clipboard.writeText(schemaPrismaCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Export Executive Report CSV
  const handleExportExecutiveReport = () => {
    const headers = [
      'Report Section',
      'Metric Name',
      'Key Identifier',
      'Calculated Value',
      'Reference Detail',
    ];

    const rows: (string | number)[][] = [
      ['Valuation', 'Total Asset Cost Valuation', 'ALL_CATALOG', `$${Math.round(valuationStats.totalCostValuation)}`, 'Current cost basis'],
      ['Valuation', 'Total Retail Potential', 'ALL_CATALOG', `$${Math.round(valuationStats.totalRetailValuation)}`, 'Full retail value'],
      ['Valuation', 'Estimated Gross Margin', 'ALL_CATALOG', `${valuationStats.marginPct.toFixed(1)}%`, `$${Math.round(valuationStats.marginDollars)} margin`],
      ['Valuation', 'Total Stocked Units', 'ALL_CATALOG', valuationStats.totalStockUnits, 'Base UoM inventory sum'],
      ['Health', 'Critical Stockout Risk SKUs', 'UNDERSTOCK', healthStats.criticalItems.length, 'Below 50% reorder point'],
      ['Health', 'Low Stock Warning SKUs', 'WARNING', healthStats.lowStockItems.length, 'At or below reorder point'],
      ['Health', 'Replenishment Capital Needed', 'PO_BUDGET', `$${Math.round(healthStats.replenishmentCost)}`, 'Cost to restore safety stock'],
    ];

    valuationStats.categoryList.forEach((cat) => {
      rows.push([
        'Category Breakdown',
        cat.name,
        'TAXONOMY',
        `$${Math.round(cat.val)}`,
        `${cat.units} units (${cat.sharePct.toFixed(1)}% share)`,
      ]);
    });

    facilityStats.forEach((f) => {
      rows.push([
        'Facility Occupancy',
        f.name,
        f.code,
        `${f.utilization}%`,
        `${f.totalUnits} units ($${Math.round(f.totalValuation)})`,
      ]);
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(',')).map((c) => `"${c}"`)].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `neom_warehouse_executive_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5e1d5] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-[#8c5e15] uppercase tracking-wider">
              Warehouse Intelligence & Analytics
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#122b39] text-[#e5a329]">
              Enterprise Reports
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#122b39] tracking-tight mt-1">
            Warehouse Intelligence & Prisma Reports
          </h1>
          <p className="text-xs text-[#6a7d8d] mt-0.5">
            Executive financial valuation, stockout risk assessment, facility capacity utilization, and PostgreSQL data architecture.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExecutiveReport}
            className="px-4 py-2 rounded-xl bg-[#122b39] hover:bg-[#1a3d52] text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-sm shadow-[#122b39]/20"
          >
            <Download className="w-4 h-4 text-[#e5a329]" />
            <span>Export Executive Report (CSV)</span>
          </button>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div className="flex items-center gap-2 p-1 bg-white border border-[#e5e1d5] rounded-xl shadow-2xs overflow-x-auto">
        <button
          onClick={() => setActiveReportTab('VALUATION')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'VALUATION'
              ? 'bg-[#122b39] text-white shadow-xs'
              : 'text-[#526677] hover:text-[#122b39]'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-[#e5a329]" />
          <span>Inventory Valuation & Margin</span>
        </button>

        <button
          onClick={() => setActiveReportTab('HEALTH')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'HEALTH'
              ? 'bg-[#122b39] text-white shadow-xs'
              : 'text-[#526677] hover:text-[#122b39]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Stock Health & Stockout Risk</span>
        </button>

        <button
          onClick={() => setActiveReportTab('FACILITY')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'FACILITY'
              ? 'bg-[#122b39] text-white shadow-xs'
              : 'text-[#526677] hover:text-[#122b39]'
          }`}
        >
          <Warehouse className="w-3.5 h-3.5 text-blue-500" />
          <span>Facility Bay Occupancy</span>
        </button>

        <button
          onClick={() => setActiveReportTab('TECHNICAL_SCHEMA')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'TECHNICAL_SCHEMA'
              ? 'bg-[#122b39] text-white shadow-xs'
              : 'text-[#526677] hover:text-[#122b39]'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-purple-500" />
          <span>Prisma Schema & Database Models</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* REPORT 1: INVENTORY VALUATION & MARGIN                                    */}
      {/* ========================================================================= */}
      {activeReportTab === 'VALUATION' && (
        <div className="space-y-6">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4.5 rounded-xl border border-[#e5e1d5] shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a8b99] block">
                Total Asset Cost Basis
              </span>
              <div className="text-2xl font-black text-[#122b39] font-mono mt-1">
                ${Math.round(valuationStats.totalCostValuation).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#7a8b99] mt-0.5">
                Across {products.length} registered SKUs
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-xl border border-[#e5e1d5] shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a8b99] block">
                Retail Realization Value
              </span>
              <div className="text-2xl font-black text-[#0284c7] font-mono mt-1">
                ${Math.round(valuationStats.totalRetailValuation).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#7a8b99] mt-0.5">At current catalog retail pricing</div>
            </div>

            <div className="bg-white p-4.5 rounded-xl border border-[#e5e1d5] shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a8b99] block">
                Gross Margin Potential
              </span>
              <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                {valuationStats.marginPct.toFixed(1)}%
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                +${Math.round(valuationStats.marginDollars).toLocaleString()} unrealized profit
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-xl border border-[#e5e1d5] shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a8b99] block">
                Total Stock Volume
              </span>
              <div className="text-2xl font-black text-[#122b39] font-mono mt-1">
                {valuationStats.totalStockUnits.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#7a8b99] mt-0.5">Physical items in storage</div>
            </div>
          </div>

          {/* Category Valuation Breakdown Table */}
          <div className="bg-white rounded-2xl border border-[#e5e1d5] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#f0ece2] bg-[#faf9f6] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#122b39]">
                  Inventory Valuation by Product Category
                </h3>
                <p className="text-xs text-[#7a8b99] mt-0.5">
                  Portfolio capital allocation, share of total asset valuation, and SKU breadth.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#122b39]">
                {valuationStats.categoryList.length} Categories
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f5ee] text-[#526677] font-bold uppercase tracking-wider border-b border-[#e5e1d5] text-[11px]">
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4 text-center">SKU Count</th>
                    <th className="py-3 px-4 text-right">Physical Units</th>
                    <th className="py-3 px-4 text-right">Total Valuation</th>
                    <th className="py-3 px-4">Portfolio Share (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ece2] font-mono">
                  {valuationStats.categoryList.map((cat) => (
                    <tr key={cat.name} className="hover:bg-[#faf9f6]">
                      <td className="py-3 px-4 font-sans font-bold text-[#122b39]">
                        {cat.name}
                      </td>
                      <td className="py-3 px-4 text-center text-[#526677]">{cat.count}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#122b39]">
                        {cat.units.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        ${Math.round(cat.val).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-[#f0ece2] overflow-hidden">
                            <div
                              className="h-full bg-[#122b39] rounded-full"
                              style={{ width: `${Math.min(100, Math.max(2, cat.sharePct))}%` }}
                            />
                          </div>
                          <span className="w-12 text-right font-bold text-xs text-[#122b39]">
                            {cat.sharePct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REPORT 2: STOCK HEALTH & STOCKOUT RISK                                    */}
      {/* ========================================================================= */}
      {activeReportTab === 'HEALTH' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 p-4.5 rounded-xl border border-red-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-800 block">
                Critical Stockout Risk (Below 50% ROP)
              </span>
              <div className="text-3xl font-black text-red-700 font-mono mt-1">
                {healthStats.criticalItems.length} SKUs
              </div>
              <div className="text-xs text-red-600 mt-1 font-sans">
                Immediate purchase orders required to prevent supply disruptions.
              </div>
            </div>

            <div className="bg-amber-50 p-4.5 rounded-xl border border-amber-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                Low Stock Warning (At/Below ROP)
              </span>
              <div className="text-3xl font-black text-amber-700 font-mono mt-1">
                {healthStats.lowStockItems.length} SKUs
              </div>
              <div className="text-xs text-amber-700 mt-1 font-sans">
                Reorder trigger threshold reached. Review procurement schedules.
              </div>
            </div>

            <div className="bg-emerald-50 p-4.5 rounded-xl border border-emerald-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                Replenishment Budget Needed
              </span>
              <div className="text-3xl font-black text-emerald-700 font-mono mt-1">
                ${Math.round(healthStats.replenishmentCost).toLocaleString()}
              </div>
              <div className="text-xs text-emerald-700 mt-1 font-sans">
                Capital needed to restore safety stock for all deficient SKUs.
              </div>
            </div>
          </div>

          {/* Critical Items Table */}
          <div className="bg-white rounded-2xl border border-[#e5e1d5] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#f0ece2] bg-[#faf9f6]">
              <h3 className="text-sm font-bold text-[#122b39]">
                High-Priority Reorder Attention List
              </h3>
              <p className="text-xs text-[#7a8b99] mt-0.5">
                Products requiring immediate procurement intervention.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f5ee] text-[#526677] font-bold uppercase tracking-wider border-b border-[#e5e1d5] text-[11px]">
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Current Stock</th>
                    <th className="py-3 px-4 text-right">Reorder Point</th>
                    <th className="py-3 px-4 text-right">Lead Time</th>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ece2] font-mono">
                  {[...healthStats.criticalItems, ...healthStats.lowStockItems].map((p) => {
                    const isCritical = p.totalStock <= p.reorderPoint * 0.5;
                    return (
                      <tr key={p.id} className="hover:bg-[#faf9f6]">
                        <td className="py-2.5 px-4 font-sans">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              isCritical
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isCritical ? 'CRITICAL' : 'LOW STOCK'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-[#122b39]">{p.sku}</td>
                        <td className="py-2.5 px-4 font-sans font-semibold text-[#152836]">
                          {p.name}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-[#7a8b99]">{p.category}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-red-700">
                          {p.totalStock} {p.unitOfMeasure || 'EA'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-[#526677]">{p.reorderPoint}</td>
                        <td className="py-2.5 px-4 text-right text-[#526677]">
                          {p.leadTimeDays || 14} days
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-[#122b39]">
                          ${p.unitCost}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REPORT 3: FACILITY BAY OCCUPANCY                                          */}
      {/* ========================================================================= */}
      {activeReportTab === 'FACILITY' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {facilityStats.map((fac) => (
              <div key={fac.id} className="bg-white p-5 rounded-2xl border border-[#e5e1d5] shadow-2xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#f6f4ed] text-[#526677] border border-[#e2ddd0]">
                      {fac.code}
                    </span>
                    <h3 className="text-base font-bold text-[#122b39] mt-1">{fac.name}</h3>
                    <span className="text-xs text-[#7a8b99]">{fac.type}</span>
                  </div>
                  <span
                    className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg ${
                      fac.utilization > 85
                        ? 'bg-red-100 text-red-800'
                        : fac.utilization > 60
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {fac.utilization}% Full
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#7a8b99]">Occupied Volume:</span>
                    <span className="font-bold text-[#122b39]">
                      {fac.totalUnits.toLocaleString()} / {fac.capacity.toLocaleString()} units
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f0ece2] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        fac.utilization > 85 ? 'bg-red-600' : fac.utilization > 60 ? 'bg-amber-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${fac.utilization}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#f0ece2] flex justify-between items-center text-xs">
                  <span className="text-[#7a8b99]">Asset Valuation:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    ${Math.round(fac.totalValuation).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REPORT 4: TECHNICAL PRISMA SCHEMA & MODELS                                */}
      {/* ========================================================================= */}
      {activeReportTab === 'TECHNICAL_SCHEMA' && (
        <div className="bg-[#0f172a] text-slate-100 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  PostgreSQL & Prisma Schema Architecture
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Engine definition for RedSea IMS relational database tables and foreign keys.
              </p>
            </div>

            <button
              onClick={handleCopySchema}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Schema.prisma'}</span>
            </button>
          </div>

          <pre className="font-mono text-xs text-slate-300 overflow-x-auto p-4 bg-[#090d16] rounded-xl border border-slate-800 leading-relaxed">
            {schemaPrismaCode}
          </pre>
        </div>
      )}
    </div>
  );
};
