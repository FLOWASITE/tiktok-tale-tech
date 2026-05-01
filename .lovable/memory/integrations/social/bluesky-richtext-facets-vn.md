---
name: Bluesky Rich Text Facets
description: Logic phát hiện URL/bare-domain/mention/hashtag và build facets với byte offsets để publish-bluesky đăng đúng kiểu native, mockup preview khớp output thật
type: feature
---

## Facets generation (publish-bluesky/index.ts → parseRichTextFacets)

AT Protocol yêu cầu facets có **byte offsets** (không phải char) tính bằng `TextEncoder().encode().byteLength`.

Thứ tự ưu tiên (claim byte ranges để tránh overlap):
1. **Full URL** `https?://...` — trim trailing punctuation `.,;:!?)]`
2. **Bare domain** `flowa.one`, `vd.com/path` — TLD whitelist (com|net|org|io|ai|co|app|dev|xyz|one|vn|me|so|cloud|tech|store|shop|blog|news|info|gg|to). Skip nếu prev char là `@` (email), `/` (path), `.` (subdomain). Wrap thành `https://${domain}`.
3. **Mentions** `@handle.tld` — collect tất cả → `Promise.all(resolveDID)` (parallel, không sequential). Chỉ giữ facet nếu DID resolve thành công.
4. **Hashtags** `#tag` — Vietnamese diacritics OK (`\u00C0-\u024F\u1E00-\u1EFF`). Reject pure-numeric `#123`. Cap 64 chars (AT Protocol limit).

Sort facets theo `byteStart` trước khi return — AT Protocol expect ordered facets.

## Preview parity (src/utils/blueskyFormatter.ts → segmentBlueskyText)

Frontend mockup dùng cùng regex set + cùng skip rules để preview = published. Segment types: `text | link | bareLink | mention | hashtag`. Tất cả render text-[#0085ff] hover:underline trong `BlueskyMockup`.

## Key files
- `supabase/functions/publish-bluesky/index.ts` — `parseRichTextFacets`, `resolveDID`
- `src/utils/blueskyFormatter.ts` — `segmentBlueskyText`, `stripMarkdownForBluesky`, `countGraphemes`
- `src/components/preview/ChannelMockupFrame.tsx` — `BlueskyMockup` render
