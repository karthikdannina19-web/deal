import { dbConnect } from '@/config/database';
import Store from '@/models/store.model';
import Category from '@/models/category.model';
import Vendor from '@/models/vendor.model';
import { calculateDistanceKm, getVendorCoordinates, parseCoordinate } from '@/utils/offer-location.js';

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
    const lat = parseCoordinate(searchParams.get('lat'));
    const lng = parseCoordinate(searchParams.get('lng'));
    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;
    
    const sort = searchParams.get('sort') || 'newest';

    const storeQuery = { status: 'active' };
    const vendorQuery = {
      status: 'active',
      is_deleted: { $ne: true },
      account_status: { $ne: 'DELETED' }
    };
    
    if (q) {
      storeQuery.$or = [
        { businessName: { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } }
      ];
      vendorQuery.$or = [
        { storeName: { $regex: q, $options: 'i' } },
        { fullAddress: { $regex: q, $options: 'i' } }
      ];
    }

    let categoryName = null;
    let resolvedCategoryId = null;
    if (categoryId) {
      const categoryDoc = await Category.findById(categoryId).select('name').lean();
      if (categoryDoc) {
        categoryName = categoryDoc.name;
        resolvedCategoryId = categoryDoc._id;
      } else {
        categoryName = '_invalid_category_id_';
      }
    } else if (category && category !== 'all') {
      const trimmedCategory = category.trim();
      if (/^[0-9a-fA-F]{24}$/.test(trimmedCategory)) {
        const categoryDoc = await Category.findById(trimmedCategory).select('name').lean();
        if (categoryDoc) {
          categoryName = categoryDoc.name;
          resolvedCategoryId = categoryDoc._id;
        } else {
          categoryName = trimmedCategory;
        }
      } else {
        categoryName = trimmedCategory;
        const categoryDoc = await Category.findOne({ name: trimmedCategory }).select('_id name').lean();
        if (categoryDoc) {
          resolvedCategoryId = categoryDoc._id;
        }
      }
    }

    if (categoryName) storeQuery.category = categoryName;
    if (resolvedCategoryId) {
      vendorQuery.categoryId = resolvedCategoryId;
    } else if (categoryName) {
      vendorQuery._id = null;
    }

    if (state) {
      storeQuery.state = state;
      vendorQuery['location.state'] = state;
    }
    if (district) {
      storeQuery.district = district;
      vendorQuery['location.district'] = district;
    }
    if (mandal) {
      storeQuery.mandal = mandal;
      vendorQuery['location.mandal'] = mandal;
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'popular') sortOption = { views: -1 };

    const [stores, vendors] = await Promise.all([
      Store.find(storeQuery)
        .sort(sortOption)
        .lean(),
      Vendor.find(vendorQuery)
        .populate('categoryId', '_id name')
        .sort(sortOption)
        .lean()
    ]);

    const categoryNames = [...new Set(stores.map(store => store.category).filter(Boolean))];
    const categoryDocs = categoryNames.length > 0
      ? await Category.find({ name: { $in: categoryNames } }).select('_id name').lean()
      : [];

    const categoryMap = categoryDocs.reduce((acc, c) => {
      acc[c.name] = c._id.toString();
      return acc;
    }, {});

    const mappedStores = stores.map(store => {
      const storeLat = parseCoordinate(store.location?.coordinates?.[1]);
      const storeLng = parseCoordinate(store.location?.coordinates?.[0]);
      const distanceKm = calculateDistanceKm(lat, lng, storeLat, storeLng);

      return {
        _id: store._id,
        id: store._id,
        name: store.businessName,
        category: store.category || '',
        categoryId: categoryMap[store.category] || null,
        coverImageUrl: store.images && store.images.length > 0 ? store.images[0] : '',
        logoUrl: store.images && store.images.length > 0 ? store.images[0] : '',
        distanceKm,
        latitude: storeLat,
        longitude: storeLng,
        lat: storeLat,
        lng: storeLng,
        viewCount: store.views || 0,
        address: store.address || [store.mandal, store.district, store.state].filter(Boolean).join(', '),
        location: {
          state: store.state || '',
          district: store.district || '',
          mandal: store.mandal || '',
          latitude: storeLat,
          longitude: storeLng,
          lat: storeLat,
          lng: storeLng,
          coordinates: storeLat !== null && storeLng !== null ? [storeLng, storeLat] : []
        },
        isActive: store.status === 'active'
      };
    });

    const mappedVendors = vendors.map(vendor => {
      const { latitude, longitude } = getVendorCoordinates(vendor);
      const distanceKm = calculateDistanceKm(lat, lng, latitude, longitude);
      const address = vendor.fullAddress || [vendor.location?.mandal, vendor.location?.district, vendor.location?.state].filter(Boolean).join(', ');

      return {
        _id: vendor._id,
        id: vendor._id,
        name: vendor.storeName || vendor.fullName || '',
        category: vendor.categoryId?.name || '',
        categoryId: vendor.categoryId?._id || null,
        coverImageUrl: vendor.media?.bannerUrl || vendor.media?.images?.[0] || vendor.media?.thumbnailUrl || '',
        logoUrl: vendor.media?.thumbnailUrl || vendor.media?.images?.[0] || '',
        distanceKm,
        latitude,
        longitude,
        lat: latitude,
        lng: longitude,
        viewCount: vendor.views || 0,
        address,
        location: {
          state: vendor.location?.state || '',
          district: vendor.location?.district || '',
          mandal: vendor.location?.mandal || '',
          latitude,
          longitude,
          lat: latitude,
          lng: longitude,
          coordinates: latitude !== null && longitude !== null ? [longitude, latitude] : []
        },
        isActive: vendor.status === 'active'
      };
    });

    const allResults = [...mappedVendors, ...mappedStores];
    if (sort === 'distance') {
      allResults.sort((a, b) => {
        const aDistance = Number.isFinite(a.distanceKm) ? a.distanceKm : Number.MAX_SAFE_INTEGER;
        const bDistance = Number.isFinite(b.distanceKm) ? b.distanceKm : Number.MAX_SAFE_INTEGER;
        return aDistance - bDistance;
      });
    }

    const total = allResults.length;
    const results = allResults.slice(skip, skip + safeLimit);

    return Response.json({
      success: true,
      message: 'Stores fetched successfully',
      total,
      data: {
        stores: results,
        total
      },
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit)
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
