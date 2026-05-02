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
- **Generate streaming/non-streaming**: lưu `blogger_content`/`wordpress_content` đúng cột; nếu kênh được chọn nhưng AI trả rỗng → log warn và lưu NULL (UI sẽ hiện missing state, không che bằng Website).
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
