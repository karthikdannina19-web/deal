import User from "@/models/user.model.js";
import { getFirebaseMessaging } from "@/firebase/firebaseAdmin.js";

const FCM_BATCH_SIZE = 500;
const MAX_RETRY_ATTEMPTS = 2;

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument",
  "invalid-registration-token",
  "not-registered",
  "invalid-argument",
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
  return token.trim();
}

function isValidDeviceToken(token) {
  if (!token) return false;
  if (token.length <= 15) return false;
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
  return error?.code || error?.errorInfo?.code || "unknown";
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
      notificationId: asStringData(payload.notificationId || ""),
      imageUrl: asStringData(payload.imageUrl || ""),
      actionType: asStringData(action.type || "none"),
      actionTarget: asStringData(action.target || ""),
      actionParams: asStringData(action.params || {}),
      metadata: asStringData(payload.metadata || {}),
    },
    android: {
      priority: "high",
      notification: {
        channelId: "high_importance_channel",
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

async function sendSingleWithRetry(token, payload, attempt = 1) {
  const messaging = getFirebaseMessaging();
  try {
    await messaging.send(buildPayload(token, payload));
    return { token, success: true, error: null };
  } catch (error) {
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

    let messaging;
    try {
      messaging = getFirebaseMessaging();
    } catch (error) {
      console.error("[PushNotificationService] Firebase init failed:", error.message);
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
      const firstPayload = buildPayload(tokenChunk[0], payload);
      const multicastPayload = {
        ...firstPayload,
        tokens: tokenChunk,
      };
      delete multicastPayload.token;

      try {
        const batchResponse = await messaging.sendEachForMulticast(multicastPayload);
        batchResponse.responses.forEach((result, index) => {
          const token = tokenChunk[index];
          if (result.success) {
            successCount += 1;
            return;
          }

          if (isInvalidTokenError(result.error)) {
            invalidTokens.push(token);
            failureCount += 1;
            return;
          }

          failures.push({
            token,
            code: getErrorCode(result.error),
            retryable: isRetryableError(result.error),
          });
          failureCount += 1;
        });
      } catch (error) {
        tokenChunk.forEach((token) => {
          failures.push({
            token,
            code: getErrorCode(error),
            retryable: isRetryableError(error),
          });
        });
        failureCount += tokenChunk.length;
      }
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
