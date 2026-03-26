
Mục tiêu: sửa để 2 nút **Giữ brand / Toàn quyền** tạo ra khác biệt rõ ràng trong Manual Mode (không chỉ đổi highlight UI).

1) Nguyên nhân chính đã thấy trong code
- `promptMode` có đổi ở UI, nhưng hiệu ứng thực tế đang “mờ” nên user cảm giác không hoạt động.
- Trong `useAutoImagePipeline.ts`, `includeLogo` đang set giống nhau cho mọi mode:
  - `mode === 'brand_only' ? !!brandLogoUrl : !!brandLogoUrl`
  - Kết quả: `raw` vẫn bị overlay logo như mode khác → khác biệt bị mất.
- Pipeline vẫn chạy logic chọn style V3 trước cả khi không phải `full` (tạo cảm giác mode nào cũng giống nhau).
- Manual generation hiện chưa tốt cho so sánh mode vì state ảnh/progress dễ bị reset theo lượt tạo.

2) Kế hoạch sửa (3 file)

A. `src/hooks/useAutoImagePipeline.ts` (fix hành vi mode ở backend pipeline)
- Chuẩn hóa rule theo mode:
  - `full`: dùng V3 style + role/angle + logo (nếu có).
  - `brand_only`: giữ brand (logo + màu), bỏ strategic directives nặng.
  - `raw`: **tắt hoàn toàn logo overlay** (`includeLogo=false`, `logoUrl=undefined`), không style/strategy từ brand.
- Chỉ chạy `suggestImageStylesV3` khi `mode === 'full'`.
- Đảm bảo `genOptions.promptMode` luôn nhận đúng mode từ Step 5.

B. `src/hooks/useAutoImageGeneration.ts` (fix trạng thái manual để không “ảo giác không đổi”)
- Thêm cơ chế generate dạng additive cho manual single-channel:
  - Không reset toàn bộ `generatedImages/progress` khi chỉ tạo 1 kênh.
- Lưu metadata mode cho mỗi ảnh (ví dụ `promptModeUsed`) để UI biết ảnh hiện tại được tạo bằng mode nào.

C. `src/components/multichannel/MultiChannelFormWizard.tsx` (làm khác biệt mode thấy ngay)
- Dưới cụm 3 nút mode, thêm khối mô tả “Mode hiện tại” (rõ ràng: bật/tắt logo, mức AI can thiệp, mức bám brand).
- Ở mỗi card kênh manual:
  - Hiển thị badge mode của ảnh hiện tại (nếu đã có ảnh).
  - Nếu user đổi mode khác với mode ảnh hiện tại, hiện cảnh báo ngắn: “Đã đổi mode, bấm Tạo lại để áp dụng.”
- Giữ nguyên flow manual hiện tại (không điều hướng ra ngoài).

3) Tiêu chí nghiệm thu (E2E)
- Chọn `Giữ brand` rồi tạo ảnh: ảnh có dấu hiệu giữ nhận diện brand.
- Chuyển `Toàn quyền` rồi `Tạo lại`: ảnh đổi theo mode mới, **không còn logo overlay tự động**.
- Badge mode trên card cập nhật đúng theo ảnh mới.
- Manual mode vẫn tạo từng kênh độc lập, UI không biến mất sau mỗi lượt tạo.
