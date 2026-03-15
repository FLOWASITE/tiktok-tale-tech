

## Tối ưu hiệu năng pipeline tạo ảnh

### Phân tích bottleneck hiện tại

Cho 3 kênh với logo overlay, thời gian hiện tại:
```text
Channel 1: [DB queries ~1.5s] [AI gen ~15-30s] [logo ~5s] [upload ~2s] = ~25-40s
   ↓ 500ms delay
Channel 2: [DB queries ~1.5s] [AI gen ~15-30s] [logo ~5s] [upload ~2s] = ~25-40s
   ↓ 500ms delay
Channel 3: [DB queries ~1.5s] [AI gen ~15-30s] [logo ~5s] [upload ~2s] = ~25-40s

Total: ~75-120s sequential
```

### 6 tối ưu đề xuất

#### 1. Song song hóa DB queries trong edge function (NGHIÊM TRỌNG)

**File:** `supabase/functions/generate-brand-image/index.ts`

Hiện tại 3 query chạy tuần tự: `brand_templates` → `multi_channel_contents` → `product_persona_mappings` (~1.5s). Chuyển sang `Promise.all` giảm còn ~0.5s.

```text
Trước: brand(500ms) → content(500ms) → persona(500ms) = 1500ms
Sau:   Promise.all([brand, content, persona]) = 500ms
Tiết kiệm: ~1s/channel × N channels
```

#### 2. Tăng batch size cho ≤3 kênh (CAO)

**File:** `src/hooks/useAutoImageGeneration.ts`

Hiện tại `getBatchSize(totalChannels <= 3) = 1` → hoàn toàn tuần tự. Đổi thành batch 2 cho 2-3 kênh, batch 3 cho 4+ kênh. AI gateway có thể xử lý song song.

```text
Trước (3 kênh): Ch1→Ch2→Ch3 = 90s
Sau (3 kênh):   [Ch1,Ch2]→Ch3 = 60s (-33%)
```

#### 3. Giảm retry chồng chéo client-server (CAO)

**File:** `src/hooks/useAutoImageGeneration.ts` + `supabase/functions/generate-brand-image/index.ts`

Hiện tại: Client retry 2x × Server retry 2x/model × 2 models = tối đa 12 lần gọi AI. Quá lãng phí.

**Đề xuất:** Giảm client retry xuống 1 (từ 2), giữ server retry 1 (từ 2). Tổng worst case: 2 × (1+1) × 2 = 8 → giảm 33%.

#### 4. Non-blocking history save (TRUNG BÌNH)

**File:** `supabase/functions/generate-brand-image/index.ts`

Hiện tại `channel_image_history` update + insert chạy trước khi trả response (lines 601-631). Chuyển thành fire-and-forget để response trả về sớm hơn ~200-500ms.

#### 5. Cache brand context phía client (TRUNG BÌNH)

**File:** `src/hooks/useAutoImageGeneration.ts`

Khi tạo ảnh cho 5 kênh cùng brand, edge function fetch `brand_templates` 5 lần giống nhau. Truyền brand context từ client (đã có sẵn) thay vì để server fetch lại.

**Đề xuất:** Thêm optional `brandContext` vào request body. Nếu có, skip DB query. Nếu không, fetch như cũ (backward compatible).

#### 6. Early timeout detection (THẤP)

**File:** `src/hooks/useAutoImageGeneration.ts`

Thêm progress heartbeat: nếu sau 60s chưa có response, hiện warning toast cho user biết "đang chờ AI" thay vì im lặng 120s rồi timeout.

---

### Tóm tắt thay đổi

| # | Tối ưu | Tiết kiệm | File |
|---|--------|-----------|------|
| 1 | Song song DB queries | ~1s/kênh | `generate-brand-image/index.ts` |
| 2 | Tăng batch size | ~30-40% tổng thời gian | `useAutoImageGeneration.ts` |
| 3 | Giảm retry chồng chéo | Tránh 12 attempts → 8 | Cả 2 files |
| 4 | Non-blocking history | ~300ms/kênh | `generate-brand-image/index.ts` |
| 5 | Cache brand context | ~500ms/kênh (từ kênh thứ 2) | `useAutoImageGeneration.ts` + edge function |
| 6 | Early timeout warning | UX improvement | `useAutoImageGeneration.ts` |

### Phạm vi: 2 files chính, ~50-70 dòng thay đổi

