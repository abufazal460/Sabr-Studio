import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../../shared/hooks/useCart';
import { formatPrice } from '../../../shared/utils/formatPrice';
import CartLineItem from '../components/CartLineItem';
import { Button } from '../../../shared/components/Button';
import EmptyState from '../../../shared/components/EmptyState';
import Seo from '../../../shared/components/Seo';
import { LuCircleAlert, LuShieldCheck } from 'react-icons/lu';

export const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal } = useCart();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

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

      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-24">
        {cartItems.length === 0 ? (
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
                Your Studio Selection ({cartItems.length})
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
                    variant="Primary"
                    fullWidth
                    size="default"
                    label="Proceed to Checkout"
                  />
                  <div className="flex items-center justify-center space-x-2 text-[11px] text-muted">
                    <LuShieldCheck className="w-3.5 h-3.5 text-ink" />
                    <span>Address & verified Razorpay payment next — bag stays safe</span>
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
