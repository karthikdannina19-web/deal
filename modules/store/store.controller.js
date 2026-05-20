import { StoreService } from '@/modules/store/store.service.js';
import { dbConnect } from '@/config/database.js';

/**
 * Store Controller
 * Handles requests for public store profile viewing
 */
export class StoreController {
  /**
   * GET /api/stores/:storeId
   * Public endpoint to get store profile and its deals
   */
  static async getStoreDetails(req, { params }) {
    try {
      // 1. Ensure Database Connection
      await dbConnect();

      // 2. Extract storeId from URL parameters
      const { storeId } = await params;

      if (!storeId) {
        return Response.json({ 
          success: false, 
          message: 'Store ID is required',
          data: null,
          pagination: null
        }, { status: 400 });
      }

      // 3. Fetch consolidated data from Service
      const result = await StoreService.getStoreDetails(storeId);

      // 4. Verify store existence and status
      if (!result) {
        return Response.json({ 
          success: false, 
          message: 'Store not found or is currently inactive',
          data: null,
          pagination: null
        }, { status: 404 });
      }

      // 5. Return JSON payload wrapped consistently
      return Response.json({
        success: true,
        message: 'Store details fetched successfully',
        data: {
          storeId: result.storeId,
          businessName: result.businessName,
          storeName: result.storeName,
          bannerImage: result.bannerImage,
          coverImage: result.coverImage,
          logoImage: result.logoImage,
          galleryImages: result.galleryImages,
          description: result.description,
          about: result.about,
          fullAddress: result.fullAddress,
          latitude: result.latitude,
          longitude: result.longitude,
          phoneNumber: result.phoneNumber,
          openingHours: result.openingHours,
          socialLinks: result.socialLinks,
          storeRatingSummary: result.storeRatingSummary,
          customerReviews: result.customerReviews,
          offers: result.offers,
          
          // Legacy properties for backward compatibility
          store: result.store,
          deals: result.deals
        },
        pagination: null
      }, { status: 200 });

    } catch (error) {
      console.error('[StoreController.getStoreDetails Error]', error);

      // Handle common Mongoose validation/formatting errors
      if (error.name === 'CastError') {
        return Response.json({ 
          success: false, 
          message: 'Invalid Store ID provided',
          data: null,
          pagination: null
        }, { status: 400 });
      }

      // Standard error response
      return Response.json({
        success: false,
        message: 'Failed to retrieve store details',
        data: null,
        pagination: null
      }, { status: 500 });
    }
  }

  /**
   * GET /api/stores/search
   * Discovery Engine: Search stores by keyword, category, and geolocation
   */
  static async searchStores(req) {
    try {
      await dbConnect();

      const { searchParams } = new URL(req.url);
      
      const search = searchParams.get('search') || null;
      const categoryId = searchParams.get('categoryId') || null;
      const latitude = searchParams.get('latitude');
      const longitude = searchParams.get('longitude');
      const radius = parseFloat(searchParams.get('radius')) || 10;
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 10;

      // 1. Validation: Geo-params (if provided, both lat and lng are required)
      let lat = null;
      let lng = null;

      if (latitude || longitude) {
        lat = parseFloat(latitude);
        lng = parseFloat(longitude);

        if (isNaN(lat) || isNaN(lng)) {
          return Response.json({ 
            success: false, 
            message: 'Geospatial search requires valid numeric latitude and longitude' 
          }, { status: 400 });
        }

        // Validate Latitude (-90 to 90)
        if (lat < -90 || lat > 90) {
          return Response.json({ 
            success: false, 
            message: 'Latitude must be between -90 and 90' 
          }, { status: 400 });
        }

        // Validate Longitude (-180 to 180)
        if (lng < -180 || lng > 180) {
          return Response.json({ 
            success: false, 
            message: 'Longitude must be between -180 and 180' 
          }, { status: 400 });
        }
      }

      // 2. Execute Search via Service
      const result = await StoreService.searchStores({
        search,
        categoryId,
        latitude: lat,
        longitude: lng,
        radius,
        page,
        limit
      });

      // 3. Return Combined Payload
      return Response.json({
        success: true,
        total: result.total,
        page: result.page,
        limit: result.limit,
        stores: result.stores
      }, { status: 200 });

    } catch (error) {
      console.error('[StoreController.searchStores Error]', error);
      return Response.json({
        success: false,
        message: 'An error occurred while searching for stores'
      }, { status: 500 });
    }
  }

