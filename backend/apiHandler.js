import { authController } from './controllers/auth.controller.js';
import { projectController } from './controllers/project.controller.js';
import { retailController } from './controllers/retail.controller.js';
import { enquiryController } from './controllers/enquiry.controller.js';
import { orderController } from './controllers/order.controller.js';

import { projectService } from './services/project.service.js';
import { retailService } from './services/retail.service.js';
import { enquiryService } from './services/enquiry.service.js';
import { orderService } from './services/order.service.js';

import { protect } from './middlewares/protect.middleware.js';
import { authLimiter, adminLimiter, generalLimiter, enquiryLimiter } from './middlewares/rateLimit.middleware.js';

import { loginValidator } from './validators/auth.validator.js';
import {
  createProjectValidator,
  updateProjectValidator,
} from './validators/project.validator.js';
import {
  createRetailValidator,
  updateRetailValidator,
} from './validators/retail.validator.js';
import {
  createEnquiryValidator,
  updateEnquiryStatusValidator,
} from './validators/enquiry.validator.js';
import {
  checkoutValidator,
  verifyPaymentValidator,
  updateOrderStatusValidator,
} from './validators/order.validator.js';

export function apiHandler(req, res, next) {
  // If next is provided (Express/Connect middleware style) and the path is not
  // an API/health path, pass through to static + SPA handling downstream.
  if (next && req.url && !req.url.startsWith('/api') && !req.url.startsWith('/health')) {
    return next();
  }
  return handleApiRequest(req, res);
}

