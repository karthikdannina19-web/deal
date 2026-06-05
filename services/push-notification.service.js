import User from "@/models/user.model.js";
import {
  getFirebaseMessagingAccessToken,
  getFirebaseServiceAccount,
} from "@/firebase/firebaseAdmin.js";

const FCM_BATCH_SIZE = 500;
const MAX_RETRY_ATTEMPTS = 2;
const USER_FIREBASE_PROJECT_ID = "rhockdeal-20fc2";
const USER_FCM_SEND_URL = `https://fcm.googleapis.com/v1/projects/${USER_FIREBASE_PROJECT_ID}/messages:send`;

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument",
  "invalid-registration-token",
  "not-registered",
  "invalid-argument",
  "INVALID_ARGUMENT",
  "UNREGISTERED",
  "SENDER_ID_MISMATCH",
]);

const RETRYABLE_CODES = new Set([
  "messaging/internal-error",
  "messaging/server-unavailable",
  "messaging/quota-exceeded",
  "messaging/unavailable",
]);

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function normalizeToken(token) {
  if (typeof token !== "string") return "";
  return token;
}

function isValidDeviceToken(token) {
  if (!token) return false;
  if (token.length <= 15) return false;
  if (token !== token.trim()) return false;
  if (token.startsWith("test_fcm_token_")) return false;
  if (token.toLowerCase().includes("dummy")) return false;
  return true;
}

