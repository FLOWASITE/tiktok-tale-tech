

# Sửa lỗi Gợi ý chủ đề không khớp Brand đang chọn

## Nguyên nhân (đã verify trong code)

`src/pages/MultiChannelCreate.tsx` line 120–125:
```ts
useEffect(() => {
  if (currentBrand && !selectedBrandId) {     // ← chỉ chạy khi selectedBrandId rỗng
    setSelectedBrandId(currentBrand.id);
  }
}, [currentBrand, selectedBrandId]);
```

Hệ quả:
1. Lần đầu vào `/multichannel/new`, `selectedBrandId` được set theo `currentBrand` ✅
2. User đổi brand ở **header switcher toàn cục** → `BrandContext.currentBrand` đổi ✅
3. Nhưng vì `selectedBrandId` đã có giá trị (brand cũ), effect KHÔNG chạy lại → `selectedBrandId` giữ brand cũ ❌
4. `MultiChannelFormWizard` nhận `brandTemplateId={selectedBrandId}` (brand cũ) → `useEnhancedTopicSuggestions({brandTemplateId})` gọi `topic-ai` với brand cũ → backend cache key chứa brand cũ, TTL 24h → tiếp tục trả gợi ý của brand cũ ngay cả khi force refresh.

Cùng anti-pattern xuất hiện ở `MultiChannelFormStepper.tsx` line 251–257: auto-set default template nhưng KHÔNG sync lại khi `currentBrand` đổi (script form, các flow khác có thể dính tương tự).

Backend (`topic-ai`) đã filter đúng theo brand nhận được — log `[filterByBrandAndGoal] Brand: "Thuế Hộ by TAF.vn"` cho thấy nó nhận brand nào thì filter brand đó. Vấn đề 100% ở frontend gửi sai brand ID.

## Fix

### 1. `src/pages/MultiChannelCreate.tsx` — sync 2 chiều với BrandContext

Đổi effect line 120–125 thành sync mỗi khi `currentBrand.id` đổi:

```ts
useEffect(() => {
  if (currentBrand?.id && currentBrand.id !== selectedBrandId) {
    setSelectedBrandId(currentBrand.id);
    // Reset voice variant vì variant thuộc brand cũ
    setSelectedVoiceVariantId(undefined);
  }
}, [currentBrand?.id]);  // bỏ selectedBrandId khỏi deps để tránh loop
```

→ Khi user switch brand ở header, form tự động cập nhật + reset voice variant không hợp lệ.

### 2. `src/components/multichannel/MultiChannelFormWizard.tsx` — sync formData khi prop đổi

Effect line 548–553 hiện tại đã sync `brandTemplateId` từ prop vào `formData`. Bổ sung reset voice variant khi brand đổi:

```ts
useEffect(() => {
  if (brandTemplateId && brandTemplateId !== formData.brandTemplateId) {
    setFormData(prev => ({
      ...prev,
      brandTemplateId,
      brandVoiceVariantId: undefined,  // reset variant cũ
      productId: undefined,             // reset product cũ
    }));
  }
}, [brandTemplateId]);
```

### 3. `src/components/multichannel/MultiChannelFormStepper.tsx` — sync với `currentBrand`

Component này tự quản brand không qua prop, cần đọc `useCurrentBrand()` và sync:

```ts
import { useCurrentBrand } from '@/contexts/BrandContext';
const { currentBrand } = useCurrentBrand();

useEffect(() => {
  if (currentBrand?.id && currentBrand.id !== formData.brandTemplateId) {
    setFormData(prev => ({
      ...prev,
      brandTemplateId: currentBrand.id,
      brandVoiceVariantId: undefined,
      productId: undefined,
    }));
  }
}, [currentBrand?.id]);
```

Giữ logic auto-select default template như fallback khi không có `currentBrand`.

### 4. Backend cache key — bonus defense

`supabase/functions/topic-ai/index.ts` line 200, cache key đã chứa `brandTemplateId` nên không có vấn đề poisoning. Không cần sửa. Nhưng để chắc chắn user thấy kết quả mới ngay khi đổi brand, frontend `useTopicAI` đã có `useEffect` watch `brandTemplateId` (line 919–945) tự refetch khi prop đổi → fix #1+#2 sẽ trigger refetch tự động.

## Files sửa

| File | Thay đổi |
|---|---|
| `src/pages/MultiChannelCreate.tsx` | Sửa effect line 120–125: sync `selectedBrandId` mỗi khi `currentBrand.id` đổi (không chỉ khi rỗng); reset voice variant. |
| `src/components/multichannel/MultiChannelFormWizard.tsx` | Sửa effect line 548–553: khi prop `brandTemplateId` đổi, reset thêm `brandVoiceVariantId` + `productId` để tránh dùng dữ liệu brand cũ. |
| `src/components/multichannel/MultiChannelFormStepper.tsx` | Import `useCurrentBrand`; thêm effect sync `currentBrand.id` → `formData.brandTemplateId` (kèm reset variant/product); giữ auto-select default làm fallback. |

## Test sau khi sửa

1. Vào `/multichannel/new` với Brand A → gợi ý đúng A
2. Đổi sang Brand B ở header switcher → form/topic suggestions tự refetch + filter cho B (xem log `[filterByBrandAndGoal] Brand: "B"`)
3. Voice variant + product reset về placeholder
4. Đổi lại Brand A → gợi ý A (cache hit, instant)

## Ngoài phạm vi

- Không động đến backend `topic-ai` (logic filter đã đúng).
- Không sửa các form khác (script, carousel, ad-copy) trong phạm vi này — nếu user báo cùng triệu chứng ở form khác sẽ apply cùng pattern sau.
- Không clear cache `ai_response_cache` thủ công — entries cũ sẽ tự expire sau 24h hoặc bị overwrite khi key mới khớp.

## Rủi ro

Thấp. Effect chỉ trigger khi `currentBrand.id` thực sự đổi (so sánh với state hiện tại). Reset variant/product là hành vi mong đợi vì chúng thuộc brand cũ — user phải chọn lại cho đúng brand mới.

