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

  // Helper JSON sender
  const sendJson = (status, payload) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  };

  // Helper body reader
  const parseBody = (cb) => {
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

  // Checkout endpoint
  if (path === '/api/checkout' && method === 'POST') {
    return parseBody(body => {
      const { items } = body;
      if (!items || !items.length) {
        return sendJson(400, { success: false, message: 'Cart is empty' });
      }
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const product = products.find(p => p.id === item.productId || p.slug === item.slug);
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
        totalAmount,
        orderStatus: 'pending',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString()
      };
      orders.unshift(order);

      return sendJson(200, {
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: totalAmount,
          currency: 'INR',
          // mock razorpay order id for dev/preview
          razorpayOrderId: 'order_mock_' + Date.now()
        }
      });
    });
  }

  // Auth endpoints (Admin login / me)
  if (path === '/api/auth/login' && method === 'POST') {
    return parseBody(body => {
      const { email, password } = body;
      if (email === 'admin@sabrstudio.com' && password === 'admin123') {
        return sendJson(200, {
          success: true,
          data: {
            user: { id: 'admin-1', email: 'admin@sabrstudio.com', name: 'Studio Admin', role: 'admin' },
            token: 'mock-jwt-token-admin'
          }
        });
      }
      return sendJson(401, { success: false, message: 'Invalid credentials' });
    });
  }

  if (path === '/api/auth/me' && method === 'GET') {
    return sendJson(200, {
      success: true,
      data: { id: 'admin-1', email: 'admin@sabrstudio.com', name: 'Studio Admin', role: 'admin' }
    });
  }

  // Admin data endpoints
  if (path === '/api/admin/enquiries' && method === 'GET') {
    return sendJson(200, { success: true, data: enquiries });
  }

  if (path === '/api/admin/orders' && method === 'GET') {
    return sendJson(200, { success: true, data: orders });
  }

  // Fallback 404 for unknown /api routes
  return sendJson(404, { success: false, message: `Route ${method} ${path} not found` });
}
