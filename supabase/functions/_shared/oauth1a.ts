import { createHmac } from "node:crypto";

/**
 * Percent-encode a string per RFC 3986 (required for OAuth 1.0a).
 */
function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

/**
 * Generate an OAuth 1.0a signature.
 */
export function generateOAuth1Signature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ''
): string {
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join('&');

  const signatureBaseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(sortedParams)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  return createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');
}

/**
 * Build an OAuth 1.0a Authorization header.
 */
export function buildOAuth1Header(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  token?: string,
  tokenSecret?: string,
  extraParams?: Record<string, string>
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
  };

  if (token) {
    oauthParams.oauth_token = token;
  }

  // Merge extra params for signature calculation only
  const allParams = { ...oauthParams, ...(extraParams || {}) };

  const signature = generateOAuth1Signature(
    method,
    url,
    allParams,
    consumerSecret,
    tokenSecret || ''
  );

  oauthParams.oauth_signature = signature;

  return 'OAuth ' + Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ');
}
