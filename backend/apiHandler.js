import { authController } from './controllers/auth.controller.js';
import { protect } from './middlewares/protect.middleware.js';
import { authLimiter } from './middlewares/rateLimit.middleware.js';
import { loginValidator } from './validators/auth.validator.js';

// In-memory data store for immediate boot and local dev fallback
const initialProjects = [
  {
    id: 'proj-1',
    slug: 'the-vasant-vihar-residence',
    title: 'The Vasant Vihar Residence',
    category: 'Residential',
    location: 'New Delhi',
    year: '2024',
    area: '4,500 sq.ft',
    description: 'A serene sanctuary in South Delhi balancing brutalist architectural geometries with tactile wabi-sabi finishes.',
    coverImage: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
    ],
    featured: true,
    published: true
  },
  {
    id: 'proj-2',
    slug: 'studio-pavilion',
    title: 'Studio Pavilion & Creative Workspace',
    category: 'Commercial',
    location: 'Gurugram',
    year: '2023',
    area: '3,200 sq.ft',
    description: 'An open-concept creative studio fostering quiet focus through acoustic limewash surfaces and natural ventilation.',
    coverImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80'
    ],
    featured: true,
    published: true
  },
  {
    id: 'proj-3',
    slug: 'aura-wellness-haven',
    title: 'Aura Wellness Haven',
    category: 'Hospitality',
    location: 'North Goa',
    year: '2024',
    area: '6,800 sq.ft',
    description: 'A boutique wellness retreat rooted in local terracotta craft, sheltered courtyards, and filtered tropical daylight.',
    coverImage: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'
    ],
    featured: true,
    published: true
  },
  {
    id: 'proj-4',
    slug: 'minimalist-penthouse',
    title: 'Minimalist Penthouse',
    category: 'Residential',
    location: 'South Delhi',
    year: '2023',
    area: '5,100 sq.ft',
    description: 'A panoramic duplex emphasizing monolithic micro-cement volumes, smoked oak cabinetry, and concealed lighting.',
    coverImage: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80'
    ],
    featured: false,
    published: true
  }
];

const initialProducts = [
  {
    id: 'prod-1',
    slug: 'komorebi-lounge-chair',
    title: 'Komorebi Lounge Chair',
    category: 'Chair',
    price: 34000,
    dimensions: '78 x 82 x 72 cm',
    materials: 'Solid white ash, Belgian natural linen',
    description: 'Sculptural lounge chair with generous proportions and deeply pitched seat for relaxed meditation.',
    image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    published: true
  },
  {
    id: 'prod-2',
    slug: 'sora-oak-coffee-table',
    title: 'Sora Oak Coffee Table',
    category: 'Table',
    price: 42000,
    dimensions: '120 x 60 x 36 cm',
    materials: 'Quarter-sawn smoked oak, oil finish',
    description: 'Low-profile solid oak table with rounded softened edges and floating base detail.',
    image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    published: true
  },
  {
    id: 'prod-3',
    slug: 'zenith-linen-pendant',
    title: 'Zenith Linen Pendant',
    category: 'Lighting',
    price: 18500,
    dimensions: '55 cm dia x 40 cm h',
    materials: 'Raw linen shade, blackened brass hardware',
    description: 'Diffused ambient luminaire filtering warm downward illumination with natural fabric texture.',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    published: true
  },
  {
    id: 'prod-4',
    slug: 'mori-sculptural-credenza',
    title: 'Mori Sculptural Credenza',
    category: 'Storage',
    price: 85000,
    dimensions: '180 x 48 x 75 cm',
    materials: 'Fluted walnut, honed travertine top',
    description: 'Architectural credenza featuring fluted solid wood doors and travertine stone counter.',
    image: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    published: true
  },
  {
    id: 'prod-5',
    slug: 'nami-ceramic-vessel',
    title: 'Nami Ceramic Vessel',
    category: 'Decor',
    price: 6200,
    dimensions: '22 cm dia x 34 cm h',
    materials: 'Hand-thrown stoneware, matte sand glaze',
    description: 'Handcrafted stoneware vessel shaped with subtle organic asymmetries.',
    image: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    published: true
  },
  {
    id: 'prod-6',
    slug: 'wabi-daybed',
    title: 'Wabi Daybed',
    category: 'Sofa',
    price: 95000,
    dimensions: '200 x 90 x 42 cm',
    materials: 'Blackened teak frame, boucle upholstery',
    description: 'Clean-lined daybed designed for both transitional lounging and primary seating.',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    published: true
  }
];

let projects = [...initialProjects];
let products = [...initialProducts];
let enquiries = [];
let orders = [];

