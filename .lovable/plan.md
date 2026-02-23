

# Nghien cuu giai phap toi uu trai nghiem tao noi dung Multichannel - Giam cam giac cho doi

## 1. Phan tich hien trang (Current Pipeline)

### Quy trinh hien tai - Tuan tu (Sequential)

```text
[User]
  |
  v
Step 1: Nhap Topic + Chon Brand (manual)
  |
  v
Step 2: Tao Core Content (streaming, ~20-40s)
  |  - User PHAI DOI xong moi tiep
  v
Step 3: Chon Role (manual)
  |
  v
Step 4: Chon Channels + Generate Multichannel (streaming SSE, ~40-90s tuy so kenh)
  |  - User thay streaming text tung kenh
  |  - PHAI DOI xong tat ca kenh
  v
Step 5: Xem ket qua → Mo SimpleImageGenerator → Tao anh (120s/kenh, tuan tu batch)
  |  - User PHAI CHU DONG mo dialog tao anh
  |  - Moi kenh mat 60-120s (KIE polling 30 vong x 4s)
  v
[XONG]
```

### Thoi gian thuc te cho user doi:
- Core Content: **20-40s** (co streaming)
- Multichannel: **40-90s** (co streaming, tot)
- Anh: **60-120s/kenh x N kenh** (CHUA CO streaming, user phai tu bat)

**Tong: 3-10 phut** cho 1 bo noi dung day du (text + anh)

### Diem gay uc che chinh:

1. **Anh khong tu dong tao** - User phai tu mo dialog, chon kenh, bam nut → them 3-5 buoc manual
2. **Anh tao tuan tu** - 5 kenh = 5-10 phut doi them
3. **Khong co feedback khi tao anh** - Chi co spinner, khong biet AI dang lam gi
4. **Buoc Core Content chan buoc Multichannel** - Phai doi xong moi di tiep
5. **Sau khi tao xong multichannel, trang chuyen sang view content** - Mat context, phai navigate lai de tao anh

---

## 2. Giai phap de xuat

### Giai phap A: Auto Image Generation Pipeline (Khuyen nghi - ROI cao nhat)

Sau khi multichannel content duoc tao xong, **tu dong bat dau tao anh cho tat ca kenh** ma khong can user lam gi.

```text
[Multichannel hoan thanh]
  |
  v  (tu dong, khong can click)
[Auto-trigger image generation cho tat ca kenh]
  |
  ├── Facebook: generating... ✓ done (60s)
  ├── Instagram: generating... ✓ done (65s)  ← chay song song
  ├── LinkedIn: generating... ✓ done (58s)   ← chay song song
  └── ...
  |
  v
[User thay anh hien len tung kenh trong real-time]
```

**Loi ich:**
- User khong can lam them bat ky buoc nao
- Anh bat dau tao ngay khi co noi dung
- Song song hoa: 3-4 kenh cung luc → tong thoi gian giam 3-4x

### Giai phap B: Streaming Visual Feedback cho Image Generation

Hien tai `SimpleImageGenerator` chi hien spinner. Can them:
- Hien prompt dang duoc su dung
- Hien trang thai polling (vong 5/30...)
- Hien anh ngay khi co (progressive rendering)
- Hien thoi gian da troi va uoc tinh con lai

### Giai phap C: Background Generation voi Toast Notification

Cho phep user tiep tuc lam viec khac (tao content moi, xem content cu) trong khi anh dang duoc tao. Hien toast khi moi anh hoan thanh.

### Giai phap D: Prefetch/Warm-up API

Khi user dang o buoc chon channel (Step 4), bat dau "warm up" KIE/PoYo API de giam latency khi thuc su tao anh.

---

## 3. Ke hoach ky thuat chi tiet

### Phase 1: Auto Image Generation sau Multichannel (Giai phap A)

**1.1 Tao hook `useAutoImagePipeline`**
- Sau khi `generate-multichannel` tra ve ket qua, tu dong goi `useAutoImageGeneration.generateAllImages()`
- Su dung V3 Suggestion Engine de tu dong chon style tot nhat (khong can user chon)
- Batch size = 3 (song song 3 kenh)

**1.2 Cap nhat `MultiChannelCreate.tsx`**
- Sau `handleGenerate` thanh cong → tu dong trigger image pipeline
- Chuyen sang trang view content voi image progress overlay

**1.3 Cap nhat `CreatePreviewPanel.tsx`**
- Them phase "Dang tao anh..." sau khi text hoan thanh
- Hien `ImageStreamingGrid` truc tiep trong preview panel

### Phase 2: Visual Feedback tot hon (Giai phap B)

**2.1 Cap nhat `ImageStreamingCard.tsx`**
- Hien elapsed time (da chay 45s...)
- Hien trang thai cu the (Dang gui request → Cho AI xu ly → Dang tai anh)
- Animation skeleton co gradient shimmer

**2.2 Them progress notification**
- Toast moi khi 1 kenh hoan thanh: "Facebook ✓ - Da tao anh"
- Summary toast khi tat ca xong: "5/5 kenh da co anh"

### Phase 3: Background Mode (Giai phap C)

**3.1 Tich hop vao `useBackgroundGeneration`**
- Them task_type: 'image_generation'
- Realtime subscription de cap nhat UI
- User co the navigate di noi khac va quay lai

**3.2 Floating Progress Indicator**
- Nut nho o goc man hinh hien so anh dang tao
- Click vao de xem chi tiet

---

## 4. Thu tu uu tien

| STT | Giai phap | Do kho | Tac dong UX | Thoi gian |
|-----|-----------|--------|-------------|-----------|
| 1 | A: Auto Image Generation | Trung binh | Rat cao | 2-3 gio |
| 2 | B: Visual Feedback | Thap | Cao | 1-2 gio |
| 3 | C: Background Mode | Cao | Trung binh | 3-4 gio |
| 4 | D: Warm-up API | Thap | Thap | 30 phut |

**Khuyen nghi:** Bat dau voi **Phase 1 (Auto Image)** + **Phase 2 (Visual Feedback)** vi chung mang lai tac dong lon nhat voi do phuc tap hop ly.

---

## 5. Ket qua ky vong

### Truoc:
- User phai: Tao text (90s) → Mo dialog anh → Chon kenh → Bam tao → Doi 120s/kenh
- Tong: **5-10 phut** + 5 buoc manual

### Sau:
- User chi can: Tao text (90s) → Anh tu dong tao song song
- Tong: **2-3 phut** + 0 buoc manual cho anh
- Giam **60-70% thoi gian** va **100% thao tac manual** cho phan tao anh

