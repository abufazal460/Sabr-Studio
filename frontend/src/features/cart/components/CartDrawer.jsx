import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuX, LuShoppingBag, LuPackage } from 'react-icons/lu';
import { useCart } from '../../../shared/hooks/useCart';
import useCustomer from '../../../shared/hooks/useCustomer';
import { formatPrice } from '../../../shared/utils/formatPrice';
import { Button } from '../../../shared/components/Button';
import CartLineItem from './CartLineItem';

export const CartDrawer = () => {
  const { cartItems, cartCount, cartTotal, isDrawerOpen, closeDrawer } = useCart();
  const { isAuthenticated: customerAuthed } = useCustomer();
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isDrawerOpen]);

  if (!isDrawerOpen) return null;

  const handleCheckout = () => {
    closeDrawer();
    navigate('/cart');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer container — no left padding on tiny screens */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-[100vw] sm:max-w-md bg-white shadow-hover flex flex-col border-l border-border"
        >
          {/* Header */}
          <div className="shrink-0 p-4 sm:p-6 border-b border-border flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <LuShoppingBag className="w-5 h-5 text-ink shrink-0" />
              <h2 className="font-abhaya text-xl sm:text-2xl text-ink font-medium truncate">
                Shopping Bag ({cartCount})
              </h2>
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              className="p-2 -mr-2 text-muted hover:text-ink focus:outline-none shrink-0"
              aria-label="Close cart drawer"
            >
              <LuX className="w-5 h-5" />
            </button>
          </div>

          {/* Order history lives inside the cart experience (no separate navbar item) */}
          {customerAuthed && (
            <button
              type="button"
              onClick={() => { closeDrawer(); navigate('/orders'); }}
              className="shrink-0 flex items-center justify-between w-full px-4 sm:px-6 py-3 border-b border-border text-xs font-medium text-muted hover:text-ink hover:bg-surface transition-colors"
            >
              <span className="flex items-center gap-2"><LuPackage className="w-4 h-4" />My Orders / Order History</span>
              <span aria-hidden="true">→</span>
            </button>
          )}

          {/* Item List — scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            {cartItems.length === 0 ? (
              <div className="py-12 sm:py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mx-auto text-muted">
                  <LuShoppingBag className="w-6 h-6" />
                </div>
                <p className="font-abhaya text-lg sm:text-xl text-ink">Your bag is currently empty</p>
                <p className="text-xs text-muted max-w-xs mx-auto">
                  Explore our curated retail catalog of architectural furniture and bespoke lighting.
                </p>
                <div className="pt-4">
                  <Button
                    label="Browse Retail Catalog"
                    variant="Secondary-Outline"
                    size="sm"
                    onClick={() => {
                      closeDrawer();
                      navigate('/retail');
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {cartItems.map((item) => (
                  <CartLineItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Footer Subtotal & Checkout */}
          {cartItems.length > 0 && (
            <div className="shrink-0 p-4 sm:p-6 border-t border-border bg-surface space-y-3 sm:space-y-4">
              <div className="flex justify-between items-baseline text-sm gap-2">
                <span className="text-muted">Estimated Subtotal</span>
                <span className="font-medium text-ink font-inter text-base whitespace-nowrap">
                  {formatPrice(cartTotal)}
                </span>
              </div>
              <p className="text-[11px] text-muted leading-tight">
                Taxes and white-glove shipping calculated during checkout. Subtotal is validated server-side.
              </p>
              <div className="space-y-2 pt-1 sm:pt-2">
                <Button
                  label="Proceed to Checkout"
                  variant="Primary"
                  fullWidth
                  onClick={handleCheckout}
                />
                <Button
                  label="Continue Shopping"
                  variant="Secondary-Outline"
                  fullWidth
                  onClick={closeDrawer}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
