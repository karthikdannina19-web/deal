import { dbConnect } from '@/config/database';
import Store from '@/models/store.model';

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
    
    if (category && category !== 'all') query.category = category;
    if (state) query.state = state;
    if (district) query.district = district;
    if (mandal) query.mandal = mandal;

    if (!isNaN(lat) && !isNaN(lng)) {
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 50000 // 50km
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

    const results = stores.map(store => {
      let distanceKm = null;
      if (!isNaN(lat) && !isNaN(lng) && store.location && store.location.coordinates) {
        const [adLng, adLat] = store.location.coordinates;
        distanceKm = calculateDistance(lat, lng, adLat, adLng);
      }

      return {
        id: store._id,
        name: store.businessName,
        coverImageUrl: store.images && store.images.length > 0 ? store.images[0] : '',
        logoUrl: store.images && store.images.length > 0 ? store.images[0] : '', // Fallback to cover if no logo
        distanceKm: distanceKm ? parseFloat(distanceKm.toFixed(1)) : null,
        viewCount: store.views || 0, // Fallback
        address: store.address || [store.mandal, store.district].filter(Boolean).join(', '),
        shortDescription: store.category,
        category: store.category,
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
