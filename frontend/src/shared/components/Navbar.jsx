import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LuShoppingBag, LuMenu, LuX } from 'react-icons/lu';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { cartCount, openDrawer } = useCart();
  const { isAuthenticated } = useAuth();
  const reduceMotion = useReducedMotion();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Projects', path: '/projects' },
    { name: 'Retail', path: '/retail' },
    { name: 'Services', path: '/services' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  // Monitor scroll offset for bottom border transition (position/visibility stay constant)
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

  const activeIndex = navLinks.findIndex((link) => isActive(link.path));
  // Indicator rests on the active route item; slides to the hovered item; returns on mouse leave.
  const indicatorIndex = hoveredIndex !== null ? hoveredIndex : activeIndex;

  // Entrance: descend into place while being uncovered by a clip-path mask (compositor-only).
  const enter = (delay) => ({
    initial: reduceMotion ? false : { y: '-120%', clipPath: 'inset(0 0 100% 0)' },
    animate: { y: '0%', clipPath: 'inset(0 0 0% 0)' },
    transition: reduceMotion
      ? { duration: 0 }
      : { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay },
  });

  // Shared sliding indicator: transform-based layout projection, snappy spring (~250-300ms).
  const indicatorTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 500, damping: 38, mass: 0.9 };

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-colors duration-200 ${
        scrolled ? 'border-b border-border shadow-xs' : 'border-b border-transparent'
      }`}
    >
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
        {/* Brand Lockup */}
        <motion.div {...enter(0)}>
          <Link
            to="/"
            className="flex items-center space-x-3 group focus:outline-none"
            aria-label="Sabr Studio Home"
          >
            <span className="font-abhaya text-2xl sm:text-3xl font-medium tracking-tight text-ink group-hover:opacity-80 transition-opacity">
              Sabr Studio
            </span>
          </Link>
        </motion.div>

        {/* Desktop Navigation */}
        <motion.nav
          {...enter(0.08)}
          className="hidden md:flex items-center space-x-8"
          aria-label="Main Navigation"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {navLinks.map((link, index) => {
            const active = isActive(link.path);
            const isTarget = index === indicatorIndex;
            return (
              <Link
                key={link.path}
                to={link.path}
                onMouseEnter={() => setHoveredIndex(index)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
                aria-current={active ? 'page' : undefined}
                className={`relative block rounded-md px-3 py-1.5 text-sm transition-colors duration-200 focus:outline-none ${
                  active ? 'font-semibold' : 'font-medium'
                } ${isTarget ? 'text-white' : 'text-muted'}`}
              >
                {isTarget && (
                  <motion.span
                    layoutId="navbar-active-indicator"
                    className="absolute inset-0 rounded-md bg-black"
                    aria-hidden="true"
                    transition={indicatorTransition}
                  />
                )}
                <span className="relative z-10">{link.name}</span>
              </Link>
            );
          })}
        </motion.nav>

        {/* Action Controls */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          {/* Cart Trigger */}
          <motion.div {...enter(0.24)}>
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
          </motion.div>

          {/* Login Button */}
          <motion.div {...enter(0.16)} className="hidden sm:block">
            <Button
              variant="Primary"
              size="sm"
              label={isAuthenticated ? 'Admin' : 'Login'}
              onClick={() => {
                navigate(isAuthenticated ? '/admin' : '/admin/login');
              }}
              className="!px-5 !py-2 !text-xs !min-h-[36px]"
            />
          </motion.div>

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
                  label={isAuthenticated ? 'Admin' : 'Login'}
                  className="w-full justify-center"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(isAuthenticated ? '/admin' : '/admin/login');
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
