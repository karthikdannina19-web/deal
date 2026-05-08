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

    // Return the user data if valid
    return { 
      user: {
        id: userId,
        vendorId: decoded.vendorId,
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