  /**
   * GET /api/stores/nearby
   * Nearby Discovery: Get stores and deals near a specific location
   */
  static async getNearby(req) {
    try {
      await dbConnect();

      const { searchParams } = new URL(req.url);
      const latitude = searchParams.get('lat') || searchParams.get('latitude');
      const longitude = searchParams.get('lng') || searchParams.get('longitude');
      const radius = parseFloat(searchParams.get('radius')) || 10;
      const limit = parseInt(searchParams.get('limit')) || 10;

      if (!latitude || !longitude) {
        return Response.json({ 
          success: false, 
          message: 'Latitude and Longitude are required for nearby discovery' 
        }, { status: 400 });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lng)) {
        return Response.json({ success: false, message: 'Invalid coordinates' }, { status: 400 });
      }

      const result = await StoreService.getNearbyDiscovery({
        latitude: lat,
        longitude: lng,
        radius,
        limit
      });

      return Response.json({
        success: true,
        stores: result
      }, { status: 200 });

    } catch (error) {
      console.error('[StoreController.getNearby Error]', error);
      return Response.json({ success: false, message: 'Failed to fetch nearby discovery' }, { status: 500 });
    }
  }

  /**
   * GET /api/offers/:offerId
   * Public endpoint to get offer details, parent store info, and reviews
   */
  static async getOfferDetails(req, { params }) {
    try {
      await dbConnect();
      const { offerId } = await params;

      if (!offerId) {
        return Response.json({
          success: false,
          message: 'Offer ID is required',
          data: null
        }, { status: 400 });
      }

      // 1. Fetch Ad
      const Ad = (await import('@/models/ad.model.js')).default;
      const ad = await Ad.findById(offerId).lean();

      if (!ad) {
        return Response.json({
          success: false,
          message: 'Offer not found',
          data: null
        }, { status: 404 });
      }

      // 2. Fetch Parent Store (Vendor)
      const Vendor = (await import('@/models/vendor.model.js')).default;
      const vendor = await Vendor.findById(ad.vendor).lean();

      if (!vendor) {
        return Response.json({
          success: false,
          message: 'Store associated with this offer not found',
          data: null
        }, { status: 404 });
      }

      // 3. Fetch Store Reviews & Ratings Breakdown
      const Review = (await import('@/models/review.model.js')).default;
      const reviews = await Review.find({ vendorId: ad.vendor, isActive: true })
        .populate({
          path: 'userId',
          select: 'firstName lastName profileImage email phone'
        })
        .sort({ createdAt: -1 })
        .lean();

      let totalReviews = reviews.length;
      let sumRatings = 0;
      const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      const storeReviews = reviews.map(rev => {
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

      // 4. Form coordinates and images
      const primaryImage = ad.images?.find((img) => img.isPrimary)?.url || ad.images?.[0]?.url || '';
      const expiresAt = ad.expiresAt;
      const isActive = ad.status === 'approved' && (!expiresAt || new Date() < expiresAt);
      const shareUrl = ad.slug ? `https://rhock.vercel.app/ads/${ad.slug}` : '';

      return Response.json({
        success: true,
        message: 'Offer details fetched successfully',
        data: {
          offerId: ad._id,
          title: ad.title,
          description: ad.description,
          image: primaryImage,
          category: ad.category || 'General',
          price: ad.price || 0,
          priceType: ad.priceType || 'fixed',
          shareUrl,
          isActive,
          storeId: vendor._id,
          storeName: vendor.storeName || '',
          
          storeSummary: {
            storeId: vendor._id,
            businessName: vendor.storeName || '',
            logoImage: vendor.media?.thumbnailUrl || '',
            averageRating,
            totalReviews,
            fullAddress: vendor.fullAddress || ''
          },
          
          feedbackType: 'store',
          storeRatingSummary: {
            averageRating,
            totalReviews,
            ratingBreakdown
          },
          storeReviews
        },
        pagination: null
      }, { status: 200 });

    } catch (error) {
      console.error('[StoreController.getOfferDetails Error]', error);
      if (error.name === 'CastError') {
        return Response.json({
          success: false,
          message: 'Invalid Offer ID provided',
          data: null
        }, { status: 400 });
      }
      return Response.json({
        success: false,
        message: 'Failed to retrieve offer details',
        data: null
      }, { status: 500 });
    }
  }

  /**
   * POST /api/stores/:storeId/reviews
   * Submit review/rating for a vendor/store
   */
  static async submitReview(req, { params }) {
    try {
      await dbConnect();
      const { storeId } = await params;

      if (!storeId) {
        return Response.json({
          success: false,
          message: 'Store ID is required',
          data: null
        }, { status: 400 });
      }

      // 1. Verify Store (Vendor) Exists
      const Vendor = (await import('@/models/vendor.model.js')).default;
      const vendor = await Vendor.findById(storeId).lean();
      if (!vendor) {
        return Response.json({
          success: false,
          message: 'Store not found',
          data: null
        }, { status: 404 });
      }

      // 2. Parse Body
      const body = await req.json().catch(() => ({}));
      const { rating, comment } = body;

      if (rating === undefined || rating === null) {
        return Response.json({
          success: false,
          message: 'Rating is required',
          data: null
        }, { status: 400 });
      }

      const numRating = Number(rating);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return Response.json({
          success: false,
          message: 'Rating must be a number between 1 and 5',
          data: null
        }, { status: 400 });
      }

      // 3. Authenticate User with fallback in development
      let userId = '69f980072f64d21725a3ae33'; // Dev fallback user ID
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const { authenticate } = await import('@/middleware/auth.middleware.js');
        const { user, error: authError } = await authenticate(req);
        if (authError) {
          return Response.json({
            success: false,
            message: authError.message || 'Authentication failed',
            data: null
          }, { status: 401 });
        }
        userId = user.id;
      }

      // 4. Create and Save Review
      const Review = (await import('@/models/review.model.js')).default;
      const newReview = new Review({
        vendorId: storeId,
        userId,
        rating: numRating,
        reviewText: comment || '',
        isActive: true
      });

      await newReview.save();

      return Response.json({
        success: true,
        message: 'Review submitted successfully',
        data: {
          reviewId: newReview._id,
          userId: newReview.userId,
          vendorId: newReview.vendorId,
          rating: newReview.rating,
          reviewText: newReview.reviewText,
          isActive: newReview.isActive,
          createdAt: newReview.createdAt,
          updatedAt: newReview.updatedAt
        }
      }, { status: 201 });

    } catch (error) {
      console.error('[StoreController.submitReview Error]', error);
      if (error.name === 'CastError') {
        return Response.json({
          success: false,
          message: 'Invalid Store ID provided',
          data: null
        }, { status: 400 });
      }
      return Response.json({
        success: false,
        message: 'Failed to submit review',
        data: null
      }, { status: 500 });
    }
  }
}
