// ============================================
// Crypto Utilities for API Key Encryption
// Uses AES-256-GCM for secure encryption
// ============================================

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // bits

/**
 * Get encryption key from environment.
 *
 * Preferred format: base64 of 32 random bytes (AES-256).
 *
 * To prevent configuration "got X bytes" errors from breaking the app,
 * we accept any non-empty value and *derive* a 32-byte key via SHA-256 when needed.
 *
 * Security note: hashing a low-entropy input does NOT increase entropy.
 * Always use a randomly generated value for AI_ENCRYPTION_KEY.
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("AI_ENCRYPTION_KEY");
  if (!raw) throw new Error("AI_ENCRYPTION_KEY is not configured");

  // 1) Try to treat env as base64.
  let keyBytes: Uint8Array | null = null;
  try {
    const decoded = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    // Only accept base64 decode if it looks plausible (non-empty)
    if (decoded.length > 0) keyBytes = decoded;
  } catch {
    keyBytes = null;
  }

  // 2) Fallback: treat env as a raw string.
  if (!keyBytes) {
    keyBytes = new TextEncoder().encode(raw);
  }

  // 3) Ensure 32 bytes for AES-256.
  if (keyBytes.length !== 32) {
    console.warn(
      `[crypto] AI_ENCRYPTION_KEY decoded length is ${keyBytes.length} bytes; deriving 32-byte key via SHA-256.`
    );
    const digest = await crypto.subtle.digest(
      "SHA-256",
      keyBytes as unknown as BufferSource
    );
    keyBytes = new Uint8Array(digest);
  }

  return await crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as BufferSource,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a plaintext string
 * Returns base64 encoded: IV (12 bytes) + ciphertext + tag
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  // Encode plaintext to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    data
  );
  
  // Combine IV + ciphertext (includes tag)
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Return base64 encoded
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a ciphertext string
 * Expects base64 encoded: IV (12 bytes) + ciphertext + tag
 */
export async function decrypt(ciphertext: string): Promise<string> {
  const key = await getEncryptionKey();
  
  // Decode base64
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    data
  );
  
  // Decode to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Check if encryption is available
 */
export function isEncryptionConfigured(): boolean {
  return !!Deno.env.get("AI_ENCRYPTION_KEY");
}

/**
 * Decrypt credential with GCM first, fallback to legacy CBC.
 * This is the single shared helper all edge functions should use.
 */
export async function decryptCredential(ciphertext: string): Promise<string> {
  if (!ciphertext) throw new Error("Empty ciphertext");

  // 1. Try modern GCM
  try {
    const result = await decrypt(ciphertext);
    if (result) return result;
  } catch { /* fallback to CBC */ }

  // 2. Fallback: legacy AES-256-CBC (hex iv:ciphertext format)
  if (ciphertext.includes(":")) {
    const { createDecipheriv } = await import("node:crypto");
    const { Buffer } = await import("node:buffer");
    const encryptionKey = Deno.env.get("AI_ENCRYPTION_KEY") || "default-key";
    const keyCandidates = [
      ...new Set([encryptionKey, "default-encryption-key-change-me", "default-key"]),
    ];
    for (const candidate of keyCandidates) {
      try {
        const textParts = ciphertext.split(":");
        const iv = Buffer.from(textParts.shift()!, "hex");
        const encryptedData = Buffer.from(textParts.join(":"), "hex");
        const keyBuffer = Buffer.alloc(32);
        Buffer.from(candidate).copy(keyBuffer);
        const decipher = createDecipheriv("aes-256-cbc", keyBuffer, iv);
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        const result = decrypted.toString();
        if (result) return result;
      } catch { /* try next */ }
    }
  }

  throw new Error("Failed to decrypt credential with any method");
}
