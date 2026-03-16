

## Rà soát & Điều chỉnh UI 3 chế độ Kiểm soát AI

### Phân tích hiện trạng

**Bảng so sánh: Chức năng vs UI hiện tại**

```text
┌──────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│ UI Element           │ Để AI lo (full)     │ Giữ Brand           │ Toàn quyền (raw)    │
│                      │ (ai_render mode)    │ (brand_only)        │                     │
├──────────────────────┼─────────────────────┼─────────────────────┼─────────────────────┤
│ Style Grid           │ ẨN ✅               │ HIỆN (Adv) ✅       │ HIỆN (Main) ✅      │
│ V3 Style read-only   │ HIỆN ✅             │ ẨN ❌               │ ẨN ✅               │
│ Aspect Ratio         │ HIỆN ✅             │ HIỆN ✅             │ HIỆN ✅             │
│ Logo toggle          │ HIỆN (manual) ❌    │ HIỆN (auto-on) ✅   │ HIỆN ✅             │
│ Text overlay toggle  │ HIỆN ❌ (gây hiểu   │ HIỆN ✅             │ HIỆN ✅             │
│                      │  lầm vì AI render)  │                     │                     │
│ Text position        │ ẨN ✅               │ HIỆN ✅             │ HIỆN ✅             │
│ Negative prompt      │ ẨN ✅               │ HIỆN ✅             │ HIỆN ✅             │
│ Hybrid/AI render     │ ẨN (auto-on) ✅     │ HIỆN khi complex ✅ │ HIỆN khi complex ✅ │
│ Template picker      │ ẨN (auto) ✅        │ HIỆN khi hybrid ✅  │ HIỆN khi hybrid ✅  │
│ Strategic context    │ HIỆN ✅             │ ẨN ❌               │ ẨN ✅               │
│ Auto-enable logo     │ KHÔNG ❌            │ CÓ ✅               │ KHÔNG ✅            │
└──────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┘
```

### 5 vấn đề cần sửa

**1. Full mode: Text overlay toggle gây hiểu lầm**
- Toggle "Thêm text lên ảnh" vẫn hiện nhưng AI render text — user tưởng có thể tắt text nhưng AI vẫn render theo structured elements
- **Fix**: Trong full mode, ẩn toggle switch, thay bằng label read-only "AI tự quyết định text trên ảnh" + vẫn cho nhập nội dung text (vì nó feed vào prompt)

**2. Full mode: Logo không auto-enable**
- brand_only tự bật logo khi chọn, nhưng full mode (cũng là mode "AI lo hết") lại không
- **Fix**: Auto-enable logo khi chuyển sang full mode (nếu có brandLogoUrl)

**3. Brand_only: Thiếu V3 style suggestions**
- Raw mode có V3StylePreview ở main area, brand_only chỉ có style grid trong Advanced
- brand_only cũng cần gợi ý style vì user chọn phong cách — nhưng ở dạng "gợi ý" chứ không phải "bắt buộc"
- **Fix**: Hiện V3StylePreview ở main area cho brand_only (giống raw)

**4. Brand_only: Thiếu Strategic Context**
- Full mode hiện strategic context (Role, Angle, Hook), brand_only thì không — nhưng brand_only cũng dùng context này ở mức "hint"
- **Fix**: Hiện strategic context cho brand_only ở dạng mờ hơn (opacity-60) với label "Áp dụng nhẹ"

**5. Description text không nhất quán giữa 3 nơi**
- SimpleImageGenerator, ImageAdvancedOptions, và MultiChannelFormWizard có description hơi khác nhau
- **Fix**: Thống nhất text description

### Thay đổi chi tiết

#### File 1: `src/components/multichannel/SimpleImageGenerator.tsx` (~15 dòng)

- **Auto-enable logo cho full mode** (line 726-731): Thêm case `full` cùng logic `brand_only`
```typescript
if ((mode.value === 'brand_only' || mode.value === 'full') && brandLogoUrl) {
  setIncludeLogo(true);
}
```

- **Hiện V3StylePreview cho brand_only** (line 775-782): Đổi điều kiện từ `promptMode === 'raw'` thành `promptMode !== 'full'`

- **Đổi hideStyleGrid** (line 941): Từ `hideStyleGrid={promptMode === 'raw'}` thành `hideStyleGrid={promptMode !== 'full'}` (vì cả raw và brand_only đã có V3StylePreview ở main area)

#### File 2: `src/components/multichannel/ImageAdvancedOptions.tsx` (~25 dòng)

- **Text overlay section**: Trong full mode, ẩn Switch toggle, hiện label read-only thay thế:
```typescript
{promptMode === 'full' ? (
  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/15">
    <Type className="w-4 h-4 text-primary" />
    <p className="text-xs text-primary/80">AI tự quyết định nội dung text trên ảnh</p>
  </div>
) : (
  // existing Switch toggle
)}
```
- Vẫn giữ phần nhập text content phía dưới (Chung/Theo kênh) cho full mode vì nó feed vào prompt

- **Strategic context**: Mở rộng điều kiện hiển thị cho brand_only (với opacity giảm):
```typescript
{(promptMode === 'full' || promptMode === 'brand_only') && (contentRole || contentAngle || ...) && (
  <div className={cn("space-y-2", promptMode === 'brand_only' && "opacity-60")}>
    <Label>
      {promptMode === 'brand_only' ? 'Ngữ cảnh chiến lược (áp dụng nhẹ)' : 'Ngữ cảnh chiến lược'}
    </Label>
    ...
  </div>
)}
```

#### File 3: Thống nhất description text (cả 3 file)
```text
full:       "AI tự tối ưu phong cách, bố cục và text. Bạn chỉ cần duyệt."
brand_only: "Giữ logo & màu brand. Bạn chọn phong cách và bố cục text."
raw:        "Bạn kiểm soát 100%: phong cách, logo, text, bố cục."
```

### Scope
- 2 file chính: `SimpleImageGenerator.tsx`, `ImageAdvancedOptions.tsx`
- ~40 dòng thay đổi tổng cộng
- Không ảnh hưởng pipeline backend

