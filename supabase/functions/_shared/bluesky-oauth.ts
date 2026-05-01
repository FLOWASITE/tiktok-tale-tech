/**
 * Bluesky / atproto OAuth 2.0 helpers — Confidential client.
 *
 * Implements:
 *  - Identity resolution (handle → DID → PDS)
 *  - PDS / Authorization Server metadata discovery
 *  - PKCE (S256)
 *  - DPoP proof generation (per-session ES256 keypair)
 *  - Client assertion JWT (signed with project-wide private JWK)
 *  - PAR (Pushed Authorization Request) with nonce retry
 *  - Token exchange + refresh
 *  - Authenticated fetch to PDS with DPoP nonce handling
 */

// =====================================================================
// Constants & helpers
// =====================================================================

export const BLUESKY_CLIENT_ID =
  Deno.env.get("BLUESKY_CLIENT_ID") ||
  "https://app.flowa.one/oauth/bluesky/client-metadata.json";

export const BLUESKY_REDIRECT_URI =
  "https://app.flowa.one/oauth/bluesky/callback";

export const BLUESKY_SCOPE = "atproto transition:generic";

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomB64Url(byteLength: number): string {
  const b = new Uint8Array(byteLength);
  crypto.getRandomValues(b);
  return b64urlEncode(b);
}

async function sha256(input: string): Promise<Uint8Array> {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return new Uint8Array(h);
}

// =====================================================================
// Identity resolution
// =====================================================================

export interface ResolvedIdentity {
  did: string;
  handle: string;
  pdsUrl: string;
}

