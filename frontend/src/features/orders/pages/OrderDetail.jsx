import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatPrice } from '../../../shared/utils/formatPrice';
import { getMyOrder } from '../../cart/api/checkout.api';
import Seo from '../../../shared/components/Seo';
import Skeleton from '../../../shared/components/Skeleton';
import ErrorState from '../../../shared/components/ErrorState';
import Badge from '../../../shared/components/Badge';
import { LuMapPin, LuTruck, LuArrowLeft } from 'react-icons/lu';

const STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];

export const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => {
    setLoading(true); setError('');
    getMyOrder(id).then((res) => setOrder(res?.data || null)).catch((e) => setError(e?.message || 'Could not load order.')).finally(() => setLoading(false));
  };
  useEffect(load, [id]);
  if (loading) return <div className="max-w-container mx-auto px-5 py-16 space-y-4"><Skeleton height="28px" width="50%" /><Skeleton height="300px" /></div>;
  if (error || !order) return <div className="max-w-container mx-auto px-5 py-16"><ErrorState title="Order unavailable" message={error || 'Not found.'} onRetry={load} /></div>;
  const addr = order.deliveryAddress || {};
  const stepIdx = STEPS.indexOf(order.orderStatus);
  return (
    <div className="w-full bg-white">
      <Seo title={`Order ${order.orderNumber} · Sabr Studio`} />
      <div className="max-w-container mx-auto px-5 sm:px-8 py-12 space-y-8">
        <Link to="/orders" className="inline-flex items-center gap-2 text-xs text-muted hover:text-ink"><LuArrowLeft className="w-4 h-4" />Back to orders</Link>
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div><h1 className="font-abhaya text-3xl text-ink font-medium font-mono">{order.orderNumber}</h1>
          <p className="text-xs text-muted">Placed {order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : ''}</p></div>
          <div className="flex gap-2"><Badge variant={order.paymentStatus === 'paid' ? 'success' : 'default'}>{order.paymentStatus}</Badge><Badge variant="dark">{String(order.orderStatus).replace(/_/g, ' ')}</Badge></div>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto py-2" aria-label="Delivery progress">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <span className={`w-3 h-3 rounded-full ${stepIdx >= i && stepIdx !== -1 ? 'bg-black' : 'bg-border'}`} />
              <span className={`text-[10px] uppercase tracking-wider pr-2 ${stepIdx >= i ? 'text-ink font-semibold' : 'text-muted'}`}>{s.replace(/_/g, ' ')}</span>
              {i < STEPS.length - 1 && <span className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>
        <div className="border border-border rounded-md p-6 space-y-3">
          {(order.items || []).map((it, idx) => (
            <div key={idx} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
              {it.image && <img src={it.image} alt={it.name} className="w-12 h-12 object-cover border border-border rounded-sm" />}
              <div className="flex-1"><p className="text-sm font-medium text-ink">{it.name}</p><p className="text-xs text-muted">Qty {it.quantity} × {formatPrice(it.unitPrice)}</p></div>
              <p className="text-sm font-medium">{formatPrice(it.lineTotal)}</p>
            </div>
          ))}
          <div className="flex justify-between text-sm pt-2"><span className="text-muted">Total</span><span className="font-semibold">{formatPrice(order.amount)}</span></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-border rounded-md p-5 space-y-2">
            <h3 className="text-xs uppercase tracking-widest text-muted flex items-center gap-2"><LuMapPin className="w-4 h-4" />Delivery Address</h3>
            <p className="text-sm text-ink font-medium">{addr.fullName || order.customer?.name}</p>
            <p className="text-xs text-muted">{[addr.house, addr.street, addr.landmark, addr.city, addr.state, addr.pincode, addr.country].filter(Boolean).join(', ') || order.customer?.address}</p>
            <p className="text-xs text-muted">{addr.phone || order.customer?.phone}</p>
          </div>
          <div className="border border-border rounded-md p-5 space-y-2">
            <h3 className="text-xs uppercase tracking-widest text-muted flex items-center gap-2"><LuTruck className="w-4 h-4" />Shipment Tracking</h3>
            {order.trackingId ? <p className="text-sm">Tracking ID: <strong className="font-mono">{order.trackingId}</strong></p>
              : <p className="text-xs text-muted">Tracking ID not available yet — the studio adds it once your order ships.</p>}
            <button type="button" onClick={load} className="text-xs underline text-ink">Refresh status</button>
          </div>
        </div>
        {(order.statusHistory || []).length > 0 && (
          <div className="border border-border rounded-md p-5">
            <h3 className="text-xs uppercase tracking-widest text-muted pb-3">Status History</h3>
            <ul className="space-y-2 text-xs text-muted">
              {(order.statusHistory || []).slice().reverse().map((h, i) => (
                <li key={i} className="flex justify-between gap-4"><span>{h.kind}: {h.from || '—'} → <strong className="text-ink">{h.to}</strong>{h.note ? ` · ${h.note}` : ''}</span><span>{h.at ? new Date(h.at).toLocaleString('en-IN') : ''}</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
export default OrderDetail;
