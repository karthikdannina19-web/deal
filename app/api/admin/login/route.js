import { AdminController } from '@/modules/admin/admin.controller.js';

/**
 * POST /api/admin/login
 * Admin authentication (Email/Password)
 */
export async function POST(req) {
  try {
    return await AdminController.login(req);
  } catch (error) {
    console.error('[API] POST /api/admin/login Error:', error);
    return Response.json({ 
      success: false, 
      message: error.message || 'Authentication failed' 
    }, { status: 500 });
  }
}
