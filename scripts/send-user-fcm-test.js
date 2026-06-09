import dotenv from 'dotenv';
import { PushNotificationService } from '../services/push-notification.service.js';

dotenv.config({ path: '.env.local' });

const token = process.argv[2] || process.env.USER_APP_FCM_TOKEN;

if (!token) {
  console.error('Usage: node scripts/send-user-fcm-test.js <USER_APP_FCM_TOKEN>');
  process.exit(1);
}

const result = await PushNotificationService.sendToTokens([token], {
  title: 'Test Notification',
  body: 'Testing user app push',
  type: 'test',
  androidChannelId: 'default',
});

console.log('[ManualFCMTest] PushNotificationService result:', result);