/** Resolve a handle (e.g. "alice.bsky.social") to DID + PDS URL. */
export async function resolveHandle(input: string): Promise<ResolvedIdentity> {
  const cleaned = input.trim().replace(/^@/, "").toLowerCase();
  if (!cleaned) throw new Error("Handle rỗng");

  let did = "";
  let handle = cleaned;

  if (cleaned.startsWith("did:")) {
    did = cleaned;
  } else {
    // Try HTTPS .well-known first (browser-friendly), then DNS-over-HTTPS
    try {
      const r = await fetch(`https://${cleaned}/.well-known/atproto-did`, {
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok) {
        const txt = (await r.text()).trim();
        if (txt.startsWith("did:")) did = txt;
      }
    } catch { /* ignore */ }

    if (!did) {
      // DNS-over-HTTPS via Cloudflare (TXT _atproto.<handle>)
      try {
        const r = await fetch(
          `https://cloudflare-dns.com/dns-query?name=_atproto.${cleaned}&type=TXT`,
          { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(5000) }
        );
        const j = await r.json();
        const ans = (j?.Answer || []) as Array<{ data: string }>;
        for (const a of ans) {
          const v = (a.data || "").replace(/^"|"$/g, "");
          if (v.startsWith("did=did:")) { did = v.slice(4); break; }
        }
      } catch { /* ignore */ }
    }

    if (!did) throw new Error(`Không resolve được handle "${cleaned}" thành DID. Handle phải có dạng "yourname.bsky.social".`);
  }

  // Resolve DID document → find PDS service
  let didDoc: any;
  if (did.startsWith("did:plc:")) {
    const r = await fetch(`https://plc.directory/${did}`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`PLC directory lookup failed: ${r.status}`);
    didDoc = await r.json();
  } else if (did.startsWith("did:web:")) {
    const host = did.slice("did:web:".length).replace(/:/g, "/");
    const r = await fetch(`https://${host}/.well-known/did.json`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`did:web lookup failed: ${r.status}`);
    didDoc = await r.json();
  } else {
    throw new Error(`Unsupported DID method: ${did}`);
  }

  const services: any[] = didDoc.service || [];
  const pdsSvc = services.find((s) => s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer");
  if (!pdsSvc?.serviceEndpoint) throw new Error("DID document không chứa atproto_pds endpoint");
  const pdsUrl = String(pdsSvc.serviceEndpoint).replace(/\/$/, "");

  // Bidirectional verification: confirm handle is claimed by DID
  const claimedHandle = (didDoc.alsoKnownAs || []).map((u: string) => u.replace(/^at:\/\//, "")).find((h: string) => h);
  if (!did.startsWith("did:") || (claimedHandle && claimedHandle.toLowerCase() !== handle.toLowerCase())) {
    // Soft warn — still allow, atproto handles can change
    handle = claimedHandle || handle;
  }

  return { did, handle, pdsUrl };
}

// =====================================================================
// Server metadata discovery
// =====================================================================

export interface AuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  pushed_authorization_request_endpoint: string;
  scopes_supported?: string[];
  dpop_signing_alg_values_supported?: string[];
}

export async function discoverAuthServer(pdsUrl: string): Promise<AuthServerMetadata> {
  // 1. Resource metadata
  const rmRes = await fetch(`${pdsUrl}/.well-known/oauth-protected-resource`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!rmRes.ok) throw new Error(`Không lấy được oauth-protected-resource từ ${pdsUrl}: ${rmRes.status}`);
  const rm = await rmRes.json();
  const authzServers: string[] = rm.authorization_servers || [];
  if (authzServers.length === 0) throw new Error("PDS không khai báo authorization_servers");

  const issuer = authzServers[0].replace(/\/$/, "");

  // 2. Authorization server metadata
  const asRes = await fetch(`${issuer}/.well-known/oauth-authorization-server`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!asRes.ok) throw new Error(`Không lấy được authorization-server metadata: ${asRes.status}`);
  const meta = await asRes.json();

  if (!meta.pushed_authorization_request_endpoint) {
    throw new Error("Authorization server không hỗ trợ PAR");
  }

  return {
    issuer,
    authorization_endpoint: meta.authorization_endpoint,
    token_endpoint: meta.token_endpoint,
    pushed_authorization_request_endpoint: meta.pushed_authorization_request_endpoint,
    scopes_supported: meta.scopes_supported,
    dpop_signing_alg_values_supported: meta.dpop_signing_alg_values_supported,
  };
}

// =====================================================================
// PKCE
// =====================================================================

export interface PKCE {
  verifier: string;
  challenge: string;
  method: "S256";
}

export async function generatePKCE(): Promise<PKCE> {
  const verifier = randomB64Url(64);
  const challengeBytes = await sha256(verifier);
  return { verifier, challenge: b64urlEncode(challengeBytes), method: "S256" };
}

// =====================================================================
// DPoP keypair (per-session, ES256)
// =====================================================================

export interface DpopKey {
  privateKey: CryptoKey;
  publicJwk: JsonWebKey;
}

export async function generateDpopKey(): Promise<DpopKey> {
  const kp = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
  return { privateKey: kp.privateKey, publicJwk };
}

/** Restore a DPoP key from stored JWK (private key included). */
export async function importDpopPrivateJwk(jwk: JsonWebKey): Promise<DpopKey> {
  // Need a non-extractable private key for signing; export public side from same JWK.
  const privateKey = await crypto.subtle.importKey(
    "jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  );
  const publicJwk: JsonWebKey = { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y };
  return { privateKey, publicJwk };
}

/** Export a freshly-generated DPoP private key as JWK (for storage). */
export async function exportDpopPrivateJwk(privateKey: CryptoKey): Promise<JsonWebKey> {
  return await crypto.subtle.exportKey("jwk", privateKey);
}

// =====================================================================
// JWT signing (ES256, IEEE P1363 — what WebCrypto produces; matches OAuth/JOSE expectation)
// =====================================================================

async function signJwtES256(
  privateKey: CryptoKey,
  header: Record<string, unknown>,
  payload: Record<string, unknown>
): Promise<string> {
  const h = b64urlEncode(enc.encode(JSON.stringify(header)));
  const p = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const data = enc.encode(`${h}.${p}`);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    data
  );
  // WebCrypto ECDSA P-256 → already 64-byte (r||s) IEEE P1363 raw; jose / OAuth expects this
  return `${h}.${p}.${b64urlEncode(new Uint8Array(sig))}`;
}

// =====================================================================
// DPoP proof
// =====================================================================

export interface DpopProofOpts {
  htm: string;             // HTTP method, uppercase
  htu: string;             // HTTP URL (no query/fragment)
  nonce?: string;          // server-issued DPoP nonce
  accessToken?: string;    // include `ath` hash when sending bearer
}

export async function makeDpopProof(key: DpopKey, opts: DpopProofOpts): Promise<string> {
  const header = {
    typ: "dpop+jwt",
    alg: "ES256",
    jwk: { kty: key.publicJwk.kty, crv: key.publicJwk.crv, x: key.publicJwk.x, y: key.publicJwk.y },
  };
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    jti: randomB64Url(16),
    htm: opts.htm.toUpperCase(),
    htu: opts.htu.split("#")[0].split("?")[0],
    iat: now,
    exp: now + 120,
  };
  if (opts.nonce) payload.nonce = opts.nonce;
  if (opts.accessToken) {
    const athBytes = await sha256(opts.accessToken);
    payload.ath = b64urlEncode(athBytes);
  }
  return await signJwtES256(key.privateKey, header, payload);
}

// =====================================================================
// Client assertion JWT (private_key_jwt)
// =====================================================================

let _confidentialKey: { privateKey: CryptoKey; kid: string } | null = null;

async function getConfidentialKey(): Promise<{ privateKey: CryptoKey; kid: string }> {
  if (_confidentialKey) return _confidentialKey;
  const raw = Deno.env.get("BLUESKY_OAUTH_PRIVATE_JWK");
  if (!raw) throw new Error("Missing BLUESKY_OAUTH_PRIVATE_JWK secret");
  const jwk = JSON.parse(raw) as JsonWebKey & { kid?: string };
  const privateKey = await crypto.subtle.importKey(
    "jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  );
  _confidentialKey = { privateKey, kid: jwk.kid || "default" };
  return _confidentialKey;
}

export async function makeClientAssertion(audience: string): Promise<string> {
  const { privateKey, kid } = await getConfidentialKey();
  const header = { typ: "JWT", alg: "ES256", kid };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: BLUESKY_CLIENT_ID,
    sub: BLUESKY_CLIENT_ID,
    aud: audience,
    jti: randomB64Url(16),
    iat: now,
    exp: now + 120,
  };
  return await signJwtES256(privateKey, header, payload);
}

// =====================================================================
// Posting requests with DPoP + nonce auto-retry
// =====================================================================

interface DpopResponse {
  response: Response;
  newNonce?: string;
}

async function dpopFormPost(opts: {
  url: string;
  formBody: URLSearchParams;
  dpopKey: DpopKey;
  nonce?: string;
  accessToken?: string;
}): Promise<DpopResponse> {
  const proof = await makeDpopProof(opts.dpopKey, {
    htm: "POST",
    htu: opts.url,
    nonce: opts.nonce,
    accessToken: opts.accessToken,
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "DPoP": proof,
    "Accept": "application/json",
  };
  if (opts.accessToken) headers["Authorization"] = `DPoP ${opts.accessToken}`;

  const res = await fetch(opts.url, {
    method: "POST",
    headers,
    body: opts.formBody.toString(),
  });
  return { response: res, newNonce: res.headers.get("DPoP-Nonce") || undefined };
}

/** POST to an OAuth endpoint with auto DPoP nonce retry (max 1 retry). */
async function dpopFormPostWithRetry(opts: {
  url: string;
  formBody: URLSearchParams;
  dpopKey: DpopKey;
  initialNonce?: string;
  accessToken?: string;
}): Promise<{ json: any; finalNonce?: string; status: number }> {
  let nonce = opts.initialNonce;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { response, newNonce } = await dpopFormPost({
      url: opts.url, formBody: opts.formBody, dpopKey: opts.dpopKey,
      nonce, accessToken: opts.accessToken,
    });
    if (newNonce) nonce = newNonce;

    if (response.ok) {
      const j = await response.json();
      return { json: j, finalNonce: nonce, status: response.status };
    }

    // Try to parse error
    let errBody: any = {};
    try { errBody = await response.json(); } catch { /* ignore */ }

    if (response.status === 400 || response.status === 401) {
      if (errBody?.error === "use_dpop_nonce" && newNonce && attempt === 0) {
        // Retry with the fresh nonce
        continue;
      }
    }

    throw new Error(
      `OAuth request thất bại (${response.status} ${errBody?.error || ""}): ${
        errBody?.error_description || JSON.stringify(errBody).slice(0, 300)
      }`
    );
  }
  throw new Error("OAuth nonce retry exhausted");
}

// =====================================================================
// PAR — Pushed Authorization Request
// =====================================================================

export interface ParResult {
  request_uri: string;
  expires_in: number;
  dpop_nonce?: string;
}

export async function pushAuthorizationRequest(opts: {
  authServer: AuthServerMetadata;
  pkce: PKCE;
  state: string;
  loginHint: string;
  dpopKey: DpopKey;
}): Promise<ParResult> {
  const clientAssertion = await makeClientAssertion(opts.authServer.issuer);

  const form = new URLSearchParams({
    client_id: BLUESKY_CLIENT_ID,
    response_type: "code",
    redirect_uri: BLUESKY_REDIRECT_URI,
    scope: BLUESKY_SCOPE,
    state: opts.state,
    code_challenge: opts.pkce.challenge,
    code_challenge_method: "S256",
    login_hint: opts.loginHint,
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: clientAssertion,
  });

  const { json, finalNonce } = await dpopFormPostWithRetry({
    url: opts.authServer.pushed_authorization_request_endpoint,
    formBody: form,
    dpopKey: opts.dpopKey,
  });

  if (!json.request_uri) throw new Error("PAR response thiếu request_uri");
  return {
    request_uri: json.request_uri,
    expires_in: json.expires_in || 60,
    dpop_nonce: finalNonce,
  };
}

export function buildAuthorizationUrl(authServer: AuthServerMetadata, requestUri: string): string {
  const u = new URL(authServer.authorization_endpoint);
  u.searchParams.set("client_id", BLUESKY_CLIENT_ID);
  u.searchParams.set("request_uri", requestUri);
  return u.toString();
}

// =====================================================================
// Token exchange + refresh
// =====================================================================

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  token_type: string; // "DPoP"
  expires_in: number;
  scope?: string;
  sub: string;        // DID
  dpop_nonce?: string;
  expires_at: number; // ms epoch — derived
}

export async function exchangeCodeForToken(opts: {
  authServer: AuthServerMetadata;
  code: string;
  pkceVerifier: string;
  dpopKey: DpopKey;
  initialNonce?: string;
}): Promise<TokenSet> {
  const clientAssertion = await makeClientAssertion(opts.authServer.issuer);
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: BLUESKY_REDIRECT_URI,
    client_id: BLUESKY_CLIENT_ID,
    code_verifier: opts.pkceVerifier,
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: clientAssertion,
  });

  const { json, finalNonce } = await dpopFormPostWithRetry({
    url: opts.authServer.token_endpoint,
    formBody: form,
    dpopKey: opts.dpopKey,
    initialNonce: opts.initialNonce,
  });

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    token_type: json.token_type || "DPoP",
    expires_in: json.expires_in || 3600,
    scope: json.scope,
    sub: json.sub,
    dpop_nonce: finalNonce,
    expires_at: Date.now() + ((json.expires_in || 3600) - 60) * 1000,
  };
}

