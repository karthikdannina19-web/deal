import { dbConnect } from '@/config/database';
import { authenticate } from '@/middleware/auth.middleware';
import User from '@/models/user.model';
import Ad from '@/models/ad.model';
import Store from '@/models/store.model';

export async function DELETE(req) {
  try {
    await dbConnect();
    const authResult = await authenticate(req);
    
    if (authResult.error) {
      return Response.json(
        { success: false, message: authResult.error.message, data: null, pagination: null },
        { status: authResult.error.statusCode || 401 }
      );
    }

    const userId = authResult.user.id;
    let body = {};
    
    try {
      body = await req.json();
    } catch (e) {
      // Body is optional
    }

    const { reason, feedback } = body;

    const user = await User.findById(userId);
    if (!user) {
      return Response.json({ success: false, message: 'User not found', data: null, pagination: null }, { status: 404 });
    }

    // Soft delete user
    user.status = 'deleted';
    user.deletedAt = new Date();
    // Clear identifying data if strict privacy is required
    // user.fcmTokens = []; 
    // user.deviceId = null;
    
    await user.save();

    // If the user is also a vendor, we should mark their ads/store as suspended or deleted
    if (user.role === 'vendor' && user.vendorProfile) {
      await Ad.updateMany({ user: userId }, { $set: { status: 'suspended' } });
      await Store.updateMany({ vendorId: user.vendorProfile }, { $set: { status: 'rejected' } });
    }

    // Log the reason/feedback if we have a separate collection, or just let it pass for now.
    if (reason || feedback) {
      console.log(`Account deleted by user ${userId}. Reason: ${reason}. Feedback: ${feedback}`);
    }

    return Response.json({
      success: true,
      message: 'Account successfully deleted',
      data: null,
      pagination: null
    }, { status: 200 });

  } catch (error) {
    console.error('Delete account error:', error);
    return Response.json({
      success: false,
      message: 'Failed to delete account',
      data: null,
      pagination: null
    }, { status: 500 });
  }
}
