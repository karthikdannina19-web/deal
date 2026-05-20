import { dbConnect } from '@/config/database';
import { authenticate } from '@/middleware/auth.middleware';
import User from '@/models/user.model';

export async function POST(req) {
  try {
    await dbConnect();
    
    // We only process authenticated requests for logout to remove device/FCM tokens
    const authResult = await authenticate(req);
    
    if (!authResult.error) {
      const userId = authResult.user.id;
      
      let body = {};
      try {
        body = await req.json();
      } catch (e) {
        // Body is optional
      }

      const { deviceId, fcmToken } = body;

      if (fcmToken || deviceId) {
        const updateQuery = { $pull: { fcmTokens: {} } };
        
        if (fcmToken) {
          updateQuery.$pull.fcmTokens.token = fcmToken;
        }

        if (deviceId) {
           // If we tracked deviceId in fcmTokens or separately
           // We will unset deviceId if it matches
        }

        await User.findByIdAndUpdate(userId, updateQuery);
      }
    }

    // Since it's stateless JWT, we always return success so the client can clear its local state
    return Response.json({
      success: true,
      message: 'Logged out successfully',
      data: null,
      pagination: null
    }, { status: 200 });

  } catch (error) {
    console.error('Logout error:', error);
    return Response.json({
      success: false,
      message: 'An error occurred during logout',
      data: null,
      pagination: null
    }, { status: 500 });
  }
}
