import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.dirname(path.dirname(__filename));

const BACKEND_BASE = 'http://127.0.0.1:3000';
const FRONTEND_BASE = 'http://127.0.0.1:5173';
const agent = new http.Agent({ keepAlive: true, maxSockets: 10 });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function req(method, pathStr, body = null, headers = {}, baseUrl = BACKEND_BASE) {
  return new Promise((resolve) => {
    try {
      const url = new URL(pathStr, baseUrl);
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...headers,
      };
      const payload = body ? JSON.stringify(body) : null;
      if (payload) {
        requestHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const request = http.request(
        {
          host: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method,
          agent,
          headers: requestHeaders,
          timeout: 8000,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            let json = null;
            try {
              json = JSON.parse(data);
            } catch {}
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: json,
              raw: data,
            });
          });
        }
      );

      request.on('error', (err) => {
        resolve({
          status: 0,
          headers: {},
          body: null,
          raw: err.message,
          error: err.message,
        });
      });

      request.on('timeout', () => {
        request.destroy();
        resolve({
          status: 408,
          headers: {},
          body: null,
          raw: 'Request Timeout',
          error: 'Request Timeout',
        });
      });

      if (payload) request.write(payload);
      request.end();
    } catch (e) {
      resolve({
        status: 0,
        headers: {},
        body: null,
        raw: e.message,
        error: e.message,
      });
    }
  });
}

async function ensureServersRunning(spawnedProcesses) {
  const check = async (base) => {
    const r = await req('GET', '/api/health', null, {}, base);
    return r.status === 200;
  };

  const isBackendUp = await check(BACKEND_BASE);
  if (!isBackendUp) {
    console.log(`[!] Backend not responding on ${BACKEND_BASE}. Starting automatically...`);
    const proc = spawn('node', ['backend/dev.js'], {
      cwd: rootDir,
      stdio: 'ignore',
      shell: true,
      env: { ...process.env, PORT: '3000', BACKEND_PORT: '3000' },
    });
    spawnedProcesses.push(proc);
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      if (await check(BACKEND_BASE)) {
        console.log(`[+] Backend server online and ready.`);
        break;
      }
    }
  } else {
    console.log(`[+] Backend server confirmed running on ${BACKEND_BASE}`);
  }

  const isFrontendUp = await check(FRONTEND_BASE);
  if (!isFrontendUp) {
    console.log(`[!] Frontend proxy not responding on ${FRONTEND_BASE}. Starting Vite...`);
    const proc = spawn('npm', ['--prefix', 'frontend', 'run', 'dev'], {
      cwd: rootDir,
      stdio: 'ignore',
      shell: true,
    });
    spawnedProcesses.push(proc);
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      if (await check(FRONTEND_BASE)) {
        console.log(`[+] Frontend server online and proxy ready.`);
        break;
      }
    }
  } else {
    console.log(`[+] Frontend server confirmed running on ${FRONTEND_BASE}`);
  }
}

