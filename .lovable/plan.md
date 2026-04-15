

## Fix: Hiển thị đủ 5 nút publish social cho Carousel

### Vấn đề
`CAROUSEL_PLATFORM_CHANNELS` trong `CarouselViewer.tsx` (line 344-349) chỉ map một số channel cố định theo platform gốc của carousel. Ví dụ carousel Facebook chỉ hiện `['facebook', 'instagram']` — thiếu LinkedIn, X, TikTok.

### Giải pháp
Mở rộng `CAROUSEL_PLATFORM_CHANNELS` để mọi carousel đều hiển thị đủ 5 nền tảng đã hỗ trợ: `facebook`, `instagram`, `linkedin`, `twitter`, `tiktok`. Platform gốc xếp đầu tiên.

### Thay đổi

**File: `src/components/CarouselViewer.tsx` (line 344-349)**

Thay:
```typescript
const CAROUSEL_PLATFORM_CHANNELS: Record<string, string[]> = {
  facebook: ['facebook', 'instagram'],
  instagram: ['instagram', 'facebook'],
  tiktok: ['tiktok', 'instagram', 'facebook'],
  linkedin: ['linkedin', 'facebook'],
};
```

Bằng:
```typescript
const ALL_CAROUSEL_CHANNELS = ['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok'];

// Platform gốc xếp đầu, còn lại theo thứ tự mặc định
const getChannelsForPlatform = (platform: string): string[] => {
  const rest = ALL_CAROUSEL_CHANNELS.filter(ch => ch !== platform);
  return ALL_CAROUSEL_CHANNELS.includes(platform) 
    ? [platform, ...rest] 
    : ALL_CAROUSEL_CHANNELS;
};
```

Và cập nhật `availableChannels` useMemo dùng `getChannelsForPlatform(carousel?.platform)` thay vì lookup từ map.

Kết quả: tất cả carousel sẽ hiện đủ 5 nút publish (chỉ những platform có active connection mới hiện).

