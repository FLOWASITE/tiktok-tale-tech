## Vấn đề

Lần tạo nội dung mới nhất (`46081c5e`, 04:27 UTC, 15 kênh) cho thấy:

| Kênh | Kết quả | Mục tiêu |
|---|---|---|
| Bluesky | **0 ký tự** | ≤300 graphemes |
| Google Maps | **0 ký tự** | 80–150 từ |
| Threads | **43 ký tự** (~10 từ) | 50–200 từ |
| Medium | 2 815 ký tự (~450 từ) | **1 000–1 800 từ** |
| Shopify | 2 383 ký tự (~380 từ) | **800–1 500 từ** |
| Wix | 1 481 ký tự (~240 từ) | **800–1 500 từ** |

`ai_metrics` xác nhận run thành công (`had_error=false`, no fallback), 236s, 15 354 output tokens — tức **bị truncate** ở giữa generation.

## Nguyên nhân gốc

`supabase/functions/_shared/dynamic-tokens.ts` thiếu cấu hình token cho 5 kênh và path parallel không apply token floor cho long-form:

1. **`CHANNEL_TOKEN_CONFIGS` thiếu**: `bluesky`, `medium`, `shopify`, `wix`, `pinterest` → fallback `DEFAULT_TOKEN_CONFIG` (max **1 500 tokens** = ~250–300 từ tiếng Việt). Đây chính là lý do Medium/Shopify/Wix ra ngắn ~250–450 từ.
2. **`applyLongformTokenFloor` không được gọi trong `generateChannelsInParallel`** (line 5395 `generate-multichannel/index.ts`). Floor 5000–6500 tokens cho shopify/wix/medium chỉ áp dụng ở retry path (line 623) và admin-config path (line 3768), không áp dụng cho main parallel path.
3. **Threads `maxTokens: 300`** với buffer 1.4 → ~420 tokens hiệu lực, đủ cho 200 từ nhưng AI có thể dừng sớm khi không có instruction min-length cứng. Cần raise floor.
4. **Bluesky/Google Maps trả empty**: maxTokens không phải vấn đề (ngắn). Cần đọc edge function logs của run 04:27 để xác định: AI tool-call trả thiếu key `bluesky_content`/`google_maps_content`, hay parse extraction fail. Có thể do prompt cuối câu `[CHỈ TẠO NỘI DUNG CHO CÁC KÊNH: BLUESKY]` không match key trong tool schema. Phải debug trước khi sửa.

## Kế hoạch

### Bước 1 — Sửa `supabase/functions/_shared/dynamic-tokens.ts`

Thêm cấu hình cho 5 kênh thiếu vào `CHANNEL_TOKEN_CONFIGS`:

```ts
medium:   { minTokens: 6500, maxTokens: 9000, bufferMultiplier: 1.3 }, // 1000-1800 từ
shopify:  { minTokens: 5000, maxTokens: 7500, bufferMultiplier: 1.3 }, // 800-1500 từ
wix:      { minTokens: 5000, maxTokens: 7500, bufferMultiplier: 1.3 }, // 800-1500 từ
bluesky:  { minTokens: 300,  maxTokens: 600,  bufferMultiplier: 1.4 }, // 300 graphemes
pinterest:{ minTokens: 400,  maxTokens: 1000, bufferMultiplier: 1.3 }, // title + 500-chars desc
```

Đồng thời nâng `threads.minTokens` từ 100 → **300** (đảm bảo AI có headroom để viết ≥50 từ).

### Bước 2 — Áp `applyLongformTokenFloor` trong parallel path

`supabase/functions/generate-multichannel/index.ts` line 5393:

```ts
// Trước:
const maxTokens = channelConfig?.maxTokens ?? dynamicTokens;
// Sau:
const baseMaxTokens = channelConfig?.maxTokens ?? dynamicTokens;
const maxTokens = clampMaxTokensForModel(model, applyLongformTokenFloor(channel, baseMaxTokens));
```

Đảm bảo shopify/wix/medium luôn ≥ 5 000/6 500 tokens kể cả khi admin chưa set channel config.

### Bước 3 — Debug Bluesky & Google Maps empty

1. Pull edge function logs `generate-multichannel` quanh 04:27 UTC, filter `bluesky` và `google_maps`.
2. Kiểm tra tool-call response: AI có trả `bluesky_content`/`google_maps_content` không, hay trả key khác (vd: `content` lồng trong wrapper).
3. Nếu key sai → sửa `buildToolsForChannels` hoặc extraction.
4. Nếu AI thật sự bỏ qua → strengthen prompt cho 2 kênh này (đã có instruction ở line 4999 cho bluesky và 4990 cho google_maps, có thể tool schema chưa enforce required).

### Bước 4 — Kiểm chứng

1. Tạo lại 1 nội dung 15 kênh sau khi deploy.
2. Query `multi_channel_contents` mới nhất, xác nhận:
   - `medium_content` ≥ 4 500 ký tự (~700 từ trở lên)
   - `shopify_content`, `wix_content` ≥ 3 500 ký tự
   - `bluesky_content`, `google_maps_content`, `threads_content` đều có nội dung > 100 ký tự
3. Xem `ai_metrics` đảm bảo không có truncate (output_tokens không chạm trần dynamic).

## Files sẽ chỉnh

- `supabase/functions/_shared/dynamic-tokens.ts` — thêm 5 channel configs + nâng threads floor
- `supabase/functions/generate-multichannel/index.ts` — apply `applyLongformTokenFloor` ở dòng 5393
- (Có thể) `supabase/functions/generate-multichannel/index.ts` — fix extraction/tool schema cho bluesky/google_maps sau khi đọc logs

## Rủi ro

- Nâng max_tokens làm tăng chi phí AI: medium/shopify/wix mỗi kênh thêm ~3000–5000 tokens output. Acceptable vì hiện đang sai requirement.
- Không ảnh hưởng các kênh đã hoạt động đúng (facebook, instagram, linkedin, ...).