function asStringData(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function getErrorCode(error) {
  return error?.code || error?.errorInfo?.code || error?.status || "unknown";
}

function getFcmErrorCode(responseBody = {}) {
  const details = responseBody?.error?.details;
  if (Array.isArray(details)) {
    const fcmError = details.find((item) => item?.errorCode);
    if (fcmError?.errorCode) return fcmError.errorCode;
  }
  return responseBody?.error?.status || responseBody?.error?.code || "unknown";
}

function isInvalidTokenError(error) {
  return INVALID_TOKEN_CODES.has(getErrorCode(error));
}

function isRetryableError(error) {
  return RETRYABLE_CODES.has(getErrorCode(error));
}

function buildPayload(token, payload) {
  const action = payload.action && typeof payload.action === "object" ? payload.action : { type: "none" };
  const imageUrl = payload.imageUrl || undefined;

  return {
    token,
    notification: {
      title: payload.title,
      body: payload.body,
      image: imageUrl,
    },
    data: {
      type: asStringData(payload.type || "welcome"),
      screen: asStringData(payload.screen || payload.action?.target || "notifications"),
      notificationId: asStringData(payload.notificationId || ""),
      imageUrl: asStringData(payload.imageUrl || ""),
      actionType: asStringData(action.type || "none"),
      actionTarget: asStringData(action.target || ""),
      actionParams: asStringData(action.params || {}),
      metadata: asStringData(payload.metadata || {}),
    },
    android: {
      priority: "HIGH",
      notification: {
        channel_id: payload.androidChannelId || "default",
        image: imageUrl,
      },
    },
    apns: {
      headers: { "apns-priority": "10" },
      payload: { aps: { "mutable-content": 1 } },
      fcm_options: { image: imageUrl },
    },
  };
}

async function cleanupInvalidTokens(tokens = []) {
  if (!tokens.length) return;

  await User.updateMany(
    { "fcmTokens.token": { $in: tokens } },
    { $pull: { fcmTokens: { token: { $in: tokens } } } }
  );
}

async function sendHttpV1Message(message) {
  const serviceAccount = getFirebaseServiceAccount();
  if (serviceAccount.projectId !== USER_FIREBASE_PROJECT_ID) {
    throw new Error(
      `Firebase service account project mismatch. Expected ${USER_FIREBASE_PROJECT_ID}, got ${serviceAccount.projectId}.`
    );
  }

  const accessToken = await getFirebaseMessagingAccessToken();
  const response = await fetch(USER_FCM_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  const responseText = await response.text();
  let responseBody;
  try {
    responseBody = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseBody = { raw: responseText };
  }

  console.log("[PushNotificationService] FCM HTTP v1 response:", {
    url: USER_FCM_SEND_URL,
    status: response.status,
    ok: response.ok,
    body: responseBody,
  });

  if (!response.ok) {
    const code = getFcmErrorCode(responseBody);
    const error = new Error(responseBody?.error?.message || `FCM send failed with ${response.status}`);
    error.code = code;
    error.status = responseBody?.error?.status || code;
    error.response = responseBody;
    throw error;
  }

  return responseBody;
}

async function sendSingleWithRetry(token, payload, attempt = 1) {
  try {
    const response = await sendHttpV1Message(buildPayload(token, payload));
    return { token, success: true, error: null, response };
  } catch (error) {
    if (error.message.includes('credentials missing')) {
      console.warn("[PushNotificationService] Firebase notifications disabled (credentials missing).");
      return { token, success: false, error };
    }
    if (attempt < MAX_RETRY_ATTEMPTS && isRetryableError(error)) {
      return sendSingleWithRetry(token, payload, attempt + 1);
    }
    return { token, success: false, error };
  }
}

export class PushNotificationService {
  static extractValidTokensFromUsers(users = []) {
    const tokenSet = new Set();

    for (const user of users) {
      const userTokens = Array.isArray(user?.fcmTokens) ? user.fcmTokens : [];
      for (const tokenEntry of userTokens) {
        const normalized = normalizeToken(tokenEntry?.token);
        if (isValidDeviceToken(normalized)) {
          tokenSet.add(normalized);
        }
      }
    }

    return [...tokenSet];
  }

  static async sendToTokens(tokens = [], payload = {}) {
    const normalizedTokens = tokens
      .map(normalizeToken)
      .filter((token) => isValidDeviceToken(token));
    const uniqueTokens = [...new Set(normalizedTokens)];

    if (!uniqueTokens.length) {
      return {
        tokensTargeted: 0,
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
        failures: [],
      };
    }

    try {
      getFirebaseServiceAccount();
    } catch (error) {
      if (error.message.includes('credentials missing')) {
        console.warn("[PushNotificationService] Firebase notifications disabled (credentials missing).");
      } else {
        console.warn("[PushNotificationService] Firebase init failed:", error.message);
      }
      return {
        tokensTargeted: uniqueTokens.length,
        successCount: 0,
        failureCount: uniqueTokens.length,
        invalidTokens: [],
        failures: uniqueTokens.map((token) => ({ token, code: "firebase/init-failed" })),
      };
    }

    let successCount = 0;
    let failureCount = 0;
    const invalidTokens = [];
    const failures = [];

    const chunks = chunkArray(uniqueTokens, FCM_BATCH_SIZE);
    for (const tokenChunk of chunks) {
      const results = await Promise.all(
        tokenChunk.map((token) => sendSingleWithRetry(token, payload))
      );

      results.forEach((result) => {
        if (result.success) {
          successCount += 1;
          return;
        }

        if (isInvalidTokenError(result.error)) {
          invalidTokens.push(result.token);
          failureCount += 1;
          return;
        }

        failures.push({
          token: result.token,
          code: getErrorCode(result.error),
          retryable: isRetryableError(result.error),
        });
        failureCount += 1;
      });
    }

    const retryableTokens = failures.filter((f) => f.retryable).map((f) => f.token);
    const recoveredTokens = new Set();
    if (retryableTokens.length) {
      const retryResults = await Promise.all(
        retryableTokens.map((token) => sendSingleWithRetry(token, payload))
      );

      retryResults.forEach((result) => {
        if (result.success) {
          recoveredTokens.add(result.token);
          successCount += 1;
          failureCount -= 1;
          return;
        }

        if (isInvalidTokenError(result.error)) {
          invalidTokens.push(result.token);
        }
      });
    }

    const dedupedInvalidTokens = [...new Set(invalidTokens)];
    const finalFailures = failures.filter((failure) => !recoveredTokens.has(failure.token));
    if (dedupedInvalidTokens.length) {
      await cleanupInvalidTokens(dedupedInvalidTokens);
    }

    return {
      tokensTargeted: uniqueTokens.length,
      successCount,
      failureCount,
      invalidTokens: dedupedInvalidTokens,
      failures: finalFailures,
    };
  }
}
