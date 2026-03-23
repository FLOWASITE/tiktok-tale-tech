

# Phân loại lại kênh xuất bản theo loại nội dung

## Hiện tại
Kênh được phân thành 4 nhóm: **Mạng xã hội**, **Nền tảng nội dung**, **Kênh trực tiếp**, **Địa phương** — phân theo nền tảng, không theo loại nội dung.

## Phân loại mới (theo loại nội dung)

| Nhóm | Kênh | Lý do |
|------|------|-------|
| **📝 Thiên về Text** | Website/Blog, LinkedIn, X (Twitter), Threads, Email, Telegram | Nội dung chủ yếu là văn bản dài/ngắn |
| **📸 Thiên về Ảnh** | Instagram, Facebook, Google Maps, Zalo OA | Ảnh là yếu tố chính, text hỗ trợ |
| **🎬 Thiên về Video** | TikTok, YouTube | Nội dung video là core |

## Thay đổi

### 1. Cập nhật `src/types/multichannel.ts` — đổi `category` của CHANNELS
- Website: `'text'`, LinkedIn: `'text'`, Twitter: `'text'`, Threads: `'text'`, Email: `'text'`, Telegram: `'text'`
- Instagram: `'image'`, Facebook: `'image'`, Google Maps: `'image'`, Zalo OA: `'image'`
- TikTok: `'video'`, YouTube: `'video'`

### 2. Cập nhật `src/components/multichannel/CompactChannelGrid.tsx` — đổi tên nhóm
- `{ name: 'Thiên về Text', key: 'text', icon: FileText }`
- `{ name: 'Thiên về Ảnh', key: 'image', icon: Image }`
- `{ name: 'Thiên về Video', key: 'video', icon: Video }`
- Mặc định expand tất cả 3 nhóm (chỉ còn 3 thay vì 4)
- Thêm icon nhận diện cho mỗi nhóm trong header

### Files cần sửa
- `src/types/multichannel.ts` — đổi `category` field cho từng channel
- `src/components/multichannel/CompactChannelGrid.tsx` — đổi tên nhóm + icon

