// Shared helpers for Pinterest publishing — image rehosting + token refresh retry
import { getServiceClient } from "./middleware/perf.ts";
import { decryptCredential } from "./crypto.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL') ?? '';

/**
 * Validate media URL is publicly fetchable by Pinterest.
 * Pinterest rejects data:, blob:, file:, localhost, and non-HTTPS URLs.
 */
export function isPinterestSafeUrl(url: string): boolean {
  if (!url) return false;
  if (!/^https:\/\//i.test(url)) return false;
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(url)) return false;
  if (/^data:|^blob:|^file:/i.test(url)) return false;
  return true;
}

/**
 * Rehost an image to Supabase public bucket if it's not Pinterest-safe.
 * Returns a public HTTPS URL Pinterest can crawl.
 */
export async function rehostImageForPinterest(url: string, prefix = 'pinterest'): Promise<string> {
  if (isPinterestSafeUrl(url)) return url;

  console.log('[pinterest-helpers] rehosting image', { url: url.slice(0, 80) });
  const supabase = getServiceClient();

  let blob: Blob;
  let ext = 'jpg';

  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URL');
    const mime = match[1];
    ext = mime.split('/')[1]?.split('+')[0] || 'jpg';
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    blob = new Blob([bytes], { type: mime });
  } else {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image for rehost: HTTP ${res.status}`);
    blob = await res.blob();
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('png')) ext = 'png';
    else if (ct.includes('webp')) ext = 'webp';
  }

  const path = `${prefix}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from('carousel-images')
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from('carousel-images').getPublicUrl(path);
  console.log('[pinterest-helpers] rehosted →', data.publicUrl);
  return data.publicUrl;
}

/**
 * Refresh a Pinterest connection's access token via refresh-pinterest-token function.
 * Returns the new decrypted access token, or throws.
 */
export async function refreshPinterestToken(connectionId: string): Promise<string> {
  console.log('[pinterest-helpers] refreshing token', { connectionId });
  const supabase = getServiceClient();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const res = await fetch(`${SUPABASE_URL}/functions/v1/refresh-pinterest-token`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ connectionId }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Pinterest token refresh failed');

  // Re-fetch connection to get fresh encrypted token
  const { data: conn } = await supabase
    .from('social_connections')
    .select('access_token')
    .eq('id', connectionId)
    .single();
  if (!conn?.access_token) throw new Error('Connection not found after refresh');
  return await decryptCredential(conn.access_token);
}
