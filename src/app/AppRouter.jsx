import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import PublicLayout from '../shared/layouts/PublicLayout';
import ProtectedRoute from './ProtectedRoute';
import Skeleton from '../shared/components/Skeleton';
import NotFoundState from '../shared/components/NotFoundState';

// Public pages eager loaded
import Home from '../features/home/pages/Home';
import ProjectsListing from '../features/projects/pages/ProjectsListing';
import ProjectDetail from '../features/projects/pages/ProjectDetail';
import RetailListing from '../features/retail/pages/RetailListing';
import RetailDetail from '../features/retail/pages/RetailDetail';
import Services from '../features/services/pages/Services';
import About from '../features/about/pages/About';
import Contact from '../features/contact/pages/Contact';
import Cart from '../features/cart/pages/Cart';

// Admin features lazy loaded per 02-frontend.md §6 (FE-31, PERF-03)
const AdminLayout = lazy(() => import('../shared/layouts/AdminLayout'));
const AdminLogin = lazy(() => import('../features/admin/pages/AdminLogin'));
const AdminDashboard = lazy(() => import('../features/admin/pages/AdminDashboard'));

const AdminFallback = () => (
  <div className="w-full min-h-[60vh] flex items-center justify-center p-12">
    <div className="space-y-4 max-w-md w-full">
      <Skeleton height="32px" width="60%" />
      <Skeleton height="16px" width="80%" />
      <Skeleton height="240px" />
    </div>
  </div>
);

export const AppRouter = () => {
  return (
    <Routes>
      {/* Public Layout Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<ProjectsListing />} />
        <Route path="/projects/:slug" element={<ProjectDetail />} />
        <Route path="/retail" element={<RetailListing />} />
        <Route path="/retail/:slug" element={<RetailDetail />} />
        <Route path="/services" element={<Services />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/cart" element={<Cart />} />
        <Route
          path="*"
          element={
            <div className="py-24 max-w-container mx-auto px-5 sm:px-8">
              <NotFoundState
                title="Page Not Found"
                message="The page you requested does not exist or has been relocated."
                backTo="/"
                backLabel="Return to Homepage"
              />
            </div>
          }
        />
      </Route>

      {/* Standalone Admin Login (No Public Layout / No Sidebar) */}
      <Route
        path="/admin/login"
        element={
          <Suspense fallback={<AdminFallback />}>
            <AdminLogin />
          </Suspense>
        }
      />

      {/* Protected Admin Portal Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Suspense fallback={<AdminFallback />}>
              <AdminLayout />
            </Suspense>
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminDashboard />
            </Suspense>
          }
        />
        <Route
          path="projects"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminDashboard />
            </Suspense>
          }
        />
        <Route
          path="retail"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminDashboard />
            </Suspense>
          }
        />
        <Route
          path="enquiries"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminDashboard />
            </Suspense>
          }
        />
        <Route
          path="orders"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminDashboard />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
};

export default AppRouter;
