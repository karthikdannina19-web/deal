import { SupervisorService } from './supervisor.service.js';
import { dbConnect } from '../../config/database.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import User from '../../models/user.model.js';
import { generateToken } from '../../utils/jwt.js';

export class SupervisorController {
  
  static async requireAdmin(req) {
    await dbConnect();
    const { user, error: authError } = await authenticate(req);
    if (authError) return { error: authError };
    
    const roleError = authorize(user, ['admin']);
    if (roleError) return { error: roleError };
    
    return { user };
  }

  static async requireSupervisor(req) {
    await dbConnect();
    const { user, error: authError } = await authenticate(req);
    if (authError) return { error: authError };
    
    const roleError = authorize(user, ['supervisor']);
    if (roleError) return { error: roleError };
    
    return { user };
  }

  /**
   * POST /api/admin/supervisors/create
   */
  static async createSupervisor(req) {
    try {
      const { error, user } = await this.requireAdmin(req);
      if (error) return error;

      const body = await req.json();
      
      const supervisor = await SupervisorService.createSupervisor(body, user.id);
      
      return Response.json({
        success: true,
        message: 'Supervisor created successfully',
        data: supervisor
      }, { status: 201 });
      
    } catch (error) {
      console.error('[SupervisorController.createSupervisor Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 400 });
    }
  }

  /**
   * GET /api/admin/supervisors
   */
  static async listSupervisors(req) {
    try {
      const { error } = await this.requireAdmin(req);
      if (error) return error;

      const { searchParams } = new URL(req.url);
      const filters = {
        status: searchParams.get('status'),
        search: searchParams.get('search'),
        page: searchParams.get('page'),
        limit: searchParams.get('limit')
      };
      
      const result = await SupervisorService.listSupervisors(filters);
      return Response.json({ success: true, ...result }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * GET /api/admin/supervisors/[id]
   */
  static async getSupervisorDetail(req, { params }) {
    try {
      const { error } = await this.requireAdmin(req);
      if (error) return error;

      const { id } = await params;
      const supervisor = await SupervisorService.getSupervisorDetail(id);
      
      return Response.json({ success: true, data: supervisor }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 404 });
    }
  }

  /**
   * PUT /api/admin/supervisors/[id]
   */
  static async updateSupervisor(req, { params }) {
    try {
      const { error } = await this.requireAdmin(req);
      if (error) return error;

      const { id } = await params;
      const body = await req.json();
      
      const supervisor = await SupervisorService.updateSupervisor(id, body);
      
      return Response.json({ success: true, message: 'Supervisor updated', data: supervisor }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 400 });
    }
  }

  /**
   * PATCH /api/admin/supervisors/[id]/status
   */
  static async toggleStatus(req, { params }) {
    try {
      const { error } = await this.requireAdmin(req);
      if (error) return error;

      const { id } = await params;
      const body = await req.json();
      
      const supervisor = await SupervisorService.toggleSupervisorStatus(id, body.status);
      
      return Response.json({ success: true, message: 'Status updated', data: supervisor }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 400 });
    }
  }

  /**
   * DELETE /api/admin/supervisors/[id]
   */
  static async deleteSupervisor(req, { params }) {
    try {
      const { error } = await this.requireAdmin(req);
      if (error) return error;

      const { id } = await params;
      await SupervisorService.deleteSupervisor(id);
      
      return Response.json({ success: true, message: 'Supervisor deleted' }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 400 });
    }
  }
  
  /**
   * POST /api/supervisor/login
   */
  static async supervisorLogin(req) {
    try {
      await dbConnect();
      const body = await req.json();
      const { username, password } = body;

      if (!username || !password) {
        return Response.json({ success: false, message: 'Username and password are required' }, { status: 400 });
      }

      const Supervisor = (await import('../../models/supervisor.model.js')).default;
      
      const supervisor = await Supervisor.findOne({ username: username.toLowerCase(), is_deleted: false });
      if (!supervisor || supervisor.status !== 'active') {
        return Response.json({ success: false, message: 'Invalid credentials or account inactive' }, { status: 401 });
      }
      
      const user = await User.findById(supervisor.userId).select('+password');
      if (!user) {
        return Response.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return Response.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
      }

      const token = generateToken({ 
        id: user._id, 
        supervisorId: supervisor._id,
        role: 'supervisor',
      });

      return Response.json({
        success: true,
        message: 'Login successful',
        token,
        supervisor: {
          id: supervisor._id,
          fullName: supervisor.fullName,
          supervisorCode: supervisor.supervisorCode
        }
      }, { status: 200 });

    } catch (error) {
      console.error('[SupervisorController.login Error]', error);
      return Response.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
  }

  /**
   * GET /api/supervisor/dashboard
   */
  static async getSupervisorDashboard(req) {
    try {
      const { error, user } = await this.requireSupervisor(req);
      if (error) return error;
      
      const Supervisor = (await import('../../models/supervisor.model.js')).default;
      const sup = await Supervisor.findOne({ userId: user.id });
      
      if (!sup) {
         return Response.json({ success: false, message: 'Profile not found' }, { status: 404 });
      }
      
      const data = await SupervisorService.getDashboardData(sup._id);
      return Response.json({ success: true, data }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * GET /api/supervisor/vendors
   */
  static async getSupervisorVendors(req) {
    try {
      const { error, user } = await this.requireSupervisor(req);
      if (error) return error;
      
      const Supervisor = (await import('../../models/supervisor.model.js')).default;
      const sup = await Supervisor.findOne({ userId: user.id });
      
      if (!sup) {
         return Response.json({ success: false, message: 'Profile not found' }, { status: 404 });
      }

      const { searchParams } = new URL(req.url);
      const filters = {
        status: searchParams.get('status'),
        search: searchParams.get('search'),
        page: searchParams.get('page'),
        limit: searchParams.get('limit')
      };
      
      const result = await SupervisorService.getSupervisorVendors(sup._id, filters);
      return Response.json({ success: true, ...result }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * POST /api/vendor/validate-supervisor-code
   */
  static async validateCode(req) {
    try {
      await dbConnect();
      const body = await req.json();
      const { supervisorCode } = body;
      
      if (!supervisorCode) {
        return Response.json({ success: false, message: 'Code is required' }, { status: 400 });
      }
      
      const result = await SupervisorService.validateSupervisorCode(supervisorCode);
      if (!result.valid) {
        return Response.json({ success: false, message: 'Invalid Supervisor Code' }, { status: 400 });
      }
      
      return Response.json({ success: true, message: 'Code valid', data: result }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }
}
