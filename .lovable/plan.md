## Vấn đề

Hiện tại topic chỉ được lưu vào `topic_history` khi người dùng đi từ **Topics Hub** (có sẵn `topicHistoryId`). Khi tạo trực tiếp từ trang Carousel/Script/Multichannel, topic không vào Kho → người dùng nghĩ "Kho chủ đề không lưu".

## Giải pháp

Thêm 1 helper chung `ensureTopicInHistory()` trong `src/hooks/useTopicHistory.ts`, dùng ở 3 flow generate. Logic:

1. Nếu form đã có `topicHistoryId` → dùng `createLink` như cũ (giữ behavior hiện tại).
2. Nếu chưa có → tìm record cũ trong `topic_history` theo `(organization_id || user_id) + brand_template_id + lower(trim(topic))`. 
   - **Có**: dùng lại `id`, gọi `markAsUsed` + `createLink`.
   - **Không**: insert mới với `usage_status='created'`, `was_used=true`, `format` phù hợp, rồi `createLink`.

## Thay đổi cụ thể

### 1. `src/hooks/useTopicHistory.ts`
- Export hàm độc lập `findOrCreateTopic({ topic, format, contentGoal, brandTemplateId, userId, organizationId })` trả về `topicHistoryId`.
- Dùng `select id` với filter case-insensitive (`.ilike('topic', topic.trim())` + so sánh chính xác sau khi fetch để tránh false match).

### 2. `src/pages/Carousel.tsx` (handleGenerateCarousel)
- Khi `newCarousel` thành công và **không có** `formData.topicHistoryId`:
  - Gọi `findOrCreateTopic({ topic: formData.topic, format: 'carousel', contentGoal: formData.contentGoal ?? 'engagement', brandTemplateId: currentBrand?.id, ... })`.
  - Sau đó gọi `createLink(id, newCarousel.id, 'carousel', title, status)` và `markAsUsed(id, newCarousel.id, 'carousel')`.

### 3. Script flow
- Tìm điểm gọi sau khi tạo script thành công (page `ScriptNew.tsx` / hook `useScripts` — sẽ xác định khi build). Áp dụng cùng pattern với `format: 'script'`.

### 4. Multichannel flow
- Trong handler submit của `CoreContentPage` / `MultiChannelFormWizard` callsite, sau khi tạo content thành công và không có `topicHistoryId`, gọi `findOrCreateTopic` với `format: 'multichannel'` + `createLink`.

## Acceptance

- Tạo carousel từ /carousel với topic mới → vào Kho chủ đề (tab "Tất cả" hoặc "Recent") với status `created`, có link tới carousel.
- Tạo lại carousel với topic trùng (case-insensitive, trim) → KHÔNG tạo entry mới; carousel mới được link vào entry cũ; entry cũ cập nhật `used_at`.
- Flow đi từ Topics Hub (có `topicHistoryId`) vẫn hoạt động như trước (không regression).
- Áp dụng tương tự cho Script + Multichannel.

## Out of scope

- Không đổi schema `topic_history`.
- Không đổi UI Kho chủ đề.
- Không backfill các content cũ chưa có topic link.
