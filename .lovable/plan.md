## Mục tiêu
Bổ sung context UI ngay cạnh Switch "Chế độ SEO" để user hiểu **khi nào nên bật** và **bật xong phải điền gì**.

## Thay đổi: `src/components/multichannel/SeoModeToggle.tsx`

### A. Thêm icon `Info` (lucide-react) ngay cạnh chữ "Chế độ SEO"
- Click/hover vào icon → mở Tooltip giàu nội dung (multi-section).
- Giữ Switch on/off như hiện tại.

### B. Tooltip nội dung (cấu trúc 3 phần)
1. **Khi nào nên bật?**
   "Khi bạn cần nội dung long-form (Website / Blog / WordPress) bám sát keyword để lên top Google."
2. **Bật xong cần điền gì?** (ordered list)
   1. Chọn **Pillar** (cụm chủ đề lớn).
   2. Chọn 1–5 **Keyword** trong pillar đó.
   3. AI sẽ gợi ý **Topic** phù hợp → bạn chọn 1.
3. *Italic note:* "Tắt = bắt đầu tự do từ ý tưởng, AI sẽ tự gợi pillar sau."

### C. Mô tả phụ ngay dưới label (luôn hiển thị, không cần hover)
- Off: "Bắt đầu từ ý tưởng (mặc định)" (giữ nguyên)
- On: đổi thành **"Cần chọn Pillar → Keyword trước khi tạo"** (rõ requirement hơn câu cũ "Bắt đầu từ pillar + keyword")

### D. Cấu trúc layout
```
[🎯  Chế độ SEO  ⓘ                    ◉━━○]
     Cần chọn Pillar → Keyword trước khi tạo
```
- Icon Info dùng `w-3.5 h-3.5 text-muted-foreground hover:text-foreground`.
- Tooltip `side="bottom" align="end" max-w-xs`, content dùng `text-xs` với heading bold + list.
- Bỏ Tooltip wrap toàn bộ label hiện tại (chuyển sang trigger trên Info icon) để click switch không vô tình mở tooltip lớn.

## Không đổi
- Props `SeoModeToggle` (`enabled`, `onChange`, `disabled`) giữ nguyên.
- `MultiChannelFormWizard.tsx` không cần sửa.
- Hook `useEntryMode`, `SeoFirstEntry` không đổi.

## Kết quả
User nhìn thấy ngay dòng mô tả "Cần chọn Pillar → Keyword trước khi tạo" khi bật, và có thể hover icon ⓘ để đọc hướng dẫn 3 bước chi tiết.