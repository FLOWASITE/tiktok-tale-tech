
## Đã check lại nguyên nhân
- `124/400` không phải do UI cắt ngắn. Nó là đúng độ dài string backend trả về.
- Tôi đã check request thật của `topic-ai` với `forceRefresh: true`: backend vẫn trả ra nhiều title dưới 150 ký tự, trong đó có đúng title bạn đang thấy.
- Code hiện tại **đã** có prompt `150-300 ký tự` và cache key `v12-title-150-300`, nên lỗi không còn là “quên sửa prompt” hay “cache cũ”.
- Lỗi thật là: backend chỉ **nhắc model** viết dài hơn, nhưng **không có lớp enforce sau khi model trả kết quả**.

## Plan sửa đúng chỗ

### 1. Thêm hard validation ở backend
Trong `supabase/functions/topic-ai/index.ts`:
- validate từng suggestion sau `parseTopicSuggestions()`
- rule:
  - `topic` phải từ **150-300 ký tự**
  - `reasoning` phải **>= 300 ký tự**
- log rõ độ dài từng item để dễ debug lần sau

### 2. Repair các title bị ngắn
Nếu AI trả ra item fail:
- chạy thêm 1 pass AI chỉ để **rewrite lại các `topic` lỗi**
- giữ nguyên intent/cấu trúc/topic subject, chỉ kéo title lên đúng **150-300 ký tự**
- item nào sửa xong vẫn fail thì loại khỏi kết quả

### 3. Siết chặt output format
Đổi action `suggest` sang structured output/tool-calling schema:
- `topic`: `minLength: 150`, `maxLength: 300`
- `reasoning`: `minLength: 300`
- vẫn giữ validator backend làm lớp chốt cuối, không tin model 100%

### 4. Vá luôn fallback ngắn
`getDefaultSuggestions()` hiện vẫn là title ngắn.
Tôi sẽ sửa fallback để kể cả khi AI lỗi/parsing lỗi thì title fallback cũng theo chuẩn **150-300 ký tự**, tránh tái diễn.

### 5. Thêm guard phía client
Trong `src/hooks/ai/useTopicAI.ts`:
- filter bỏ suggestion có `topic.length < 150` hoặc `> 300`
- nếu toàn bộ invalid thì báo lỗi/refresh lại, không render title ngắn ra UI

### 6. Giữ UI hiện tại nhưng thêm safeguard nhỏ
- `MAX_TOPIC_LENGTH = 400` đang đủ, không cần đổi thêm
- chỉnh nhẹ textarea ở:
  - `src/components/multichannel/MultiChannelFormWizard.tsx`
  - `src/components/multichannel/MultiChannelFormStepper.tsx`
- mục tiêu: title dài 150-300 ký tự không bị badge counter đè lên dòng cuối

## Files sẽ sửa
- `supabase/functions/topic-ai/index.ts`
- `src/hooks/ai/useTopicAI.ts`
- `src/components/multichannel/MultiChannelFormWizard.tsx`
- `src/components/multichannel/MultiChannelFormStepper.tsx`

## Kết quả sau khi làm
- Khung đỏ sẽ không còn hiện kiểu `124 ký tự` cho topic AI mới.
- Topic title được render ra sẽ có **tối thiểu 150 ký tự thật**, không phải kéo dài giả ở UI.
- Kể cả model trả sai, backend + client sẽ chặn không cho title ngắn lọt ra màn hình.
