import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCustomer from '../../../shared/hooks/useCustomer';
import { useCart } from '../../../shared/hooks/useCart';
import { formatPrice } from '../../../shared/utils/formatPrice';
import { Button } from '../../../shared/components/Button';
import Seo from '../../../shared/components/Seo';
import EmptyState from '../../../shared/components/EmptyState';
import AuthModal from '../components/AuthModal';
import AddressModal from '../components/AddressModal';
import { getAddresses, createAddress, updateAddress } from '../../customer/api/customer.api';
import { createCheckoutSession, verifyPayment, loadRazorpayScript, openRazorpayCheckout } from '../../cart/api/checkout.api';
import { generateIdempotencyKey } from '../../../shared/utils/idempotency';
import { LuMapPin, LuPencil, LuCircleAlert, LuShieldCheck } from 'react-icons/lu';

export const Checkout = () => {
  const navigate = useNavigate();
  const { customer, isAuthenticated } = useCustomer();
  const { cartItems } = useCart();
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrError, setAddrError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const cartTotal = useMemo(() => cartItems.reduce((s, i) => s + (Number(i.price) || 0) * i.quantity, 0), [cartItems]);

  useEffect(() => {
    if (!isAuthenticated) { setAddresses([]); return; }
    getAddresses().then((res) => {
      const list = Array.isArray(res?.data) ? res.data : [];
      setAddresses(list);
      const def = list.find((a) => a.isDefault) || list[0];
      setSelectedId((prev) => prev || (def?._id || def?.id || null));
    }).catch(() => {});
  }, [isAuthenticated]);

  const selected = addresses.find((a) => String(a._id || a.id) === String(selectedId)) || null;

  const saveAddress = async (form) => {
    setAddrSaving(true); setAddrError('');
    try {
      const res = editing ? await updateAddress(editing._id || editing.id, form) : await createAddress({ ...form, isDefault: addresses.length === 0 });
      const list = Array.isArray(res?.addresses) ? res.addresses : await getAddresses().then((r) => (Array.isArray(r?.data) ? r.data : []));
      setAddresses(list);
      const saved = res?.data;
      setSelectedId(saved?._id || saved?.id || selectedId || (list.find((a) => a.isDefault) || list[0])?._id);
      setAddrOpen(false); setEditing(null);
    } catch (e) { setAddrError(e?.message || 'Could not save address.'); }
    finally { setAddrSaving(false); }
  };

  const finishPaidOrder = (order) => {
    // Requirement: NEVER auto-clear the bag. Purchased items stay in the cart
    // until the customer removes them manually. The order keeps its own snapshot,
    // so retaining the cart cannot cause duplicate orders or duplicate charges.
    navigate(`/order-success/${order?.orderNumber}`, { state: { order } });
  };

  const placeOrder = async () => {
    setError(''); setNotice('');
    if (!cartItems.length) { setError('Your bag is empty.'); return; }
    if (!isAuthenticated) { setAuthOpen(true); return; }
    if (!selected) { setEditing(null); setAddrOpen(true); return; }
    if (placing || verifying) return;
    setPlacing(true);
    try {
      const payload = {
        items: cartItems.map((i) => ({ productId: i.id || i._id || i.slug, quantity: i.quantity, unitPrice: i.price })),
        addressId: selected._id || selected.id,
      };
      const session = await createCheckoutSession(payload, generateIdempotencyKey('checkout'));
      const data = session?.data || session;
      if (!data?.razorpayOrderId) throw new Error('Checkout session could not be created.');
      if (data.priceChanges?.length) setNotice(`Price updated for ${data.priceChanges.length} item(s) to the latest studio price. Please review before paying.`);
      // The gateway opens ONLY when the server returned a real Razorpay key.
      // Without configured credentials the order stays pending and we NEVER
      // fabricate an "Order Confirmed" success screen (that was the reported bug).
      if (!data.keyId) {
        setPlacing(false);
        setError('Payment gateway is not configured on the server yet (Razorpay keys missing). Your order is saved as pending and no charge was made. Please complete payment once the gateway is enabled.');
        return;
      }
      await loadRazorpayScript();
      setPlacing(false);
      openRazorpayCheckout({
        keyId: data.keyId, amountPaise: data.amountPaise, currency: data.currency,
        orderId: data.razorpayOrderId, customer,
        onSuccess: async (resp) => {
          setVerifying(true);
          try {
            const verified = await verifyPayment({ orderId: data.orderId, razorpayOrderId: resp.razorpay_order_id, razorpayPaymentId: resp.razorpay_payment_id, razorpaySignature: resp.razorpay_signature });
            finishPaidOrder(verified?.data?.order || verified?.order || verified?.data);
          } catch (e) {
            setError(`${e?.message || 'Verification pending.'} If money was debited, open My Orders to reconcile — do not pay again yet.`);
          } finally { setVerifying(false); }
        },
        onDismiss: (info) => {
          if (info && info.code && info.code !== 'MODAL_CLOSED') setError(`Payment ${info.description || 'failed'}. Your bag is safe — retry when ready.`);
          else setNotice('Payment window closed. Your bag is unchanged — retry payment when ready.');
          setPlacing(false);
        },
      });
    } catch (e) {
      if (e?.code === 'CUSTOMER_AUTH_REQUIRED' || e?.status === 401) setAuthOpen(true);
      else setError(e?.message || 'Could not start checkout. Please try again.');
      setPlacing(false);
    }
  };

  if (!cartItems.length) {
    return (
      <div className="w-full bg-white"><Seo title="Checkout · Sabr Studio" />
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 py-16">
          <EmptyState title="Your bag is empty" description="Add a studio edition before checking out." actionLabel="Browse Retail" actionTo="/retail" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white">
      <Seo title="Checkout · Sabr Studio" />
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-8">
          <h1 className="font-abhaya text-3xl sm:text-4xl text-ink font-medium">Checkout</h1>
          {error && <div role="alert" className="p-4 bg-error/5 border border-error/20 text-error text-xs rounded-sm flex gap-2"><LuCircleAlert className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
          {notice && <div className="p-4 bg-surface border border-border text-ink text-xs rounded-sm">{notice}</div>}
          <section className="border border-border rounded-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-abhaya text-xl text-ink">1 · Account</h2>
              {!isAuthenticated && <Button size="sm" variant="Secondary-Outline" label="Log In" onClick={() => setAuthOpen(true)} />}
            </div>
            {isAuthenticated ? <p className="text-xs text-muted">Signed in as <span className="text-ink font-medium">{customer?.name}</span> · {customer?.email}</p>
              : <p className="text-xs text-muted">Log in or create an account to place your order. Your bag stays intact.</p>}
          </section>
          <section className="border border-border rounded-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-abhaya text-xl text-ink">2 · Delivery Address</h2>
              {isAuthenticated && <Button size="sm" variant="Secondary-Outline" label={addresses.length ? 'Add New' : 'Add Address'} onClick={() => { setEditing(null); setAddrOpen(true); }} />}
            </div>
            {!isAuthenticated ? <p className="text-xs text-muted">Log in first, then add your delivery address.</p>
              : !addresses.length ? <p className="text-xs text-muted">No saved address yet — add one to continue.</p>
              : (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{addresses.map((a) => {
                    const id = String(a._id || a.id);
                    const active = id === String(selectedId);
                    return (
                      <div key={id} role="button" tabIndex={0} onClick={() => setSelectedId(id)} onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(id); }}
                        className={`border rounded-sm p-4 space-y-1 cursor-pointer ${active ? 'border-black bg-surface' : 'border-border'}`}>
                        <span className="flex items-center gap-2 text-sm font-medium text-ink"><LuMapPin className="w-4 h-4" />{a.fullName}</span>
                        <span className="block text-xs text-muted">{a.house}, {a.street}</span>
                        <span className="block text-xs text-muted">{a.city}, {a.state} — {a.pincode}</span>
                        <span className="block text-xs text-muted">{a.phone}</span>
                        <span className="block pt-2"><span role="button" tabIndex={0} className="inline-flex items-center gap-1 text-xs underline" onClick={(e) => { e.stopPropagation(); setEditing(a); setAddrOpen(true); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setEditing(a); setAddrOpen(true); } }}><LuPencil className="w-3 h-3" />Edit</span></span>
                      </div>
                    );
                  })}</div>)}
          </section>
          <section className="border border-border rounded-md p-6 space-y-4">
            <h2 className="font-abhaya text-xl text-ink">3 · Review Items</h2>
            <div className="divide-y divide-border">
              {cartItems.map((i) => (
                <div key={String(i.id || i._id || i.slug)} className="py-3 flex items-center gap-4">
                  <img src={i.image || i.coverImage || ''} alt={i.title || i.name} className="w-14 h-14 object-cover border border-border rounded-sm" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{i.title || i.name}</p>
                    <p className="text-xs text-muted">Qty {i.quantity} × {formatPrice(i.price)}</p>
                  </div>
                  <p className="text-sm font-medium text-ink">{formatPrice((Number(i.price) || 0) * i.quantity)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="lg:col-span-5">
          <div className="border border-border rounded-md p-6 sm:p-8 space-y-5 lg:sticky lg:top-24">
            <h2 className="font-abhaya text-2xl text-ink">Order Summary</h2>
            <div className="text-xs space-y-2">
              <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="text-ink font-medium">{formatPrice(cartTotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Shipping</span><span className="text-muted">Calculated at dispatch</span></div>
            </div>
            <div className="border-t border-border pt-4 flex justify-between items-baseline">
              <span className="text-sm font-semibold uppercase tracking-wider">Total</span>
              <span className="text-xl font-semibold">{formatPrice(cartTotal)}</span>
            </div>
            {selected && <p className="text-[11px] text-muted leading-relaxed">Deliver to: {selected.fullName}, {selected.house}, {selected.street}, {selected.city} — {selected.pincode} · {selected.phone}</p>}
            <Button fullWidth variant="Primary" loading={placing || verifying} onClick={placeOrder} label={verifying ? 'Verifying Payment…' : placing ? 'Creating Order…' : 'Place Order · Pay Securely'} />
            <p className="flex items-center justify-center gap-2 text-[11px] text-muted"><LuShieldCheck className="w-3.5 h-3.5" />Your bag stays until you remove items — even after payment</p>
            <Link to="/cart" className="block text-center text-xs underline text-muted hover:text-ink">Back to bag</Link>
          </div>
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />
      <AddressModal open={addrOpen} initial={editing} saving={addrSaving} error={addrError} onClose={() => { setAddrOpen(false); setEditing(null); }} onSave={saveAddress} />
    </div>
  );
};
export default Checkout;
