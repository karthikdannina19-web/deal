import Ad from '../../models/ad.model.js';
import Store from '../../models/store.model.js';
import { dbConnect } from '../../config/database.js';

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
        select: 'storeName location fullAddress media'
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return deals.map(deal => ({
      offerId: deal._id,
      title: deal.title,
      description: deal.description,
      discountValue: deal.price, // Using price as fallback for discountValue
      discountType: 'fixed',
      images: deal.images,
      store: {
        businessName: deal.vendor?.storeName,
        location: {
          lat: deal.vendor?.locationCoordinates?.coordinates[1],
          lng: deal.vendor?.locationCoordinates?.coordinates[0]
        },
        address: deal.vendor?.fullAddress
      }
    }));
  }
}

