import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';

export const protect = (req, res, next) => {
  try {
    const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

    if (!token) {
      return next(new ApiError(401, 'Authentication required. Please sign in as an administrator.'));
    }

    const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-sabr-studio';
    const decoded = jwt.verify(token, secret);
    
    req.admin = decoded;
    next();
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired session. Please sign in again.'));
  }
};
