import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { LuInstagram, LuMail, LuPhone } from 'react-icons/lu';
import { FaWhatsapp, FaFacebookF, FaYoutube } from 'react-icons/fa';
import footerLogo from "../../assets/icons/brand-logo-navbar.svg"

export const Footer = () => {
  const reduceMotion = useReducedMotion();

  return (
    <footer className="bg-footer-bg text-footer-text border-t border-white/10">
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16">
          {/* Column 1 — Brand & Studio Philosophy */}
          <div className="md:col-span-5 space-y-6">

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
              }
              className="flex items-center"
            >
              <Link
                to="/"
                aria-label="Sabr Studio home"
                className="inline-flex items-center shrink-0 rounded-lg bg-white px-4 py-2.5 shadow-[0_2px_12px_rgba(255,255,255,0.12)] transition-shadow duration-300 hover:shadow-[0_4px_18px_rgba(255,255,255,0.2)]"
              >
                <img
                  src={footerLogo}
                  alt="Sabr Studio"
                  className="block h-12 w-auto max-w-[200px] object-contain object-left sm:h-[52px] md:h-14"
                  width="200"
                  height="56"
                  decoding="async"
                />
              </Link>
            </motion.div>

            <p className="text-footer-muted text-sm leading-relaxed max-w-sm font-inter">
              A design studio blending natural textures, thoughtful layouts, and timeless furnishings to create meaningful spaces. From residential and commercial interiors to space planning, furniture layouts, 3D visualization, and material and colour consultation, every detail is shaped with purpose.
            </p>
            <div className="pt-2 text-xs text-footer-muted uppercase tracking-wider font-inter">
              New Delhi · Established 2017
            </div>

            {/* Social Icons with Platform Hover Brand Colors (UI-UX §41 & ANIMATION §8) */}
            <div className="pt-2 flex items-center space-x-3" aria-label="Social media links">
              <a
                href="https://wa.me/9958402801"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-footer-muted hover:text-white hover:bg-[#25D366] hover:border-[#25D366] transition duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-105"
              >
                <FaWhatsapp className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/sabrstudio.design?utm_source=qr"
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

              <div className="flex items-center space-x-3">
                <LuMail className="w-4 h-4 text-white shrink-0" />
                <a href="mailto:sabrstudio.design@gmail.com" className="hover:text-white transition-colors">
                  sabrstudio.design@gmail.com
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <LuPhone className="w-4 h-4 text-white shrink-0" />
                <a href="tel:+911149823000" className="hover:text-white transition-colors">
                  +91 8700655802
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
