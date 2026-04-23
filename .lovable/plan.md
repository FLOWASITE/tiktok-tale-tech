
Mục tiêu: đảm bảo hook/text ngắn trên ảnh luôn theo ngôn ngữ của brand, không bị lệch sang tiếng của nội dung gốc hay UI.

1. Kết luận hiện tại
- `src/lib/imageOverlayText.ts` chỉ chọn text từ:
  - `selectedHooks[channel].text_overlay`
  - `globalHook.text_overlay`
  - `opening_line`
  - hoặc `trimmed_summary` từ `channelContent`
- Nhưng helper này không biết brand đang dùng ngôn ngữ nào.
- `src/components/multichannel/MultiChannelFormWizard.tsx` và `src/hooks/useAutoImagePipeline.ts` chỉ kiểm tra “có short text hay không”, chưa kiểm tra “text đó có đúng ngôn ngữ brand không”.
- Backend `supabase/functions/generate-brand-image/index.ts` có nhận `country_code` để tối ưu render/localization, nhưng chỉ áp dụng sau khi text đã được chọn; nó không sửa việc chọn sai ngôn ngữ ở frontend.

2. Rủi ro đang xảy ra
- Nếu `selectedHooks` hoặc `globalHook` được tạo bằng ngôn ngữ khác brand, ảnh vẫn render text sai ngôn ngữ.
- Nếu fallback sang `trimmed_summary`, text trên ảnh sẽ bám theo nội dung channel hiện có, không nhất thiết theo ngôn ngữ brand.
- Debug hiện chỉ cho biết source/length, chưa cho biết text có “khớp ngôn ngữ brand” hay không.

3. Nguồn chuẩn để xác định ngôn ngữ brand
- Ưu tiên dùng `brandTemplate.country_code`.
- Map `country_code -> output language` bằng cùng logic hiện có:
  - frontend: `src/utils/countryLanguageMap.ts`
  - backend/shared: `supabase/functions/_shared/country-language-map.ts`
- Quy ước:
  - `VN -> vi`
  - `TH -> th`
  - còn lại fallback `en` hoặc mapping hiện có của project

4. Sửa helper chọn overlay text theo ngôn ngữ brand
- File: `src/lib/imageOverlayText.ts`
- Mở rộng `ResolveOverlayTextInput` thêm:
  - `brandLanguage?: string`
  - `brandCountryCode?: string`
- Thêm lớp đánh giá text candidate:
  - detect ngôn ngữ thô theo script/heuristic
  - `vi`: có dấu tiếng Việt / ký tự `đ, ă, â, ê, ô, ơ, ư`
  - `th`: có ký tự Thai Unicode
  - `en`: ASCII Latin là chủ đạo
- Quy tắc chọn:
  1. ưu tiên candidate ngắn + đúng ngôn ngữ brand
  2. nếu candidate ngắn nhưng sai ngôn ngữ → không dùng ngay
  3. chỉ fallback `trimmed_summary` nếu summary cũng khớp ngôn ngữ brand
  4. nếu không có text đúng ngôn ngữ brand → suppress và downgrade `background_only`
- Bổ sung metadata mới trong result:
  - `languageMatch: boolean`
  - `detectedLanguage?: string`
  - `reason` thêm case như:
    - `language_mismatch`
    - `no_short_hook_in_brand_language`

5. Sửa auto flow để không render hook sai ngôn ngữ
- File: `src/components/multichannel/MultiChannelFormWizard.tsx`
- Khi gọi `resolveOverlayText`, truyền `brandTemplate?.country_code`.
- `hasAnyShortOverlayText` chỉ tính là `true` nếu:
  - text hợp lệ
  - và match ngôn ngữ brand
- Kết quả:
  - nếu content có text ngắn nhưng sai ngôn ngữ brand, pipeline sẽ chọn `background_only` thay vì render sai.

6. Sửa pipeline truyền đúng context ngôn ngữ
- File: `src/hooks/useAutoImagePipeline.ts`
- Khi build `overlayTextResults`, truyền `brandCountryCode` hoặc `brandLanguage`.
- Chỉ đưa text vào:
  - `textsPerChannel`
  - `sharedTextToInclude`
  nếu text match ngôn ngữ brand.
