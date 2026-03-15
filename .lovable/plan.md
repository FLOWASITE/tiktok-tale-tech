

## Rà soát toàn diện tính hợp lý của hệ thống tạo ảnh — Phát hiện và đề xuất sửa

### Tóm tắt kiến trúc hiện tại

Hệ thống có 2 luồng tạo ảnh:
1. **SimpleImageGenerator** (standalone dialog) → `useAutoImageGeneration` → edge function `generate-brand-image`
2. **MultiChannelFormWizard Step 6** → `useAutoImagePipeline` → `useAutoImageGeneration` → edge function `generate-brand-image`

Cả 2 đều truyền `promptMode` xuống backend `image-prompt-builder.ts` để build prompt khác nhau cho 3 mode.

---

### Các vấn đề phát hiện

#### Vấn đề 1: Pipeline luôn gửi `imageStylePreset` bất kể mode (NGHIÊM TRỌNG)

**File:** `useAutoImagePipeline.ts` line 128

Pipeline luôn truyền `imageStylePreset` (từ V3 engine) vào `genOptions`, kể cả khi `promptMode === 'raw'` hoặc `'brand_only'`. Nhưng logic ở `batchOptions` trong `SimpleImageGenerator` (line 372) lại đúng — chỉ truyền style khi `promptMode !== 'full'` VÀ style không phải `'auto'`.

**Hậu quả:** Trong wizard flow, mode `raw` vẫn bị V3 engine ép style thay vì để user chọn. Mode `brand_only` cũng bị AI style override.

**Sửa:** Điều chỉnh `genOptions` trong pipeline:
- `full`: giữ V3 auto-selected style (đúng rồi)
- `brand_only`: bỏ `imageStylePreset` (để backend dùng `computeStyleFromBrand`)
- `raw`: bỏ `imageStylePreset` (user phải tự chọn, nhưng pipeline hiện không có UI cho việc này → vấn đề 3)

#### Vấn đề 2: Pipeline luôn truyền `contentRole` và `contentAngle` (TRUNG BÌNH)

**File:** `useAutoImagePipeline.ts` line 129-130

Pipeline luôn gửi `contentRole` và `contentAngle` cho mọi mode. Nhưng ở `SimpleImageGenerator` (line 374-376), chúng chỉ được gửi khi `promptMode === 'full'`.

**Hậu quả:** Trong wizard flow, mode `brand_only` và `raw` vẫn nhận strategic context, làm prompt bị AI can thiệp dù user muốn kiểm soát thủ công. Backend `buildImagePrompt` xử lý đúng (raw/brand_only skip sections này), nhưng `contentRole`/`contentAngle` vẫn tồn tại trong request body → gây nhầm lẫn và tiềm ẩn bug nếu backend logic thay đổi.

**Sửa:** Chỉ truyền `contentRole`/`contentAngle` khi `mode === 'full'`, giống SimpleImageGenerator.

#### Vấn đề 3: `imageContentType` luôn là `'with_text'` trong pipeline (TRUNG BÌNH)

**File:** `useAutoImagePipeline.ts` line 135

```typescript
imageContentType: mode === 'full' ? 'with_text' : 'with_text',
```

Dòng này là dead code — kết quả luôn `'with_text'` bất kể mode. Đối với `raw` mode, user nên có quyền chọn `background_only` nếu muốn. Đối với `brand_only`, cũng nên tùy thuộc cài đặt user.

**Sửa:** Pipeline nên nhận `imageContentType` từ caller thay vì hardcode.

#### Vấn đề 4: Pipeline không truyền `promptMode` vào `genOptions` (NGHIÊM TRỌNG)

**File:** `useAutoImagePipeline.ts` line 122-140

`genOptions` **KHÔNG** chứa `promptMode`! Mặc dù `contentMeta.promptMode` được đọc để tính `mode` variable, nhưng nó không bao giờ được truyền vào `AutoGenerateOptions`. Trong khi `useAutoImageGeneration.ts` line 105 CÓ đọc `promptMode` và gửi nó đến edge function.

