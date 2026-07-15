import Section from '@/models/section.model.js';
import Ad from '@/models/ad.model.js';
import '@/models/vendor.model.js';
import { dbConnect } from '@/config/database.js';
import { authenticate } from '@/middleware/auth.middleware.js';
import User from '@/models/user.model.js';
import { VisibilityService } from '@/services/visibility.service.js';
import Category from '@/models/category.model.js';
import { SectionVisibilityService } from '@/services/section-visibility.service.js';
import { calculateDistanceKm, getVendorCoordinates, parseCoordinate } from '@/utils/offer-location.js';
import { PriorityService } from '@/services/priority.service.js';
import { LocationResolverService } from '@/services/location-resolver.service.js';
import { LocationMasterService } from '@/services/location-master.service.js';

export class SectionController {
  static async resolveRequestLocation(req, authUser = null) {
    const { searchParams } = new URL(req.url);

    const queryStateId = searchParams.get('stateId');
    const queryDistrictId = searchParams.get('districtId');
    const queryMandalId = searchParams.get('mandalId');
    if (queryStateId) {
      return {
        stateId: queryStateId,
        districtId: queryDistrictId || null,
        mandalId: queryMandalId || null,
      };
    }

    const normalizedAuthLocation = VisibilityService.getUserLocation(authUser);
    if (normalizedAuthLocation) {
      return normalizedAuthLocation;
    }

    const latitude = parseCoordinate(searchParams.get('lat') || searchParams.get('latitude'));
    const longitude = parseCoordinate(searchParams.get('lng') || searchParams.get('longitude'));
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      try {
        const resolved = await LocationResolverService.resolveCoordinates({ latitude, longitude });
        return {
          stateId: resolved.state._id,
          districtId: resolved.district._id,
          mandalId: resolved.mandal._id,
        };
      } catch {
        // fall through
      }
    }

    const state = searchParams.get('state');
    const district = searchParams.get('district');
    const mandal = searchParams.get('mandal');
    if (state && district && mandal) {
      try {
        const resolved = await LocationMasterService.findByNames({
          state,
          district,
          mandal,
          autoCreateMissingDistrict: false,
          autoCreateMissingMandal: false,
        });
        return {
          stateId: resolved.state._id,
          districtId: resolved.district._id,
          mandalId: resolved.mandal._id,
        };
      } catch {
        return null;
      }
    }

    return null;
  }

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
      const userLocation = await this.resolveRequestLocation(req, authUser);
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
      const userLocation = await this.resolveRequestLocation(req, authUser);
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
          .select('_id section title category images status vendor showViews showClicks views clicks createdAt isFeatured priority')
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

      const adPriorityMap = await PriorityService.getEffectivePriorityMap(
        'ad',
        ads.map((ad) => ad._id),
        userLocation
      );

      const orderedAds = PriorityService.sortItemsByPriority(
        ads,
        (ad) => ad._id,
        adPriorityMap,
        (left, right) => {
          if ((right.isFeatured ? 1 : 0) !== (left.isFeatured ? 1 : 0)) {
            return (right.isFeatured ? 1 : 0) - (left.isFeatured ? 1 : 0);
          }
          if ((right.priority || 0) !== (left.priority || 0)) {
            return (right.priority || 0) - (left.priority || 0);
          }
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        }
      );

      const mappedAds = orderedAds.map((ad) => {
        const { latitude, longitude } = getVendorCoordinates(ad.vendor);
        const rule = adPriorityMap.get(String(ad._id));
        return {
          id: ad._id,
          _id: ad._id,
          title: ad.title,
          category: ad.category || 'General',
          storeId: ad.vendor?._id || null,
          storeName: ad.vendor?.storeName || '',
          storeAddress: ad.vendor?.fullAddress || '',
          locationLabel: ad.vendor?.fullAddress || [ad.vendor?.location?.mandal, ad.vendor?.location?.district, ad.vendor?.location?.state].filter(Boolean).join(', '),
          latitude,
          longitude,
          lat: latitude,
          lng: longitude,
          distanceKm: calculateDistanceKm(userLatitude, userLongitude, latitude, longitude),
          storeSummary: {
            businessName: ad.vendor?.storeName || '',
            logoImage: ad.vendor?.media?.thumbnailUrl || '',
            fullAddress: ad.vendor?.fullAddress || [ad.vendor?.location?.mandal, ad.vendor?.location?.district, ad.vendor?.location?.state].filter(Boolean).join(', ') || '',
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
          resolvedPriority: rule?.priority ?? null,
          priorityScopeLevel: rule?.scopeLevel ?? null,
          status: ad.status,
        };
      });

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
