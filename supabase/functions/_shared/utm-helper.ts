/**
 * UTM Auto-Generator — appends UTM tracking parameters to URLs in content text.
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|$)/i;
const SUPABASE_STORAGE_RE = /supabase\.co\/storage/i;
const URL_RE = /https?:\/\/[^\s"'<>)\]]+/g;

export function appendUtmToUrls(
  text: string,
  params: { source: string; medium?: string; campaign?: string },
): string {
  if (!text) return text;

  const medium = params.medium || 'social';

  return text.replace(URL_RE, (url) => {
    // Skip images
    if (IMAGE_EXT_RE.test(url)) return url;
    // Skip Supabase storage
    if (SUPABASE_STORAGE_RE.test(url)) return url;
    // Skip if already has UTM
    if (/[?&]utm_/i.test(url)) return url;

    const separator = url.includes('?') ? '&' : '?';
    let utm = `utm_source=${encodeURIComponent(params.source)}&utm_medium=${encodeURIComponent(medium)}`;
    if (params.campaign) {
      utm += `&utm_campaign=${encodeURIComponent(params.campaign)}`;
    }
    return `${url}${separator}${utm}`;
  });
}
