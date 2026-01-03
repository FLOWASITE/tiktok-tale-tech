// ============================================
// Crypto Utilities for API Key Encryption
// Uses AES-256-GCM for secure encryption
// ============================================

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // bits

/**
 * Get encryption key from environment
 * Key should be 32 bytes (256 bits) base64 encoded
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyBase64 = Deno.env.get("AI_ENCRYPTION_KEY");
  if (!keyBase64) {
    throw new Error("AI_ENCRYPTION_KEY is not configured");
  }

  // Decode base64 key
  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  
  // Key should be 32 bytes for AES-256
  if (keyBytes.length !== 32) {
    throw new Error(`Invalid encryption key length: expected 32 bytes, got ${keyBytes.length}`);
  }

  return await crypto.subtle.importKey(
    "raw",
    keyBytes,
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
