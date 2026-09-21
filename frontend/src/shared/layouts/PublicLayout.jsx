import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CartDrawer from '../../features/cart/components/CartDrawer';

export const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white text-ink antialiased selection:bg-black selection:text-white">
      <Navbar />
      <main id="main-content" className="flex-1 w-full">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
};

export default PublicLayout;