**Hậu quả:** Trong wizard flow, edge function `generate-brand-image` nhận `promptMode = undefined` → mặc định `'full'` → **mọi mode đều chạy giống nhau ở backend!**

**Sửa:** Thêm `promptMode: mode` vào `genOptions`.

#### Vấn đề 5: `batchOptions` trong SimpleImageGenerator có logic ngược cho `imageStylePreset` (THẤP)

**File:** `SimpleImageGenerator.tsx` line 372

```typescript
imageStylePreset: (promptMode !== 'full' || imageStyle === 'auto') ? undefined : imageStyle,
```

Logic này: nếu `promptMode !== 'full'` → `undefined`. Nhưng ở mode `raw`, user **nên** được chọn style thủ công và style đó phải được gửi xuống. Hiện tại V3StylePreview chỉ hiện ở `raw` mode (đúng), nhưng giá trị chọn bị bỏ qua.

**Sửa:** Đổi thành:
```typescript
imageStylePreset: (promptMode === 'full' && imageStyle === 'auto') ? undefined 
  : (promptMode === 'raw' ? (imageStyle === 'auto' ? undefined : imageStyle) : undefined),
```
Hoặc đơn giản hơn: khi `raw` và user đã chọn style (≠ auto), gửi style đó.

#### Vấn đề 6: `brand_only` mode có `includeLogo` logic mâu thuẫn (THẤP)

**File:** `useAutoImagePipeline.ts` line 132 vs `SimpleImageGenerator.tsx` line 367

- Pipeline: `includeLogo: mode === 'brand_only' ? true : !!brandLogoUrl` → force logo cho brand_only
- SimpleImageGenerator: `includeLogo: includeLogo && !!brandLogoUrl` → dùng state user chọn

Trong SimpleImageGenerator, brand_only không force logo — user toggle `includeLogo` state. Nhưng pipeline force it. Hai luồng không nhất quán.

**Sửa:** Pipeline cũng nên force `includeLogo: true` khi brand_only **VÀ** logoUrl tồn tại (không có logoUrl thì force cũng vô nghĩa). SimpleImageGenerator nên auto-set `includeLogo = true` khi user chọn `brand_only` mode.

---

### Tóm tắt thay đổi

| # | File | Vấn đề | Mức |
|---|------|--------|-----|
| 1 | `useAutoImagePipeline.ts` | Style luôn gửi bất kể mode | Cao |
| 2 | `useAutoImagePipeline.ts` | contentRole/Angle gửi mọi mode | TB |
| 3 | `useAutoImagePipeline.ts` | imageContentType hardcode `'with_text'` | TB |
| 4 | `useAutoImagePipeline.ts` | **`promptMode` không truyền vào genOptions** | Cao |
| 5 | `SimpleImageGenerator.tsx` | Style bị bỏ qua ở raw mode | Thấp |
| 6 | `useAutoImagePipeline.ts` + `SimpleImageGenerator.tsx` | Logo logic mâu thuẫn giữa 2 luồng | Thấp |

### Kế hoạch sửa

**File 1: `src/hooks/useAutoImagePipeline.ts`** — Sửa `genOptions`:
- Thêm `promptMode: mode`
- `imageStylePreset`: chỉ gửi khi `mode === 'full'`
- `contentRole`/`contentAngle`: chỉ gửi khi `mode === 'full'`
- `imageContentType`: nhận từ caller hoặc mặc định `'with_text'` chỉ khi `full`
- `includeLogo`: force `true` khi `brand_only` VÀ có `brandLogoUrl`

**File 2: `src/components/multichannel/SimpleImageGenerator.tsx`** — Sửa `batchOptions`:
- `imageStylePreset`: gửi khi `raw` và user đã chọn style (≠ auto)
- Auto-set `includeLogo = true` khi chuyển sang `brand_only` mode

### Phạm vi: 2 file, ~20-30 dòng thay đổi

