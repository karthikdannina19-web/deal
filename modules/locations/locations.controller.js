import { dbConnect } from '@/config/database.js';
import { LocationMasterService } from '@/services/location-master.service.js';
import { LocationResolverService } from '@/services/location-resolver.service.js';
import { authenticate } from '@/middleware/auth.middleware.js';
import { UserService } from '@/modules/user/user.service.js';
import mongoose from 'mongoose';

/**
 * Locations Controller
 * Handles master-data for locations (States, Districts, Mandals)
 */
export class LocationsController {
  /**
   * GET /api/locations/tree
   * Returns a hierarchical tree of states, districts, and mandals
   */
  static async getLocationTree() {
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

  /**
   * GET /api/locations/states
   * Returns all states/UTs for the location picker
   */
  static async getStates() {
    try {
      await dbConnect();
      const states = await LocationMasterService.getStates();

      return Response.json({
        success: true,
        data: states.map((state) => ({
          id: state._id,
          name: state.name,
          code: state.code,
        }))
      }, { status: 200 });
    } catch (error) {
      console.error('[LocationsController.getStates Error]', error);
      return Response.json({
        success: false,
        message: 'Failed to fetch states'
      }, { status: 500 });
    }
  }

  /**
   * GET /api/locations/districts?stateId=
   * Returns districts for one state
   */
  static async getDistricts(req) {
    try {
      await dbConnect();
      const { searchParams } = new URL(req.url);
      const stateId = searchParams.get('stateId');

      if (!mongoose.Types.ObjectId.isValid(stateId)) {
        return Response.json({
          success: false,
          message: 'Valid stateId is required'
        }, { status: 400 });
      }

      const districts = await LocationMasterService.getDistrictsByState(stateId);

      return Response.json({
        success: true,
        data: districts.map((district) => ({
          id: district._id,
          name: district.name,
          stateId: district.stateId,
        }))
      }, { status: 200 });
    } catch (error) {
      console.error('[LocationsController.getDistricts Error]', error);
      return Response.json({
        success: false,
        message: 'Failed to fetch districts'
      }, { status: 500 });
    }
  }

  /**
   * GET /api/locations/mandals?districtId=
   * Returns mandals/areas for one district
   */
  static async getMandals(req) {
    try {
      await dbConnect();
      const { searchParams } = new URL(req.url);
      const districtId = searchParams.get('districtId');

      if (!mongoose.Types.ObjectId.isValid(districtId)) {
        return Response.json({
          success: false,
          message: 'Valid districtId is required'
        }, { status: 400 });
      }

      const mandals = await LocationMasterService.getMandalsByDistrict(districtId);

      return Response.json({
        success: true,
        data: mandals.map((mandal) => ({
          id: mandal._id,
          name: mandal.name,
          districtId: mandal.districtId,
        }))
      }, { status: 200 });
    } catch (error) {
      console.error('[LocationsController.getMandals Error]', error);
      return Response.json({
        success: false,
        message: 'Failed to fetch mandals'
      }, { status: 500 });
    }
  }

  static async resolveLocation(req) {
    try {
      await dbConnect();

      let body = null;
      if (req.method === 'GET') {
        const { searchParams } = new URL(req.url);
        body = {
          latitude: searchParams.get('latitude') || searchParams.get('lat'),
          longitude: searchParams.get('longitude') || searchParams.get('lng'),
          accuracy: searchParams.get('accuracy'),
        };
      } else {
        try {
          body = await req.json();
        } catch {
          return Response.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
        }
      }

      const latitude = Number(body?.latitude ?? body?.lat);
      const longitude = Number(body?.longitude ?? body?.lng);
      const accuracy = body?.accuracy === undefined ? null : Number(body?.accuracy);

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

      const location = {
        state: { id: resolved.state._id, name: resolved.state.name },
        district: { id: resolved.district._id, name: resolved.district.name },
        mandal: { id: resolved.mandal._id, name: resolved.mandal.name },
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        lat: resolved.latitude,
        lng: resolved.longitude,
        addressLine: resolved.addressLine,
        area: resolved.area,
        city: resolved.city,
        pincode: resolved.pincode,
      };

      return Response.json({
        success: true,
        location,
        data: location
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
