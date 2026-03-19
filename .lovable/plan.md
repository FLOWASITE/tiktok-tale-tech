

## Phân tích: Tại sao có 2 bài Nội dung (Multichannel) cùng chủ đề

### Nguyên nhân gốc — giống hệt Carousel

**Có 2 điểm INSERT** trong `generate-multichannel/index.ts`:
- **Line 3173**: Streaming mode — INSERT mới khi `formData.contentId` không có
- **Line 4877**: Non-streaming mode — INSERT mới khi không phải expand mode

**Không có dedup check** trước cả 2 điểm INSERT. Nếu cache HIT hoặc user double-submit, cả 2 lần đều tạo record mới với cùng nội dung.

**Frontend đã có guard** (`generatingRef` trong `useStreamingGeneration.ts` line 57-78 và `submittingRef` trong `MultiChannelFormWizard.tsx` line 814-869), nhưng backend thiếu layer bảo vệ thứ 2.

### Hướng fix

Thêm **dedup query trước INSERT** ở cả 2 điểm trong `generate-multichannel/index.ts`:

```sql
SELECT id FROM multi_channel_contents 
WHERE user_id = ? AND topic = ? AND organization_id = ? 
AND created_at > now() - interval '2 minutes'
LIMIT 1
```

Nếu tìm thấy → trả về record cũ thay vì INSERT mới.

### Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/generate-multichannel/index.ts` | Thêm dedup check trước INSERT ở line ~3173 (streaming) và line ~4877 (non-streaming) |

### Không thay đổi
- Frontend guards (đã có `generatingRef` + `submittingRef`)
- Logic AI generation, cache, self-critique
- Database schema

