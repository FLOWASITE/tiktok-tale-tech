Mình đã kiểm tra nhanh và thấy đúng lỗi:

- Request đầu tiên lên `topic-ai` chỉ có `clusterId`, chưa có `targetKeywords` vì frontend gọi gợi ý trước khi hook resolve keyword text xong.
- Request sau đó có `targetKeywords`, ví dụ `ai viết content tiktok`, `ai viết caption facebook`, nhưng response vẫn trả cache cũ không bám keyword.
- Nguyên nhân backend: cache key đang dùng `hashContextData({ c, kw })`, nhưng hàm này chỉ hash cấu trúc brand context, không hash field `c/kw`, nên nhiều bộ keyword khác nhau có thể trùng cache và trả lại gợi ý cũ.

Kế hoạch fix:

1. Sửa frontend SEO-mode để không fetch topic suggestion quá sớm
   - Trong `MultiChannelFormWizard.tsx`, lấy thêm trạng thái loading từ `useKeywordsByIds`.
   - Khi `entryMode === 'seo'` và đã chọn keyword ID nhưng keyword text chưa resolve xong, tạm disable `useEnhancedTopicSuggestions`.
   - Chỉ gọi `topic-ai` khi đã có `targetKeywordsText`, tránh request đầu tiên chỉ có pillar.

2. Tăng độ rõ UI để người dùng biết gợi ý đang bám keyword nào
   - Truyền context SEO xuống `TopicIdeaHub` / `TopicSuggestionPanel` hoặc hiển thị ngay trên khối “Ý tưởng chủ đề”.
   - Thêm dòng nhỏ dạng: `Đang gợi ý theo 3 keyword: ai viết content tiktok, ai viết caption facebook, ...`.
   - Khi keyword đổi, show loading/refresh rõ ràng để không nhìn nhầm cache cũ.

3. Sửa backend cache key của `topic-ai`
   - Trong `supabase/functions/topic-ai/index.ts`, thay phần hash SEO bằng một hash local ổn định dựa trên chính `clusterId + sorted targetKeywords`.
   - Không sửa `_shared/topic-utils.ts` để tránh ảnh hưởng rộng các function khác.
   - Bump cache version từ `topic-suggestions-v15-seo` sang version mới để bỏ cache sai hiện tại.

4. Chặn kết quả cache không khớp keyword
   - Với request có `targetKeywords`, backend sẽ dùng cache key mới riêng theo keyword.
   - Prompt hiện đã có rule bắt buộc bám keyword; sau khi cache đúng, AI sẽ nhận đúng context.
   - Có thể thêm log rõ hơn: `targetKeywords=[...] seoHash=... source=cache|ai` để debug sau này.

5. Kiểm tra lại luồng
   - Chọn Pillar → auto Top keyword → “Ý tưởng chủ đề” chỉ tải sau khi keyword text sẵn sàng.
   - Đổi/bỏ keyword → request mới có `targetKeywords` tương ứng.
   - Response không còn lấy cache của pillar-only.
   - Tooltip/card gợi ý hiển thị `relatedKeywords` bám keyword đã chọn.