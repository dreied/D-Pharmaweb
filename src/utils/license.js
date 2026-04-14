// src/utils/license.js
import { PUBLIC_KEY_PEM } from "./publicKey";

const STORAGE_KEY = "dpharmacy_license";
const TRIAL_DAYS = 30;

let deviceIdCache = null;
let listeners = [];

export function setDeviceId(id) {
  deviceIdCache = id;
  listeners.forEach((cb) => cb(id));
}

export function subscribeToDeviceId(cb) {
  listeners.push(cb);
}


export function getDeviceId() {
  return deviceIdCache;
}

/* ===================== LICENSE STATE ===================== */

export function getLicenseState() {
  if (!deviceIdCache) {
    return { status: "no_device_id" };
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const now = new Date().toISOString();
    const state = {
      trialStart: now,
      activatedUntil: null,
      plan: null,
      deviceId: deviceIdCache,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ...state, status: "trial" };
  }

  const state = JSON.parse(raw);
  state.deviceId = deviceIdCache;

  return computeStatus(state);
}

function computeStatus(state) {
  const now = new Date();
  const trialStart = new Date(state.trialStart);
  const daysUsed = (now - trialStart) / (1000 * 60 * 60 * 24);

  if (state.activatedUntil) {
    const activatedUntil = new Date(state.activatedUntil);
    if (activatedUntil > now) {
      return { ...state, status: "activated", daysUsed };
    }
  }

  if (daysUsed > TRIAL_DAYS) {
    return { ...state, status: "expired", daysUsed };
  }

  return { ...state, status: "trial", daysUsed };
}

/* ===================== ACTIVATION ===================== */

/**
 * Verify activation code:
 *   WEB-ACT:<payload>.<signature>
 * payload is JSON with: { deviceId, expiry, plan }
 */
export async function saveActivationFromCode(code) {
  if (!deviceIdCache) {
    throw new Error("Device ID not loaded");
  }

  const parts = code.trim().split(":");
  const raw = parts.length === 2 ? parts[1] : parts[0];

  const [payloadB64, signatureB64] = raw.split(".");
  if (!payloadB64 || !signatureB64) {
    throw new Error("Invalid activation format");
  }

  const payloadJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
  const payload = JSON.parse(payloadJson);

  // Verify signature (if you wire it fully)
  const isValid = await verifySignature(payloadB64, signatureB64);
  if (!isValid) {
    throw new Error("Invalid activation signature");
  }

  if (payload.deviceId !== deviceIdCache) {
    throw new Error("Activation code is for a different device");
  }

  const expiry = new Date(payload.expiry);
  if (expiry <= new Date()) {
    throw new Error("Activation already expired");
  }

  const existing = getLicenseState();
  const newState = {
    ...existing,
    activatedUntil: expiry.toISOString(),
    plan: payload.plan || "pro",
    deviceId: deviceIdCache,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  return newState;
}

/* ===================== TRIAL INFO ===================== */

export function getTrialInfo() {
  const state = getLicenseState();
  if (state.status === "no_device_id") return state;

  const now = new Date();
  const trialStart = new Date(state.trialStart);
  const daysUsed = Math.floor((now - trialStart) / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, TRIAL_DAYS - daysUsed);

  return {
    ...state,
    daysUsed,
    daysLeft,
    trialDays: TRIAL_DAYS,
  };
}

/* ===================== SIGNATURE VERIFY (WebCrypto) ===================== */

async function verifySignature(payloadB64, signatureB64) {
  try {
    const key = await importPublicKey(PUBLIC_KEY_PEM);

    const payloadBytes = new TextEncoder().encode(payloadB64);
    const signatureBytes = base64UrlToUint8Array(signatureB64);

    return await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      signatureBytes,
      payloadBytes
    );
  } catch (e) {
    console.error("Signature verify failed:", e);
    return false;
  }
}

function base64UrlToUint8Array(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const str = atob(b64 + pad);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function importPublicKey(pem) {
  const b64 = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);

  return crypto.subtle.importKey(
    "spki",
    buf,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}


