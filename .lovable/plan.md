## Vấn đề

Trong sidebar "Kênh" của `MultiChannelViewer`, các social đang hiển thị tên viết tắt thay vì tên đầy đủ:
- Facebook → `FB`
- Instagram → `IG`
- Threads → `Th`
- (kèm các kênh khác cũng đang viết tắt: LinkedIn `LI`, YouTube `YT`, TikTok `TT`, Email `Mail`, Google Maps `Maps`, Telegram `TG`, Zalo OA `Zalo`)

## Kế hoạch sửa

Trong `src/components/MultiChannelViewer.tsx` (block `channelInfo` ~line 145–240), đổi `shortLabel` của tất cả kênh sang tên đầy đủ để đồng bộ với Pinterest / Blogger / WordPress đã sửa trước đó:

| Channel | shortLabel cũ | shortLabel mới |
|---|---|---|
| facebook | FB | Facebook |
| instagram | IG | Instagram |
| threads | Th | Threads |
| twitter | X | X (giữ — đây là tên chính thức) |
| linkedin | LI | LinkedIn |
| email | Mail | Email |
| youtube | YT | YouTube |
| tiktok | TT | TikTok |
| google_maps | Maps | Google Maps |
| telegram | TG | Telegram |
| zalo_oa | Zalo | Zalo OA |

Đồng bộ thêm `MultiChannelListView.tsx` (block label map ~line 100–115) nếu vẫn còn viết tắt cho các social trên (FB/IG/Th/LI/YT/TT/TG…), đổi sang tên đầy đủ tương ứng.

## Kết quả mong muốn

Sidebar "Kênh" hiển thị:
```
[logo FB]   Facebook
[logo IG]   Instagram
[logo Th]   Threads
…
```

Đồng nhất pattern "tên đầy đủ" cho mọi social.