---
name: Longform Channel Separation
description: Website / Blogger / WordPress là 3 kênh long-form độc lập — KHÔNG fallback giữa các cột; UI/publish phải đọc đúng cột riêng
type: feature
---

## Trước (≤2026-04)
3 nút UI nhưng pipeline collapse `blogger`+`wordpress` → `website`, ghi chung cột `website_content`. Hệ quả: 3 kênh đăng cùng 1 bài.

## Sau (2026-05) — Tách hoàn toàn

| Kênh | Cột DB | Length | Format guidance |
|------|--------|--------|-----------------|
| website | `website_content` (+ `website_seo_data`) | 1000–2000 từ | Corporate, H1+H2/H3, blockquote, CTA, schema-friendly |
| blogger | `blogger_content` | 500–900 từ | Casual, ngôi 'tôi/mình', bullet ngắn, kết câu hỏi |
| wordpress | `wordpress_content` | 1200–2200 từ | In-depth, H2+H3, 4-6 sections, FAQ, callouts |

## ⚠️ Quy tắc tuyệt đối: KHÔNG fallback (2026-05 final)

Bug "Blog/Web/WordPress cùng 1 nội dung" quay lại nhiều lần vì code fallback `blogger_content || website_content`. Chốt lại:

- **Frontend** (`MultiChannelViewer`, `ChannelComparison`, `EnhancedExportMenu`): `getContentForChannel` chỉ đọc đúng cột của kênh, KHÔNG `|| website_content`.
- **Viewer**: nếu `website/blogger/wordpress` chưa có nội dung riêng → hiển thị banner amber "Chưa có nội dung riêng cho {Channel}" + nút "Tạo lại" gọi `regenerate` cho đúng kênh.
- **Không nhồi nút Blogger trong tab Website**: trước đây tab Website render thêm `DirectPublishButton channel="blogger"` với `content={website_content}` → đăng nhầm. Đã gỡ.
- **`channel-publisher`** (Blogger/WordPress): chỉ resolve từ cột riêng. Nếu rỗng → 400 `EMPTY_CHANNEL_CONTENT` với hướng dẫn vào tab kênh đó bấm Tạo lại. KHÔNG fallback `website_content`.
- **Generate streaming/non-streaming**: lưu `blogger_content`/`wordpress_content` đúng cột; nếu Blogger/WordPress được chọn mà AI/retry vẫn rỗng hoặc guard lỗi → trả 422/SSE error `EMPTY_GENERATED_CHANNEL_CONTENT`, KHÔNG lưu NULL.
- **Preview mode** (`action='preview'`): có entry riêng cho `blogger` (200-400 từ casual) và `wordpress` (400-700 từ in-depth) + `PREVIEW_CHANNEL_STYLE` hint nhấn mạnh "PHẢI khác Website/Blogger/WordPress".
- **Mockup mapping** (`MultiChannelPreviewDialog.channelToMockupType`, `ContentMockupToggle.channelToMockupType`): `blogger → 'blogger'`, `wordpress → 'wordpress'` (không còn `'general'`).
- **Labels**: `BASE_CHANNEL_CONFIG` và `CHANNELS` description nói rõ 3 kênh độc lập; không còn dòng "nội dung dùng chung Website".

## Bug history đã sửa (2026-05): streaming mode prompt
**Streaming path** (`generate-multichannel/index.ts` ~3185) chạy 1 AI call/channel song song qua `generateChannelsParallel` — KHÁC với block CREATE/INSERT non-streaming. Trước đây prompt cho mỗi channel chỉ là `Bây giờ viết nội dung cho kênh: ${channel.toUpperCase()}` → AI không biết format khác nhau → trả nội dung giống nhau hoặc rỗng cho blogger/wordpress.

**Fix**: inject `CHANNEL_FORMAT_GUIDANCE` map (per-channel format spec) + warning "3 kênh long-form phải KHÁC nhau" vào `buildChannelUserPrompt`. Đồng thời cập nhật shared modules:
- `_shared/dynamic-tokens.ts`: thêm `blogger` (1500-5000 tokens), `wordpress` (2500-9000 tokens). Không có entry → fallback default 1500 → cắt ngắn.
- `_shared/channel-optimization.ts`: thêm entry quality/balanced cho 2 kênh.
- `_shared/streaming-handler.ts` `getChannelDisplayName`: thêm `Blogger`, `WordPress`, `Pinterest`, `Bluesky`.

## Cost impact
Chọn cả 3 → AI chạy 3 long-form calls song song → ~3x output tokens. Chấp nhận trade-off.

## Backward compat
Dữ liệu cũ chỉ có `website_content` cho các record đã chọn `blogger`/`wordpress`: KHÔNG copy ngầm. UI hiện banner missing state để user chủ động bấm "Tạo lại nội dung" cho đúng kênh.

