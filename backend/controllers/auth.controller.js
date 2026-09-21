import { authService } from '../services/auth.service.js';
import { COOKIE_NAME, getCookieOptions, getClearCookieOptions } from '../utils/cookieOptions.js';

/**
 * Controller for Admin Authentication endpoints
 * References: Master Context §6.2, 05-auth.md §4; API.md §9, §10, §11
 */
class AuthController {
  /**
   * POST /api/auth/login
   * Authenticates admin with email & password, sets httpOnly cookie, returns sanitized admin profile
   */
  async login(req, res) {
    // Auth responses must never be cached (SECURITY.md §8 CACHE-04)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
      const { email, password } = req.body;
      const result = await authService.loginAdmin(email, password);

      // Generic authentication failure response prevents account enumeration (05-auth.md §4)
      if (!result) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      const { admin, token } = result;
      const cookieOpts = getCookieOptions();

      // Set auth token as httpOnly, Secure, SameSite cookie
      if (typeof res.cookie === 'function') {
        res.cookie(COOKIE_NAME, token, cookieOpts);
      } else {
        // Fallback manual Set-Cookie header if running in raw Connect/Node http
        const cookieHeader = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=${cookieOpts.path}; Max-Age=${cookieOpts.maxAge / 1000}; HttpOnly${cookieOpts.secure ? '; Secure' : ''}; SameSite=${cookieOpts.sameSite}`;
        res.setHeader('Set-Cookie', cookieHeader);
      }

      // Return sanitized admin identity ONLY — NEVER return token or password hash (05-auth.md §4, §7)
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          admin,
          user: admin, // Included for frontend AuthContext compatibility
        },
      });
    } catch (err) {
      if (err.statusCode === 403) {
        return res.status(403).json({
          success: false,
          message: err.message || 'Account is disabled',
        });
      }

      console.error('[AuthController.login] Error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication',
      });
    }
  }

  /**
   * GET /api/auth/me
   * Validates active admin session and returns current admin identity
   */
  async getMe(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // req.admin populated by protect middleware
    return res.status(200).json({
      success: true,
      data: {
        admin: req.admin,
        user: req.admin,
      },
    });
  }

  /**
   * POST /api/auth/logout
   * Clears the authentication cookie and ends session
   */
  async logout(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const clearOpts = getClearCookieOptions();

    if (typeof res.clearCookie === 'function') {
      res.clearCookie(COOKIE_NAME, clearOpts);
    } else {
      const clearHeader = `${COOKIE_NAME}=; Path=${clearOpts.path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly${clearOpts.secure ? '; Secure' : ''}; SameSite=${clearOpts.sameSite}`;
      res.setHeader('Set-Cookie', clearHeader);
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}

export const authController = new AuthController();
