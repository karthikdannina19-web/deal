import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

function normalizePrivateKey(value = "") {
  return value.replace(/\\n/g, "\n");
}

function normalizeServiceAccount(rawAccount = {}) {
  const projectId = rawAccount.projectId || rawAccount.project_id;
  const clientEmail = rawAccount.clientEmail || rawAccount.client_email;
  const privateKeyRaw = rawAccount.privateKey || rawAccount.private_key;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error(
      "Firebase service account is missing required fields (project_id, client_email, private_key)."
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKeyRaw),
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

export function getFirebaseMessaging() {
  if (messaging) return messaging;

  const existing = getApps()[0];
  firebaseApp =
    existing ||
    initializeApp({
      credential: cert(parseServiceAccount()),
    });
  messaging = getMessaging(firebaseApp);
  return messaging;
}

export { firebaseApp, messaging };
