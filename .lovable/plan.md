# Fix: Keyword đã chọn nhưng AI không dùng

## Nguyên nhân (đã xác minh trong code)

`generate-multichannel/index.ts` có **2 nhánh sinh nội dung**:

| Nhánh | Vị trí | Inject SEO Cluster? |
|---|---|---|
| Normal mode (non-stream) | line 4321–4378, dùng tại 4455 | ✅ Có |
| **Streaming mode** (mặc định UI) | line 3143–3236 | ❌ **KHÔNG** |

UI `MultiChannelCreate` luôn gọi `useStreamingGeneration` → toàn bộ user **luôn rơi vào nhánh streaming**. Frontend đã gửi `clusterId` + `targetKeywordIds` xuống (verified ở `useStreamingGeneration.ts:185`), nhưng nhánh streaming chỉ build `targetedProductContext` + `targetedPersonaContext` rồi nhồi vào `userPrompt` (line 3226–3236) — bỏ qua hoàn toàn block `## 🎯 SEO PILLAR CLUSTER`.

Hậu quả: keyword được lưu vào `multi_channel_contents.target_keyword_ids` **sau khi** AI đã sinh xong — AI không hề biết keyword nào để tối ưu mật độ / H2 / hashtag. Đúng triệu chứng "có keyword nhưng hệ thống không dùng".

## Sửa

**1 file duy nhất**: `supabase/functions/generate-multichannel/index.ts`

Trong nhánh streaming, ngay sau khối build `targetedPersonaContext` (~line 3220, trước `buildHookOverview`), thêm block load SEO cluster context **giống hệt** logic đang có ở normal-mode (line 4326–4378):

- Nếu `formData.clusterId` → fetch `seo_clusters` (name, description, pillar_keyword_id)
- Nếu có `pillar_keyword_id` → fetch keyword
- Nếu `formData.targetKeywordIds?.length` → fetch `seo_keywords` (keyword, search_intent, search_volume, is_pillar) bằng `.in('id', ...)`
- Build `seoClusterContext` string với block `## 🎯 SEO PILLAR CLUSTER` + 5 quy tắc on-page (density 0.8–1.5%, H2/H3 cho long-form, keyword trong 2 dòng đầu cho social, hashtag #keyword cho IG/Threads/X)

Inject vào `userPrompt` (line 3226+) ngay sau `${targetedPersonaContext}`:

```
${targetedProductContext}
${targetedPersonaContext}
${seoClusterContext}
${hookOverview}
```

Bọc trong `try/catch` + `console.warn('[streaming-mode] Failed to load SEO cluster context')` y hệt nhánh normal để không phá generation nếu DB lỗi.

## Refactor nhỏ (khuyến nghị, optional)

Hai khối build SEO context giờ giống hệt nhau ở 2 nhánh → tách thành helper `buildSeoClusterContext(supabase, formData)` đặt cuối file (cạnh các helper khác trong cùng `index.ts`, không tạo file mới vì rule edge function "no subfolders/no shared imports cross-function"). Cả normal mode và streaming mode cùng gọi. Giảm duplication và tránh drift trong tương lai.

## Out of scope
- Không đổi schema, không migration mới
- Không đụng UI (`ClusterPicker`, `KeywordTargetPicker` đang chạy đúng)
- Không đụng `MultiChannelCreate.tsx` (đã update DB đúng sau khi tạo)
- Không đụng nhánh agent / regenerate (kiểm tra riêng nếu user báo)

## Test sau khi sửa
1. Mở `/multi-channel/create`, chọn 1 Pillar trong `ClusterPicker` → keyword auto-fill
2. Generate → check edge function logs `generate-multichannel` thấy log `[streaming-mode] Loaded SEO cluster: <name>`
3. Output content phải chứa keyword đã chọn trong tiêu đề / 2 dòng đầu / hashtag