export async function refreshAccessToken(opts: {
  authServer: AuthServerMetadata;
  refreshToken: string;
  dpopKey: DpopKey;
  initialNonce?: string;
}): Promise<TokenSet> {
  const clientAssertion = await makeClientAssertion(opts.authServer.issuer);
  const form = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: opts.refreshToken,
    client_id: BLUESKY_CLIENT_ID,
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: clientAssertion,
  });

  const { json, finalNonce } = await dpopFormPostWithRetry({
    url: opts.authServer.token_endpoint,
    formBody: form,
    dpopKey: opts.dpopKey,
    initialNonce: opts.initialNonce,
  });

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token || opts.refreshToken,
    token_type: json.token_type || "DPoP",
    expires_in: json.expires_in || 3600,
    scope: json.scope,
    sub: json.sub,
    dpop_nonce: finalNonce,
    expires_at: Date.now() + ((json.expires_in || 3600) - 60) * 1000,
  };
}

// =====================================================================
// Authenticated PDS fetch (with DPoP nonce auto-retry)
// =====================================================================

export async function pdsFetch(opts: {
  url: string;
  method: string;
  accessToken: string;
  dpopKey: DpopKey;
  nonce?: string;
  body?: BodyInit | null;
  contentType?: string;
}): Promise<{ response: Response; newNonce?: string }> {
  let nonce = opts.nonce;

  for (let attempt = 0; attempt < 2; attempt++) {
    const proof = await makeDpopProof(opts.dpopKey, {
      htm: opts.method, htu: opts.url, nonce, accessToken: opts.accessToken,
    });
    const headers: Record<string, string> = {
      "Authorization": `DPoP ${opts.accessToken}`,
      "DPoP": proof,
    };
    if (opts.contentType) headers["Content-Type"] = opts.contentType;

    const res = await fetch(opts.url, { method: opts.method, headers, body: opts.body });
    const newNonce = res.headers.get("DPoP-Nonce") || undefined;
    if (newNonce) nonce = newNonce;

    if (res.status === 401 && attempt === 0) {
      // Read once to inspect; clone so callers can still use body if no retry
      const clone = res.clone();
      try {
        const errJson = await clone.json();
        if (errJson?.error === "use_dpop_nonce") continue;
      } catch { /* fall-through */ }
      const wwwAuth = res.headers.get("WWW-Authenticate") || "";
      if (/use_dpop_nonce/.test(wwwAuth)) continue;
    }

    return { response: res, newNonce: nonce };
  }
  throw new Error("PDS fetch nonce retry exhausted");
}