export function apiHandler(req, res, next) {
  const url = req.url || '';
  if (!url.startsWith('/api')) {
    return next();
  }

  const method = req.method;
  const path = url.split('?')[0];

  // Enhance res with status, json, cookie, clearCookie if missing (e.g. Vite connect middleware)
  if (!res.status) {
    res.status = function (code) {
      this.statusCode = code;
      return this;
    };
  }
  if (!res.json) {
    res.json = function (payload) {
      this.setHeader('Content-Type', 'application/json');
      this.end(JSON.stringify(payload));
      return this;
    };
  }
  if (!res.send) {
    res.send = function (payload) {
      if (typeof payload === 'object') {
        return this.json(payload);
      }
      this.setHeader('Content-Type', 'text/plain; charset=utf-8');
      this.end(payload);
      return this;
    };
  }
  if (!res.cookie) {
    res.cookie = function (name, val, options = {}) {
      let cookieStr = `${name}=${encodeURIComponent(val)}`;
      if (options.path) cookieStr += `; Path=${options.path}`;
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

  // Helper JSON sender
  const sendJson = (status, payload) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  };

  // Helper body reader
  const parseBody = (cb) => {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      return cb(req.body);
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        cb(parsed);
      } catch (err) {
        cb({});
      }
    });
  };

  // Projects endpoints
  if (path === '/api/projects' && method === 'GET') {
    return sendJson(200, { success: true, data: projects.filter(p => p.published) });
  }

  if (path.startsWith('/api/projects/') && method === 'GET') {
    const slug = path.replace('/api/projects/', '');
    const project = projects.find(p => p.slug === slug || p.id === slug);
    if (!project) {
      return sendJson(404, { success: false, message: 'Project not found' });
    }
    return sendJson(200, { success: true, data: project });
  }

  // Retail endpoints
  if (path === '/api/retail' && method === 'GET') {
    return sendJson(200, { success: true, data: products.filter(p => p.published) });
  }

  if (path.startsWith('/api/retail/') && method === 'GET') {
    const slug = path.replace('/api/retail/', '');
    const product = products.find(p => p.slug === slug || p.id === slug);
    if (!product) {
      return sendJson(404, { success: false, message: 'Product not found' });
    }
    return sendJson(200, { success: true, data: product });
  }

  // Enquiries endpoint
  if (path === '/api/enquiries' && method === 'POST') {
    return parseBody(body => {
      const { name, email, phone, message } = body;
      if (!name || !email || !message) {
        return sendJson(400, { success: false, message: 'Name, email, and message are required' });
      }
      const newEnquiry = {
        id: 'enq-' + Date.now(),
        name,
        email,
        phone: phone || '',
        message,
        status: 'new',
        createdAt: new Date().toISOString()
      };
      enquiries.unshift(newEnquiry);
      return sendJson(201, { success: true, data: newEnquiry });
    });
  }

  // Checkout endpoints (supports /api/orders/checkout and /api/checkout)
  if ((path === '/api/orders/checkout' || path === '/api/checkout') && method === 'POST') {
    return parseBody(body => {
      const { items } = body;
      if (!items || !items.length) {
        return sendJson(400, { success: false, message: 'Cart is empty' });
      }
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const product = products.find(p => p.id === item.productId || p.slug === item.productId || p.slug === item.slug);
        if (product) {
          const qty = item.quantity || 1;
          totalAmount += product.price * qty;
          orderItems.push({
            productId: product.id,
            title: product.title,
            price: product.price,
            quantity: qty,
            image: product.image
          });
        }
      }

      const order = {
        id: 'ord-' + Date.now(),
        orderNumber: 'SABR-' + Math.floor(100000 + Math.random() * 900000),
        items: orderItems,
        totalAmount: totalAmount || (Number(body.totalAmount) || 0),
        orderStatus: 'pending',
        paymentStatus: 'confirmed',
        createdAt: new Date().toISOString()
      };
      orders.unshift(order);

      return sendJson(200, {
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: order.totalAmount,
          currency: 'INR',
          razorpayOrderId: 'order_mock_' + Date.now()
        }
      });
    });
  }

  // Payment verification endpoint
  if (path === '/api/orders/verify' && method === 'POST') {
    return parseBody(body => {
      return sendJson(200, {
        success: true,
        message: 'Payment verified successfully',
        data: { verified: true }
      });
    });
  }

  // -------------------------------------------------------------
  // Authentication endpoints (05-auth.md)
  // -------------------------------------------------------------
  if (path === '/api/auth/login' && method === 'POST') {
    return parseBody((body) => {
      req.body = body;
      return authLimiter(req, res, () => {
        let idx = 0;
        const runValidators = () => {
          if (idx < loginValidator.length) {
            const currentValidator = loginValidator[idx++];
            currentValidator(req, res, runValidators);
          } else {
            authController.login(req, res);
          }
        };
        runValidators();
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

  // -------------------------------------------------------------
  // Admin Routes (Strictly guarded by protect middleware)
  // References: 05-auth.md §10; ARCHITECTURE.md §10.11
  // -------------------------------------------------------------
  if (path.startsWith('/api/admin')) {
    return protect(req, res, () => {
      // Admin stats endpoint
      if (path === '/api/admin/stats' && method === 'GET') {
        return sendJson(200, {
          success: true,
          data: {
            totalProjects: projects.length,
            totalProducts: products.length,
            totalEnquiries: enquiries.length,
            totalOrders: orders.length,
            revenue: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
          },
        });
      }

      // Admin Projects endpoints
      if (path === '/api/admin/projects' && method === 'GET') {
        return sendJson(200, { success: true, data: projects });
      }

      if (path === '/api/admin/projects' && method === 'POST') {
        return parseBody((body) => {
          const newProj = {
            ...body,
            id: body.id || `proj-${Date.now()}`,
            slug:
              body.slug ||
              (body.title
                ? body.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '')
                : `proj-${Date.now()}`),
            published: body.published !== undefined ? body.published : true,
          };
          projects.unshift(newProj);
          return sendJson(201, { success: true, data: newProj });
        });
      }

      if (path.startsWith('/api/admin/projects/') && method === 'PUT') {
        const id = path.replace('/api/admin/projects/', '');
        return parseBody((body) => {
          const index = projects.findIndex((p) => p.id === id || p.slug === id);
          if (index !== -1) {
            projects[index] = { ...projects[index], ...body };
            return sendJson(200, { success: true, data: projects[index] });
          }
          return sendJson(404, { success: false, message: 'Project not found' });
        });
      }

      if (path.startsWith('/api/admin/projects/') && method === 'DELETE') {
        const id = path.replace('/api/admin/projects/', '');
        projects = projects.filter((p) => p.id !== id && p.slug !== id);
        return sendJson(200, { success: true, message: 'Project deleted' });
      }

      // Admin Retail endpoints
      if (path === '/api/admin/retail' && method === 'GET') {
        return sendJson(200, { success: true, data: products });
      }

      if (path === '/api/admin/retail' && method === 'POST') {
        return parseBody((body) => {
          const newItem = {
            ...body,
            id: body.id || `prod-${Date.now()}`,
            slug:
              body.slug ||
              (body.title
                ? body.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '')
                : `prod-${Date.now()}`),
            price: Number(body.price) || 0,
            published: body.published !== undefined ? body.published : true,
          };
          products.unshift(newItem);
          return sendJson(201, { success: true, data: newItem });
        });
      }

      if (path.startsWith('/api/admin/retail/') && method === 'PUT') {
        const id = path.replace('/api/admin/retail/', '');
        return parseBody((body) => {
          const index = products.findIndex((p) => p.id === id || p.slug === id);
          if (index !== -1) {
            products[index] = {
              ...products[index],
              ...body,
              price: Number(body.price || products[index].price),
            };
            return sendJson(200, { success: true, data: products[index] });
          }
          return sendJson(404, { success: false, message: 'Product not found' });
        });
      }

      if (path.startsWith('/api/admin/retail/') && method === 'DELETE') {
        const id = path.replace('/api/admin/retail/', '');
        products = products.filter((p) => p.id !== id && p.slug !== id);
        return sendJson(200, { success: true, message: 'Product deleted' });
      }

      // Admin Enquiry status patch
      if (path.startsWith('/api/admin/enquiries/') && path.endsWith('/status') && method === 'PATCH') {
        const id = path.replace('/api/admin/enquiries/', '').replace('/status', '');
        return parseBody((body) => {
          const enq = enquiries.find((e) => e.id === id);
          if (enq) {
            enq.status = body.status;
            return sendJson(200, { success: true, data: enq });
          }
          return sendJson(404, { success: false, message: 'Enquiry not found' });
        });
      }

      // Admin Order status patch
      if (path.startsWith('/api/admin/orders/') && path.endsWith('/status') && method === 'PATCH') {
        const id = path.replace('/api/admin/orders/', '').replace('/status', '');
        return parseBody((body) => {
          const ord = orders.find((o) => o.id === id || o.orderNumber === id);
          if (ord) {
            ord.orderStatus = body.status;
            return sendJson(200, { success: true, data: ord });
          }
          return sendJson(404, { success: false, message: 'Order not found' });
        });
      }

      // Admin data endpoints
      if (path === '/api/admin/enquiries' && method === 'GET') {
        return sendJson(200, { success: true, data: enquiries });
      }

      if (path === '/api/admin/orders' && method === 'GET') {
        return sendJson(200, { success: true, data: orders });
      }

      return sendJson(404, { success: false, message: `Admin route ${method} ${path} not found` });
    });
  }

  // Fallback 404 for unknown /api routes
  return sendJson(404, { success: false, message: `Route ${method} ${path} not found` });
}