- Nếu không channel nào có text đúng ngôn ngữ brand:
  - `effectiveImageContentType = 'background_only'`
  - `useCanvasFallback` không bật cho main headline text
- Điều này giữ footer/logo bình thường nhưng chặn hook sai ngôn ngữ.

7. Sửa manual flow để đồng bộ với auto flow
- File: `src/components/multichannel/SimpleImageGenerator.tsx`
- Manual generator hiện có `countryCode` cho prompt preview, nhưng cần dùng chính country đó khi chọn overlay text.
- Áp dụng cùng helper/logic để:
  - manual và auto đều chọn short hook theo brand language
  - không còn case manual đúng mà auto sai, hoặc ngược lại

8. Tăng guard ở `useAutoImageGeneration.ts`
- File: `src/hooks/useAutoImageGeneration.ts`
- Hiện hook chỉ validate độ dài bằng `isValidOverlayText`.
- Cần bổ sung guard theo metadata từ resolver:
  - nếu `languageMatch === false` thì coi như `channelText = undefined`
  - `effectiveContentType` tự downgrade sang `background_only`
- Đồng thời mở rộng `RenderDebugInfo.overlayText`:
  - `detectedLanguage?: string`
  - `brandLanguage?: string`
  - `languageMatch?: boolean`

9. Cập nhật debug UI để nhìn ra lỗi ngay
- File: `src/components/ui/RenderDebugTimeline.tsx`
- Bổ sung dưới mục “Overlay text”:
  - Brand language: `vi/th/en/...`
  - Detected language: `vi/th/en/...`
  - Language match: yes/no
  - Reason nếu bị suppress vì lệch ngôn ngữ
- Mục tiêu:
  - bấm vào ảnh là biết text bị bỏ vì quá dài hay vì sai ngôn ngữ brand.

10. Tăng lớp bảo vệ ở backend
- File: `supabase/functions/generate-brand-image/index.ts`
- Backend hiện đã có `country_code`, nhưng chưa xác minh `textToInclude` có khớp ngôn ngữ market không.
- Thêm normalize/guard trước khi build prompt:
  - nếu `textToInclude` không khớp language mong muốn từ `country_code`
  - bỏ `textToInclude`
  - downgrade `imageContentType` sang `background_only`
- Mục tiêu:
  - kể cả frontend truyền nhầm, backend vẫn không ép AI render sai ngôn ngữ.

11. Cách xử lý trường hợp thiếu hook đúng ngôn ngữ
- Không auto dịch hook trong bước này nếu chưa có luồng dịch chuẩn của project.
- Hành vi an toàn:
  - không có hook ngắn đúng ngôn ngữ brand → không render main text
  - vẫn giữ visual sạch + logo + footer
- Điều này tốt hơn render hook sai ngôn ngữ lên ảnh.

12. File cần sửa
- `src/lib/imageOverlayText.ts`
- `src/components/multichannel/MultiChannelFormWizard.tsx`
- `src/hooks/useAutoImagePipeline.ts`
- `src/hooks/useAutoImageGeneration.ts`
- `src/components/multichannel/SimpleImageGenerator.tsx`
- `src/components/ui/RenderDebugTimeline.tsx`
- `supabase/functions/generate-brand-image/index.ts`

13. Tiêu chí nghiệm thu
- Brand `country_code = VN`:
  - hook/text ngắn trên ảnh phải là tiếng Việt hoặc bị suppress
- Brand `country_code = TH`:
  - hook/text ngắn trên ảnh phải là tiếng Thái hoặc bị suppress
- Brand `country_code = US/SG/...`:
  - hook/text ngắn trên ảnh phải là tiếng Anh hoặc bị suppress
- Không còn case:
```text
brand VN nhưng ảnh render headline EN
brand TH nhưng ảnh render headline VI
```
- Render Debug Timeline phải trả lời được:
  - ngôn ngữ brand là gì?
  - text được detect là ngôn ngữ gì?
  - có match không?
  - nếu không match thì ảnh đã downgrade sang `background_only` chưa?
