import mongoose from 'mongoose';
import Vendor from '../../models/vendor.model.js';
import Store from '../../models/store.model.js';
import Ads from '../../models/ads.model.js';
import Review from '../../models/review.model.js';
import Ad from '../../models/ad.model.js';

/**
 * Store Service
 * Handles complex store and deal aggregation logic
 */
export class StoreService {
  static getActiveVendorQuery(extra = {}) {
    return {
      status: 'active',
      is_deleted: { $ne: true },
      account_status: { $ne: 'DELETED' },
      deletedAt: null,
      ...extra
    };
  }

  static getActiveStoreQuery(extra = {}) {
    return {
      status: 'active',
      isDeleted: { $ne: true },
      deletedAt: null,
      ...extra
    };
  }

  static async incrementStoreView(storeId) {
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return null;
    }

    const vendor = await Vendor.findOneAndUpdate(
      this.getActiveVendorQuery({ _id: storeId }),
      { $inc: { views: 1 } },
      { returnDocument: 'after' }
    ).select('_id views').lean();

    if (vendor) {
      return {
        entityType: 'vendor',
        storeId: vendor._id,
        viewCount: vendor.views || 0
      };
    }

    const store = await Store.findOneAndUpdate(
      this.getActiveStoreQuery({ _id: storeId }),
      { $inc: { views: 1 } },
      { returnDocument: 'after' }
    ).select('_id views').lean();

    if (!store) {
      return null;
    }

