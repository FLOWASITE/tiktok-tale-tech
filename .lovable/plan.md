# Format chuẩn hơn cho bài viết Bluesky

## Vấn đề hiện tại

1. **Giới hạn sai**: Đang ép ≤280 ký tự (giới hạn Twitter), nhưng Bluesky thực ra là **300 graphemes**.
2. **Prompt mâu thuẫn**: 1 prompt (line 4060) ghi "≤280", 1 prompt khác (line 4243) cũng "≤280", còn channel settings (line 308) lại để **300**. Output AI bị lệch.
3. **Format không đúng văn hóa Bluesky**:
   - Bluesky là **plain text** — không render `**bold**`, `# heading`, `- bullet`. Nhưng AI hay sinh markdown vì prompt chung chung → render ra ký tự `**` thô trong mockup.
   - Link nên là **URL trần đặt riêng 1 dòng cuối** (Bluesky tự tạo facet/embed card) — không nên `[text](url)` markdown.
   - Mention dùng `@handle.bsky.social`, không phải `@brand`.
4. **Mockup render bằng `ReactMarkdown`** → nếu AI lỡ trả markdown thì hiển thị OK trên preview nhưng SAI khi publish thật. Bluesky render plain text + auto-link.
5. **Thiếu line-break style native**: posts Bluesky hay có 2-3 đoạn ngắn cách bằng dòng trống, mỗi đoạn 1-2 câu.

## Giải pháp

### 1. Sửa prompt AI (`supabase/functions/generate-multichannel/index.ts`)

Cập nhật **cả 2 chỗ** mô tả Bluesky (line 4060 và 4243) thành spec chính xác:

```text
Nội dung Bluesky (≤300 graphemes — đếm chặt, chừa 30 ký tự cho link nếu có).
- PLAIN TEXT thuần, KHÔNG markdown (không **bold**, không # heading, không - bullet, không [text](url)).
- Cấu trúc: 2-3 đoạn rất ngắn (1-2 câu/đoạn), cách nhau bằng dòng trống.
- Hook ngay câu đầu: hot take, observation, hoặc câu hỏi gây tò mò.
- Giọng casual như chat với bạn — first person, có cá tính, không corporate.
- Emoji 0-3 (rải tự nhiên trong câu, không spam đầu/cuối).
- KHÔNG hashtag (văn hóa Bluesky).
- Link (nếu có): đặt URL TRẦN ở dòng cuối, cách 1 dòng trống với body.
  Ví dụ: "https://flowa.one" — KHÔNG bọc markdown.
- Mention (nếu có): dạng @handle.bsky.social.
- Kết: câu hỏi mở HOẶC observation thú vị mời tương tác.
```

### 2. Đồng bộ `channel-transform.ts` map độ dài

`src/types/channel-transform.ts` line 1870 đang để `bluesky: { min: 30, max: 80, unit: "từ" }`. Đổi thành `{ min: 30, max: 300, unit: "ký tự" }` cho khớp.

### 3. Thắt rule trong `channelSettings.ts`

Cập nhật `format_description` (line 322) cho khớp prompt mới và thêm:
- `emoji_limit: 3` (giảm từ 5 → match văn hóa Bluesky chuẩn hơn)
- `format_description`: nhấn mạnh "plain text, no markdown, link trần dòng cuối"

### 4. Sửa `BlueskyMockup` render đúng spec native

Trong `src/components/preview/ChannelMockupFrame.tsx` (function `BlueskyMockup` line 1221):

- **Bỏ `ReactMarkdown`**, thay bằng plain text renderer + auto-link regex:
  - Render text với `whitespace-pre-wrap` (giữ line breaks).
  - Detect URL bằng regex → bọc thành `<a class="text-[#0085ff] hover:underline">`.
  - Detect `@xxx.bsky.social` → bọc link xanh.
  - Strip residual markdown (`**`, `__`, leading `# `, leading `- `) trước khi render — phòng AI lỡ sinh.
- **Embed card cho link**: nếu post có URL, hiển thị thêm khối "link card" giả lập dưới text (border xám nhẹ, favicon placeholder + domain) — đây là behavior native Bluesky.
- **Counter ký tự** dạng nhỏ ở góc nếu vượt 300 (cảnh báo overflow như Twitter mockup).

### 5. Helper utility mới

Tạo `src/utils/blueskyFormatter.ts`:
- `stripMarkdownForBluesky(text: string)`: xóa `**`, `__`, `#`, `-` đầu dòng, `[text](url)` → giữ `text` + tách url.
- `extractFirstUrl(text: string)`: trả URL đầu tiên để dùng cho embed card.
- `countGraphemes(text: string)`: đếm grapheme chuẩn (dùng `Intl.Segmenter`) — vì Bluesky đếm grapheme chứ không phải char.

Dùng utility này cả ở **mockup** (sanitize trước khi render) và **`useContentAnalysis`** (đếm đúng graphemes cho Bluesky thay vì `text.length`).

## Files sẽ chỉnh

- `supabase/functions/generate-multichannel/index.ts` (2 chỗ prompt Bluesky)
- `src/types/channelSettings.ts` (bluesky settings)
- `src/types/channel-transform.ts` (length map)
- `src/components/preview/ChannelMockupFrame.tsx` (BlueskyMockup render)
- `src/utils/blueskyFormatter.ts` (mới)
- `src/hooks/useContentAnalysis.ts` (dùng grapheme count cho bluesky)

## Kết quả mong đợi

- AI sinh post Bluesky đúng văn hóa: plain text, ngắn, casual, có khoảng trắng giữa đoạn, link riêng dòng cuối.
- Mockup hiển thị giống native Bluesky thật (không còn `**` thô, có link card).
- Đếm độ dài chính xác bằng grapheme — không bị lệch khi có emoji.
