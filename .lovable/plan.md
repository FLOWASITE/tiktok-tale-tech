

## Rà soát kết quả nâng cấp Prompt AI Multichannel

### Tình trạng hiện tại

| File | Trạng thái | Chi tiết |
|------|-----------|----------|
| `generate-multichannel/index.ts` — DEFAULT_CHANNEL_SETTINGS | ✅ Đã cập nhật | Facebook 250-500, LinkedIn 300-600, Email 250-500, Telegram giữ 100-500 (chưa tăng min lên 200) |
| `generate-multichannel/index.ts` — Editorial Structure | ✅ Đã cập nhật | 9 phần cấu trúc nội dung chuẩn có trong system prompt |
| `generate-multichannel/index.ts` — Channel Descriptions | ✅ Đã cập nhật | Mô tả kênh đồng bộ word count mới |
| `_shared/channel-transform-rules.ts` | ✅ Đã cập nhật | Facebook [0.20, 0.40], LinkedIn [0.25, 0.45], Email [0.20, 0.40] |
| `_shared/length-validator.ts` | ✅ Đã cập nhật | Facebook 250-500, LinkedIn 300-600, Email 250-500, Telegram 200-500 |
| `_shared/dynamic-tokens.ts` | ✅ Đã cập nhật | Facebook 600-2000, LinkedIn 800-2500, Email 600-2000 |
| `src/types/length-compliance.ts` (frontend) | ✅ Đã cập nhật | Đồng bộ với backend |
| `src/types/channel-transform.ts` (frontend) | ✅ Đã cập nhật | Đồng bộ multipliers |

### Thiếu sót phát hiện — 2 file CHƯA được cập nhật

#### 1. `supabase/functions/generate-sample-text/index.ts` — CÒN GIÁ TRỊ CŨ
- Facebook: `min_length: 120, max_length: 300` → cần **250, 500**
- LinkedIn: `min_length: 150, max_length: 400` → cần **300, 600**
- Email: `min_length: 150, max_length: 400` → cần **250, 500**
- Telegram: `min_length: 100` → cần **200**

File này dùng để tạo sample text mẫu cho brand. Nếu không đồng bộ, sample text sẽ ngắn hơn tiêu chuẩn mới.

#### 2. `supabase/functions/ai-edit-channel/index.ts` — CÒN GIÁ TRỊ CŨ
- Facebook: `min_length: 120, max_length: 300` → cần **250, 500**
- LinkedIn: `min_length: 150, max_length: 400` → cần **300, 600**
- Email: `min_length: 150, max_length: 400` → cần **250, 500**
- Website: `max_length: 1500` → cần **2000**

File này dùng khi user chỉnh sửa nội dung kênh bằng AI. Nếu không đồng bộ, AI edit sẽ áp dụng giới hạn cũ và cắt ngắn nội dung.

#### 3. Telegram min_length trong `generate-multichannel/index.ts`
- Hiện tại: `min_length: 100` (dòng 811 không thấy nhưng cần xác nhận)
- Kế hoạch gốc: tăng lên **200**
- `length-validator.ts` đã có 200, nhưng `DEFAULT_CHANNEL_SETTINGS` cần kiểm tra

### Kế hoạch sửa

1. **`generate-sample-text/index.ts`**: Cập nhật Facebook (250-500), LinkedIn (300-600), Email (250-500), Telegram min 200
2. **`ai-edit-channel/index.ts`**: Cập nhật Facebook (250-500), LinkedIn (300-600), Email (250-500), Website max 2000
3. Xác nhận Telegram min_length trong `generate-multichannel/index.ts`

Tổng: ~20 dòng thay đổi trong 2-3 file

