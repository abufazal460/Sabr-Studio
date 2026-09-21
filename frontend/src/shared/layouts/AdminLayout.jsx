import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  LuLayoutDashboard,
  LuFolderGit2,
  LuPackage,
  LuMail,
  LuShoppingBag,
  LuLogOut,
  LuExternalLink,
  LuMenu,
  LuX,
} from 'react-icons/lu';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/Button';

export const AdminLayout = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LuLayoutDashboard, end: true },
    { name: 'Projects', path: '/admin/projects', icon: LuFolderGit2 },
    { name: 'Retail Items', path: '/admin/retail', icon: LuPackage },
    { name: 'Enquiries', path: '/admin/enquiries', icon: LuMail },
    { name: 'Orders', path: '/admin/orders', icon: LuShoppingBag },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-black text-white p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center space-x-2">
          <span className="font-abhaya text-xl font-medium tracking-tight">
            Sabr Studio
          </span>
          <span className="text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-sm">
            Admin
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 text-white hover:opacity-80"
          aria-label="Toggle admin menu"
        >
          {sidebarOpen ? <LuX className="w-6 h-6" /> : <LuMenu className="w-6 h-6" />}
        </button>
      </div>

      {/* Admin Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'block' : 'hidden'
        } md:block w-full md:w-64 bg-footer-bg text-footer-text border-r border-border shrink-0 z-40`}
      >
        <div className="p-6 border-b border-white/10 hidden md:flex items-center justify-between">
          <div>
            <span className="font-abhaya text-2xl font-medium text-white block">
              Sabr Studio
            </span>
            <span className="text-[11px] uppercase tracking-widest text-footer-muted">
              Management Portal
            </span>
          </div>
        </div>

        <nav className="p-4 space-y-1" aria-label="Admin Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 text-xs uppercase tracking-wider font-medium rounded-sm transition-colors ${
                    isActive
                      ? 'bg-white text-black font-semibold'
                      : 'text-footer-muted hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 mt-auto space-y-3">
          <Link
            to="/"
            className="flex items-center space-x-2 text-xs text-footer-muted hover:text-white px-4 py-2 transition-colors"
          >
            <LuExternalLink className="w-4 h-4" />
            <span>View Public Site</span>
          </Link>
          <div className="px-4 py-2 text-xs text-footer-muted truncate">
            {admin?.email || 'Administrator'}
          </div>
          <div className="px-4">
            <Button
              variant="WhiteOutline"
              size="sm"
              fullWidth
              icon={LuLogOut}
              iconPosition="left"
              label="Sign Out"
              onClick={handleLogout}
              className="!text-xs !py-2"
            />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