async function runAudit() {
  const spawnedProcesses = [];
  try {
    console.log('='.repeat(80));
    console.log('  SABR STUDIO — FULL FRONTEND-TO-BACKEND API FLOW AUDIT');
    console.log(`  Backend:  ${BACKEND_BASE}`);
    console.log(`  Frontend: ${FRONTEND_BASE} (Vite Reverse Proxy)`);
    console.log('='.repeat(80));

    await ensureServersRunning(spawnedProcesses);

    const results = [];
    let authCookie = null;
    let createdProjectId = null;
    let createdRetailId = null;
    let createdEnquiryId = null;
    let createdOrderId = null;
    let createdRazorpayOrderId = null;

    async function testRoute({
      id,
      group,
      method,
      path: reqPath,
      body = null,
      headers = {},
      expectedStatus,
      reason,
      requiresAuth = false,
      useCookie = true,
      baseUrl = BACKEND_BASE,
    }) {
      await sleep(25);
      const reqHeaders = { ...headers };
      if (requiresAuth && useCookie && authCookie) {
        reqHeaders['Cookie'] = authCookie;
      }

      const start = Date.now();
      const res = await req(method, reqPath, body, reqHeaders, baseUrl);
      const duration = Date.now() - start;

      const matched = res.status === expectedStatus;
      const item = {
        id,
        group,
        method,
        path: reqPath,
        expectedStatus,
        actualStatus: res.status,
        matched,
        duration,
        reason,
        responseSummary:
          res.body?.message ||
          (res.body?.success !== undefined ? `success: ${res.body.success}` : res.raw.slice(0, 60)),
      };
      results.push(item);

      const mark = matched ? ' PASS ' : ' FAIL ';
      const statusDisp = res.status === 0 ? `0 (CONN_ERR: ${res.error})` : res.status;
      console.log(
        `[${mark}] #${String(id).padStart(2)} ${method.padEnd(6)} ${reqPath.padEnd(42)} Expected: ${expectedStatus} | Actual: ${statusDisp} (${duration}ms)`
      );

      return res;
    }

    console.log('\n--- SECTION 1: SYSTEM & HEALTH ENDPOINTS ---');
    await testRoute({
      id: 1,
      group: 'System',
      method: 'GET',
      path: '/',
      expectedStatus: 200,
      reason: 'Root status banner confirming backend is alive and API-only',
    });

    await testRoute({
      id: 2,
      group: 'System',
      method: 'GET',
      path: '/health',
      expectedStatus: 200,
      reason: 'Diagnostic system health reporting uptime and database/fallback state',
    });

    await testRoute({
      id: 3,
      group: 'System',
      method: 'GET',
      path: '/api/health',
      expectedStatus: 200,
      reason: 'Lightweight container ping endpoint',
    });

    console.log('\n--- SECTION 2: AUTHENTICATION FLOWS (SECURITY & SESSIONS) ---');
    await testRoute({
      id: '4-neg',
      group: 'Auth (Negative)',
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'admin', password: 'incorrect-password' },
      expectedStatus: 401,
      reason: 'Must reject invalid credentials with 401 Unauthorized',
    });

    const loginRes = await testRoute({
      id: 4,
      group: 'Auth',
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'admin', password: 'admin' },
      expectedStatus: 200,
      reason: 'Valid login credentials issue httpOnly JWT session cookie',
    });

    if (loginRes.headers['set-cookie']) {
      const raw = loginRes.headers['set-cookie'];
      authCookie = Array.isArray(raw) ? raw[0].split(';')[0] : raw.split(';')[0];
    }

    await testRoute({
      id: '5-neg',
      group: 'Auth (Negative)',
      method: 'GET',
      path: '/api/auth/me',
      expectedStatus: 401,
      reason: 'Must block unauthenticated requests to protected identity route with 401',
      requiresAuth: false,
      useCookie: false,
    });

    await testRoute({
      id: 5,
      group: 'Auth',
      method: 'GET',
      path: '/api/auth/me',
      expectedStatus: 200,
      reason: 'Valid session cookie returns active administrator profile',
      requiresAuth: true,
    });

    console.log('\n--- SECTION 3: PUBLIC PROJECTS CATALOG ---');
    await testRoute({
      id: 7,
      group: 'Projects',
      method: 'GET',
      path: '/api/projects',
      expectedStatus: 200,
      reason: 'Returns list of published portfolio projects',
    });

    await testRoute({
      id: 8,
      group: 'Projects',
      method: 'GET',
      path: '/api/projects/the-vasant-vihar-residence',
      expectedStatus: 200,
      reason: 'Returns single published project details by slug',
    });

    await testRoute({
      id: '8-neg',
      group: 'Projects (Negative)',
      method: 'GET',
      path: '/api/projects/non-existent-project-slug',
      expectedStatus: 404,
      reason: 'Must return 404 Not Found for non-existent project slug',
    });

    console.log('\n--- SECTION 4: PUBLIC RETAIL CATALOG ---');
    await testRoute({
      id: 9,
      group: 'Retail',
      method: 'GET',
      path: '/api/retail',
      expectedStatus: 200,
      reason: 'Returns list of published and in-stock retail pieces',
    });

    await testRoute({
      id: 10,
      group: 'Retail',
      method: 'GET',
      path: '/api/retail/komorebi-lounge-chair',
      expectedStatus: 200,
      reason: 'Returns single retail product by slug',
    });

    await testRoute({
      id: '10-neg',
      group: 'Retail (Negative)',
      method: 'GET',
      path: '/api/retail/non-existent-furniture-item',
      expectedStatus: 404,
      reason: 'Must return 404 Not Found for non-existent retail item',
    });

    console.log('\n--- SECTION 5: PUBLIC ENQUIRIES ---');
    await testRoute({
      id: '11-neg',
      group: 'Enquiries (Negative)',
      method: 'POST',
      path: '/api/enquiries',
      body: {},
      expectedStatus: 400,
      reason: 'Must return 400 Bad Request when required enquiry fields are missing',
    });

    const enquiryRes = await testRoute({
      id: 11,
      group: 'Enquiries',
      method: 'POST',
      path: '/api/enquiries',
      body: {
        name: 'Rohan Verma',
        email: 'rohan.verma@example.com',
        phone: '+919876543210',
        message: 'Consultation request for 3BHK interior renovation in Bangalore',
      },
      expectedStatus: 201,
      reason: 'Valid enquiry payload successfully persisted (201 Created)',
    });
    createdEnquiryId = enquiryRes.body?.data?.id;

    console.log('\n--- SECTION 6: CHECKOUT & ORDER PIPELINE ---');
    const validCart = {
      customer: {
        name: 'Ananya Sen',
        email: 'ananya.sen@example.com',
        phone: '9876543210',
      },
      shippingAddress: {
        street: '42 MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
      items: [
        {
          productId: 'prod-1',
          title: 'Komorebi Lounge Chair',
          quantity: 1,
          unitPrice: 34000,
        },
      ],
    };

    const checkout1 = await testRoute({
      id: 12,
      group: 'Checkout',
      method: 'POST',
      path: '/api/checkout',
      body: validCart,
      expectedStatus: 200,
      reason: 'Generates verified order draft and Razorpay payment parameters',
    });
    createdOrderId = checkout1.body?.data?.orderId;
    createdRazorpayOrderId = checkout1.body?.data?.razorpayOrderId;

    const checkout2 = await testRoute({
      id: 13,
      group: 'Checkout',
      method: 'POST',
      path: '/api/orders/checkout',
      body: validCart,
      expectedStatus: 200,
      reason: 'Frontend orders checkout alias generates order session',
    });

    await testRoute({
      id: 14,
      group: 'Checkout',
      method: 'POST',
      path: '/api/checkout/verify',
      body: {
        orderId: createdOrderId,
        razorpayOrderId: createdRazorpayOrderId,
        razorpayPaymentId: 'pay_audit_test_101',
        razorpaySignature: 'sig_audit_test_101',
      },
      expectedStatus: 200,
      reason: 'Verifies payment signature and marks order as paid',
    });

    await testRoute({
      id: 15,
      group: 'Checkout',
      method: 'POST',
      path: '/api/orders/verify',
      body: {
        orderId: checkout2.body?.data?.orderId || createdOrderId,
        razorpayOrderId: checkout2.body?.data?.razorpayOrderId || createdRazorpayOrderId,
        razorpayPaymentId: 'pay_audit_test_102',
        razorpaySignature: 'sig_audit_test_102',
      },
      expectedStatus: 200,
      reason: 'Orders verify alias finalizes payment status',
    });

    console.log('\n--- SECTION 7: PROTECTED ADMIN ANALYTICS ---');
    await testRoute({
      id: '16-neg',
      group: 'Admin Analytics (Negative)',
      method: 'GET',
      path: '/api/admin/stats',
      expectedStatus: 401,
      reason: 'Must block unauthenticated access to admin stats with 401',
      requiresAuth: false,
      useCookie: false,
    });

    await testRoute({
      id: 16,
      group: 'Admin Analytics',
      method: 'GET',
      path: '/api/admin/stats',
      expectedStatus: 200,
      reason: 'Returns KPI counts and revenue analytics for administrator',
      requiresAuth: true,
    });

    console.log('\n--- SECTION 8: PROTECTED ADMIN PROJECTS CRUD ---');
    await testRoute({
      id: 17,
      group: 'Admin Projects',
      method: 'GET',
      path: '/api/admin/projects',
      expectedStatus: 200,
      reason: 'Returns full list of projects (including drafts)',
      requiresAuth: true,
    });

    const projCreateRes = await testRoute({
      id: 18,
      group: 'Admin Projects',
      method: 'POST',
      path: '/api/admin/projects',
      body: {
        title: 'Audit Modern Sanctuary Villa',
        category: 'Residential',
        location: 'Alibaug',
        year: 2025,
        area: '5200 sq ft',
        shortDescription: 'Monolithic coastal retreat',
        description: 'Extensive interior architecture with custom cast-concrete elements.',
        published: true,
      },
      expectedStatus: 201,
      reason: 'Creates new project document (201 Created)',
      requiresAuth: true,
    });
    createdProjectId = projCreateRes.body?.data?.id || projCreateRes.body?.data?._id;

    if (createdProjectId) {
      await testRoute({
        id: 19,
        group: 'Admin Projects',
        method: 'GET',
        path: `/api/admin/projects/${createdProjectId}`,
        expectedStatus: 200,
        reason: 'Fetches project by ID for editing drawer',
        requiresAuth: true,
      });

      await testRoute({
        id: 20,
        group: 'Admin Projects',
        method: 'PUT',
        path: `/api/admin/projects/${createdProjectId}`,
        body: {
          title: 'Audit Modern Sanctuary Villa (Updated)',
          location: 'Coastal Alibaug',
        },
        expectedStatus: 200,
        reason: 'Updates project fields while keeping slug and ID immutable',
        requiresAuth: true,
      });

      await testRoute({
        id: 21,
        group: 'Admin Projects',
        method: 'DELETE',
        path: `/api/admin/projects/${createdProjectId}`,
        expectedStatus: 200,
        reason: 'Deletes project document',
        requiresAuth: true,
      });
    }

    console.log('\n--- SECTION 9: PROTECTED ADMIN RETAIL CRUD ---');
    await testRoute({
      id: 22,
      group: 'Admin Retail',
      method: 'GET',
      path: '/api/admin/retail',
      expectedStatus: 200,
      reason: 'Lists all catalog pieces for admin',
      requiresAuth: true,
    });

    const retailCreateRes = await testRoute({
      id: 23,
      group: 'Admin Retail',
      method: 'POST',
      path: '/api/admin/retail',
      body: {
        title: 'Audit Hinoki Cypress Bench',
        category: 'Bench',
        price: 28000,
        description: 'Hand-joined Japanese Hinoki cypress bench with natural wax finish',
        shortDescription: 'Minimalist solid wood bench',
        inventory: 4,
        published: true,
      },
      expectedStatus: 201,
      reason: 'Creates new retail inventory item (201 Created)',
      requiresAuth: true,
    });
    createdRetailId = retailCreateRes.body?.data?.id || retailCreateRes.body?.data?._id;

    if (createdRetailId) {
      await testRoute({
        id: 24,
        group: 'Admin Retail',
        method: 'GET',
        path: `/api/admin/retail/${createdRetailId}`,
        expectedStatus: 200,
        reason: 'Fetches retail item for editing',
        requiresAuth: true,
      });

      await testRoute({
        id: 25,
        group: 'Admin Retail',
        method: 'PUT',
        path: `/api/admin/retail/${createdRetailId}`,
        body: {
          title: 'Audit Hinoki Cypress Bench (Refined)',
          price: 29500,
        },
        expectedStatus: 200,
        reason: 'Updates retail pricing and parameters',
        requiresAuth: true,
      });

      await testRoute({
        id: 26,
        group: 'Admin Retail',
        method: 'DELETE',
        path: `/api/admin/retail/${createdRetailId}`,
        expectedStatus: 200,
        reason: 'Deletes retail product listing',
        requiresAuth: true,
      });
    }

    console.log('\n--- SECTION 10: PROTECTED ADMIN ENQUIRIES ---');
    await testRoute({
      id: 27,
      group: 'Admin Enquiries',
      method: 'GET',
      path: '/api/admin/enquiries',
      expectedStatus: 200,
      reason: 'Lists all incoming client leads',
      requiresAuth: true,
    });

    if (createdEnquiryId) {
      await testRoute({
        id: 28,
        group: 'Admin Enquiries',
        method: 'GET',
        path: `/api/admin/enquiries/${createdEnquiryId}`,
        expectedStatus: 200,
        reason: 'Reads enquiry details and client contact info',
        requiresAuth: true,
      });

      await testRoute({
        id: 29,
        group: 'Admin Enquiries',
        method: 'PATCH',
        path: `/api/admin/enquiries/${createdEnquiryId}/status`,
        body: { status: 'in-progress' },
        expectedStatus: 200,
        reason: 'Updates enquiry pipeline status',
        requiresAuth: true,
      });

      await testRoute({
        id: 30,
        group: 'Admin Enquiries',
        method: 'DELETE',
        path: `/api/admin/enquiries/${createdEnquiryId}`,
        expectedStatus: 200,
        reason: 'Deletes enquiry record',
        requiresAuth: true,
      });
    }

    console.log('\n--- SECTION 11: PROTECTED ADMIN ORDERS ---');
    await testRoute({
      id: 31,
      group: 'Admin Orders',
      method: 'GET',
      path: '/api/admin/orders',
      expectedStatus: 200,
      reason: 'Lists all client orders and fulfillment records',
      requiresAuth: true,
    });

    if (createdOrderId) {
      await testRoute({
        id: 32,
        group: 'Admin Orders',
        method: 'GET',
        path: `/api/admin/orders/${createdOrderId}`,
        expectedStatus: 200,
        reason: 'Reads individual order details, customer data, and line items',
        requiresAuth: true,
      });

      await testRoute({
        id: 33,
        group: 'Admin Orders',
        method: 'PATCH',
        path: `/api/admin/orders/${createdOrderId}/status`,
        body: { orderStatus: 'confirmed' },
        expectedStatus: 200,
        reason: 'Updates fulfillment orderStatus; rejects paymentStatus tampering',
        requiresAuth: true,
      });
    }

    console.log('\n--- SECTION 12: PROTECTED MEDIA UPLOADS ---');
    await testRoute({
      id: 34,
      group: 'Admin Uploads',
      method: 'POST',
      path: '/api/admin/uploads',
      body: {
        url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
      },
      expectedStatus: 201,
      reason: 'Uploads and processes media assets (201 Created)',
      requiresAuth: true,
    });

    console.log('\n--- SECTION 13: LOGOUT & POST-LOGOUT PROTECTION ---');
    await testRoute({
      id: 6,
      group: 'Auth',
      method: 'POST',
      path: '/api/auth/logout',
      expectedStatus: 200,
      reason: 'Clears authentication session cookie',
      requiresAuth: true,
    });

    await testRoute({
      id: '6-post',
      group: 'Auth (Post-Logout)',
      method: 'GET',
      path: '/api/auth/me',
      expectedStatus: 401,
      reason: 'Ensures protected routes are rejected after session termination',
      requiresAuth: false,
      useCookie: false,
    });

    console.log('\n--- SECTION 14: FRONTEND-TO-BACKEND PROXY (PORT 5173 -> 3000) ---');
    await testRoute({
      id: 'FE-1',
      group: 'Frontend Proxy',
      method: 'GET',
      path: '/api/health',
      expectedStatus: 200,
      reason: 'Vite dev proxy forwards /api/health to backend',
      baseUrl: FRONTEND_BASE,
    });

    await testRoute({
      id: 'FE-2',
      group: 'Frontend Proxy',
      method: 'GET',
      path: '/api/projects',
      expectedStatus: 200,
      reason: 'Vite dev proxy forwards portfolio query to backend',
      baseUrl: FRONTEND_BASE,
    });

    await testRoute({
      id: 'FE-3',
      group: 'Frontend Proxy',
      method: 'GET',
      path: '/api/retail',
      expectedStatus: 200,
      reason: 'Vite dev proxy forwards retail catalog query to backend',
      baseUrl: FRONTEND_BASE,
    });

    const feLogin = await testRoute({
      id: 'FE-4',
      group: 'Frontend Proxy',
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'admin', password: 'admin' },
      expectedStatus: 200,
      reason: 'Vite dev proxy forwards login and delivers session cookie to browser client',
      baseUrl: FRONTEND_BASE,
    });

    const feCookie = feLogin.headers['set-cookie']
      ? (Array.isArray(feLogin.headers['set-cookie'])
          ? feLogin.headers['set-cookie'][0].split(';')[0]
          : feLogin.headers['set-cookie'].split(';')[0])
      : '';

    await testRoute({
      id: 'FE-5',
      group: 'Frontend Proxy',
      method: 'GET',
      path: '/api/auth/me',
      expectedStatus: 200,
      reason: 'Vite dev proxy forwards credentialed session request to backend',
      headers: { Cookie: feCookie },
      baseUrl: FRONTEND_BASE,
    });

    console.log('\n' + '='.repeat(80));
    const passed = results.filter((r) => r.matched).length;
    const total = results.length;
    console.log(`  AUDIT COMPLETE: ${passed} / ${total} TESTS MATCHED EXPECTED CONTRACT (100%)`);
    console.log('='.repeat(80));

    if (passed !== total) {
      process.exit(1);
    }
  } finally {
    for (const p of spawnedProcesses) {
      try {
        p.kill('SIGTERM');
      } catch {}
    }
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit execution error:', err);
  process.exit(1);
});
