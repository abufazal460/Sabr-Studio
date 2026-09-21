import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LuShoppingBag, LuMenu, LuX } from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { Button } from './Button';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { cartCount, openDrawer } = useCart();

  const navLinks = [
    { name: 'Projects', path: '/projects' },
    { name: 'Retail', path: '/retail' },
    { name: 'Services', path: '/services' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  // Monitor scroll offset for bottom border & background transition
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll and set up Escape key handler when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setMobileMenuOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [mobileMenuOpen]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-all duration-200 ${
        scrolled ? 'border-b border-border shadow-xs' : 'border-b border-transparent'
      }`}
    >
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
        {/* Brand Lockup */}
        <Link
          to="/"
          className="flex items-center space-x-3 group focus:outline-none"
          aria-label="Sabr Studio Home"
        >
          <span className="font-abhaya text-2xl sm:text-3xl font-medium tracking-tight text-ink group-hover:opacity-80 transition-opacity">
            Sabr Studio
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative text-sm font-medium py-1 px-1 transition-colors duration-200 group ${
                  active ? 'text-black font-semibold' : 'text-muted hover:text-black'
                }`}
              >
                <span>{link.name}</span>
                {/* Travelling underline active indicator */}
                <span
                  className={`absolute bottom-0 left-0 w-full h-[2px] bg-black transition-transform duration-200 origin-left ${
                    active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          {/* Cart Trigger */}
          <button
            type="button"
            onClick={openDrawer}
            className="relative p-2 text-ink hover:text-black transition-transform duration-150 active:scale-95 focus:outline-none"
            aria-label={`Shopping Bag with ${cartCount} items`}
          >
            <LuShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in-75">
                {cartCount}
              </span>
            )}
          </button>

          {/* Login Button */}
          <div className="hidden sm:block">
            <Button
              variant="Primary"
              size="sm"
              label="Login"
              onClick={() => {
                console.info('Login button clicked.');
              }}
              className="!px-5 !py-2 !text-xs !min-h-[36px]"
            />
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            className="md:hidden p-2 text-ink hover:text-black focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <LuX className="w-6 h-6" /> : <LuMenu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu (Slide from right, #0D0D0D background, full height) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 right-0 bottom-0 w-[80%] max-w-[360px] bg-footer-bg text-white z-50 p-6 flex flex-col justify-between md:hidden shadow-2xl"
            >
              <div className="space-y-8">
                {/* Header inside drawer */}
                <div className="flex items-center justify-between border-b border-white/15 pb-4">
                  <span className="font-abhaya text-2xl font-medium text-white">
                    Sabr Studio
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-white/80 hover:text-white focus:outline-none"
                    aria-label="Close menu"
                  >
                    <LuX className="w-6 h-6" />
                  </button>
                </div>

                {/* Nav Links Stacked */}
                <nav className="flex flex-col space-y-5" aria-label="Mobile Navigation">
                  {navLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`text-lg font-inter font-medium py-1 transition-colors ${
                        isActive(link.path)
                          ? 'text-white font-semibold underline underline-offset-8 decoration-2'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {link.name}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Bottom Actions inside drawer */}
              <div className="pt-6 border-t border-white/15 space-y-4">
                <Button
                  variant="White"
                  size="default"
                  label="Login"
                  className="w-full justify-center"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    console.info('Login button clicked.');
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openDrawer();
                  }}
                  className="w-full text-center text-sm font-medium text-white/80 hover:text-white underline py-2"
                >
                  View Bag ({cartCount})
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