export default function handleApiRequest(req, res) {
  const method = req.method;
  const [pathname, queryString] = (req.url || '').split('?');
  const path = pathname;

  // Decorate res with standard Express-like methods if missing
  if (!res.status) {
    res.status = function (statusCode) {
      res.statusCode = statusCode;
      return this;
    };
  }
  if (!res.json) {
    res.json = function (data) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return this;
    };
  }
  if (!res.send) {
    res.send = function (body) {
      if (typeof body === 'object' && body !== null) {
        return res.json(body);
      }
      res.end(body);
      return this;
    };
  }
  if (!res.cookie) {
    res.cookie = function (name, value, options = {}) {
      let cookieStr = `${name}=${encodeURIComponent(value)}; Path=${options.path || '/'}`;
      if (options.maxAge) cookieStr += `; Max-Age=${Math.floor(options.maxAge / 1000)}`;
      if (options.httpOnly) cookieStr += '; HttpOnly';
      if (options.secure) cookieStr += '; Secure';
      if (options.sameSite) cookieStr += `; SameSite=${options.sameSite}`;
      const existing = res.getHeader('Set-Cookie');
      if (!existing) {
        res.setHeader('Set-Cookie', cookieStr);
      } else if (Array.isArray(existing)) {
        res.setHeader('Set-Cookie', [...existing, cookieStr]);
      } else {
        res.setHeader('Set-Cookie', [existing, cookieStr]);
      }
      return this;
    };
  }
  if (!res.clearCookie) {
    res.clearCookie = function (name, options = {}) {
      let cookieStr = `${name}=; Path=${options.path || '/'}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      if (options.httpOnly) cookieStr += '; HttpOnly';
      if (options.secure) cookieStr += '; Secure';
      if (options.sameSite) cookieStr += `; SameSite=${options.sameSite || 'lax'}`;
      res.setHeader('Set-Cookie', cookieStr);
      return this;
    };
  }

  // Parse cookies into req.cookies if not populated
  if (!req.cookies) {
    req.cookies = {};
    if (req.headers && req.headers.cookie) {
      req.headers.cookie.split(';').forEach((part) => {
        const idx = part.indexOf('=');
        if (idx > -1) {
          const k = part.slice(0, idx).trim();
          const v = part.slice(idx + 1).trim();
          req.cookies[k] = decodeURIComponent(v);
        }
      });
    }
  }

  // Parse query parameters into req.query if not populated
  if (!req.query) {
    req.query = {};
    if (queryString) {
      const searchParams = new URLSearchParams(queryString);
      for (const [k, v] of searchParams.entries()) {
        req.query[k] = v;
      }
    }
  }

  // Helper body reader
  const parseBody = (cb) => {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      return cb(req.body);
    }
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        req.body = parsed;
        cb(parsed);
      } catch {
        req.body = {};
        cb({});
      }
    });
  };

  // Helper middleware runner
  const runMiddlewareChain = (middlewares, finalHandler) => {
    let idx = 0;
    const next = (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message || 'Internal server error',
        });
      }
      if (idx < middlewares.length) {
        const mw = middlewares[idx++];
        mw(req, res, next);
      } else {
        finalHandler();
      }
    };
    next();
  };

  // -------------------------------------------------------------
  // Health-check endpoint (unauthenticated)
  // -------------------------------------------------------------
  if ((path === '/health' || path === '/api/health') && method === 'GET') {
    return res.status(200).json({ status: 'ok' });
  }

  // -------------------------------------------------------------
  // Route dispatch. Wrapped by the general rate limiter for public
  // data routes; auth/admin groups apply their own limiters inside.
  // The limiter calls its callback asynchronously, so dispatch MUST
  // run inside that callback (never via a synchronous flag).
  // -------------------------------------------------------------
  const dispatch = () => {
    // 1. Authentication Endpoints (05-auth.md)
    if (path === '/api/auth/login' && method === 'POST') {
      return parseBody(() => {
        return runMiddlewareChain([authLimiter, ...loginValidator], () => {
          authController.login(req, res);
        });
      });
    }

    if (path === '/api/auth/me' && method === 'GET') {
      return protect(req, res, () => {
        authController.getMe(req, res);
      });
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      return authController.logout(req, res);
    }

    // 2. Public Projects Endpoints (06-features.md §4.2)
    if (path === '/api/projects' && method === 'GET') {
      return projectController.getPublicProjects(req, res);
    }

    if (path.startsWith('/api/projects/') && method === 'GET') {
      const slug = path.replace('/api/projects/', '');
      req.params = { slug };
      return projectController.getPublicProjectBySlug(req, res);
    }

    // 3. Public Retail Endpoints (06-features.md §4.3)
    if (path === '/api/retail' && method === 'GET') {
      return retailController.getPublicRetail(req, res);
    }

    if (path.startsWith('/api/retail/') && method === 'GET') {
      const slug = path.replace('/api/retail/', '');
      req.params = { slug };
      return retailController.getPublicRetailBySlug(req, res);
    }

    // 4. Public Enquiry Endpoint (06-features.md §4.6)
    if (path === '/api/enquiries' && method === 'POST') {
      return parseBody(() => {
        return runMiddlewareChain([enquiryLimiter, ...createEnquiryValidator], () => {
          enquiryController.createEnquiry(req, res);
        });
      });
    }

    // 5. Public Checkout & Payment Endpoints (06-features.md §4.8)
    if ((path === '/api/checkout' || path === '/api/orders/checkout') && method === 'POST') {
      return parseBody(() => {
        return runMiddlewareChain([...checkoutValidator], () => {
          orderController.checkout(req, res);
        });
      });
    }

    if ((path === '/api/checkout/verify' || path === '/api/orders/verify') && method === 'POST') {
      return parseBody(() => {
        return runMiddlewareChain([...verifyPaymentValidator], () => {
          orderController.verifyPayment(req, res);
        });
      });
    }

    // 6. Admin Routes (guarded by adminLimiter + protect middleware)
    if (path.startsWith('/api/admin')) {
      return adminLimiter(req, res, () => {
        return protect(req, res, async () => {
          // 6.1 Admin Stats Overview
          if (path === '/api/admin/stats' && method === 'GET') {
            const [projects, products, enquiries, orders] = await Promise.all([
              projectService.getAdminProjects(),
              retailService.getAdminRetail(),
              enquiryService.getAdminEnquiries(),
              orderService.getAdminOrders(),
            ]);
            const revenue = orders
              .filter((o) => o.paymentStatus === 'paid' || o.payment?.verified)
              .reduce((sum, o) => sum + (o.amount || o.totalAmount || 0), 0);

            return res.status(200).json({
              success: true,
              data: {
                totalProjects: projects.length,
                totalProducts: products.length,
                totalEnquiries: enquiries.length,
                totalOrders: orders.length,
                revenue,
              },
            });
          }

          // 6.2 Admin Projects CRUD
          if (path === '/api/admin/projects' && method === 'GET') {
            return projectController.getAdminProjects(req, res);
          }

          if (path === '/api/admin/projects' && method === 'POST') {
            return parseBody(() => {
              return runMiddlewareChain([...createProjectValidator], () => {
                projectController.createProject(req, res);
              });
            });
          }

          if (path.startsWith('/api/admin/projects/') && method === 'GET') {
            const id = path.replace('/api/admin/projects/', '');
            req.params = { id };
            return projectController.getAdminProjectById(req, res);
          }

          if (path.startsWith('/api/admin/projects/') && method === 'PUT') {
            const id = path.replace('/api/admin/projects/', '');
            req.params = { id };
            return parseBody(() => {
              return runMiddlewareChain([...updateProjectValidator], () => {
                projectController.updateProject(req, res);
              });
            });
          }

          if (path.startsWith('/api/admin/projects/') && method === 'DELETE') {
            const id = path.replace('/api/admin/projects/', '');
            req.params = { id };
            return projectController.deleteProject(req, res);
          }

          // 6.3 Admin Retail CRUD
          if (path === '/api/admin/retail' && method === 'GET') {
            return retailController.getAdminRetail(req, res);
          }

          if (path === '/api/admin/retail' && method === 'POST') {
            return parseBody(() => {
              return runMiddlewareChain([...createRetailValidator], () => {
                retailController.createRetailItem(req, res);
              });
            });
          }

          if (path.startsWith('/api/admin/retail/') && method === 'GET') {
            const id = path.replace('/api/admin/retail/', '');
            req.params = { id };
            return retailController.getAdminRetailById(req, res);
          }

          if (path.startsWith('/api/admin/retail/') && method === 'PUT') {
            const id = path.replace('/api/admin/retail/', '');
            req.params = { id };
            return parseBody(() => {
              return runMiddlewareChain([...updateRetailValidator], () => {
                retailController.updateRetailItem(req, res);
              });
            });
          }

          if (path.startsWith('/api/admin/retail/') && method === 'DELETE') {
            const id = path.replace('/api/admin/retail/', '');
            req.params = { id };
            return retailController.deleteRetailItem(req, res);
          }

          // 6.4 Admin Enquiry Management
          if (path === '/api/admin/enquiries' && method === 'GET') {
            return enquiryController.getAdminEnquiries(req, res);
          }

          if (path.startsWith('/api/admin/enquiries/') && path.endsWith('/status') && method === 'PATCH') {
            const id = path.replace('/api/admin/enquiries/', '').replace('/status', '');
            req.params = { id };
            return parseBody(() => {
              return runMiddlewareChain([...updateEnquiryStatusValidator], () => {
                enquiryController.updateEnquiryStatus(req, res);
              });
            });
          }

          if (path.startsWith('/api/admin/enquiries/') && method === 'GET') {
            const id = path.replace('/api/admin/enquiries/', '');
            req.params = { id };
            return enquiryController.getAdminEnquiryById(req, res);
          }

          if (path.startsWith('/api/admin/enquiries/') && method === 'DELETE') {
            const id = path.replace('/api/admin/enquiries/', '');
            req.params = { id };
            return enquiryController.deleteEnquiry(req, res);
          }

          // 6.5 Admin Order Management (orderStatus only; paymentStatus is never admin-editable)
          if (path === '/api/admin/orders' && method === 'GET') {
            return orderController.getAdminOrders(req, res);
          }

          if (path.startsWith('/api/admin/orders/') && path.endsWith('/status') && method === 'PATCH') {
            const id = path.replace('/api/admin/orders/', '').replace('/status', '');
            req.params = { id };
            return parseBody(() => {
              return runMiddlewareChain([...updateOrderStatusValidator], () => {
                orderController.updateOrderStatus(req, res);
              });
            });
          }

          if (path.startsWith('/api/admin/orders/') && method === 'GET') {
            const id = path.replace('/api/admin/orders/', '');
            req.params = { id };
            return orderController.getAdminOrderById(req, res);
          }

          // 6.6 Admin Cloudinary Upload Endpoint (06-features.md §5.7)
          if (path === '/api/admin/uploads' && method === 'POST') {
            return parseBody(() => {
              const sampleUpload = {
                url: req.body?.url || 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
                publicId: `sabr_upload_${Date.now()}`,
              };
              return res.status(201).json({
                success: true,
                data: { images: [sampleUpload] },
              });
            });
          }

          return res.status(404).json({
            success: false,
            message: `Admin route ${method} ${path} not found`,
          });
        });
      });
    }

    // Fallback 404 for unknown /api routes
    return res.status(404).json({
      success: false,
      message: `Route ${method} ${path} not found`,
    });
  };

  // Auth and admin groups have dedicated limiters; health is unauthenticated.
  const isRateLimitExempt =
    path === '/health' ||
    path === '/api/health' ||
    path.startsWith('/api/auth') ||
    path.startsWith('/api/admin');

  if (isRateLimitExempt) return dispatch();
  return generalLimiter(req, res, dispatch);
}
