import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LuShoppingBag, LuMenu, LuX, LuUser } from 'react-icons/lu';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../hooks/useAuth';
import useCustomer from '../hooks/useCustomer';
import { Button } from './Button';
import AuthModal from '../../features/checkout/components/AuthModal';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const userMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { cartCount, openDrawer } = useCart();
  const { isAuthenticated } = useAuth();
  const { isAuthenticated: customerAuthed, customer, logout } = useCustomer();
  const reduceMotion = useReducedMotion();

  const goAccount = (path) => { setUserMenuOpen(false); setMobileMenuOpen(false); navigate(path); };
  const openCustomerAuth = () => { setUserMenuOpen(false); setMobileMenuOpen(false); setAuthOpen(true); };
  const handleCustomerLogout = async () => { setUserMenuOpen(false); setMobileMenuOpen(false); try { await logout(); } catch {} navigate('/'); };
  // Logged-out -> open login modal. Logged-in (customer or admin) -> account menu.
  const handleUserIcon = () => {
    if (customerAuthed || isAuthenticated) setUserMenuOpen((v) => !v);
    else openCustomerAuth();
  };

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

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!userMenuOpen) return;
    const onDown = (e) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setUserMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [userMenuOpen]);

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
      <div className="max-w-container-wide mx-auto px-4 sm:px-8 lg:px-12 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Lockup */}
        <motion.div {...enter(0)} className="shrink-0">
          <Link
            to="/"
            className="flex items-center space-x-3 group focus:outline-none"
            aria-label="Sabr Studio Home"
          >
            <span className="font-abhaya text-xl sm:text-2xl lg:text-3xl font-medium tracking-tight text-ink group-hover:opacity-80 transition-opacity">
              Sabr Studio
            </span>
          </Link>
        </motion.div>

        {/* Desktop Navigation */}
        <motion.nav
          {...enter(0.08)}
          className="hidden lg:flex items-center space-x-8"
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
                className={`relative block rounded-md px-3 py-1.5 text-sm transition-colors duration-200 focus:outline-none whitespace-nowrap ${
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
        <div className="flex items-center space-x-1 sm:space-x-3 lg:space-x-4 shrink-0">
          {/* Admin Login — visible only on desktop (lg+) when admin is NOT logged in */}
          <motion.div {...enter(0.16)} className="hidden sm:block">
            <Button
              variant="Primary"
              size="sm"
              label="Admin"
              onClick={() => {
                navigate(isAuthenticated ? '/admin' : '/admin/login');
              }}
              className="!px-5 !py-2 !text-xs !min-h-[36px]"
            />
          </motion.div>

          {/* Account (user icon) — visible on sm+ screens */}
          <motion.div {...enter(0.16)} className="relative hidden sm:block" ref={userMenuRef}>
            <button
              type="button"
              onClick={handleUserIcon}
              aria-label="Your account"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              className="p-2 text-ink hover:text-black transition-transform duration-150 active:scale-95 focus:outline-none"
            >
              <LuUser className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-52 bg-white border border-border rounded-md shadow-hover py-2 z-50"
                  role="menu"
                >
                  {customerAuthed && (
                    <div className="px-4 py-2 border-b border-border mb-1">
                      <p className="text-xs font-medium text-ink truncate">{customer?.name}</p>
                      <p className="text-[11px] text-muted truncate">{customer?.email}</p>
                    </div>
                  )}
                  {customerAuthed && (
                    <>
                      <button type="button" role="menuitem" onClick={() => goAccount('/account')} className="w-full text-left px-4 py-2 text-xs font-medium text-muted hover:text-ink hover:bg-surface transition-colors">Profile</button>
                      <button type="button" role="menuitem" onClick={() => goAccount('/orders')} className="w-full text-left px-4 py-2 text-xs font-medium text-muted hover:text-ink hover:bg-surface transition-colors">My Orders</button>
                    </>
                  )}
                  {isAuthenticated && (
                    <button type="button" role="menuitem" onClick={() => goAccount('/admin')} className="w-full text-left px-4 py-2 text-xs font-medium text-muted hover:text-ink hover:bg-surface transition-colors">Admin Panel</button>
                  )}
                  {customerAuthed ? (
                    <button type="button" role="menuitem" onClick={handleCustomerLogout} className="w-full text-left px-4 py-2 text-xs font-medium text-muted hover:text-ink hover:bg-surface transition-colors border-t border-border mt-1 !pt-3">Logout</button>
                  ) : (
                    <button type="button" role="menuitem" onClick={openCustomerAuth} className="w-full text-left px-4 py-2 text-xs font-medium text-muted hover:text-ink hover:bg-surface transition-colors">Login / Register</button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Cart Trigger */}
          <motion.div {...enter(0.24)} className='p-2'>
            <button
              type="button"
              onClick={openDrawer}
              className="relative p-2 text-ink hover:text-black transition-transform duration-150 active:scale-95 focus:outline-none"
              aria-label={`Shopping Bag with ${cartCount} items`}
            >
              <LuShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-black text-white text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in-75">
                  {cartCount}
                </span>
              )}
            </button>
          </motion.div>

          {/* Mobile Hamburger Toggle — visible below lg breakpoint */}
          <button
            type="button"
            className="lg:hidden p-2 text-ink hover:text-black focus:outline-none"
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
            {/* Backdrop Overlay — matches lg:hidden to align with drawer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[360px] bg-footer-bg text-white z-50 flex flex-col lg:hidden shadow-2xl overflow-hidden"
            >
              {/* Fixed header inside drawer */}
              <div className="shrink-0 px-5 pt-5 pb-4 border-b border-white/15">
                <div className="flex items-center justify-between">
                  <span className="font-abhaya text-xl sm:text-2xl font-medium text-white">
                    Sabr Studio
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 -mr-2 text-white/80 hover:text-white focus:outline-none"
                    aria-label="Close menu"
                  >
                    <LuX className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6">
                {/* Nav Links Stacked */}
                <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
                  {navLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`text-base sm:text-lg font-inter font-medium py-2.5 px-2 rounded-md transition-colors ${
                        isActive(link.path)
                          ? 'text-white font-semibold bg-white/10'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {link.name}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Fixed bottom actions inside drawer */}
              <div className="shrink-0 px-5 py-5 border-t border-white/15 space-y-3">
                {customerAuthed ? (
                  <div className="space-y-2">
                    <button type="button" onClick={() => goAccount('/account')} className="w-full text-left text-sm font-medium text-white/80 hover:text-white py-2 px-2 rounded-md hover:bg-white/5 transition-colors">Profile</button>
                    <button type="button" onClick={() => goAccount('/orders')} className="w-full text-left text-sm font-medium text-white/80 hover:text-white py-2 px-2 rounded-md hover:bg-white/5 transition-colors">My Orders</button>
                    <button type="button" onClick={handleCustomerLogout} className="w-full text-left text-sm font-medium text-white/80 hover:text-white py-2 px-2 rounded-md hover:bg-white/5 transition-colors">Logout</button>
                  </div>
                ) : (
                  <Button
                    variant="White"
                    size="default"
                    label="Login / Register"
                    className="w-full justify-center"
                    onClick={openCustomerAuth}
                  />
                )}
                {isAuthenticated ? (
                  <Button
                    variant="White"
                    size="default"
                    label="Admin Panel"
                    className="w-full justify-center"
                    onClick={() => goAccount('/admin')}
                  />
                ) : (
                  <Button
                    variant="WhiteOutline"
                    size="sm"
                    label="Admin Login"
                    className="w-full justify-center border border-red-500"
                    onClick={() => goAccount('/admin/login')}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openDrawer();
                  }}
                  className="w-full text-center text-sm font-medium text-white/80 hover:text-white py-2 rounded-md hover:bg-white/5 transition-colors"
                >
                  View Bag ({cartCount})
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Customer login / register / OTP / Google modal */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />
    </header>
  );
};

export default Navbar;
