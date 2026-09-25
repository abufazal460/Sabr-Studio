import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { LuInstagram, LuMail, LuPhone, LuMapPin } from 'react-icons/lu';
import { FaWhatsapp, FaFacebookF, FaYoutube } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

export const Footer = () => {
  const reduceMotion = useReducedMotion();

  return (
    <footer className="bg-footer-bg text-footer-text border-t border-white/10">
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16">
          {/* Column 1 — Brand & Studio Philosophy */}
          <div className="md:col-span-5 space-y-6">
            <motion.span
              initial={reduceMotion ? false : { y: '-120%', clipPath: 'inset(0 0 100% 0)' }}
              animate={{ y: '0%', clipPath: 'inset(0 0 0% 0)' }}
              transition={
                reduceMotion ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
              }
              className="font-abhaya text-3xl sm:text-4xl text-white font-medium block"
            >
              Sabr Studio
            </motion.span>
            <p className="text-footer-muted text-sm leading-relaxed max-w-sm font-inter">
              An architectural and interior design studio crafting deliberate, quiet environments. 
              We balance tactile wabi-sabi textures with brutalist spatial clarity across residential, commercial, and retail commissions.
            </p>
            <div className="pt-2 text-xs text-footer-muted uppercase tracking-wider font-inter">
              New Delhi · Established 2012
            </div>

            {/* Social Icons with Platform Hover Brand Colors (UI-UX §41 & ANIMATION §8) */}
            <div className="pt-2 flex items-center space-x-3" aria-label="Social media links">
              <a
                href="https://wa.me/911149823000"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-footer-muted hover:text-white hover:bg-[#25D366] hover:border-[#25D366] transition duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-105"
              >
                <FaWhatsapp className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-footer-muted hover:text-white hover:bg-[#E1306C] hover:border-[#E1306C] transition duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-105"
              >
                <LuInstagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-footer-muted hover:text-white hover:bg-[#1877F2] hover:border-[#1877F2] transition duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-105"
              >
                <FaFacebookF className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-footer-muted hover:text-white hover:bg-[#334155] hover:border-[#334155] transition duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-105"
              >
                <FaXTwitter className="w-4 h-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-footer-muted hover:text-white hover:bg-[#FF0000] hover:border-[#FF0000] transition duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-105"
              >
                <FaYoutube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2 — Quick Links */}
          <div className="md:col-span-3 space-y-4">
            <div className="text-xs uppercase font-medium tracking-widest text-white font-inter">
              Quick Links
            </div>
            <ul className="space-y-2.5 text-sm font-inter">
              <li>
                <Link to="/" className="text-footer-muted hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-footer-muted hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-footer-muted hover:text-white transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/projects" className="text-footer-muted hover:text-white transition-colors">
                  Projects
                </Link>
              </li>
              <li>
                <Link to="/retail" className="text-footer-muted hover:text-white transition-colors">
                  Shop (Retail)
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-footer-muted hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li className="pt-2">
                <Link to="/admin/login" className="text-footer-muted/50 hover:text-footer-muted text-xs transition-colors">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 — Contact Info */}
          <div className="md:col-span-4 space-y-4">
            <div className="text-xs uppercase font-medium tracking-widest text-white font-inter">
              Contact Us
            </div>
            <div className="space-y-3 text-sm text-footer-muted font-inter">
              <div className="flex items-start space-x-3">
                <LuMapPin className="w-4 h-4 mt-0.5 text-white shrink-0" />
                <span>4 Design Enclave, Lado Sarai, New Delhi 110030, India</span>
              </div>
              <div className="flex items-center space-x-3">
                <LuMail className="w-4 h-4 text-white shrink-0" />
                <a href="mailto:contact@sabrstudio.com" className="hover:text-white transition-colors">
                  contact@sabrstudio.com
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <LuPhone className="w-4 h-4 text-white shrink-0" />
                <a href="tel:+911149823000" className="hover:text-white transition-colors">
                  +91 11 4982 3000
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legal / Divider (UI-UX §41) */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center text-xs text-footer-muted gap-4 font-inter">
          <p>© 2026 Sabr Studio. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white transition-colors cursor-pointer">Terms of Commission</span>
            <span>WCAG 2.2 AA</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
