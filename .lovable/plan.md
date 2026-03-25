

# Cải tiến UI Form "Mục tiêu" trong GoalWizard

## Phân tích hiện tại

GoalWizard Step 0 ("Mục tiêu") hiện đã có đầy đủ các trường: Tên campaign, Mô tả, Key Messages, CTA chính, Phân bổ Pillars. Tuy nhiên tất cả **dồn vào 1 step duy nhất**, gây quá tải trên mobile (350px viewport). Các trường brief (Key Messages, CTA, Pillars) trộn lẫn với thông tin cơ bản.

## Kế hoạch cải tiến

### 1. Tách Step 0 thành 2 bước riêng biệt

**Step 0 — "Mục tiêu"** (giữ nguyên):
- Tên campaign (bắt buộc)
- Mô tả mục tiêu (textarea)
- Info box Strategy Agent

**Step 1 — "Nội dung" (MỚI)** (icon: `MessageSquare`):
- Key Messages (badge input, max 5)
- CTA chính
- Phân bổ Content Pillars (%) với sliders
- Label "Bước này tùy chọn" để user biết có thể bỏ qua

Các step sau dịch +1: Kênh → Chiến dịch → Tự động → Liên kết → Xác nhận (tổng 7 steps).

### 2. Cải thiện UI Key Messages

- Thêm AI suggestion chips: gọi edge function hoặc dùng static suggestions dựa trên `currentBrand.industry` để gợi ý 3-4 key messages mẫu (click để thêm nhanh)
- Placeholder rõ ràng hơn theo industry

### 3. Cải thiện UI Pillar Allocation

- Thêm thanh preview tổng hợp (stacked bar) hiển thị tỷ lệ phân bổ bằng màu sắc
- Hiển thị label "Tổng: 100%" với màu xanh/vàng feedback

### 4. Update STEPS array và step indices

- STEPS: 7 items thay vì 6
- `canNext()`: thêm case cho step 1 mới (luôn return true — tùy chọn)
- `confirmStep`: vẫn = STEPS.length - 1
- Tất cả `step === N` conditions dịch +1 cho steps sau "Nội dung"

### 5. Update Xác nhận step

- Hiển thị Key Messages, CTA, Pillars trong phần review (đã có, chỉ cần đảm bảo step index đúng)

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/agents/GoalWizard.tsx` | SỬA — tách step 0, thêm step "Nội dung", update indices, cải thiện UI pillars & key messages |

Không cần migration. Không cần file mới. Logic submit (`finalSubmit`) giữ nguyên.

