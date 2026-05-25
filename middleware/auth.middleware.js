import { verifyToken } from '@/utils/jwt.js';
import { apiError } from '@/utils/errorHandler.js';

/**
 * Authentication Middleware for Next.js App Router
 * Validates JWT from Authorization header
 */
export async function authenticate(req) {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: apiError(401, 'Token required', 'AUTHENTICATION_ERROR') };
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (e) {
      console.error('[AuthMiddleware] Token verification failed:', e.message);
      return { error: apiError(401, 'Invalid or expired token', 'AUTHENTICATION_ERROR') };
    }

    if (!decoded) {
      return { error: apiError(401, 'Invalid token', 'AUTHENTICATION_ERROR') };
    }

    // Support both 'id' (from AdminController) and 'userId' (from others)
    const userId = decoded.userId || decoded.id;

    // Database soft-delete governance checks
    if (decoded.vendorId) {
      const Vendor = (await import('@/models/vendor.model.js')).default;
      const vendorDoc = await Vendor.findById(decoded.vendorId).select('is_deleted account_status');
      if (vendorDoc && (vendorDoc.is_deleted === true || vendorDoc.account_status === 'DELETED')) {
        return { error: apiError(403, 'Account deleted. Please create a new account.', 'AUTHENTICATION_ERROR') };
      }
    }

    if (decoded.supervisorId) {
      const Supervisor = (await import('@/models/supervisor.model.js')).default;
      const supDoc = await Supervisor.findById(decoded.supervisorId).select('is_deleted status');
      if (supDoc && (supDoc.is_deleted === true || supDoc.status !== 'active')) {
        return { error: apiError(403, 'Account inactive or deleted.', 'AUTHENTICATION_ERROR') };
      }
    }

    if (userId && decoded.role !== 'admin') {
      const User = (await import('@/models/user.model.js')).default;
      const userDoc = await User.findById(userId).select('status');
      if (userDoc && userDoc.status === 'deleted') {
        return { error: apiError(403, 'Account deleted. Please create a new account.', 'AUTHENTICATION_ERROR') };
      }
    }

    // Return the user data if valid
    return { 
      user: {
        id: userId,
        vendorId: decoded.vendorId,
        supervisorId: decoded.supervisorId,
        email: decoded.email,
        role: decoded.role,
      } 
    };
  } catch (error) {
    console.error('[AuthMiddleware] General error:', error);
    return { error: apiError(401, 'Authentication failed', 'AUTHENTICATION_ERROR') };
  }
}

/**
 * Role Authorization Helper
 * @param {Object} user User object from authenticate
 * @param {Array} allowedRoles Array of allowed roles
 */
export function authorize(user, allowedRoles) {
  if (!user || !allowedRoles.includes(user.role)) {
    return apiError(
      403,
      `Access denied. Role '${user.role}' is not authorized.`,
      'AUTHORIZATION_ERROR'
    );
  }
  return null;
}
