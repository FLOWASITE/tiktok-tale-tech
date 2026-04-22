

# Telegram: Kết quả tạo bài rõ ràng & đầy đủ hơn

## Vấn đề hiện tại

Sau khi bot tạo xong 1 bài, message trả về chỉ có:
```
✅ Đã tạo 1 bài cho Facebook
📌 Brand: <tên>
🎨 Đang tạo ảnh trong nền…

<preview 220 ký tự>
```

Thiếu: tiêu đề bài (chỉ thấy preview), độ dài thật, số hashtag, trạng thái ảnh khi xong, link mở web app (ngoài Mini App), không cho user "tạo lại / đổi kênh" nhanh.

## Mục tiêu

Tin nhắn kết quả phải trả lời 4 câu hỏi user thường thắc mắc ngay khi nhận:
1. **Tiêu đề là gì?** (topic AI sinh)
2. **Bài dài bao nhiêu, có hashtag/CTA không?** (số liệu nhanh)
3. **Ảnh có hay không?** (cập nhật khi xong, không chỉ "đang tạo")
4. **Mở ở đâu để duyệt/đăng?** (Mini App + web app)

## Thay đổi

### 1. Format message kết quả mới (file `telegram-webhook/index.ts`, hàm `handleGenerateSingle` dòng 1488-1509)

Layout mới:
```
✅ Bài Facebook đã sẵn sàng

📝 <Tiêu đề (effectiveTopic, in đậm)>
📌 Brand: <name> · 📍 <industry nếu có>

📊 ~<N> từ · <H> hashtag · <emoji có/không CTA>
🎨 Ảnh: ⏳ đang tạo (sẽ báo khi xong)

━━━━━━━━━
<preview ~280 ký tự, italic>
━━━━━━━━━
```

Helper `summarizeContent(text)` trả về `{ wordCount, hashtagCount, hasCTA }`:
- `wordCount`: đếm split theo whitespace
- `hashtagCount`: regex `/#\w+/g`
- `hasCTA`: regex tiếng Việt + EN: `/(inbox|nhắn|đặt lịch|đăng ký|liên hệ|click|tìm hiểu|xem thêm|gọi ngay|comment|dm me|order)/i`

### 2. Inline keyboard 2 hàng (thay cho 1 nút duy nhất)

```
[📝 Xem & duyệt (Mini App)]  [🌐 Mở web]
[🔄 Tạo bài khác]            [🎯 Đổi kênh]
```

- Nút "Mở web" → `https://app.flowa.one/multichannel/<id>` (URL button)
- Nút "Tạo bài khác" → `callback_data=regen_single:<channel>` → reuse prompt cache, chạy lại với cùng brand+channel
- Nút "Đổi kênh" → `callback_data=switch_channel:<contentId>` → bot reply menu nhanh chọn FB/IG/X/LinkedIn/TikTok

### 3. Notify khi ảnh xong (push tiếp theo)

Trong `generateImageForSinglePost` (dòng ~1241-1281), sau khi `generate-brand-image` trả về thành công, gửi thêm 1 message follow-up:
```
🎨 Ảnh cho bài "<tiêu đề>" đã sẵn sàng → mở Mini App để xem.
```
Kèm nút "👁 Xem ảnh" deep-link Mini App.

Nếu ảnh fail (status không OK sau timeout) → gửi:
```
⚠️ Ảnh chưa tạo được. Bạn có thể bấm "Tạo lại ảnh" trong Mini App.
```

### 4. Status message lúc đang chờ (dòng 1430-1432) — thêm progress hint

Hiện tại: `🎯 Đang viết 1 bài cho *Facebook*…\n_Thường mất 20-40 giây_`

Mới:
```
🎯 Đang viết bài Facebook…
🧠 Bước 1/3: Suy nghĩ chủ đề & dàn ý
⏱ ~20-40 giây · Mình sẽ ping khi xong
```

(Optional) edit message này theo từng bước nếu khả thi — nếu không thì giữ static để tránh phức tạp.

## Files sẽ sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/telegram-webhook/index.ts` | `summarizeContent()` helper; rewrite block 1488-1509 (message body + keyboard); update progress message 1430-1432; gửi follow-up khi ảnh xong/fail trong `generateImageForSinglePost` (1241-1281); thêm callback handler cho `regen_single` + `switch_channel` |

## Edge cases

- Bài rất ngắn (< 50 từ): vẫn show số liệu, không có separator nếu preview rỗng
- Không tìm được CTA: bỏ icon CTA, hiển thị `📊 ~N từ · H hashtag`
- `effectiveTopic` quá dài (>80 ký tự): truncate `…` trong title line, full vẫn lưu DB
- Không có brand: bỏ dòng brand
- Image gen fail: vẫn gửi message kết quả content trước, message ảnh độc lập

## Ngoài phạm vi

- Stream từng phần content qua Telegram (Telegram không hỗ trợ tốt edit nhiều lần liên tục — sẽ bị rate limit)
- Gửi ảnh trực tiếp qua Telegram `sendPhoto` (sẽ làm pha sau, cần xử lý URL signed từ storage)

