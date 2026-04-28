---
name: Multi-Fanpage Connection
description: Two-step Facebook OAuth with page picker for connecting multiple fanpages per brand
type: feature
---

# Multi-Fanpage OAuth Flow

## Architecture

OAuth Facebook is a **2-step flow** to allow connecting any number of Pages (page 1, 2, 3...) per brand:

1. **`facebook-oauth-callback`** (no longer auto-attaches):
   - Exchanges code → long-lived user token (60d)
   - Fetches `/me/accounts` (up to 100 pages)
   - Stores `{ encrypted_user_token, pages: [{id, name, access_token, ...}] }` in `facebook_oauth_sessions` (TTL 15 min, RLS scoped to user)
   - Redirects to `/auth/facebook/callback?session_id=...&brand_template_id=...`

2. **`facebook-list-session-pages`** (UI fetch):
   - Returns sanitized pages (no access_token) + `connected_page_ids` for the brand so UI can render "Đã kết nối" badges

3. **`facebook-attach-page`** (per-page action):
   - Idempotent upsert into `social_connections` keyed by `(brand_template_id, platform, platform_user_id)`
   - Sets `metadata.is_default=true` for the first attached page (others false)
   - Subscribes Page to webhook (non-blocking)

## Why session table

We can't pass page access tokens through URL params (security). Storing tokens server-side keeps them encrypted and out of browser history.

## UI

- `FacebookCallback.tsx` — page picker with avatar, fan_count, and per-page Connect button
- `BrandViewConnectionsTab.tsx` — already supports rendering N facebook connections; "Kết nối" button inside the multi-page state opens OAuth again to add more pages
- No DB unique constraint on `(brand_template_id, platform)` so multiple FB rows are allowed per brand

## Tables

- `facebook_oauth_sessions(id, user_id, organization_id, brand_template_id, encrypted_user_token, pages JSONB, expires_at, created_at)` — TTL 15 min, cleaned via `cleanup_expired_facebook_oauth_sessions()` pg_cron job
