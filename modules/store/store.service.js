import mongoose from 'mongoose';
import Vendor from '../../models/vendor.model.js';
import Ads from '../../models/ads.model.js';
import Review from '../../models/review.model.js';
import User from '../../models/user.model.js';
import Ad from '../../models/ad.model.js';

/**
 * Store Service
 * Handles complex store and deal aggregation logic
 */
export class StoreService {
  /**
   * Fetch complete store details along with its approved deals
   * @param {string} storeId (Vendor _id)
   */
  static async getStoreDetails(storeId) {
    // 1. Fetch Active Vendor
    // We filter for 'active' status and select all public/social/location fields
    const vendor = await Vendor.findOne({ 
      _id: storeId, 
      status: 'active' 
    })
    .select('_id storeName storeAbout mobileNumber location fullAddress media workingHours locationCoordinates website instagram linkedin youtube facebook')
    .lean();

    if (!vendor) {
      return null;
    }

    // 2. Fetch Active Reviews & Ratings Breakdown
    const reviews = await Review.find({ vendorId: storeId, isActive: true })
      .populate({
        path: 'userId',
        select: 'firstName lastName profileImage email phone'
      })
      .sort({ createdAt: -1 })
      .lean();

    let totalReviews = reviews.length;
    let sumRatings = 0;
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    const customerReviews = reviews.map(rev => {
      sumRatings += rev.rating;
      const r = Math.min(5, Math.max(1, Math.round(rev.rating)));
      ratingBreakdown[r] = (ratingBreakdown[r] || 0) + 1;

      const u = rev.userId || {};
      const userName = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Anonymous User';
      const userImage = u.profileImage || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

      return {
        reviewId: rev._id,
        userName,
        userImage,
        comment: rev.reviewText || '',
        rating: rev.rating,
        createdAt: rev.createdAt
      };
    });

    const averageRating = totalReviews > 0 ? parseFloat((sumRatings / totalReviews).toFixed(1)) : 0.0;

    // 3. Fetch Active Offers/Deals from both Ad (new) and Ads (legacy) collections
    const adsList = await Ad.find({ 
      vendor: storeId, 
      status: 'approved' 
    })
    .sort({ createdAt: -1 })
    .lean();

    const offers = adsList.map(ad => {
      const primaryImage = ad.images?.find((img) => img.isPrimary)?.url || ad.images?.[0]?.url || '';
      const slugSuffix = ad.slug ? ad.slug : '';
      const shareUrl = slugSuffix ? `https://rhock.vercel.app/ads/${slugSuffix}` : '';
      const expiresAt = ad.expiresAt;
      const isActive = ad.status === 'approved' && (!expiresAt || new Date() < expiresAt);

      return {
        offerId: ad._id,
        title: ad.title,
        description: ad.description,
        image: primaryImage,
        category: ad.category || 'General',
        price: ad.price || 0,
        shareUrl,
        isActive
      };
    });

    // 4. Form legacy deals payload for backward compatibility
    const legacyDeals = await Ads.find({ 
      vendorId: storeId, 
      status: 'approved' 
    })
    .sort({ createdAt: -1 })
    .select('_id title description imageUrl views')
    .lean();

    // 5. Structure legacy store response
    const legacyStore = {
      _id: vendor._id,
      storeName: vendor.storeName,
      about: vendor.storeAbout,
      contactNumber: vendor.mobileNumber,
      location: {
        address: vendor.fullAddress || '',
        state: vendor.location?.state || '',
        district: vendor.location?.district || ''
      },
      workingHours: vendor.workingHours || 'Not specified',
      media: vendor.media || { thumbnailUrl: '', bannerUrl: '' },
      rating: averageRating,
      totalReviews: totalReviews
    };

    // Return everything required by both modern and legacy routes
    return {
      storeId: vendor._id,
      businessName: vendor.storeName || '',
      storeName: vendor.storeName || '',
      bannerImage: vendor.media?.bannerUrl || '',
      coverImage: vendor.media?.bannerUrl || '',
      logoImage: vendor.media?.thumbnailUrl || '',
      galleryImages: vendor.media?.images || [],
      description: vendor.storeAbout || '',
      about: vendor.storeAbout || '',
      fullAddress: vendor.fullAddress || '',
      latitude: vendor.locationCoordinates?.coordinates?.[1] || 0.0,
      longitude: vendor.locationCoordinates?.coordinates?.[0] || 0.0,
      phoneNumber: vendor.mobileNumber || '',
      openingHours: vendor.workingHours || 'Not specified',
      socialLinks: {
        facebook: vendor.facebook || '',
        instagram: vendor.instagram || '',
        youtube: vendor.youtube || '',
        website: vendor.website || '',
        x: vendor.linkedin || '' // Using linkedin or empty as x fallback
      },
      storeRatingSummary: {
        averageRating,
        totalReviews,
        ratingBreakdown
      },
      customerReviews,
      offers,

      // Legacy fallback objects
      store: legacyStore,
      deals: legacyDeals
    };
  }

