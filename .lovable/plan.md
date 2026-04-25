## 🎯 Mục tiêu
Tự động xóa ảnh và video cũ hơn **7 ngày** để tiết kiệm dung lượng storage, đồng thời **thông báo cho user** biết về chính sách này.

---

## 🛠️ Backend: Edge Function + Cron

### 1. Tạo Edge Function `cleanup-old-media`
Chạy mỗi ngày lúc 03:00 UTC, quét và xóa:

| Bảng | Điều kiện xóa |
|---|---|
| `channel_image_history` | `created_at < now() - 7 days` AND `is_selected = false` |
| `carousel_images` | `created_at < now() - 7 days` AND `is_selected = false` |
| `video_generations` | `created_at < now() - 7 days` AND `status IN ('completed','failed')` |

**Logic:**
- Xóa file trong storage bucket trước (`carousel-images`, etc.) bằng cách parse URL.
- Sau đó xóa record trong DB.
- Log tổng số xóa + dung lượng giải phóng vào console.
- Giữ lại ảnh `is_selected = true` (ảnh user đang dùng) — **vĩnh viễn**, không xóa.

> **Lưu ý:** Đã có sẵn function `cleanup-old-images` cũ (default 30 ngày, dry-run). Tôi sẽ tạo function mới `cleanup-old-media` để bao gồm cả video, hard-code 7 ngày, không cần dry-run.

### 2. Schedule cron job
Dùng `pg_cron` + `pg_net` chạy hàng ngày:
```sql
select cron.schedule(
  'cleanup-old-media-daily',
  '0 3 * * *',  -- 03:00 UTC mỗi ngày
  $$ select net.http_post(...) $$
);
```

---

## 📢 Frontend: Thông báo cho user

### Vị trí hiển thị (3 chỗ — minimal, không phiền):

**A. Banner nhỏ trong View Content Đa kênh + Carousel**
- Text: *"💡 Ảnh và video tự động xóa sau 7 ngày. Tải về nếu muốn giữ lại."*
- Style: 1 dòng `text-xs text-muted-foreground` + icon Info, dismissable (lưu `localStorage`).

**B. Tooltip ở nút "Tạo ảnh AI" / "Tạo video"**
- Hover hiện: *"Lưu ý: Ảnh/video sẽ tự động xóa sau 7 ngày."*

**C. Footer note ở dialog Image/Video Generator**
- 1 dòng cuối dialog: *"⏰ Media cũ hơn 7 ngày sẽ được dọn dẹp tự động."*

### Optional: thông báo lần đầu (toast)
Lần đầu user vào trang Content/Carousel sau khi deploy, hiện toast giới thiệu policy 1 lần (lưu flag `localStorage`).

---

## 📁 Files affected

**New:**
- `supabase/functions/cleanup-old-media/index.ts` — edge function chính
- Migration SQL — schedule pg_cron job

**Edited:**
- `src/components/MultiChannelViewer.tsx` — thêm banner notice
- `src/components/carousel/CarouselViewer.tsx` (hoặc tương đương) — thêm banner notice  
- `src/components/multichannel/SimpleImageGenerator.tsx` — footer note
- `src/components/VideoGenerationDialog.tsx` (nếu có) — footer note

---

## ✅ Kết quả
- Storage được dọn dẹp tự động → tiết kiệm chi phí.
- Ảnh user đang dùng (`is_selected=true`) **không bao giờ bị xóa**.
- User được thông báo rõ ràng ở 3 điểm chạm — không cần đọc docs.
