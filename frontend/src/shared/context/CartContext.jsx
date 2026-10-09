import React, { createContext, useState, useEffect, useCallback } from 'react';

export const CartContext = createContext(null);

const STORAGE_KEY = 'sabr_cart_v1';

// Canonical product identity: Mongo docs expose `_id` only via .lean()
// (no virtual `id`), while in-memory/seed items expose `id`/`_id`/`slug`
// interchangeably. Compare all three as strings (ObjectId vs string safe)
const getProductKey = (product) =>
  String(product?.id ?? product?._id ?? product?.slug ?? '');

function loadPersistedCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((i) => i && (i.id || i._id || i.slug)) : [];
  } catch { return []; }
}

export const CartProvider = ({ children }) => {
  // Persisted across refresh (fixes lost-cart on login/address/Razorpay steps)
  const [cartItems, setCartItems] = useState(loadPersistedCart);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems)); } catch {}
  }, [cartItems ]);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  // Canonical product identity: Mongo docs expose `_id` only via .lean()
  // (no virtual `id`), while in-memory/seed items expose `id`/`_id`/`slug`
  // interchangeably. Compare all three as strings (ObjectId vs string safe)
  // so the same product arriving from different API responses is never
  // duplicated. Never use object identity.
  const getProductKey = (product) =>
    String(product?.id ?? product?._id ?? product?.slug ?? '');

  const matchesKey = (item, key) => key !== '' && getProductKey(item) === key;

  const matchesId = (item, productId) => {
    const target = String(productId ?? '');
    return (
      String(item.id ?? '') === target ||
      String(item._id ?? '') === target ||
      String(item.slug ?? '') === target
    );
  };

  const addToCart = (product, quantity = 1) => {
    const key = getProductKey(product);
    const normalizedId = product?.id ?? product?._id ?? product?.slug;
    setCartItems((prev) => {
      // Same product already in cart → increase its quantity, never duplicate.
      if (key && prev.some((item) => matchesKey(item, key))) {
        return prev.map((item) =>
          matchesKey(item, key)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, id: normalizedId, quantity }];
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => !matchesId(item, productId)));
  };

  const updateQuantity = (productId, quantity) => {
    // Minimum quantity is 1: minus at 1 does nothing; ONLY Remove deletes.
    if (quantity < 1) {
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (matchesId(item, productId) ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  // Remove ONLY purchased items after verified payment (never whole-cart on failure).
  const removePurchasedItems = useCallback((purchasedIds) => {
    const set = new Set((purchasedIds || []).map((x) => String(x)));
    if (!set.size) return;
    setCartItems((prev) => prev.filter((item) => {
      const keys = [item.id, item._id, item.slug, item.itemId, item.productId].filter(Boolean).map(String);
      return !keys.some((k) => set.has(k));
    }));
  }, []);

  // Badge = UNIQUE products only (never sum of quantities).
  const cartCount = cartItems.length;
  const cartTotal = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        removePurchasedItems,
        cartCount,
        cartTotal,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartProvider;
