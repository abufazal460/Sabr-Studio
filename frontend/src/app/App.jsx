import React, { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { CartProvider } from '../shared/context/CartContext';
import { AuthProvider } from '../shared/context/AuthContext';
import { CustomerProvider } from '../shared/context/CustomerContext';
import { SmoothScrollProvider } from '../shared/hooks/useLenisScroll';
import AppRouter from './AppRouter';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CustomerProvider>
          <CartProvider>
            <SmoothScrollProvider>
              <ScrollToTop />
              <AppRouter />
            </SmoothScrollProvider>
          </CartProvider>
        </CustomerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
