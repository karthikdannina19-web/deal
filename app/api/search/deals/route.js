import { dbConnect } from '@/config/database';
import Ad from '@/models/ad.model';

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    
    const q = searchParams.get('q');
    const category = searchParams.get('category');
    const state = searchParams.get('state');
    const district = searchParams.get('district');
    const mandal = searchParams.get('mandal');
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    
    const groupBy = searchParams.get('groupBy');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const limitPerCategory = parseInt(searchParams.get('limitPerCategory') || '10', 10);
    const skip = (page - 1) * limit;
    
    const sort = searchParams.get('sort') || 'newest';

    const query = { status: 'approved' };
    
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }
    
    if (category && category !== 'all') query.category = category;
    if (state) query.state = state;
    if (district) query.district = district;
    if (mandal) query.mandal = mandal;

    if (!isNaN(lat) && !isNaN(lng)) {
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
      let distanceKm = null;
      // If we used geo-query, distance isn't easily extracted without aggregation, 
      // but we can send a placeholder or calculate it if lat/lng are provided.
      if (!isNaN(lat) && !isNaN(lng) && ad.location && ad.location.coordinates) {
        const [adLng, adLat] = ad.location.coordinates;
        distanceKm = calculateDistance(lat, lng, adLat, adLng);
      }

      return {
        id: ad._id,
        title: ad.title,
        category: ad.category,
        storeId: ad.vendor?._id || null,
        storeName: ad.vendor?.storeName || '',
        storeSummary: {
          businessName: ad.vendor?.storeName || '',
          logoImage: ad.vendor?.media?.thumbnailUrl || '',
          fullAddress: ad.vendor?.fullAddress || [ad.vendor?.location?.mandal, ad.vendor?.location?.district, ad.vendor?.location?.state].filter(Boolean).join(', ') || ''
        },
        imageUrl: ad.images && ad.images.length > 0 ? ad.images[0].url : '',
        locationLabel: ad.locationLabel || ad.address || [ad.mandal, ad.district].filter(Boolean).join(', '),
        distanceKm: distanceKm ? parseFloat(distanceKm.toFixed(1)) : null,
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

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
