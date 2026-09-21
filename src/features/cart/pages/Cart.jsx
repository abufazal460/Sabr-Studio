import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../../shared/hooks/useCart';
import { formatPrice } from '../../../shared/utils/formatPrice';
import { createCheckoutSession } from '../api/checkout.api';
import CartLineItem from '../components/CartLineItem';
import { Button } from '../../../shared/components/Button';
import EmptyState from '../../../shared/components/EmptyState';
import Seo from '../../../shared/components/Seo';
import { LuCircleCheck, LuCircleAlert, LuShieldCheck, LuShoppingBag } from 'react-icons/lu';

export const Cart = () => {
  const { cartItems, cartCount, cartTotal, clearCart } = useCart();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const handleProceedToCheckout = async () => {
    if (cartItems.length === 0) return;
    if (!agreedToTerms) {
      setCheckoutError('Please accept the studio commission and delivery terms before proceeding.');
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError('');

    try {
      const payload = {
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        totalAmount: cartTotal,
      };

      const res = await createCheckoutSession(payload);
      if (res.success && res.data) {
        setConfirmedOrder(res.data);
        clearCart();
      } else {
        setCheckoutError(res.message || 'Checkout session creation failed. Please try again.');
      }
    } catch (err) {
      setCheckoutError(
        err.message || 'Checkout request failed. Please check your connection or try again.'
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="w-full bg-white">
      <Seo
        title="Shopping Bag · Sabr Studio"
        description="Review your selected bespoke architectural furniture pieces and studio editions."
      />

      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-24">
        {confirmedOrder ? (
          <div className="max-w-xl mx-auto text-center space-y-6 py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center text-success">
              <LuCircleCheck className="w-8 h-8" />
            </div>
            <h1 className="font-abhaya text-3xl sm:text-5xl font-medium text-ink">
              Order Confirmed
            </h1>
            <p className="font-inter text-sm sm:text-base text-muted leading-relaxed">
              Thank you for acquiring Sabr Studio editions. Your order reference is{' '}
              <strong className="text-ink font-mono font-semibold">
                {confirmedOrder.orderNumber || confirmedOrder.id || 'SABR-CONFIRMED'}
              </strong>
              . Our logistics team will contact you to confirm production schedules and delivery coordinates.
            </p>

            <div className="bg-surface border border-border p-6 rounded-md text-left space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-border pb-2">
                <span className="text-muted">Order ID</span>
                <span className="font-mono text-ink font-medium">
                  {confirmedOrder.id || 'Pending Generation'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border pb-2">
                <span className="text-muted">Validated Amount</span>
                <span className="font-medium text-ink font-inter">
                  {formatPrice(confirmedOrder.amount || cartTotal)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Status</span>
                <span className="text-success uppercase font-semibold tracking-wider">
                  Payment Confirmed
                </span>
              </div>
            </div>

            <div className="pt-4">
              <Button
                to="/retail"
                variant="Secondary-Outline"
                label="Return to Retail Catalog"
              />
            </div>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="py-16">
            <EmptyState
              title="Your Bag is Empty"
              message="You have not selected any studio edition furniture or architectural objects yet."
              actionLabel="Browse Retail Catalog"
              actionTo="/retail"
            />
          </div>
        ) : (
          <div className="space-y-12">
            <div>
              <span className="text-xs uppercase tracking-widest text-muted font-medium block mb-2">
                Shopping Bag
              </span>
              <h1 className="font-abhaya text-3xl sm:text-5xl text-ink font-medium">
                Your Studio Selection ({cartCount})
              </h1>
            </div>

            {checkoutError && (
              <div
                role="alert"
                className="p-4 bg-error/5 border border-error/20 text-error text-xs rounded-sm flex items-start space-x-2.5"
              >
                <LuCircleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* 2-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              {/* Left: Line Items List */}
              <div className="lg:col-span-8 border-t border-border divide-y divide-border">
                {cartItems.map((item) => (
                  <div key={item.id} className="py-6">
                    <CartLineItem item={item} />
                  </div>
                ))}
              </div>

              {/* Right: Order Summary Card */}
              <div className="lg:col-span-4 bg-surface border border-border p-6 sm:p-8 rounded-md space-y-6">
                <h2 className="font-abhaya text-2xl font-medium text-ink pb-4 border-b border-border">
                  Order Summary
                </h2>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted">Item Subtotal</span>
                    <span className="font-inter font-medium text-ink text-sm">
                      {formatPrice(cartTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted">GST & Taxes</span>
                    <span className="text-muted font-medium">Included</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted">Delivery / Shipping</span>
                    <span className="text-muted font-medium">Calculated at dispatch</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-between items-baseline">
                  <span className="font-inter text-sm font-semibold text-ink uppercase tracking-wider">
                    Total
                  </span>
                  <span className="font-inter text-xl font-semibold text-ink">
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
                      className="mt-0.5 w-4 h-4 rounded-none accent-black border-border cursor-pointer"
                    />
                    <span>
                      I acknowledge that bespoke pieces are handcrafted upon order and accept the studio's dispatch timelines and return policy.
                    </span>
                  </label>
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    onClick={handleProceedToCheckout}
                    loading={checkoutLoading}
                    variant="Primary"
                    fullWidth
                    size="default"
                    label="Proceed to Checkout"
                  />
                  <div className="flex items-center justify-center space-x-2 text-[11px] text-muted">
                    <LuShieldCheck className="w-3.5 h-3.5 text-ink" />
                    <span>Secure SSL & Server-Side Tokenized Checkout</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
