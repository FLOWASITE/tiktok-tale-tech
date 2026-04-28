## Goal

Surface OAuth token health for Instagram and Facebook connections so the user can see at a glance: when the token was last checked, whether it is **valid / expiring soon / expired / invalid (malformed) / inactive**, and run a fresh check on demand — without leaving the Brand → Connections tab.

## What you'll see

Inside each connected Instagram and Facebook card on `/brands → Connections`, a new compact **Token status** panel appears below the account info:

```text
┌─ Token status ─────────────────────────────┐
│  ● Valid · expires in 47 days              │
│  Last checked: 2 minutes ago               │
│  [ Check now ]   [ Reconnect ]             │
└────────────────────────────────────────────┘
```

States and colors (Soft Luxury neutral palette + semantic accent):

| State             | When                                                                                  | Badge color       |
|-------------------|---------------------------------------------------------------------------------------|-------------------|
| Valid             | `is_active=true`, `token_expires_at > now + 7d`, no recent error                      | green             |
| Expiring soon     | `token_expires_at` within 7 days                                                      | amber             |
| Expired           | `token_expires_at < now()`                                                            | red               |
| Invalid token     | `metadata.test_result = 'invalid_token'` or last error matches FB code 190 / "Cannot parse access token" | red               |
| Malformed         | last error matches "Cannot parse" / "malformed"                                       | red               |
| Inactive          | `is_active = false` and not classified above                                          | muted gray        |
| Never checked     | no `last_verified_at` and no `metadata.last_test`                                     | muted gray        |

The panel also shows:
- **Last checked**: relative time from `last_verified_at` ?? `metadata.last_test`, with full timestamp on hover.
- **Last error** (if any): one-line message from `last_error` ?? `metadata.error`.
- **Check now** button: re-runs verification and refreshes the panel.
- **Reconnect** button: appears only when state is Expired / Invalid / Malformed / Inactive — emits the existing reconnect event so the global `ReconnectBanner` flow takes over.

## Where it goes

Only Instagram and Facebook cards in `src/components/brand/BrandViewConnectionsTab.tsx` get the panel for now (matches the user's reported failure surface). The same component is reusable for other platforms later.

## Technical details

### New component
`src/components/social/TokenStatusPanel.tsx`

Props:
```ts
{
  connection: SocialConnection;   // from useSocialConnections
  platform: 'instagram' | 'facebook';
  onChecked?: () => void;         // parent calls refetch()
}
```

Behavior:
1. Computes status from a single pure function `classifyTokenStatus(connection)`:
   - Reads `is_active`, `token_expires_at`, `last_error`, and `metadata` (`test_result`, `last_test`, `error`, `needs_reauth`, `refresh_error`).
   - Returns `{ status, label, tone, lastCheckedAt, lastError }` where `status` is one of `valid | expiring_soon | expired | invalid | malformed | inactive | unknown`.
   - Error-string matching reuses the same patterns already added to `useRetryPublish.isReconnectNeededError` (centralize them in a small helper `src/lib/oauthErrorClassifier.ts` and import from both places).
2. **Check now** calls the existing `social-diagnostics` edge function with `{ action: 'test-connection', platform, connectionId }` (already used in `BrandViewConnectionsTab.handleTestConnection`). On success, calls `onChecked()` so the parent re-fetches connections.
3. Uses `formatDistanceToNow(..., { locale: vi })` for relative time, `Tooltip` for full timestamp.
4. **Reconnect** button calls `emitReconnectNeeded({ platform, platformLabel, message })` from `@/components/social/ReconnectBanner` so the in-app banner + flow already wired up handles the rest.

### New helper
`src/lib/oauthErrorClassifier.ts`

```ts
export type OAuthErrorKind =
  | 'invalid_token' | 'malformed' | 'expired'
  | 'inactive' | 'unauthorized' | 'unknown';

export function classifyOAuthError(msg?: string | null): OAuthErrorKind { … }
```

Refactor `useRetryPublish.isReconnectNeededError` to delegate to this helper so detection stays in sync between the publish-retry hook and the new panel.

### Wiring into the tab
In `BrandViewConnectionsTab.tsx`:
- Render `<TokenStatusPanel connection={connection} platform="instagram" onChecked={refetch} />` inside the Instagram card body (around line ~481, just below the existing `TokenExpiryBadge`).
- Same for Facebook card (around line ~628).
- Remove the standalone `TokenExpiryBadge` for these two platforms (the new panel replaces it). Keep it for other platforms unchanged.

### Data already available
No DB or edge-function changes needed:
- `social_connections` already has `is_active`, `token_expires_at`, `last_verified_at`, `last_error`, `metadata`.
- `test-instagram-connection` / `test-facebook-connection` (called via `social-diagnostics`) already write `metadata.last_test`, `metadata.test_result`, and update `is_active`.

### Out of scope
- No new edge function, no migration, no schema change.
- No background polling — status refreshes only on mount, after a "Check now", and after any successful publish/reconnect (parent already calls `refetch`).
- Other platforms (LinkedIn, X, Threads, Zalo, GBP, Website) keep the existing `TokenExpiryBadge` + test button. Easy follow-up: drop the same component into their cards.
