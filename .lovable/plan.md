

## Khắc phục: Ảnh AI không tạo nhân vật người Việt cho brand Việt Nam

### Nguyên nhân
Code hiện tại **đã có** logic truyền `country_code` từ brand template vào prompt tạo ảnh. Tuy nhiên, phần chỉ dẫn về diện mạo nhân vật (`HUMAN CHARACTER APPEARANCE`) được đặt **ở cuối prompt** (sau 7-8 section khác), khiến AI model dễ bỏ qua hoặc ưu tiên thấp. Ngoài ra, ngôn ngữ chỉ dẫn chưa đủ mạnh để bắt buộc model tuân thủ.

### Giải pháp

**File: `supabase/functions/_shared/image-prompt-builder.ts`**

1. **Di chuyển phần country character lên đầu prompt** -- ngay sau "ARTICLE CONTENT CONTEXT", trước các section khác. Vị trí đầu prompt có trọng số cao hơn với AI model.

2. **Tăng cường ngôn ngữ chỉ dẫn** -- dùng từ mạnh hơn, lặp lại yêu cầu, thêm negative prompt tự động:

```
## MANDATORY CHARACTER ETHNICITY (DO NOT IGNORE):
ALL human characters MUST be Vietnamese people.
- Vietnamese facial features, black hair, warm skin tone
- Vietnamese cultural context, local fashion style
- Vietnamese urban/rural settings, tropical greenery
- DO NOT use Western/Caucasian or other non-Vietnamese faces
- This is a STRICT requirement for brand authenticity
```

3. **Thêm reminder ở cuối prompt** -- lặp lại yêu cầu ethnicity một lần nữa ở cuối để tăng tuân thủ (sandwich technique).

### Chi tiết kỹ thuật

- Sửa hàm `buildCountryCharacterSection()` (dòng 706-718): tăng cường nội dung và thêm negative instruction
- Sửa hàm `buildImagePrompt()` (dòng 792-793): di chuyển lời gọi `buildCountryCharacterSection(countryCode)` lên ngay sau dòng 758 (sau CHANNEL section, trước BRAND section)
- Thêm reminder cuối prompt: "REMINDER: All people must be [ethnicity]"

