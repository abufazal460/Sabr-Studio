import React from 'react';
import { Link } from 'react-router-dom';
import { LuInstagram, LuLinkedin, LuMail, LuPhone, LuMapPin } from 'react-icons/lu';

export const Footer = () => {
  return (
    <footer className="bg-footer-bg text-footer-text border-t border-black/40">
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16">
          {/* Brand & Studio Philosophy */}
          <div className="md:col-span-5 space-y-6">
            <span className="font-abhaya text-3xl sm:text-4xl text-white font-medium block">
              Sabr Studio
            </span>
            <p className="text-footer-muted text-sm leading-relaxed max-w-sm">
              An architectural and interior design studio crafting deliberate, quiet environments. 
              We balance tactile wabi-sabi textures with brutalist spatial clarity across residential, commercial, and retail commissions.
            </p>
            <div className="pt-2 text-xs text-footer-muted uppercase tracking-wider">
              New Delhi · Established 2012
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-3 space-y-4">
            <div className="text-xs uppercase font-medium tracking-widest text-white">
              Navigation
            </div>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/projects" className="text-footer-muted hover:text-white transition-colors">
                  Architectural Projects
                </Link>
              </li>
              <li>
                <Link to="/retail" className="text-footer-muted hover:text-white transition-colors">
                  Retail & Bespoke Furniture
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-footer-muted hover:text-white transition-colors">
                  Studio Services
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-footer-muted hover:text-white transition-colors">
                  About the Studio
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-footer-muted hover:text-white transition-colors">
                  Contact & Consultations
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="text-footer-muted/60 hover:text-footer-muted text-xs transition-colors">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Studio Contact */}
          <div className="md:col-span-4 space-y-4">
            <div className="text-xs uppercase font-medium tracking-widest text-white">
              Studio Location
            </div>
            <div className="space-y-3 text-sm text-footer-muted">
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

            {/* Social Icons */}
            <div className="pt-4 flex items-center space-x-4">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Instagram"
                className="text-footer-muted hover:text-white transition-colors"
              >
                <LuInstagram className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="LinkedIn"
                className="text-footer-muted hover:text-white transition-colors"
              >
                <LuLinkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Legal / Metadata */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center text-xs text-footer-muted gap-4">
          <p>© {new Date().getFullYear()} Sabr Studio. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <span>Privacy Policy</span>
            <span>Terms of Commission</span>
            <span>WCAG 2.2 AA</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
