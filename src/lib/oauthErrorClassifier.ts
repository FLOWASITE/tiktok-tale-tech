/**
 * Centralized classifier for OAuth / social-connection errors.
 * Used by both the publish-retry hook and the Token Status panel
 * so detection stays in sync.
 */

export type OAuthErrorKind =
  | 'invalid_token'   // token rejected by provider (e.g. FB code 190)
  | 'malformed'       // token cannot be parsed
  | 'expired'         // token expired
  | 'inactive'        // local connection flag is_active = false
  | 'unauthorized'    // generic 401 / not authorized
  | 'unknown';

/**
 * Classify a free-text error message into a coarse OAuth error kind.
 * Returns 'unknown' when no signal is found.
 */
export function classifyOAuthError(msg?: string | null): OAuthErrorKind {
  if (!msg) return 'unknown';
  const m = msg.toLowerCase();

  // Order matters — most specific first.
  if (m.includes('cannot parse access token') || m.includes('malformed')) {
    return 'malformed';
  }
  if (
    m.includes('token expired') ||
    m.includes('hết hạn') ||
    (m.includes('access token') && m.includes('expired'))
  ) {
    return 'expired';
  }
  if (
    m.includes('invalid oauth access token') ||
    m.includes('oauthexception') ||
    m.includes('token_invalid') ||
    m.includes('invalid_token') ||
    (m.includes('access token') && m.includes('invalid'))
  ) {
    return 'invalid_token';
  }
  if (
    m.includes('connection is not active') ||
    m.includes('not active') ||
    m.includes('inactive') ||
    m.includes('no_connection') ||
    m.includes('chưa kết nối') ||
    m.includes('không hoạt động') ||
    m.includes('needs_reauth') ||
    m.includes('please reconnect') ||
    m.includes('reauthor')
  ) {
    return 'inactive';
  }
  if (m.includes('unauthorized') || m.includes('401')) {
    return 'unauthorized';
  }
  return 'unknown';
}

/** True when the error means the user must re-authorize the connection. */
export function isReconnectNeeded(msg?: string | null): boolean {
  return classifyOAuthError(msg) !== 'unknown';
}
