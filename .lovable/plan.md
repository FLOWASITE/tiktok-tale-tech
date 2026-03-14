

## Phân tích: Tại sao 3 chế độ prompt trông giống nhau

### Kiểm tra code

Đã kiểm tra toàn bộ luồng từ frontend → edge function → prompt builder:

- **Frontend** (`SimpleImageGenerator.tsx`): Gửi `promptMode` đúng ('full' | 'brand_only' | 'raw')
- **Edge function** (`generate-brand-image/index.ts`): Nhận `promptMode` và truyền vào `buildImagePrompt()`
- **Prompt builder** (`image-prompt-builder.ts`): Có 3 nhánh if/else cho 3 mode

### Vấn đề phát hiện

**1. `brand_only` mode quá giống `full` mode về kết quả visual:**
- Vẫn thêm brand colors section đầy đủ (`buildColorSection`)
- Vẫn thêm full text-in-image section (`buildTextInImageSection` + `buildStructuredLayoutSection`)
- Chỉ thiếu channel specs, style preset, hook, persona, journey stage — nhưng những thứ này không ảnh hưởng nhiều đến hình ảnh cuối cùng

**2. `raw` mode quá giống `brand_only` về kết quả:**
- `raw` chỉ gửi `contentSummary` + aspect ratio, nhưng `contentSummary` đã chứa đủ thông tin context → model AI tự "đoán" phong cách tương tự
- Không có text-in-image hỗ trợ → người dùng không thấy text trên ảnh = khác biệt duy nhất rõ ràng

**3. Không có logging** → không verify được mode nào đang được dùng

### Giải pháp: Tăng khác biệt giữa 3 mode

#### File: `supabase/functions/_shared/image-prompt-builder.ts`

**1. RAW mode — thực sự raw:**
- Giữ nguyên logic hiện tại nhưng thêm instruction rõ: "Generate freely without brand constraints"
- Vẫn hỗ trợ text-in-image nếu user bật (hiện tại raw mode bỏ qua text hoàn toàn)

**2. BRAND_ONLY mode — giảm AI optimization rõ ràng:**  
- Thêm instruction: "DO NOT add artistic interpretations. Follow the user's description literally."
- Giữ brand colors nhưng dùng nhẹ hơn: "Subtly incorporate brand colors" thay vì "Use these colors prominently"
- Bỏ `buildStructuredLayoutSection` (layout phức tạp là AI optimization)

**3. FULL mode — thêm explicit creative freedom:**
- Thêm instruction: "You have full creative freedom to interpret and enhance the visual concept"
- Giữ nguyên logic hiện tại

#### File: `supabase/functions/generate-brand-image/index.ts`

**4. Thêm logging:**
```typescript
console.log(`[generate-brand-image] Prompt mode: ${promptMode || 'full (default)'}`);
```

### Tóm tắt thay đổi
- 2 files: `image-prompt-builder.ts` + `generate-brand-image/index.ts`
- Tăng khác biệt instruction giữa 3 mode để AI model tạo kết quả khác nhau rõ rệt
- Thêm logging để debug

