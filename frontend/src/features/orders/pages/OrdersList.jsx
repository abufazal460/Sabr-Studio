import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCustomer from '../../../shared/hooks/useCustomer';
import { formatPrice } from '../../../shared/utils/formatPrice';
import { getMyOrders } from '../../cart/api/checkout.api';
import Seo from '../../../shared/components/Seo';
import Skeleton from '../../../shared/components/Skeleton';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import Badge from '../../../shared/components/Badge';
import { LuPackage } from 'react-icons/lu';

export const OrdersList = () => {
  const { isAuthenticated, loading: authLoading } = useCustomer();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLoading(false); return; }
    getMyOrders().then((res) => setOrders(Array.isArray(res?.data) ? res.data : [])).catch((e) => setError(e?.message || 'Could not load orders.')).finally(() => setLoading(false));
  }, [authLoading, isAuthenticated]);
  if (authLoading || loading) return <div className="max-w-container-wide mx-auto px-5 py-16 space-y-4"><Skeleton height="28px" width="40%" /><Skeleton height="180px" /><Skeleton height="180px" /></div>;
  if (!isAuthenticated) return <div className="max-w-container mx-auto px-5 py-16"><EmptyState icon={LuPackage} title="Log in to see orders" description="Your verified orders and live tracking appear here." actionLabel="Go to Checkout Login" onAction={() => navigate('/checkout')} /></div>;
  if (error) return <div className="max-w-container mx-auto px-5 py-16"><ErrorState title="Could not load orders" message={error} onRetry={() => window.location.reload()} /></div>;
  if (!orders.length) return <div className="max-w-container mx-auto px-5 py-16"><Seo title="My Orders · Sabr Studio" /><EmptyState icon={LuPackage} title="No orders yet" description="Once your payment is verified, orders appear here with tracking." actionLabel="Browse Retail" actionTo="/retail" /></div>;
  return (
    <div className="w-full bg-white">
      <Seo title="My Orders · Sabr Studio" />
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 py-12 sm:py-16 space-y-8">
        <h1 className="font-abhaya text-3xl sm:text-4xl text-ink font-medium">My Orders</h1>
        <div className="space-y-4">
          {orders.map((o) => (
            <Link key={o.orderNumber || o._id} to={`/orders/${encodeURIComponent(o.orderNumber || o._id)}`} className="block border border-border rounded-md p-5 sm:p-6 hover:border-ink transition-colors">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold text-ink">{o.orderNumber}</p>
                  <p className="text-xs text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} · {(o.items || []).length} item(s) · {formatPrice(o.amount)}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={o.paymentStatus === 'paid' ? 'success' : 'default'}>{o.paymentStatus}</Badge>
                  <Badge variant={o.orderStatus === 'delivered' ? 'success' : 'dark'}>{String(o.orderStatus).replace(/_/g, ' ')}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted pt-2">{o.trackingId ? `Tracking: ${o.trackingId}` : 'Tracking ID not available yet'}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
export default OrdersList;
