import Section from '@/models/section.model.js';
import Ad from '@/models/ad.model.js';
import { dbConnect } from '@/config/database.js';
import { authenticate } from '@/middleware/auth.middleware.js';
import User from '@/models/user.model.js';
import { VisibilityService } from '@/services/visibility.service.js';
import Category from '@/models/category.model.js';
import { SectionVisibilityService } from '@/services/section-visibility.service.js';
import { calculateDistanceKm, getVendorCoordinates, parseCoordinate } from '@/utils/offer-location.js';

export class SectionController {
  /**
   * GET /api/sections
   * Fetch all active sections with banners
   */
  static async listSections(req) {
    try {
      await dbConnect();
      const authHeader = req.headers.get('authorization');
      const auth = authHeader ? await authenticate(req) : { user: null, error: null };
      if (auth?.error && authHeader) return auth.error;
      const authUser = auth?.user?.id
        ? await User.findById(auth.user.id).select('stateId districtId mandalId').lean()
        : null;
      const userLocation = VisibilityService.getUserLocation(authUser);
      const sections = await SectionVisibilityService.getVisibleSections({ userLocation });
      return Response.json({ success: true, data: sections }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * GET /api/sections/[slug]/ads
   * Fetch ads for a specific section
   */
  static async getSectionAds(req, { params }) {
    try {
      await dbConnect();
      const { slug } = await params;
      const { searchParams } = new URL(req.url);
      const authHeader = req.headers.get('authorization');
      const auth = authHeader ? await authenticate(req) : { user: null, error: null };
      if (auth?.error && authHeader) return auth.error;
      const authUser = auth?.user?.id ? await User.findById(auth.user.id).select('stateId districtId mandalId').lean() : null;
      const userLocation = VisibilityService.getUserLocation(authUser);
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 20;
      const skip = (page - 1) * limit;
      const requestedCategoryId = searchParams.get('categoryId') || searchParams.get('category');
      const userLatitude = parseCoordinate(searchParams.get('lat'));
      const userLongitude = parseCoordinate(searchParams.get('lng'));

      const section = await Section.findOne(
        VisibilityService.buildMatchQuery(userLocation, { slug, isActive: true })
      )
        .select('_id name slug')
        .lean();
      if (!section) {
        return Response.json({ success: false, message: 'Section not found' }, { status: 404 });
      }

      const [banners, ads, total, categories] = await Promise.all([
        SectionVisibilityService.filterBannersBySection({
          userLocation,
          sectionId: section._id,
          categoryId: requestedCategoryId || null,
        })
          .select('_id section title image viewUrl whatsappLink storeLink order isActive')
          .sort({ order: 1 })
          .lean(),

        SectionVisibilityService.filterAdsBySection({
          userLocation,
          sectionId: section._id,
          categoryId: requestedCategoryId || null,
        })
          .select('_id section title category images status vendor')
          .populate('vendor', 'storeName location state district mandal locationCoordinates media fullAddress _id')
          .sort({ isFeatured: -1, priority: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        Ad.countDocuments(
          VisibilityService.buildMatchQuery(userLocation, {
            section: section._id,
            ...(requestedCategoryId ? { categoryId: requestedCategoryId } : {}),
            status: 'approved',
          })
        ),

        Category.find(
          VisibilityService.buildMatchQuery(userLocation, {
            sectionId: section._id,
            isActive: true,
          })
        )
          .select('_id name iconUrl imageUrl sectionId visibilityLevel')
          .sort({ name: 1 })
          .lean(),
      ]);

      const mappedBanners = banners.map((banner) => {
        const imageUrl = banner.image?.url || '';
        return {
          ...banner,
          id: banner._id,
          image: { ...(banner.image || {}), url: imageUrl },
          imageUrl,
          bannerUrl: imageUrl,
        };
      });

      const mappedAds = ads.map(ad => ({
        ...(() => {
          const { latitude, longitude } = getVendorCoordinates(ad.vendor);
          return {
        id: ad._id,
        _id: ad._id,
        title: ad.title,
        category: ad.category || 'General',
        storeId: ad.vendor?._id || null,
        storeName: ad.vendor?.storeName || '',
        locationLabel: ad.vendor?.fullAddress || [ad.vendor?.location?.mandal, ad.vendor?.location?.district, ad.vendor?.location?.state].filter(Boolean).join(', '),
        latitude,
        longitude,
        lat: latitude,
        lng: longitude,
        distanceKm: calculateDistanceKm(userLatitude, userLongitude, latitude, longitude),
        storeSummary: {
          businessName: ad.vendor?.storeName || '',
          logoImage: ad.vendor?.media?.thumbnailUrl || '',
          fullAddress: ad.vendor?.fullAddress || [ad.vendor?.location?.mandal, ad.vendor?.location?.district, ad.vendor?.location?.state].filter(Boolean).join(', ') || ''
        },
        store: {
          storeName: ad.vendor?.storeName || '',
          location: {
            lat: latitude,
            lng: longitude,
          },
          locationCoordinates: {
            lat: latitude,
            lng: longitude,
          },
        },
        storeDetails: {
          location: {
            lat: latitude,
            lng: longitude,
          },
          locationCoordinates: {
            lat: latitude,
            lng: longitude,
          },
        },
        vendor: ad.vendor ? {
          ...ad.vendor,
          locationCoordinates: {
            ...(ad.vendor.locationCoordinates || {}),
            lat: latitude,
            lng: longitude,
          },
        } : null,
        image: { url: ad.images?.[0]?.url || '' },
        viewCount: ad.showViews !== false ? (ad.views || 0) : null,
        clickCount: ad.showClicks !== false ? (ad.clicks || 0) : null,
        status: ad.status
          };
        })()
      }));

      return Response.json({
        success: true,
        data: {
          section,
          categories,
          banners: mappedBanners,
          ads: mappedAds,
        },
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }
}
