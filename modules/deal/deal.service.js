import Ad from '../../models/ad.model.js';
import { dbConnect } from '../../config/database.js';
import { calculateDistanceKm, getVendorCoordinates, parseCoordinate } from '../../utils/offer-location.js';

/**
 * Deal Service
 * Handles public retrieval of approved offers (deals)
 */
export class DealService {
  /**
   * Fetch all approved deals with optional filtering
   * @param {Object} options - { category, lat, lng, limit }
   */
  static async getDeals({ category, lat, lng, limit = 20 }) {
    await dbConnect();

    const query = { status: 'approved' };

    // 1. Filter by Category (if provided)
    if (category) {
      query.category = category;
    }

    // 2. Fetch Deals (using Ad model)
    let deals = await Ad.find(query)
      .populate({
        path: 'vendor',
        select: 'storeName location fullAddress media locationCoordinates'
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const userLatitude = parseCoordinate(lat);
    const userLongitude = parseCoordinate(lng);

    return deals.map((deal) => {
      const { latitude, longitude } = getVendorCoordinates(deal.vendor);

      return {
        offerId: deal._id,
        _id: deal._id,
        title: deal.title,
        description: deal.description,
        discountValue: deal.price,
        discountType: 'fixed',
        images: deal.images,
        locationLabel: deal.vendor?.fullAddress || [deal.vendor?.location?.mandal, deal.vendor?.location?.district, deal.vendor?.location?.state].filter(Boolean).join(', '),
        distanceKm: calculateDistanceKm(userLatitude, userLongitude, latitude, longitude),
        latitude,
        longitude,
        lat: latitude,
        lng: longitude,
        store: {
          businessName: deal.vendor?.storeName,
          storeName: deal.vendor?.storeName,
          location: {
            lat: latitude,
            lng: longitude
          },
          locationCoordinates: {
            lat: latitude,
            lng: longitude
          },
          address: deal.vendor?.fullAddress
        },
        vendor: deal.vendor ? {
          ...deal.vendor,
          locationCoordinates: {
            ...(deal.vendor.locationCoordinates || {}),
            lat: latitude,
            lng: longitude
          }
        } : null
      };
    });
  }
}
