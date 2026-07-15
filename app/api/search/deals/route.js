import { dbConnect } from '@/config/database';
import Ad from '@/models/ad.model';
import '@/models/vendor.model.js';
import { calculateDistanceKm, getVendorCoordinates, parseCoordinate } from '@/utils/offer-location.js';
import { VisibilityService } from '@/services/visibility.service.js';
import { LocationMasterService } from '@/services/location-master.service.js';

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    
    const q = searchParams.get('q');
    const category = searchParams.get('category');
    const state = searchParams.get('state');
    const district = searchParams.get('district');
    const mandal = searchParams.get('mandal');
    const stateId = searchParams.get('stateId');
    const districtId = searchParams.get('districtId');
    const mandalId = searchParams.get('mandalId');
    const lat = parseCoordinate(searchParams.get('lat'));
    const lng = parseCoordinate(searchParams.get('lng'));
    
    const groupBy = searchParams.get('groupBy');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const limitPerCategory = parseInt(searchParams.get('limitPerCategory') || '10', 10);
    const skip = (page - 1) * limit;
    
    const sort = searchParams.get('sort') || 'newest';

    let userLocation = stateId ? {
      stateId,
      districtId: districtId || null,
      mandalId: mandalId || null,
    } : null;

    if (!userLocation && (state || district || mandal)) {
      try {
        const resolved = await LocationMasterService.findByNames({ state, district, mandal });
        userLocation = {
          stateId: resolved.state?._id || null,
          districtId: resolved.district?._id || null,
          mandalId: resolved.mandal?._id || null,
        };
      } catch {
        userLocation = null;
      }
    }

    const query = VisibilityService.buildMatchQuery(userLocation, { status: 'approved' });
    
    if (q) {
      const searchMatchers = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
      query.$and = [...(query.$and || []), { $or: query.$or }, { $or: searchMatchers }];
      delete query.$or;
    }
    
    if (category && category !== 'all') query.category = category;
    if (lat !== null && lng !== null) {
      query.location = {
        $geoWithin: {
          $centerSphere: [[lng, lat], 50 / 6378.1] // 50km radius
        }
      };
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'popular') sortOption = { views: -1 };

    const adQuery = Ad.find(query)
      .populate('vendor', 'storeName location state district mandal locationCoordinates media fullAddress _id')
      .sort(sortOption)
      .lean();

    if (!groupBy) {
      adQuery.skip(skip).limit(limit);
    }

    const [ads, total] = await Promise.all([
      adQuery,
      Ad.countDocuments(query)
    ]);

    // We can also return filters/categories available
    const filters = [
      { id: 'all', name: 'All Categories' },
      { id: 'Food', name: 'Food & Dining' },
      { id: 'Shopping', name: 'Shopping' },
      { id: 'Services', name: 'Services' },
      { id: 'Entertainment', name: 'Entertainment' },
    ];

    const mappedAds = ads.map(ad => {
      const { latitude, longitude } = getVendorCoordinates(ad.vendor);
      const distanceKm = calculateDistanceKm(lat, lng, latitude, longitude);

      return {
        id: ad._id,
        _id: ad._id,
        title: ad.title,
        category: ad.category,
        storeId: ad.vendor?._id || null,
        storeName: ad.vendor?.storeName || '',
        latitude,
        longitude,
        lat: latitude,
        lng: longitude,
        storeSummary: {
          businessName: ad.vendor?.storeName || '',
          logoImage: ad.vendor?.media?.thumbnailUrl || '',
          fullAddress: ad.vendor?.fullAddress || [ad.vendor?.location?.mandal, ad.vendor?.location?.district, ad.vendor?.location?.state].filter(Boolean).join(', ') || ''
        },
        store: {
          storeName: ad.vendor?.storeName || '',
          location: {
            lat: latitude,
            lng: longitude
          },
          locationCoordinates: {
            lat: latitude,
            lng: longitude
          }
        },
        storeDetails: {
          location: {
            lat: latitude,
            lng: longitude
          },
          locationCoordinates: {
            lat: latitude,
            lng: longitude
          }
        },
        vendor: ad.vendor ? {
          ...ad.vendor,
          locationCoordinates: {
            ...(ad.vendor.locationCoordinates || {}),
            lat: latitude,
            lng: longitude
          }
        } : null,
        imageUrl: ad.images && ad.images.length > 0 ? ad.images[0].url : '',
        locationLabel: ad.locationLabel || ad.address || ad.vendor?.fullAddress || [ad.vendor?.location?.mandal, ad.vendor?.location?.district, ad.vendor?.location?.state].filter(Boolean).join(', '),
        distanceKm,
        viewCount: ad.showViews !== false ? (ad.views || 0) : null,
        clickCount: ad.showClicks !== false ? (ad.clicks || 0) : null,
        shareLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}/ad/${ad._id}`,
        isActive: ad.status === 'approved'
      };
    });

    if (groupBy === 'category') {
      const categoryNameMap = new Map(filters.map(({ id, name }) => [id, name]));
      const grouped = new Map();

      mappedAds.forEach(ad => {
        const categoryId = ad.category || 'General';
        if (!grouped.has(categoryId)) {
          grouped.set(categoryId, {
            categoryId,
            categoryName: categoryNameMap.get(categoryId) || categoryId,
            total: 0,
            ads: []
          });
        }

        const section = grouped.get(categoryId);
        section.total += 1;
        if (section.ads.length < limitPerCategory) {
          section.ads.push(ad);
        }
      });

      const categorySections = Array.from(grouped.values());

      return Response.json({
        success: true,
        message: 'Deals fetched successfully',
        data: {
          filters,
          categorySections
        },
        pagination: {
          page,
          limit: limitPerCategory,
          total: categorySections.length,
          totalPages: Math.ceil(categorySections.length / limitPerCategory)
        }
      }, { status: 200 });
    }

    return Response.json({
      success: true,
      message: 'Deals fetched successfully',
      data: {
        filters,
        results: mappedAds
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching deals:', error);
    return Response.json({
      success: false,
      message: 'Failed to fetch deals'
    }, { status: 500 });
  }
}
