## Root cause (đã verify từ code + log + DB)

**Bug 1 — DB save mất `cluster_id` và `target_keyword_ids`:**
File `supabase/functions/generate-multichannel/index.ts` line 745-797 định nghĩa whitelist `MULTI_CHANNEL_CONTENT_COLUMNS`. Hàm `sanitizeMultiChannelPayload` (line 799) loại bỏ mọi key không nằm trong set này TRƯỚC khi insert. Whitelist hiện thiếu 2 cột → dù code line 4056 và 6255 có set `cluster_id: formData.clusterId` thì vẫn bị strip → DB lưu `null` / `[]`.

**Bug 2 — Prompt log "keywords=0" dù đã chọn pillar:**
Trong streaming-mode (line 3229-3277) backend chỉ inject keyword nếu `formData.targetKeywordIds.length > 0`. Khi user chọn pillar qua flow nào đó mà không kích hoạt prefill top-5 ở frontend (`ClusterPicker.tsx` line 41-50, `PillarKeywordSection.tsx` line 67-79), array rỗng → AI prompt chỉ có pillar name, mất rule density 0.8-1.5% và H2/title injection.

## Fix

### 1. `supabase/functions/generate-multichannel/index.ts`

**a. Thêm 2 cột vào whitelist** (sau line 769):
```ts
'core_content_id',
'cluster_id',
'target_keyword_ids',
'channel_statuses',
```

**b. Auto-fallback top-5 keyword ở backend** — trong cả 2 block SEO context (line 3229 & 4389), nếu có `clusterId` mà `targetKeywordIds` rỗng → tự query `seo_keywords` top-5 by `priority_score` và push vào `formData.targetKeywordIds` trước khi build prompt. Đảm bảo prompt + DB đồng bộ.

**c. Cập nhật log** từ `Loaded SEO cluster context: pillar="X" keywords=N` thành `pillar="X" cluster_id=UUID keywords=N source=user|fallback` để dễ debug lần sau.

### 2. `supabase/functions/generate-multichannel/index.ts` — đảm bảo EXPAND mode cũng update cluster
Trong block expand (line 3933-3974) `updatePayload` không có `cluster_id`/`target_keyword_ids`. Thêm vào nếu request có chỉnh keyword target (dùng `formData.clusterId` / `formData.targetKeywordIds` nếu được gửi).

## Test sau fix

1. SEO mode → chọn pillar "AI" → bấm Generate (không chọn thêm keyword nào).
2. Verify edge log: `keywords=5 source=fallback`.
3. Verify DB: `SELECT cluster_id, target_keyword_ids FROM multi_channel_contents ORDER BY created_at DESC LIMIT 1;` → phải có giá trị, không null/[].
4. Verify nội dung output: keyword xuất hiện trong title + H2 của bài website/blogger.
5. Sau khi published → trigger `auto_assign_landing_page_to_keywords` chạy → keyword status đổi sang `published` (kiểm chứng counter "Đã dùng" tăng).

## Không thay đổi

- Frontend `MultiChannelFormWizard.tsx` / `PillarKeywordSection.tsx`: prefill logic giữ nguyên (vẫn là defense-in-depth ở UI). Backend fallback chỉ là layer 2 cho trường hợp UI không kịp prefill hoặc user clear hết keyword.
- Schema DB không đổi (cột đã tồn tại sẵn, chỉ bị code strip).