## 2026-05 — Long-form Guard (Blogger/WordPress không bao giờ rỗng nữa)
Trước fix này: khi streaming mode chạy parallel, AI vẫn thường trả rỗng/quá ngắn cho `blogger_content` hoặc `wordpress_content` → backend lưu NULL → UI hiện banner "Chưa có nội dung riêng" mãi mãi. Bấm Regenerate cũng có thể trả rỗng và update DB bằng rỗng.

**Fix tại `generate-multichannel/index.ts`:**
- Thêm `LONGFORM_MIN_CHARS = { blogger: 800, wordpress: 1500, website: 1500 }`.
- Thêm helper `regenerateLongformChannelDirect(channel)` gọi AI riêng với prompt cứng theo đúng đặc tả từng kênh (tone/độ dài/cấu trúc).
- Thêm `ensureLongformChannelsFilled(channels, channelResults, deps)` chạy retry 1 lần cho `blogger`/`wordpress` khi rỗng/quá ngắn.
- Wire vào 3 path:
  1. **Streaming create**: sau `generateChannelsParallel`, trước critique/dedup/insert.
  2. **Non-streaming create/expand**: ngay trước log `[persist]` và insert/update.
  3. **Regenerate (streaming + non-streaming)**: nếu output Blogger/WordPress vẫn rỗng/quá ngắn sau retry → trả lỗi 422 `EMPTY_GENERATED_CHANNEL_CONTENT`, KHÔNG update DB bằng rỗng.
- Dedup 2 phút phải bỏ qua record cũ nếu record đó có selected Blogger/WordPress nhưng cột text riêng rỗng; không được trả lại bài cũ trống rồi báo thành công.
- UI streaming regenerate phải propagate event `type:'error'` ra toast; không được nuốt lỗi trong catch parse JSON.
- Regenerate streaming/non-streaming inject thêm `## ĐẶC TẢ BẮT BUỘC CHO BLOGGER/WORDPRESS` vào systemPrompt.

Kết quả: bài mới luôn có text riêng cho 3 kênh long-form đã chọn; bài cũ bấm "Tạo lại" sẽ thực sự sinh text hoặc báo lỗi rõ — không còn trạng thái "xong nhưng vẫn trống".

## 2026-05 — ROOT CAUSE THẬT SỰ: whitelist sanitize thiếu cột
Sau nhiều vòng fix prompt/guard/retry mà DB Blogger/WordPress vẫn NULL: nguyên nhân gốc là `MULTI_CHANNEL_CONTENT_COLUMNS` (whitelist của `sanitizeMultiChannelPayload` ở `generate-multichannel/index.ts`) **THIẾU `blogger_content` và `wordpress_content`**. Mọi insert/update đi qua `buildMultiChannelCreatePayload`/`buildMultiChannelUpdatePayload` → sanitize → 2 trường này bị strip → DB nhận NULL dù logs cho thấy AI generate đủ text + retry OK.

**Fix:** thêm `'blogger_content'` và `'wordpress_content'` vào Set `MULTI_CHANNEL_CONTENT_COLUMNS` (cạnh `website_content`).

**Bài học:** mỗi khi thêm cột content channel mới vào DB, PHẢI thêm tên cột vào whitelist này — nếu không, payload sẽ bị filter trắng mà không có cảnh báo. Nên có test đảm bảo mọi cột `*_content` trong schema đều xuất hiện trong whitelist.

## 2026-05 — Defense-in-depth: Pre-insert assert + Post-write verify-and-patch
Whitelist fix vẫn chưa đủ — đã có thêm tầng "không-thể-rỗng-mà-báo-thành-công":

1. **Pre-insert assert** (streaming create): trước khi insert, normalize `channelResults.blogger`/`channelResults.wordpress`, log `pre-insert lens={...}`. Nếu kênh được chọn nhưng còn rỗng/quá ngắn → emit SSE `error` `EMPTY_GENERATED_CHANNEL_CONTENT` + fail task + close stream. KHÔNG cho insert record trống.
2. **Post-write verify-and-patch** (`verifyAndPatchLongformPersisted`): sau insert/update (cả streaming, non-streaming, expand), re-read row từ DB. Nếu cột Blogger/WordPress được chọn mà DB persist NULL/quá ngắn → patch update lại bằng text in-memory. Nếu patch vẫn không thành công → trả lỗi 422 `EMPTY_PERSISTED_CHANNEL_CONTENT`.
3. Event `result` SSE và response non-streaming dùng row sau verify, không dùng `savedContent` cũ — đảm bảo viewer/mockup nhận object đầy đủ `blogger_content`/`wordpress_content`.

## Frontend invariants (2026-05)
- `useMultiChannelContents.updateChannelContent.fieldMap` sửa lại: `pinterest → pinterest_content` và `bluesky → bluesky_content` (trước đây map sai sang `instagram_content` / `'Bluesky'`).
- `MultiChannelViewer` regenerate `onComplete`: không gọi `onUpdateContent` để ghi đè text từ stream nữa. Backend regenerate đã tự update DB → FE refetch full row qua `supabase.from('multi_channel_contents').select('*').eq('id', ...)` rồi push qua `onContentUpdated` để viewer/mockup nhận object canonical từ DB.