    return {
      entityType: 'store',
      storeId: store._id,
      viewCount: store.views || 0
    };
  }

  /**
   * Fetch complete store details along with its approved deals
   * @param {string} storeId (Vendor _id)
   */
  static async getStoreDetails(storeId) {
    // 1. Attempt to fetch active Vendor by the provided storeId
    // If that fails, fall back to a Store document with the same ID.
    let vendor = await Vendor.findOne({
      ...this.getActiveVendorQuery(),
      _id: storeId
    })
      .select('_id storeName storeAbout mobileNumber location fullAddress media workingHours locationCoordinates website instagram linkedin youtube facebook')
      .lean();

    let storeDoc = null;
    if (!vendor) {
      storeDoc = await Store.findOne(this.getActiveStoreQuery({ _id: storeId })).lean();
      if (!storeDoc) {
        return null;
      }
      vendor = await Vendor.findOne(this.getActiveVendorQuery({ _id: storeDoc.vendorId }))
        .select('_id storeName storeAbout mobileNumber location fullAddress media workingHours locationCoordinates website instagram linkedin youtube facebook')
        .lean();
      if (!vendor) {
        return null;
      }
    }

    const source = vendor || storeDoc;
    const resolvedAbout = this.buildStoreAbout(source);
    const latitude = source?.locationCoordinates?.coordinates?.[1] || source?.location?.coordinates?.[1] || null;
    const longitude = source?.locationCoordinates?.coordinates?.[0] || source?.location?.coordinates?.[0] || null;
    const hasValidCoordinates = this.hasValidCoordinates(latitude, longitude);
    const resolvedWorkingHours = (source?.workingHours || source?.businessHours || '').trim() || 'Not specified';
    const resolvedAddress = (source?.fullAddress || source?.address || '').trim() || [
      source?.location?.mandal,
      source?.location?.district,
      source?.location?.state
    ].filter(Boolean).join(', ');
    const sourceMedia = vendor?.media || { thumbnailUrl: '', bannerUrl: '', images: [] };
    const sourceImages = vendor ? sourceMedia.images || [] : (storeDoc?.images || []);

    // 2. Fetch Active Reviews & Ratings Breakdown
    const reviews = await Review.find({ vendorId: vendor?._id || storeDoc?.vendorId, isActive: true })
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
    const vendorId = vendor?._id || storeDoc?.vendorId || null;
    const requestedId = storeId;

    // Match ads either directly by the requested storeId (if it's a vendor id)
    // or by the vendorId referenced from a Store document. This ensures
    // GET /api/stores/:storeId returns all active ads belonging to that store
    const vendorMatchIds = [requestedId];
    if (vendorId && vendorId.toString() !== requestedId.toString()) vendorMatchIds.push(vendorId);

    const adsList = await Ad.find({ 
      vendor: { $in: vendorMatchIds }, 
      status: 'approved' 
    })
    .sort({ createdAt: -1 })
    .lean();

    const offers = adsList.map(ad => {
      const primaryImage = ad.images?.find((img) => img.isPrimary)?.url || ad.images?.[0]?.url || '';
      const slugSuffix = ad.slug ? ad.slug : '';
      const shareUrl = slugSuffix ? `https://rhock.vercel.app/ads/${slugSuffix}` : '';
      // Match UserAppService.mapAd: consider an ad active when status is 'approved'
      // (the user-facing ads list treats approved ads as active regardless of expiresAt)
      const isActive = ad.status === 'approved';

      return {
        offerId: ad._id,
        _id: ad._id,
        title: ad.title,
        description: ad.description,
        image: primaryImage,
        category: ad.category || 'General',
        price: ad.price || 0,
        shareUrl,
        isActive,
        locationLabel: vendor?.fullAddress || '',
        latitude: hasValidCoordinates ? latitude : null,
        longitude: hasValidCoordinates ? longitude : null,
        lat: hasValidCoordinates ? latitude : null,
        lng: hasValidCoordinates ? longitude : null,
        storeId: requestedId,
        store: {
          storeName: vendor?.storeName || '',
          location: {
            lat: hasValidCoordinates ? latitude : null,
            lng: hasValidCoordinates ? longitude : null
          },
          locationCoordinates: {
            lat: hasValidCoordinates ? latitude : null,
            lng: hasValidCoordinates ? longitude : null
          }
        }
      };
    });

    // 4. Form legacy deals payload for backward compatibility
    const legacyDeals = await Ads.find({ 
      vendorId: { $in: vendorMatchIds }, 
      status: 'approved' 
    })
    .sort({ createdAt: -1 })
    .select('_id title description imageUrl views')
    .lean();

    // 5. Structure legacy store response
    const legacyStore = {
      _id: source._id,
      storeName: source.storeName || source.businessName || '',
      about: resolvedAbout,
      description: resolvedAbout,
      contactNumber: vendor?.mobileNumber || storeDoc?.phone || '',
      location: {
        address: resolvedAddress,
        fullAddress: resolvedAddress,
        state: source.location?.state || '',
        district: source.location?.district || '',
        mandal: source.location?.mandal || '',
        latitude: hasValidCoordinates ? latitude : null,
        longitude: hasValidCoordinates ? longitude : null,
        coordinates: hasValidCoordinates ? [longitude, latitude] : []
      },
      latitude: hasValidCoordinates ? latitude : null,
      longitude: hasValidCoordinates ? longitude : null,
      hasValidCoordinates,
      workingHours: resolvedWorkingHours,
      viewCount: vendor?.views || storeDoc?.views || 0,
      media: sourceMedia,
      rating: averageRating,
      totalReviews: totalReviews
    };

    // Return everything required by both modern and legacy routes
    return {
      storeId: source._id,
      businessName: source.storeName || source.businessName || '',
      storeName: source.storeName || source.businessName || '',
      bannerImage: sourceMedia.bannerUrl || sourceImages[0] || '',
      coverImage: sourceMedia.bannerUrl || sourceImages[0] || '',
      logoImage: sourceMedia.thumbnailUrl || sourceImages[0] || '',
      galleryImages: vendor ? sourceMedia.images || [] : sourceImages,
      description: resolvedAbout,
      about: resolvedAbout,
      fullAddress: resolvedAddress,
      latitude: hasValidCoordinates ? latitude : null,
      longitude: hasValidCoordinates ? longitude : null,
      location: {
        address: resolvedAddress,
        fullAddress: resolvedAddress,
        state: source.location?.state || '',
        district: source.location?.district || '',
        mandal: source.location?.mandal || '',
        latitude: hasValidCoordinates ? latitude : null,
        longitude: hasValidCoordinates ? longitude : null,
        coordinates: hasValidCoordinates ? [longitude, latitude] : []
      },
      phoneNumber: vendor?.mobileNumber || storeDoc?.phone || '',
      openingHours: resolvedWorkingHours,
      workingHours: resolvedWorkingHours,
      viewCount: vendor?.views || storeDoc?.views || 0,
      socialLinks: {
        facebook: vendor?.facebook || '',
        instagram: vendor?.instagram || '',
        youtube: vendor?.youtube || '',
        website: vendor?.website || '',
        linkedin: vendor?.linkedin || '',
        x: ''
      },
      storeDetails: {
        about: resolvedAbout,
        address: resolvedAddress,
        fullAddress: resolvedAddress,
        state: source.location?.state || '',
        district: source.location?.district || '',
        mandal: source.location?.mandal || '',
        phoneNumber: vendor?.mobileNumber || storeDoc?.phone || '',
        openingHours: resolvedWorkingHours,
        hasAbout: Boolean(resolvedAbout),
        hasValidCoordinates,
        latitude: hasValidCoordinates ? latitude : null,
        longitude: hasValidCoordinates ? longitude : null
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

  static hasValidCoordinates(latitude, longitude) {
    return Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && !(latitude === 0 && longitude === 0);
  }

  static buildStoreAbout(entity) {
    const explicitAbout = entity.storeAbout?.trim() || entity.about?.trim();
    if (explicitAbout) {
      return explicitAbout;
    }

    const name = entity.storeName || entity.businessName || '';
    const fallbackParts = [
      name ? `${name} is available on Rhock.` : '',
      entity.location?.mandal || entity.location?.district || entity.location?.state
        ? `Serving customers in ${[entity.location?.mandal, entity.location?.district, entity.location?.state].filter(Boolean).join(', ')}.`
        : '',
      (entity.workingHours || entity.businessHours || '').trim() ? `Open ${(entity.workingHours || entity.businessHours || '').trim()}.` : ''
    ].filter(Boolean);

    return fallbackParts.join(' ').trim();
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
    const activeVendorIds = await Vendor.find(this.getActiveVendorQuery())
      .distinct('_id');

    const activeStoreMatch = this.getActiveStoreQuery({
      vendorId: { $in: activeVendorIds }
    });

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
          query: activeStoreMatch // Filter active stores within the geo stage
        }
      });
    } else {
      // Regular filter if no geo-search params provided
      pipeline.push({ $match: activeStoreMatch });
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
