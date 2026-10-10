import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../../shared/hooks/useCart';
import useCustomer from '../../../shared/hooks/useCustomer';
import { formatPrice } from '../../../shared/utils/formatPrice';
import CartLineItem from '../components/CartLineItem';
import { Button } from '../../../shared/components/Button';
import EmptyState from '../../../shared/components/EmptyState';
import Badge from '../../../shared/components/Badge';
import Seo from '../../../shared/components/Seo';
import { getMyOrders } from '../api/checkout.api';
import { LuCircleAlert, LuShieldCheck, LuPackage } from 'react-icons/lu';

export const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal } = useCart();
  const { isAuthenticated: customerAuthed } = useCustomer();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!customerAuthed) { setOrders([]); return; }
    setOrdersLoading(true);
    getMyOrders()
      .then((res) => setOrders(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [customerAuthed]);

  // ROOT-CAUSE FIX: never create an order / clear the cart from this button.
  // It only routes to /checkout, which owns auth → address → Razorpay → verify → selective clear.
  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) return;
    if (!agreedToTerms) {
      setCheckoutError('Please accept the studio commission and delivery terms before proceeding.');
      return;
    }
    setCheckoutError('');
    navigate('/checkout');
  };

  return (
    <div className="w-full bg-white">
      <Seo
        title="Shopping Bag · Sabr Studio"
        description="Review your selected bespoke architectural furniture pieces and studio editions."
      />

      <div className="max-w-container-wide mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-16 lg:py-24">
        {cartItems.length === 0 ? (
          <div className="py-10 sm:py-16">
            <EmptyState
              title="Your Bag is Empty"
              message="You have not selected any studio edition furniture or architectural objects yet."
              actionLabel="Browse Retail Catalog"
              actionTo="/retail"
            />
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-12">
            <div>
              <span className="text-xs uppercase tracking-widest text-muted font-medium block mb-2">
                Shopping Bag
              </span>
              <h1 className="font-abhaya text-2xl sm:text-3xl lg:text-5xl text-ink font-medium">
                Your Studio Selection ({cartItems.length})
              </h1>
            </div>

            {checkoutError && (
              <div
                role="alert"
                className="p-3 sm:p-4 bg-error/5 border border-error/20 text-error text-xs rounded-sm flex items-start space-x-2.5"
              >
                <LuCircleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* 2-Column Layout — stacks on mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
              {/* Left: Line Items List */}
              <div className="lg:col-span-7 xl:col-span-8 border-t border-border divide-y divide-border">
                {cartItems.map((item) => (
                  <div key={item.id} className="py-2 sm:py-4">
                    <CartLineItem item={item} />
                  </div>
                ))}
              </div>

              {/* Right: Order Summary Card */}
              <div className="lg:col-span-5 xl:col-span-4 bg-surface border border-border p-4 sm:p-6 lg:p-8 rounded-md space-y-5 sm:space-y-6 lg:sticky lg:top-24">
                <h2 className="font-abhaya text-xl sm:text-2xl font-medium text-ink pb-3 sm:pb-4 border-b border-border">
                  Order Summary
                </h2>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-muted">Item Subtotal</span>
                    <span className="font-inter font-medium text-ink text-sm whitespace-nowrap">
                      {formatPrice(cartTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-muted">GST & Taxes</span>
                    <span className="text-muted font-medium">Included</span>
                  </div>
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-muted">Delivery / Shipping</span>
                    <span className="text-muted font-medium text-right">Calculated at dispatch</span>
                  </div>
                </div>

                <div className="pt-3 sm:pt-4 border-t border-border flex justify-between items-baseline gap-2">
                  <span className="font-inter text-xs sm:text-sm font-semibold text-ink uppercase tracking-wider">
                    Total
                  </span>
                  <span className="font-inter text-lg sm:text-xl font-semibold text-ink whitespace-nowrap">
                    {formatPrice(cartTotal)}
                  </span>
                </div>

                {/* Terms and conditions acceptance */}
                <div className="pt-2">
                  <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-muted leading-relaxed select-none">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => {
                        setAgreedToTerms(e.target.checked);
                        if (checkoutError) setCheckoutError('');
                      }}
                      className="mt-0.5 w-4 h-4 shrink-0 rounded-none accent-black border-border cursor-pointer"
                    />
                    <span>
                      I acknowledge that bespoke pieces are handcrafted upon order and accept the studio's dispatch timelines and return policy.
                    </span>
                  </label>
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    onClick={handleProceedToCheckout}
                    variant="Primary"
                    fullWidth
                    size="default"
                    label="Proceed to Checkout"
                  />
                  <div className="flex items-center justify-center space-x-2 text-[11px] text-muted text-center">
                    <LuShieldCheck className="w-3.5 h-3.5 text-ink shrink-0" />
                    <span>Address & verified Razorpay payment next — bag stays safe</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order History — lives inside the cart experience (no separate navbar item) */}
        {customerAuthed && (
          <section className="mt-10 sm:mt-16 border-t border-border pt-8 sm:pt-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <span className="text-xs uppercase tracking-widest text-muted font-medium block mb-1">Order History</span>
                <h2 className="font-abhaya text-xl sm:text-2xl lg:text-3xl text-ink font-medium">My Orders</h2>
              </div>
              <Link to="/orders" className="text-xs underline text-muted hover:text-ink shrink-0">View all</Link>
            </div>
            {ordersLoading ? (
              <p className="text-xs text-muted py-6">Loading your orders…</p>
            ) : orders.length === 0 ? (
              <p className="text-xs text-muted py-6">No orders yet. Your purchased items will appear here with tracking.</p>
            ) : (
              <div className="border border-border rounded-md divide-y divide-border overflow-hidden">
                {orders.slice(0, 5).map((o) => {
                  const oid = o._id || o.id || o.orderNumber;
                  const pay = o.paymentStatus || 'pending';
                  return (
                    <Link key={oid} to={`/orders/${oid}`} className="flex flex-col sm:flex-row sm:items-center gap-3 px-3 sm:px-4 py-3 sm:py-4 hover:bg-surface/60 transition-colors">
                      <span className="w-9 h-9 shrink-0 rounded-full bg-surface border border-border flex items-center justify-center text-ink">
                        <LuPackage className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink font-mono truncate">{o.orderNumber || oid}</p>
                        <p className="text-[11px] text-muted">{Array.isArray(o.items) ? o.items.length : 1} item(s){o.createdAt ? ` · ${new Date(o.createdAt).toLocaleDateString()}` : ''}</p>
                        {o.trackingId && <p className="text-[11px] text-muted font-mono">Tracking: {o.trackingId}</p>}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <span className="text-sm font-medium text-ink whitespace-nowrap">{formatPrice(o.amount ?? o.totalAmount ?? 0)}</span>
                        <Badge variant={pay === 'paid' ? 'success' : pay === 'failed' ? 'error' : 'default'}>{pay}</Badge>
                        <Badge variant="default">{String(o.orderStatus || 'pending').replace(/_/g, ' ')}</Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default Cart;
