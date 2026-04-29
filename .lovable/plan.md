## Vấn đề
Trong screenshot, bạn tạo 3 kênh **FB / Blogger / WordPress** nhưng sidebar "Kênh" hiển thị **FB / Blogger / Blogger**. Kênh WordPress bị render nhầm thành "Blogger".

## Nguyên nhân
File `src/components/MultiChannelViewer.tsx` (dòng 137-144), config cho key `wordpress` bị copy-paste từ `blogger`:

```ts
wordpress: { 
  label: 'Blogger',        // ❌ sai
  shortLabel: 'Blogger',   // ❌ sai
  icon: <Globe ... />, 
  color: 'text-orange-500',     // trùng màu Blogger
  bgColor: 'bg-orange-500/10',  // trùng nền Blogger
  ...
}
```

Vì `shortLabel` được dùng để render trong sidebar (dòng 1210: `{config.shortLabel}`), nên 2 kênh trông giống hệt nhau.

## Cách sửa (1 file, ~8 dòng)

Cập nhật entry `wordpress` trong `channelConfig`:

```ts
wordpress: { 
  label: 'WordPress', 
  shortLabel: 'WP',
  icon: <Globe className="w-3.5 h-3.5 xs:w-4 xs:h-4" />, 
  color: 'text-sky-500',
  bgColor: 'bg-sky-500/10',
  maxLength: '800-1500 chữ'
},
```

Thay đổi:
- `label`: "Blogger" → "WordPress"
- `shortLabel`: "Blogger" → "WP" (phân biệt rõ với Blogger trong sidebar hẹp)
- `color` / `bgColor`: chuyển sang tone xanh sky để khác biệt thị giác với Blogger (cam)

## Kiểm tra sau khi sửa
- Sidebar Kênh hiển thị: `FB` / `Blogger` (cam) / `WP` (xanh sky)
- Các flow khác đã có sẵn xử lý cả `wordpress` và `blogger` (dòng 244, 1541, 1604, 1747...) nên không cần đổi gì thêm.

Không đụng tới logic publish hoặc lưu data — chỉ là nhãn UI.