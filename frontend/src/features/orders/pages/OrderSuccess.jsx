import React, { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { formatPrice } from '../../../shared/utils/formatPrice';
import { Button } from '../../../shared/components/Button';
import Seo from '../../../shared/components/Seo';
import Skeleton from '../../../shared/components/Skeleton';
import ErrorState from '../../../shared/components/ErrorState';
import { getMyOrder } from '../../cart/api/checkout.api';
import { LuCircleCheck, LuMapPin, LuTruck } from 'react-icons/lu';

function fmtAddr(a) {
  if (!a) return '';
  return [a.house, a.street, a.landmark, a.city, a.state, a.pincode, a.country].filter(Boolean).join(', ');
}

export const OrderSuccess = () => {
  const { orderNumber } = useParams();
  const { state } = useLocation();
  const [order, setOrder] = useState(state?.order || null);
  const [loading, setLoading] = useState(!state?.order);
  const [error, setError] = useState('');
  useEffect(() => {
    if (state?.order || !orderNumber) return;
    setLoading(true);
    getMyOrder(orderNumber).then((res) => setOrder(res?.data || null)).catch((e) => setError(e?.message || 'Could not load order.')).finally(() => setLoading(false));
  }, [orderNumber]);
  if (loading) return <div className="max-w-container mx-auto px-5 py-16 space-y-4"><Skeleton height="32px" width="60%" /><Skeleton height="240px" /></div>;
  if (error || !order) return <div className="max-w-container mx-auto px-5 py-16"><ErrorState title="Order not found" message={error || 'This order is not linked to your account.'} /></div>;
  const addr = order.deliveryAddress || {};
  return (
    <div className="w-full bg-white">
      <Seo title={`Order ${order.orderNumber} confirmed · Sabr Studio`} />
      <div className="max-w-container mx-auto px-5 sm:px-8 py-16 sm:py-20 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center text-success"><LuCircleCheck className="w-8 h-8" /></div>
        <p className="text-xs uppercase tracking-widest text-muted">Payment verified · Order confirmed</p>
        <h1 className="font-abhaya text-3xl sm:text-5xl text-ink font-medium">Thank you — order placed</h1>
        <p className="text-sm text-muted">Order number <strong className="text-ink font-mono">{order.orderNumber}</strong></p>
        <div className="bg-surface border border-border rounded-md p-6 text-left space-y-4 max-w-2xl mx-auto">
          {(order.items || []).map((i, idx) => (
            <div key={idx} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
              {i.image && <img src={i.image} alt={i.name} className="w-12 h-12 object-cover border border-border rounded-sm" />}
              <div className="flex-1"><p className="text-sm font-medium text-ink">{i.name}</p><p className="text-xs text-muted">Qty {i.quantity} × {formatPrice(i.unitPrice)}</p></div>
              <p className="text-sm font-medium">{formatPrice(i.lineTotal)}</p>
            </div>
          ))}
          <div className="flex justify-between text-sm pt-2"><span className="text-muted">Total paid</span><span className="font-semibold text-ink">{formatPrice(order.amount)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted">Payment</span><span className="text-success font-medium uppercase">{order.paymentStatus}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted">Fulfillment</span><span className="text-ink font-medium capitalize">{String(order.orderStatus).replace(/_/g, ' ')}</span></div>
          <p className="text-xs text-muted flex gap-2"><LuMapPin className="w-4 h-4 shrink-0" />{addr.fullName ? `${addr.fullName} — ${fmtAddr(addr)} · ${addr.phone}` : order.customer?.address}</p>
          <p className="text-xs flex gap-2"><LuTruck className="w-4 h-4 shrink-0" />{order.trackingId ? <span>Tracking ID: <strong className="font-mono">{order.trackingId}</strong></span> : <span className="text-muted">Tracking ID not available yet — added by the studio once shipped.</span>}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button to="/orders" variant="Primary" label="Track in My Orders" />
          <Button to="/retail" variant="Secondary-Outline" label="Continue Shopping" />
        </div>
      </div>
    </div>
  );
};
export default OrderSuccess;
