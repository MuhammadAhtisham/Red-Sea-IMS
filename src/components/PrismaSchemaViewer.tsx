import React, { useState } from 'react';
import { Database, Copy, Check, ShieldCheck, FileCode2 } from 'lucide-react';

export const PrismaSchemaViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);

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
  SALE
  PRODUCTION_CONSUMPTION
  PRODUCTION_YIELD
}

enum WaveStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum OrderStatus {
  PENDING
  ROUTED
  PARTIALLY_FULFILLED
  FULFILLED
  CANCELLED
}

// 1. User & Role Based Access Control
model User {
  id           String          @id @default(uuid())
  email        String          @unique
  passwordHash String
  name         String
  role         Role            @default(STAFF)
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  movements    StockMovement[]
}

// 2. Product Master & SKU Indexing
model Product {
  id                 String              @id @default(uuid())
  sku                String              @unique
  barcode            String              @unique
  name               String
  description        String?
  category           String              @default("General")
  unitCost           Float
  retailPrice        Float
  trackInventory     Boolean             @default(true)
  reorderPoint       Int                 @default(10)
  leadTimeDays       Int                 @default(7)
  unitOfMeasure      String              @default("EA")
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  stockLevels        StockLevel[]
  stockMovements     StockMovement[]
  variants           ProductVariant[]
  waveItems          WaveItem[]
  palletItems        PalletItem[]
  poItems            PurchaseOrderItem[]
  bomsAsFinished     BillOfMaterial[]    @relation("FinishedProduct")
  bomComponents      BomComponent[]
  workOrdersFinished WorkOrder[]         @relation("FinishedProductWO")
  orderItems         OrderItem[]
}

// 3. Multi-Location Topology
model Location {
  id             String          @id @default(uuid())
  name           String
  code           String          @unique
  type           LocationType    @default(WAREHOUSE)
  address        String?
  city           String?
  state          String?
  postalCode     String?
  country        String          @default("USA")
  latitude       Float?
  longitude      Float?
  shippingTier   String          @default("STANDARD")
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  stockLevels    StockLevel[]
  fromMovements  StockMovement[] @relation("FromLocation")
  toMovements    StockMovement[] @relation("ToLocation")
  bins           Bin[]
  pallets        Pallet[]
  waves          Wave[]
  workOrders     WorkOrder[]
  shipments      Shipment[]
  purchaseOrders PurchaseOrder[]
}

// 4. Atomic Multi-Location Inventory Level
model StockLevel {
  id         String   @id @default(uuid())
  productId  String
  locationId String
  quantity   Int      @default(0)
  reserved   Int      @default(0)
  updatedAt  DateTime @updatedAt

  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  location   Location @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@unique([productId, locationId], name: "unique_product_location")
  @@index([locationId])
  @@index([productId])
}

// 5. Immutable Audit Movement Ledger
model StockMovement {
  id             String       @id @default(uuid())
  type           MovementType
  productId      String
  quantity       Int
  fromLocationId String?
  toLocationId   String?
  reference      String?
  notes          String?
  userId         String?
  timestamp      DateTime     @default(now())

  product        Product      @relation(fields: [productId], references: [id])
  fromLocation   Location?    @relation("FromLocation", fields: [fromLocationId], references: [id])
  toLocation     Location?    @relation("ToLocation", fields: [toLocationId], references: [id])
  user           User?        @relation(fields: [userId], references: [id])

  @@index([productId, timestamp])
  @@index([fromLocationId])
  @@index([toLocationId])
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(schemaPrismaCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              PostgreSQL & Prisma Schema Architecture
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded">
              schema.prisma
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Engineered with strict foreign key constraints, composite unique indexes, and ACID data integrity.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied to Clipboard' : 'Copy Prisma Schema'}</span>
        </button>
      </div>

      <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 font-mono text-xs shadow-xl border border-slate-800 overflow-x-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <FileCode2 className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-white">prisma/schema.prisma</span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>PostgreSQL Provider • ACID Certified</span>
          </div>
        </div>
        <pre className="text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
          {schemaPrismaCode}
        </pre>
      </div>
    </div>
  );
};
