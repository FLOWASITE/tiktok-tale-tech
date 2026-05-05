Kết luận nhanh: lỗi này KHÔNG phải do tài khoản Alibaba hết token. Log backend cho thấy request `generate-character` đang gọi Lovable Gateway và bị 402 ở đó:

```text
Function: generate-character, Model: google/gemini-3-flash-preview
Primary provider: lovable
Using Lovable AI Gateway (default)
Lovable Gateway error: 402 Not enough credits
```

Nguyên nhân trực tiếp: trong database đang có cấu hình riêng cho `generate-character`:

```text
generate-character -> model_override = google/gemini-3-flash-preview
```

Cấu hình riêng này đang đè lên cấu hình nhóm text:

```text
text group -> model_override = qwen-plus
```

Vì model `google/gemini-3-flash-preview` được map sang Lovable Gateway, nên hệ thống báo hết credits của Lovable, không liên quan Alibaba.

Ngoài ra, `generate-character-image` hiện vẫn đang gọi Lovable Gateway trực tiếp trong code, chưa đi qua routing provider chung. Nếu admin chọn model ảnh khác như `geminigen/nano-banana-pro`, function này cũng có nguy cơ không tôn trọng đúng provider/user config.

Kế hoạch sửa:

1. Sửa cấu hình runtime cho `generate-character`
   - Bỏ hoặc thay `model_override = google/gemini-3-flash-preview` của `generate-character`.
   - Để function kế thừa group text `qwen-plus`, hoặc set thẳng:
     - `model_override = qwen-plus`
     - `force_provider = dashscope`
   - Kết quả mong muốn: log phải thành `Primary provider: dashscope`, không còn `lovable`.

2. Sửa message lỗi của `generate-character`
   - Không hiển thị câu “Hết quota AI / nạp credits” chung chung khi provider thực tế không phải Lovable.
   - Trả về lỗi rõ hơn, ví dụ:
     - `Provider: dashscope`
     - `Model: qwen-plus`
     - `traceId`
   - Nếu lỗi đến từ Lovable thì mới nói Lovable credits; nếu từ DashScope thì nói API key/billing/rate limit của Alibaba.

3. Sửa `generate-character-image` để tôn trọng user/admin config
   - Không fetch cứng sang Lovable Gateway như hiện tại.
   - Với image model thuộc Gemini/Lovable thì dùng Lovable-compatible path.
   - Với model image thuộc provider khác như `geminigen/*` hoặc KIE/PoYo nếu đang có integration tương ứng, route theo provider config thay vì gọi sai endpoint.
   - Nếu model chưa được hỗ trợ bởi function ảnh nhân vật, trả lỗi cấu hình rõ ràng thay vì báo quota sai.

4. Kiểm tra sau sửa
   - Gọi test `generate-character` và kiểm tra log có:
     ```text
     resolved model=qwen-plus
     Primary provider: dashscope
     Using user's dashscope API key
     ```
   - Gọi lại flow tạo nhân vật trên UI, đảm bảo không còn toast “Hết quota AI...” từ Lovable khi đang dùng Alibaba.
   - Kiểm tra `generate-character-image` riêng để xác nhận model ảnh nhân vật đang route đúng provider hoặc báo đúng lỗi cấu hình.

Nếu bạn approve, tôi sẽ thực hiện ngay theo hướng: ưu tiên `generate-character` dùng `qwen-plus` qua Alibaba/DashScope, đồng thời sửa `generate-character-image` để không gọi Lovable cứng nữa.