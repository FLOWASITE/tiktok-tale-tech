

# Thêm content type & channel icons vào Pipeline Card

## Mục tiêu
Hiển thị trực quan loại nội dung (post, carousel, video) và kênh phân phối (Facebook, TikTok, Instagram...) trên mỗi pipeline card.

## Dữ liệu có sẵn
Mỗi `AgentPipeline` đã có:
- `content_type`: `'multichannel' | 'video_script' | 'carousel'`
- `pipeline_state`: có thể chứa thông tin channel từ campaign plan

## Thay đổi

### `src/components/agents/PipelineKanban.tsx`

1. **Content type badge** — Thêm badge icon+label ngay dưới title:
   - `multichannel` → icon FileText + "Bài viết"
   - `video_script` → icon Video + "Video"  
   - `carousel` → icon Images + "Carousel"

2. **Channel icons** — Nếu pipeline có thông tin channel (từ `pipeline_state.target_channel` hoặc campaign plan piece), hiển thị icon kênh nhỏ (Facebook, TikTok, Instagram, LinkedIn...) dạng row icons 14x14px, tối đa 3 icons + "+N"

3. **Vị trí trên card**: Đặt dòng content type + channel icons giữa progress bar và priority badge, layout compact

```text
┌─────────────────────────┐
│ ● Content Title         │
│ ▓▓▓▓▓▓░░░░  3/6 bước   │
│ 📝 Bài viết  [fb][ig]  │  ← NEW
│ [normal] [B+]    ~2h   │
└─────────────────────────┘
```

### Content type config (thêm vào file hoặc inline)
```typescript
const CONTENT_TYPE_CONFIG = {
  multichannel: { label: 'Bài viết', icon: FileText, color: 'text-blue-400' },
  video_script: { label: 'Video', icon: Video, color: 'text-pink-400' },
  carousel: { label: 'Carousel', icon: Images, color: 'text-purple-400' },
};
```

### Channel icons (reuse từ hệ thống channel hiện có)
Hiển thị dựa trên `pipeline_state.target_channel` hoặc fallback phỏng đoán từ content_type.

## File thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/agents/PipelineKanban.tsx` | Thêm content type badge + channel icons row vào PipelineCard |