  /**
   * Search and filter stores based on name, category, and location
   * @param {Object} options { search, categoryId, latitude, longitude, radius, page, limit }
   */
  static async searchStores(options) {
    const { search, categoryId, latitude, longitude, radius = 10, page = 1, limit = 10 } = options;
    const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
    const limitNum = Math.max(1, Number(limit));

    const pipeline = [];

    // 1. Geospatial Search (Must be first stage if using $geoNear)
    // $geoNear is required to calculate and return the 'distance' field
    if (latitude && longitude) {
      pipeline.push({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          distanceField: 'distance',
          maxDistance: parseFloat(radius) * 1000, // Convert KM to Meters
          spherical: true,
          query: { status: 'active' } // Filter active stores within the geo stage
        }
      });
    } else {
      // Regular filter if no geo-search params provided
      pipeline.push({ $match: { status: 'active' } });
    }

    // 2. Search Filter (Store Name Regex)
    if (search) {
      pipeline.push({
        $match: {
          storeName: { $regex: new RegExp(search, 'i') }
        }
      });
    }

    // 3. Category Filter
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      pipeline.push({
        $match: {
          categoryId: new mongoose.Types.ObjectId(categoryId)
        }
      });
    }

    // 4. Join with Categories for display name
    pipeline.push({
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'categoryDetails'
      }
    });

    pipeline.push({
      $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true }
    });

    // 5. Faceted Results for total count and pagination
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          // If geo-search was used, results are sorted by distance naturally
          // Fallback to name sorting
          { $sort: { distance: 1, storeName: 1 } },
          { $skip: skip },
          { $limit: limitNum },
          {
            $project: {
              _id: 1,
              storeName: 1,
              category: { $ifNull: ['$categoryDetails.name', 'General'] },
              location: {
                address: { $ifNull: ['$location.district', '$location.state'] }
              },
              distance: { 
                $cond: [
                  { $gt: ['$distance', null] }, 
                  { $round: [{ $divide: ['$distance', 1000] }, 1] }, // Round to 1 decimal place (KM)
                  null
                ] 
              },
              thumbnailUrl: '$media.thumbnailUrl'
            }
          }
        ]
      }
    });

    const result = await Vendor.aggregate(pipeline);

    const total = result[0]?.metadata[0]?.total || 0;
    const stores = result[0]?.data || [];

    return {
      stores,
      total,
      page: Number(page),
      limit: Number(limit)
    };
  }

  /**
   * Nearby Discovery: Get nearby stores along with their top 3 deals
   * @param {Object} options { latitude, longitude, radius, limit }
   */
  static async getNearbyDiscovery(options) {
    const { latitude, longitude, radius = 10, limit = 10 } = options;
    
    // 1. Fetch nearby stores using existing search logic (without pagination for discovery)
    const storeResult = await this.searchStores({
      latitude,
      longitude,
      radius,
      limit,
      page: 1
    });

    const stores = storeResult.stores;

    // 2. For each store, fetch top 3 active deals
    // This is better done in a separate loop or a more complex aggregate if performance is critical.
    // Given the small limit, a map with Promise.all is acceptable.
    const storesWithDeals = await Promise.all(stores.map(async (store) => {
      const deals = await Ads.find({ 
        vendorId: store._id, 
        status: 'approved' 
      })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('_id title description imageUrl views')
      .lean();

      return {
        ...store,
        deals
      };
    }));

    return storesWithDeals;
  }
}
