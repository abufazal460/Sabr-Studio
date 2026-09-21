import { authService } from '../services/auth.service.js';

/**
 * Helper to extract token from cookies
 */
function extractToken(req) {
  if (
    req.cookies &&
    (req.cookies.token || req.cookies.sabr_auth || req.cookies.admin_token || req.cookies.jwt)
  ) {
    return (
      req.cookies.token ||
      req.cookies.sabr_auth ||
      req.cookies.admin_token ||
      req.cookies.jwt
    );
  }
  if (req.headers && req.headers.cookie) {
    const parsed = req.headers.cookie.split(';').reduce((acc, part) => {
      const idx = part.indexOf('=');
      if (idx > -1) {
        const key = part.slice(0, idx).trim();
        const val = part.slice(idx + 1).trim();
        acc[key] = decodeURIComponent(val);
      }
      return acc;
    }, {});
    return parsed.token || parsed.sabr_auth || parsed.admin_token || parsed.jwt || null;
  }
  if (req.headers && (req.headers.authorization || req.headers.Authorization)) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
  }
  return null;
}

/**
 * Protect middleware: Authoritative backend authentication and authorization boundary
 * References: Master Context §6.2, 05-auth.md §10, §11; ARCHITECTURE.md §10.10, §10.12
 */
export async function protect(req, res, next) {
  // Never cache protected responses (SECURITY.md §8 CACHE-04)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const token = extractToken(req);

  // 1. Missing cookie / token -> 401 Unauthenticated
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
    });
  }

  // 2. Verify signature and bounded expiry
  let decoded;
  try {
    decoded = authService.verifyToken(token);
  } catch (err) {
    // Distinguish expired / invalid signature without leaking internal details
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token. Please log in again.',
    });
  }

  if (!decoded || !decoded.id) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token payload.',
    });
  }

  // 3. Load admin identity & verify existence
  let admin;
  try {
    admin = await authService.getAdminById(decoded.id);
  } catch (err) {
    console.error('[Protect Middleware] Error fetching admin:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error verifying credentials.',
    });
  }

  if (!admin) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Account no longer exists.',
    });
  }

  // 4. Check account status: active vs disabled (403 Forbidden, distinct from 401)
  if (admin.status === 'disabled') {
    return res.status(403).json({
      success: false,
      message: 'Account is disabled. Access denied.',
    });
  }

  // 5. Attach identity to request
  req.admin = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    lastLoginAt: admin.lastLoginAt,
  };
  req.user = req.admin; // Aliased for compatibility

  next();
}
