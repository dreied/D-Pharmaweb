// src/utils/security/passwordHash.js

// Derive a key using PBKDF2-SHA-256
async function deriveKey(password, salt, iterations = 100000, length = 32) {
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    passKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const raw = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}

function toHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyBytes = await deriveKey(password, salt);
  const hash = toHex(keyBytes);
  const saltHex = toHex(salt);
  return { hash, salt: saltHex };
}

export async function verifyPassword(password, hash, saltHex) {
  const salt = fromHex(saltHex);
  const keyBytes = await deriveKey(password, salt);
  const computed = toHex(keyBytes);
  return computed === hash;
}
