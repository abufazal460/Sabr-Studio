import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LuShoppingBag, LuMenu, LuX } from 'react-icons/lu';
import { useCart } from '../context/CartContext';
import { Button } from './Button';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { cartCount, openDrawer } = useCart();

  const navLinks = [
    { name: 'Projects', path: '/projects' },
    { name: 'Retail', path: '/retail' },
    { name: 'Services', path: '/services' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border transition-colors duration-200">
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
        {/* Brand Lockup */}
        <Link
          to="/"
          className="flex items-center space-x-3 group"
          aria-label="Sabr Studio Home"
        >
          <span className="font-abhaya text-2xl sm:text-3xl font-medium tracking-tight text-ink group-hover:opacity-80 transition-opacity">
            Sabr Studio
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium transition-colors duration-200 py-1 ${
                isActive(link.path)
                  ? 'text-black border-b-2 border-black font-semibold'
                  : 'text-muted hover:text-black'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          {/* Cart Trigger */}
          <button
            type="button"
            onClick={openDrawer}
            className="relative p-2 text-ink hover:text-black transition-transform duration-150 active:scale-95"
            aria-label={`Shopping Bag with ${cartCount} items`}
          >
            <LuShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-medium w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in-75">
                {cartCount}
              </span>
            )}
          </button>

          {/* Login Button: Rendered per UI-UX §26-28 as Primary pill, unwired per Conflict C2 */}
          <div className="hidden sm:block">
            <Button
              variant="Primary"
              size="sm"
              label="Login"
              onClick={() => {
                // Explicit TODO per 02-frontend.md Conflict C2: pending client confirmation for customer login flow
                console.info('Login button clicked (customer login flow pending client confirmation per C2).');
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

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-white px-6 py-6 space-y-4">
          <div className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-base font-medium py-2 ${
                  isActive(link.path) ? 'text-black font-semibold' : 'text-muted hover:text-black'
                }`}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-border flex justify-between items-center">
              <Button
                variant="Primary"
                size="sm"
                label="Login"
                onClick={() => {
                  setMobileMenuOpen(false);
                  console.info('Login button clicked (customer login flow pending client confirmation per C2).');
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openDrawer();
                }}
                className="text-sm font-medium text-black underline"
              >
                View Bag ({cartCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
