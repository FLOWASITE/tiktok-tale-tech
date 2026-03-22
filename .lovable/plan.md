

## Problem

The "Twitter API: Unable to verify your credentials" error comes from the `test-twitter-credentials` edge function. This function uses **OAuth 2.0 App-Only** authentication (`client_credentials` grant) to verify Consumer Key/Secret — but the X app doesn't have OAuth 2.0 access (requires Project enrollment). Since the entire system has been migrated to **OAuth 1.0a**, this test function must also use OAuth 1.0a.

## Root Cause

`test-twitter-credentials/index.ts` line 153-163: It calls `https://api.x.com/oauth2/token` with `grant_type=client_credentials`. This endpoint requires the app to be enrolled in an X Project with OAuth 2.0 access. Without it, X returns "Unable to verify your credentials".

## Plan

### Update `test-twitter-credentials/index.ts`

Replace the OAuth 2.0 App-Only token request with an OAuth 1.0a signed request to verify credentials:

1. Import `buildOAuth1Header` from `../_shared/oauth1a.ts`
2. Replace the `client_credentials` token fetch with a simple OAuth 1.0a signed GET request to `https://api.x.com/2/users/me` (or the simpler `https://api.x.com/1.1/account/verify_credentials.json`)
3. Since this is a **credential test** (not a user-context call), use the **Application-only** approach: make a request to `https://api.x.com/1.1/application/rate_limit_status.json` signed with just consumer key/secret (no user token) via OAuth 1.0a

Actually, the simplest approach: Use OAuth 1.0a to call `https://api.x.com/1.1/application/rate_limit_status.json` with only consumer credentials (no access token). If the response is 200, credentials are valid. If 401, they're invalid.

**Key change**: Replace lines 153-184 with an OAuth 1.0a signed request using `buildOAuth1Header('GET', url, consumerKey, consumerSecret)` (no user token needed for app-level verification).

