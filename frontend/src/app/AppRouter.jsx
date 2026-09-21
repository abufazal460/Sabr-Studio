import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import PublicLayout from '../shared/layouts/PublicLayout';
import ProtectedRoute from './ProtectedRoute';
import Skeleton from '../shared/components/Skeleton';
import NotFoundState from '../shared/components/NotFoundState';

// Public pages (Home eager, others lazy-loaded per PERF-03)
import Home from '../features/home/pages/Home';
const ProjectsListing = lazy(() => import('../features/projects/pages/ProjectsListing'));
const ProjectDetail = lazy(() => import('../features/projects/pages/ProjectDetail'));
const RetailListing = lazy(() => import('../features/retail/pages/RetailListing'));
const RetailDetail = lazy(() => import('../features/retail/pages/RetailDetail'));
const Services = lazy(() => import('../features/services/pages/Services'));
const About = lazy(() => import('../features/about/pages/About'));
const Contact = lazy(() => import('../features/contact/pages/Contact'));
const Cart = lazy(() => import('../features/cart/pages/Cart'));

// Admin features lazy loaded per 02-frontend.md §6 (FE-31, PERF-03)
const AdminLayout = lazy(() => import('../shared/layouts/AdminLayout'));
const AdminLoginPage = lazy(() => import('../features/admin-auth/pages/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('../features/admin-dashboard/pages/AdminDashboardPage'));
const AdminProjectsPage = lazy(() => import('../features/admin-projects/pages/AdminProjectsPage'));
const AdminRetailPage = lazy(() => import('../features/admin-retail/pages/AdminRetailPage'));
const AdminEnquiriesPage = lazy(() => import('../features/admin-enquiries/pages/AdminEnquiriesPage'));
const AdminOrdersPage = lazy(() => import('../features/admin-orders/pages/AdminOrdersPage'));

const PageFallback = () => (
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
        <Route
          path="/projects"
          element={
            <Suspense fallback={<PageFallback />}>
              <ProjectsListing />
            </Suspense>
          }
        />
        <Route
          path="/projects/:slug"
          element={
            <Suspense fallback={<PageFallback />}>
              <ProjectDetail />
            </Suspense>
          }
        />
        <Route
          path="/retail"
          element={
            <Suspense fallback={<PageFallback />}>
              <RetailListing />
            </Suspense>
          }
        />
        <Route
          path="/retail/:slug"
          element={
            <Suspense fallback={<PageFallback />}>
              <RetailDetail />
            </Suspense>
          }
        />
        <Route
          path="/services"
          element={
            <Suspense fallback={<PageFallback />}>
              <Services />
            </Suspense>
          }
        />
        <Route
          path="/about"
          element={
            <Suspense fallback={<PageFallback />}>
              <About />
            </Suspense>
          }
        />
        <Route
          path="/contact"
          element={
            <Suspense fallback={<PageFallback />}>
              <Contact />
            </Suspense>
          }
        />
        <Route
          path="/cart"
          element={
            <Suspense fallback={<PageFallback />}>
              <Cart />
            </Suspense>
          }
        />
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
          <Suspense fallback={<PageFallback />}>
            <AdminLoginPage />
          </Suspense>
        }
      />

      {/* Protected Admin Portal Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageFallback />}>
              <AdminLayout />
            </Suspense>
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<PageFallback />}>
              <AdminDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="projects"
          element={
            <Suspense fallback={<PageFallback />}>
              <AdminProjectsPage />
            </Suspense>
          }
        />
        <Route
          path="retail"
          element={
            <Suspense fallback={<PageFallback />}>
              <AdminRetailPage />
            </Suspense>
          }
        />
        <Route
          path="enquiries"
          element={
            <Suspense fallback={<PageFallback />}>
              <AdminEnquiriesPage />
            </Suspense>
          }
        />
        <Route
          path="orders"
          element={
            <Suspense fallback={<PageFallback />}>
              <AdminOrdersPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
};

export default AppRouter;
