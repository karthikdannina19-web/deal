import { dbConnect } from '@/config/database.js';
import { LocationMasterService } from '@/services/location-master.service.js';
import { LocationResolverService } from '@/services/location-resolver.service.js';
import { authenticate } from '@/middleware/auth.middleware.js';
import { UserService } from '@/modules/user/user.service.js';

/**
 * Locations Controller
 * Handles master-data for locations (States, Districts, Mandals)
 */
export class LocationsController {
  /**
   * GET /api/locations/tree
   * Returns a hierarchical tree of states, districts, and mandals
   */
  static async getLocationTree(req) {
    try {
      await dbConnect();
      const tree = await LocationMasterService.getTree();

      return Response.json({
        success: true,
        data: tree
      }, { status: 200 });

    } catch (error) {
      console.error('[LocationsController.getLocationTree Error]', error);
      return Response.json({
        success: false,
        message: 'Failed to fetch location tree'
      }, { status: 500 });
    }
  }

  static async resolveLocation(req) {
    try {
      await dbConnect();

      let body;
      try {
        body = await req.json();
      } catch {
        return Response.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
      }

      const latitude = Number(body.latitude);
      const longitude = Number(body.longitude);
      const accuracy = body.accuracy === undefined ? null : Number(body.accuracy);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return Response.json({ success: false, message: 'Latitude and longitude are required' }, { status: 400 });
      }

      const authHeader = req.headers.get('authorization');
      const auth = authHeader ? await authenticate(req) : { user: null, error: null };
      if (auth?.error && authHeader) {
        return auth.error;
      }

      const resolved = auth?.user?.id
        ? await UserService.resolveAndSaveLocation(auth.user.id, { latitude, longitude, accuracy })
        : await LocationResolverService.resolveCoordinates({ latitude, longitude });

      return Response.json({
        success: true,
        location: {
          state: { id: resolved.state._id, name: resolved.state.name },
          district: { id: resolved.district._id, name: resolved.district.name },
          mandal: { id: resolved.mandal._id, name: resolved.mandal.name },
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          addressLine: resolved.addressLine,
          area: resolved.area,
          city: resolved.city,
          pincode: resolved.pincode,
        }
      }, { status: 200 });
    } catch (error) {
      console.error('[LocationsController.resolveLocation Error]', error);
      const message = error.message || 'Failed to resolve location';
      const status = /unsupported|missing geocode|required|invalid/i.test(message) ? 400 : 500;
      return Response.json({
        success: false,
        message
      }, { status });
    }
  }
}
