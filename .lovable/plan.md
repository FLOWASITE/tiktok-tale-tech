

# Đơn giản hóa flow: Bỏ nút "Tạo ảnh" riêng, auto-advance sau khi tạo content

## Hiện tại (6 bước)
```text
Step 1: Chủ đề → Step 2: Core Content → Step 3: Vai trò → Step 4: Đa kênh
                                                              ↓
                                                    [Tạo X kênh] + [Tạo ảnh →]  ← 2 nút riêng
                                                              ↓
                                                Step 5: Kiểm soát AI (cho ảnh)
                                                              ↓
                                                Step 6: Tạo ảnh
```

## Đề xuất mới (5 bước)
```text
Step 1: Chủ đề → Step 2: Core Content → Step 3: Vai trò → Step 4: Đa kênh
                                                              ↓
                                                    [Tạo X kênh] ← chỉ 1 nút
                                                              ↓
                                              (auto-advance khi content xong)
                                                              ↓
                                                Step 5: Tạo ảnh (gộp AI Control vào)
```

## Thay đổi

### 1. Gộp Step 5 + Step 6 thành 1 step "Tạo ảnh"
- Giảm `STEPS` từ 6 xuống 5
- Step 5 mới = gộp "Kiểm soát AI" (chọn mode: full/brand_only/raw) + UI tạo ảnh vào cùng 1 trang
- Chọn mode ở trên, nút tạo ảnh ở dưới

### 2. Bỏ nút "Tạo ảnh" riêng ở Step 4
- Step 4 chỉ còn 1 nút: "Tạo (X kênh)"
- Sau khi generation hoàn tất → auto-advance sang Step 5 (Tạo ảnh)

### 3. Auto-advance logic
- Sửa useEffect `generationComplete`: advance từ Step 4 → Step 5 (thay vì 4→5 cũ)
- Tất cả reference `currentStep === 6` → đổi thành `=== 5`
- `currentStep === 5` cũ (AI Control) → gộp UI vào step mới

### Files cần sửa
- `src/components/multichannel/MultiChannelFormWizard.tsx` — gộp step, bỏ nút, sửa navigation logic

