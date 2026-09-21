import React, { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { CartProvider } from '../shared/context/CartContext';
import { AuthProvider } from '../shared/context/AuthContext';
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
        <CartProvider>
          <ScrollToTop />
          <AppRouter />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
