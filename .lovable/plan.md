
Mình đã rà code và nguyên nhân rất rõ: đây không phải do thiếu GeminiGen key. Secret `GEMINIGEN_API_KEY` đang có sẵn. Vấn đề là logic chọn model/provider ở backend chưa khớp với UI admin.

## Kết luận chính

1. `generate-brand-image` chỉ route sang GeminiGen khi `aiConfig.model` bắt đầu bằng `geminigen/`.
2. Nhưng backend `getAIConfig()` hiện chỉ đọc `ai_function_configs`, chưa đọc `ai_function_group_configs`.
3. Trong khi UI admin lại hiển thị “effective model” có tính cả group override. Kết quả là:
   - UI có thể đang hiện GeminiGen
   - nhưng runtime vẫn dùng model mặc định của Lovable AI
4. `generate-carousel-image` còn thiếu hơn:
   - chưa có nhánh `isGeminiGenModel(...)`
   - đang gọi `getAIConfig('generate-carousel-image')` mà không truyền `organizationId`, nên org override có thể bị bỏ qua
5. Nếu bạn chỉ “chọn provider GeminiGen” trong phần quản lý provider/API key thì cũng chưa đủ để đổi runtime. Chỗ đó hiện chủ yếu là lưu key, không tự ép các image function dùng GeminiGen.

## Kế hoạch sửa

### 1) Sửa backend resolve model để khớp với UI
Tạo logic resolve thống nhất trong `supabase/functions/_shared/ai-config.ts`:
- ưu tiên 1: function override (`ai_function_configs`)
- ưu tiên 2: group override (`ai_function_group_configs`)
- ưu tiên 3: default config

Đồng thời trả thêm metadata như:
- `resolvedFrom: individual | group | default`
- `resolvedModel`
- `resolvedProvider`

Mục tiêu: backend dùng đúng model mà admin đang thấy trên UI.

### 2) Sửa `generate-brand-image` để dùng resolved config đầy đủ
Trong `supabase/functions/generate-brand-image/index.ts`:
- thay phần lấy config hiện tại bằng resolved config mới
- log rõ:
  - org id
  - model được resolve
  - source của model (individual/group/default)
  - provider branch thực sự được dùng
- giữ nhánh GeminiGen hiện có, nhưng đảm bảo nó được kích hoạt khi chọn từ group/function config

### 3) Sửa `generate-carousel-image` để thực sự hỗ trợ GeminiGen
Trong `supabase/functions/generate-carousel-image/index.ts`:
- truyền đúng `organizationId` khi lấy config
- thêm nhánh `isGeminiGenModel(requestedModel)`
- dùng `generateImageViaGeminiGen(...)`
- chuẩn hóa error response giống `generate-brand-image` để UI không báo lỗi mơ hồ

Đây là file có khả năng cao đang làm bạn tưởng đã chọn GeminiGen nhưng thực tế không dùng.

### 4) Chặn UI gây hiểu nhầm
Cập nhật UI admin để người dùng không bị “thấy GeminiGen nhưng runtime không chạy GeminiGen”:
- `src/components/admin/ai/GroupDefaultsPanel.tsx`
- `src/components/admin/ai/AIFunctionConfig.tsx`
- có thể thêm chú thích rõ:
  - Provider Manager = nơi lưu API key
  - Model selection trên function/group mới là thứ quyết định runtime
- hiển thị “runtime source” rõ hơn: Individual / Group / Default

### 5) Giới hạn model theo đúng khả năng từng function
Không nên cho mọi image function dùng chung toàn bộ image models nếu backend chưa hỗ trợ:
- `generate-brand-image`: hỗ trợ GeminiGen
- `generate-carousel-image`: sẽ hỗ trợ GeminiGen sau khi sửa
- `edit-image-background`: cần kiểm tra và chỉ bật GeminiGen nếu flow edit phù hợp
- `overlay-brand-logo`, `generate-scene-thumbnail`: nếu chưa hỗ trợ GeminiGen thì phải ẩn GeminiGen khỏi picker của các function này, hoặc giữ cố định provider phù hợp

Mục tiêu: UI chỉ cho chọn những model thực sự chạy được.

## Files dự kiến thay đổi

- `supabase/functions/_shared/ai-config.ts`
- `supabase/functions/generate-brand-image/index.ts`
- `supabase/functions/generate-carousel-image/index.ts`
- `supabase/functions/edit-image-background/index.ts` (nếu mở GeminiGen cho edit)
- `src/components/admin/ai/GroupDefaultsPanel.tsx`
- `src/components/admin/ai/AIFunctionConfig.tsx`
- có thể thêm điều kiện ở picker/model registry UI để ẩn model không supported

## Kết quả sau khi sửa

- Chọn GeminiGen ở function/group sẽ thật sự chạy GeminiGen ở backend
- Carousel image không còn rơi sang Lovable AI do thiếu nhánh GeminiGen
- UI và runtime khớp nhau
- Không còn tình trạng “đã chọn provider GeminiGen nhưng model tạo ảnh vẫn không hoạt động đúng”

## Ghi chú kỹ thuật quan trọng
Hiện tại dấu hiệu mạnh nhất là lỗi kiến trúc config/routing, không phải lỗi thiếu secret:
- `GEMINIGEN_API_KEY` đang tồn tại
- nhưng backend image flow chưa resolve config giống UI
- và `generate-carousel-image` chưa support GeminiGen đầy đủ

