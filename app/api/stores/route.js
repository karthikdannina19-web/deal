import { dbConnect } from '@/config/database';
import Store from '@/models/store.model';
import Category from '@/models/category.model';

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    
    const q = searchParams.get('q');
    const category = searchParams.get('category');
    const categoryId = searchParams.get('categoryId');
    const state = searchParams.get('state');
    const district = searchParams.get('district');
    const mandal = searchParams.get('mandal');
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;
    
    const sort = searchParams.get('sort') || 'newest';

    const query = { status: 'active' };
    
    if (q) {
      query.$or = [
        { businessName: { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } }
      ];
    }

    if (categoryId) {
      const categoryDoc = await Category.findById(categoryId).select('name').lean();
      if (categoryDoc) {
        query.category = categoryDoc.name;
      } else {
        query.category = '_invalid_category_id_';
      }
    } else if (category && category !== 'all') {
      const trimmedCategory = category.trim();
      if (/^[0-9a-fA-F]{24}$/.test(trimmedCategory)) {
        const categoryDoc = await Category.findById(trimmedCategory).select('name').lean();
        if (categoryDoc) {
          query.category = categoryDoc.name;
        } else {
          query.category = trimmedCategory;
        }
      } else {
        query.category = trimmedCategory;
      }
    }

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
    if (sort === 'popular') sortOption = { views: -1 }; // Assuming views might be added to Store model later

    const [stores, total] = await Promise.all([
      Store.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Store.countDocuments(query)
    ]);

    const categoryNames = [...new Set(stores.map(store => store.category).filter(Boolean))];
    const categoryDocs = categoryNames.length > 0
      ? await Category.find({ name: { $in: categoryNames } }).select('_id name').lean()
      : [];

    const categoryMap = categoryDocs.reduce((acc, c) => {
      acc[c.name] = c._id.toString();
      return acc;
    }, {});

    const results = stores.map(store => {
      let distanceKm = null;
      if (!isNaN(lat) && !isNaN(lng) && store.location && store.location.coordinates) {
        const [adLng, adLat] = store.location.coordinates;
        distanceKm = calculateDistance(lat, lng, adLat, adLng);
      }

      return {
        _id: store._id,
        id: store._id,
        name: store.businessName,
        category: store.category || '',
        categoryId: categoryMap[store.category] || null,
        coverImageUrl: store.images && store.images.length > 0 ? store.images[0] : '',
        logoUrl: store.images && store.images.length > 0 ? store.images[0] : '',
        distanceKm: distanceKm ? parseFloat(distanceKm.toFixed(1)) : null,
        viewCount: store.views || 0,
        address: store.address || [store.mandal, store.district, store.state].filter(Boolean).join(', '),
        isActive: store.status === 'active'
      };
    });

    return Response.json({
      success: true,
      message: 'Stores fetched successfully',
      data: {
        stores: results
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching stores:', error);
    return Response.json({
      success: false,
      message: 'Failed to fetch stores'
    }, { status: 500 });
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
