import { dbConnect } from '@/config/database.js';
import { authenticate, authorize } from '@/middleware/auth.middleware.js';
import { PriorityService } from '@/services/priority.service.js';

export class PriorityController {
  static async requireAdmin(req) {
    await dbConnect();
    const { user, error } = await authenticate(req);
    if (error) {
      return { error };
    }

    const roleError = authorize(user, ['admin']);
    if (roleError) {
      return { error: roleError };
    }

    return { user };
  }

  static async list(req) {
    try {
      const { error } = await this.requireAdmin(req);
      if (error) return error;

      const { searchParams } = new URL(req.url);
      const entityType = searchParams.get('entityType');
      const scopeLevel = searchParams.get('scopeLevel');
      const stateId = searchParams.get('stateId');
      const districtId = searchParams.get('districtId');
      const mandalId = searchParams.get('mandalId');
      const entityIds = searchParams.getAll('entityId');

      const rules = await PriorityService.listRules({
        entityType,
        scopeLevel,
        stateId,
        districtId,
        mandalId,
        entityIds,
      });

      return Response.json({
        success: true,
        data: rules,
      }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  static async save(req) {
    try {
      const { error } = await this.requireAdmin(req);
      if (error) return error;

      const body = await req.json();
      const { entityType, rules, ...singleRule } = body;

      if (Array.isArray(rules)) {
        const data = await PriorityService.upsertMany({ entityType, rules });
        return Response.json({ success: true, data }, { status: 200 });
      }

      const data = await PriorityService.upsertRule({ entityType, ...singleRule });
      return Response.json({ success: true, data }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 400 });
    }
  }
}
