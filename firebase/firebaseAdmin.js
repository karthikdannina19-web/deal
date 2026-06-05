import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import jwt from "jsonwebtoken";

const FCM_MESSAGING_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const GOOGLE_OAUTH_TOKEN_URI = "https://oauth2.googleapis.com/token";

function normalizePrivateKey(value = "") {
  return value.replace(/\\n/g, "\n");
}

function normalizeServiceAccount(rawAccount = {}) {
  const projectId = rawAccount.projectId || rawAccount.project_id;
  const clientEmail = rawAccount.clientEmail || rawAccount.client_email;
  const privateKeyRaw = rawAccount.privateKey || rawAccount.private_key;
  const tokenUri = rawAccount.tokenUri || rawAccount.token_uri || GOOGLE_OAUTH_TOKEN_URI;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error(
      "Firebase service account is missing required fields (project_id, client_email, private_key)."
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKeyRaw),
    tokenUri,
  };
}

function parseJsonEnv(rawValue) {
  const trimmed = rawValue.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(parseJsonEnv(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
      return normalizeServiceAccount(parsed);
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is set but invalid. Ensure it is valid JSON."
      );
    }
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
      const parsed = JSON.parse(decoded);
      return normalizeServiceAccount(parsed);
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_BASE64 is set but invalid. Ensure it is valid base64 JSON."
      );
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase credentials missing. Set FIREBASE_SERVICE_ACCOUNT_JSON (recommended) or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."
    );
  }

  return normalizeServiceAccount({
    projectId,
    clientEmail,
    privateKey,
  });
}

let firebaseApp = null;
let messaging = null;
let cachedServiceAccount = null;
let cachedAccessToken = null;

export function getFirebaseServiceAccount() {
  if (!cachedServiceAccount) {
    cachedServiceAccount = parseServiceAccount();
  }
  return cachedServiceAccount;
}

export async function getFirebaseMessagingAccessToken() {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt - 60 > nowInSeconds) {
    return cachedAccessToken.token;
  }

  const serviceAccount = getFirebaseServiceAccount();
  const assertion = jwt.sign(
    {
      iss: serviceAccount.clientEmail,
      scope: FCM_MESSAGING_SCOPE,
      aud: serviceAccount.tokenUri,
      iat: nowInSeconds,
      exp: nowInSeconds + 3600,
    },
    serviceAccount.privateKey,
    { algorithm: "RS256" }
  );

  const response = await fetch(serviceAccount.tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error(
      `Firebase OAuth token request failed: ${response.status} ${JSON.stringify(body)}`
    );
  }

  cachedAccessToken = {
    token: body.access_token,
    expiresAt: nowInSeconds + Number(body.expires_in || 3600),
  };
  return cachedAccessToken.token;
}

export function getFirebaseMessaging() {
  if (messaging) return messaging;

  const existing = getApps()[0];
  firebaseApp =
    existing ||
    initializeApp({
      credential: cert(getFirebaseServiceAccount()),
    });
  messaging = getMessaging(firebaseApp);
  return messaging;
}

export { firebaseApp, messaging };
