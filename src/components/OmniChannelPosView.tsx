import React, { useState } from 'react';
import {
  ShoppingBag,
  Send,
  Zap,
  Split,
  MapPin,
  Truck,
  CheckCircle2,
  DollarSign,
  Barcode,
  CreditCard,
  Plus,
  Trash2,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { ProductDTO, LocationDTO, OrderDTO, api } from '../services/api';

interface OmniChannelPosViewProps {
  products: ProductDTO[];
  locations: LocationDTO[];
  orders: OrderDTO[];
  onOperationSuccess: () => void;
}

export const OmniChannelPosView: React.FC<OmniChannelPosViewProps> = ({
  products,
  locations,
  orders,
  onOperationSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'webhook' | 'pos' | 'orders'>('webhook');

  // Webhook simulator state
  const [platform, setPlatform] = useState<'SHOPIFY' | 'AMAZON' | 'B2B_PORTAL' | 'WOOCOMMERCE'>('SHOPIFY');
  const [customerName, setCustomerName] = useState('Lockheed Martin Defense Systems');
  const [customerEmail, setCustomerEmail] = useState('procurement@lockheed.com');
  const [destCity, setDestCity] = useState('Dallas');
  const [destState, setDestState] = useState('TX');
  const [destLat, setDestLat] = useState('32.7767');
  const [destLng, setDestLng] = useState('-96.7970');
  const [orderItems, setOrderItems] = useState([
    { skuOrBarcode: products[0]?.sku || 'IOT-GW-500X', quantity: 2 },
    { skuOrBarcode: products[2]?.sku || 'LDR-SOL-360', quantity: 1 },
  ]);
  const [routingResult, setRoutingResult] = useState<any>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  // POS Checkout state
  const storefronts = locations.filter((l) => l.type === 'STOREFRONT');
  const [posLocationId, setPosLocationId] = useState(storefronts[0]?.id || locations[0]?.id || '');
  const [posCart, setPosCart] = useState<{ product: ProductDTO; quantity: number }[]>([
    { product: products[0], quantity: 1 },
    { product: products[1], quantity: 2 },
  ]);
  const [posBarcodeToScan, setPosBarcodeToScan] = useState('');
  const [posResult, setPosResult] = useState<any>(null);
  const [isPosCheckingOut, setIsPosCheckingOut] = useState(false);

  // Webhook order submit
  const handleTriggerWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRouting(true);
    setRoutingResult(null);
    setRoutingError(null);
    try {
      const res = await api.triggerOrderWebhook({
        externalOrderNo: `ORD-${platform.slice(0, 3)}-${Date.now().toString().slice(-5)}`,
        platform,
        customerName,
        customerEmail,
        destAddress: '100 Aerospace Blvd',
        destCity,
        destState,
        destPostalCode: '75201',
        destLat: parseFloat(destLat) || 32.7767,
        destLng: parseFloat(destLng) || -96.797,
        items: orderItems,
      });
      setRoutingResult(res.result);
      onOperationSuccess();
    } catch (err: any) {
      setRoutingError(err.response?.data?.error || err.message);
    } finally {
      setIsRouting(false);
    }
  };

  // Add line item to webhook
  const handleAddWebhookItem = () => {
    if (products.length > 0) {
      setOrderItems([...orderItems, { skuOrBarcode: products[0].sku, quantity: 1 }]);
    }
  };

  // POS Add item by barcode / SKU
  const handlePosScanAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = posBarcodeToScan.trim().toLowerCase();
    if (!clean) return;

    const prod = products.find(
      (p) => p.sku.toLowerCase() === clean || p.barcode === clean
    );
    if (prod) {
      const existing = posCart.find((c) => c.product.id === prod.id);
      if (existing) {
        setPosCart(posCart.map((c) => (c.product.id === prod.id ? { ...c, quantity: c.quantity + 1 } : c)));
      } else {
        setPosCart([...posCart, { product: prod, quantity: 1 }]);
      }
      setPosBarcodeToScan('');
    } else {
      alert(`Barcode/SKU "${posBarcodeToScan}" not recognized.`);
    }
  };

  // POS Checkout submit
  const handlePosCheckout = async () => {
    if (posCart.length === 0) return;
    setIsPosCheckingOut(true);
    setPosResult(null);
    try {
      const res = await api.posCheckout({
        locationId: posLocationId,
        paymentMethod: 'CHIP_N_PIN_CONTACTLESS',
        cashierId: 'usr-pos-register-01',
        items: posCart.map((c) => ({
          barcodeOrSku: c.product.barcode,
          quantity: c.quantity,
        })),
      });
      setPosResult(res);
      setPosCart([]);
      onOperationSuccess();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setIsPosCheckingOut(false);
    }
  };

  const posSubtotal = posCart.reduce((sum, c) => sum + c.product.retailPrice * c.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Omni-Channel Routing & High-Speed POS
        </h1>
        <p className="text-sm text-slate-500">
          Algorithmic multi-facility order routing, split fulfillment, and low-latency POS checkout hooks.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('webhook')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
            activeTab === 'webhook'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Split className="w-3.5 h-3.5" />
          <span>Inbound Order Webhook & Smart Router</span>
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
            activeTab === 'pos'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Barcode className="w-3.5 h-3.5" />
          <span>High-Speed POS Register Checkout</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Routed Orders & Split Shipments</span>
        </button>
      </div>

      {/* 1. WEBHOOK SIMULATOR & SMART ROUTING */}
      {activeTab === 'webhook' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Webhook Payload Form (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold">
              <Send className="w-4 h-4 text-indigo-600" />
              <h2>Simulate E-Commerce Webhook Ingestion</h2>
            </div>
            <p className="text-xs text-slate-500">
              Posts order to <code>/api/webhooks/orders</code>. Evaluates proximity, availability, and splits shipments automatically.
            </p>

            <form onSubmit={handleTriggerWebhook} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Platform Channel</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['SHOPIFY', 'AMAZON', 'B2B_PORTAL', 'WOOCOMMERCE'] as const).map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`py-1.5 px-2 rounded border text-xs font-semibold cursor-pointer ${
                        platform === p
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer / Enterprise</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destination City, State</label>
                  <input
                    type="text"
                    required
                    value={`${destCity}, ${destState}`}
                    onChange={(e) => {
                      const parts = e.target.value.split(',');
                      setDestCity(parts[0]?.trim() || '');
                      setDestState(parts[1]?.trim() || '');
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Order Line Items</label>
                  <button
                    type="button"
                    onClick={handleAddWebhookItem}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center space-x-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <select
                        value={item.skuOrBarcode}
                        onChange={(e) => {
                          const updated = [...orderItems];
                          updated[idx].skuOrBarcode = e.target.value;
                          setOrderItems(updated);
                        }}
                        className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.sku}>
                            {p.sku} — {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...orderItems];
                          updated[idx].quantity = parseInt(e.target.value, 10) || 1;
                          setOrderItems(updated);
                        }}
                        className="w-16 px-2 py-1.5 border border-slate-300 rounded font-mono text-xs"
                      />
                      {orderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isRouting}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isRouting ? 'Evaluating Routing Matrix...' : 'Dispatch Webhook Payload'}
              </button>
            </form>
          </div>

          {/* Smart Router Decision Visualizer (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Smart Routing & Split Fulfillment Results
                </h2>
                <p className="text-xs text-slate-500">
                  Haversine distance ranking + inventory allocation decision output.
                </p>
              </div>
              {routingResult && (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    routingResult.routingDecision.isSplit
                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {routingResult.routingDecision.isSplit ? 'Split Fulfillment' : 'Single Hub Optimal'}
                </span>
              )}
            </div>

            {routingError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                <strong>Transaction Rolled Back:</strong> {routingError}
              </div>
            )}

            {routingResult ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-semibold text-slate-900 mb-1">Algorithmic Decision:</div>
                  <div className="text-slate-600 leading-relaxed">
                    {routingResult.routingDecision.reason}
                  </div>
                </div>

                {/* Facilities Used */}
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Fulfillment Shipments Dispatched ({routingResult.shipments.length})
                  </h3>
                  {routingResult.shipments.map((shp: any) => (
                    <div
                      key={shp.id}
                      className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Truck className="w-4 h-4 text-indigo-600" />
                          <span className="font-bold text-slate-900">{shp.locationName}</span>
                        </div>
                        <span className="font-mono text-emerald-700 font-bold">
                          Est. Cost: ${shp.estimatedCost.toFixed(2)}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-slate-500 flex justify-between">
                        <span>Carrier: {shp.carrier}</span>
                        <span>Tracking: {shp.trackingNumber}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        {shp.items.map((it: any) => (
                          <div key={it.productId} className="flex justify-between text-[11px]">
                            <span className="text-slate-700 font-medium">
                              • {it.quantity}x {it.name}
                            </span>
                            <span className="font-mono text-slate-500">[{it.sku}]</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Split className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Ready to process payload. Click "Dispatch Webhook Payload" to trigger live execution.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. HIGH-SPEED POS CHECKOUT */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* POS Cart & Barcode Scanner (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Point of Sale (POS) Hardware Terminal</h2>
                <p className="text-xs text-slate-500">
                  Sub-15ms checkout endpoint with atomic stock deduction from chosen retail location.
                </p>
              </div>
              <div className="text-right">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Register Storefront</label>
                <select
                  value={posLocationId}
                  onChange={(e) => setPosLocationId(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-xs font-semibold text-slate-800"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Barcode scanner gun input */}
            <form onSubmit={handlePosScanAdd} className="flex space-x-2 text-xs">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Scan product barcode or SKU into register..."
                  value={posBarcodeToScan}
                  onChange={(e) => setPosBarcodeToScan(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                Add Item
              </button>
            </form>

            {/* Quick-tap product buttons */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Quick-Select Buttons:</span>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {products.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const existing = posCart.find((c) => c.product.id === p.id);
                      if (existing) {
                        setPosCart(posCart.map((c) => (c.product.id === p.id ? { ...c, quantity: c.quantity + 1 } : c)));
                      } else {
                        setPosCart([...posCart, { product: p, quantity: 1 }]);
                      }
                    }}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-left cursor-pointer"
                  >
                    <div className="font-bold text-slate-800 truncate">{p.name}</div>
                    <div className="font-mono text-emerald-600 font-semibold">${p.retailPrice.toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cart Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Item / Barcode</th>
                    <th className="py-2 px-3 text-right">Price</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {posCart.map((item, idx) => (
                    <tr key={item.product.id}>
                      <td className="py-2 px-3 font-sans">
                        <div className="font-bold text-slate-900">{item.product.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.product.barcode}</div>
                      </td>
                      <td className="py-2 px-3 text-right">${item.product.retailPrice.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1;
                            setPosCart(posCart.map((c, i) => (i === idx ? { ...c, quantity: val } : c)));
                          }}
                          className="w-12 text-center border border-slate-300 rounded py-0.5"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        ${(item.product.retailPrice * item.quantity).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => setPosCart(posCart.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {posCart.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 font-sans italic">
                        Register cart is empty. Scan barcode or tap quick-select buttons above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total and Checkout */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="text-xs text-slate-500">Cart Total ({posCart.length} lines):</div>
                <div className="text-2xl font-bold font-mono text-slate-900">${posSubtotal.toFixed(2)}</div>
              </div>
              <button
                onClick={handlePosCheckout}
                disabled={isPosCheckingOut || posCart.length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition flex items-center space-x-2 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <CreditCard className="w-4 h-4" />
                <span>{isPosCheckingOut ? 'Authorizing...' : 'Charge & Atomic Deduct'}</span>
              </button>
            </div>
          </div>

          {/* POS Receipt / Latency Inspector (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Hardware Telemetry & Receipt</h2>
              {posResult && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                  Latency: {posResult.latencyMs}ms
                </span>
              )}
            </div>

            {posResult ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs space-y-3">
                <div className="text-center border-b border-dashed border-slate-300 pb-2">
                  <div className="font-bold text-sm text-slate-900">APEX RETAIL STOREFRONT</div>
                  <div className="text-[10px] text-slate-500">{posResult.receipt.locationId}</div>
                  <div className="text-[10px] text-slate-500 font-bold mt-1">
                    RECEIPT #{posResult.receipt.receiptId}
                  </div>
                </div>

                <div className="space-y-1 text-[11px]">
                  {posResult.receipt.items.map((it: any) => (
                    <div key={it.productId} className="flex justify-between">
                      <span>
                        {it.quantity}x {it.name}
                      </span>
                      <span>${it.lineTotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-right">
                  <div>Subtotal: ${posResult.receipt.subtotal.toFixed(2)}</div>
                  <div>Sales Tax (8.25%): ${posResult.receipt.tax.toFixed(2)}</div>
                  <div className="font-bold text-sm text-slate-900 pt-1">
                    TOTAL PAID: ${posResult.receipt.total.toFixed(2)}
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-200 font-sans">
                  Stock decremented atomically in single PostgreSQL transaction.
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Perform a register sale to view electronic receipt and latency metrics.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. ORDER & SHIPMENT HISTORY */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Order Routing & Split Shipment History</h2>
            <span className="text-xs font-mono text-slate-400">{orders.length} orders recorded</span>
          </div>

          <div className="space-y-3">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 text-xs"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900">{ord.externalOrderNo}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {ord.platform}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      ${ord.totalAmount.toLocaleString()}
                    </span>
                    <div className="text-[10px] text-slate-400">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="text-slate-600">
                  <span className="font-semibold text-slate-800">{ord.customerName}</span> ({ord.customerEmail})
                  — Destination: {ord.destAddress}, {ord.destCity}, {ord.destState}
                </div>

                {/* Shipments breakdown */}
                {ord.shipments && ord.shipments.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Fulfillment Shipments ({ord.shipments.length}):
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ord.shipments.map((s) => (
                        <div
                          key={s.id}
                          className="p-2.5 rounded border border-slate-200 bg-slate-50 text-[11px] space-y-1"
                        >
                          <div className="flex justify-between font-semibold text-slate-800">
                            <span>{s.locationName}</span>
                            <span className="font-mono text-emerald-700">${s.estimatedCost.toFixed(2)}</span>
                          </div>
                          <div className="text-slate-500 font-mono text-[10px]">
                            {s.carrier} • {s.trackingNumber}
                          </div>
                          <div className="text-slate-700 pt-1">
                            {s.items.map((i) => (
                              <div key={i.productId}>
                                • {i.quantity}x {i.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
