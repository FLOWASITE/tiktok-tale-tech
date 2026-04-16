

## Fix: TikTok privacy level chọn sai → bài đăng bị ẩn

### Nguyên nhân
Code hiện tại ưu tiên chọn `SELF_ONLY` nếu có trong danh sách options:
```typescript
privacyLevel: privacyLevelOptions.includes("SELF_ONLY")
  ? "SELF_ONLY"
  : privacyLevelOptions[0],
```
Kết quả: mọi bài đăng đều ở chế độ **chỉ mình tôi**, không hiện trên profile.

### Giải pháp
Đảo ngược ưu tiên privacy: chọn mức công khai nhất có thể.

**File:** `supabase/functions/publish-tiktok/index.ts` — hàm `getCreatorPostSettings`

Thay logic chọn privacy (dòng 93-96):
```typescript
// Ưu tiên: PUBLIC > FOLLOWER > MUTUAL_FOLLOW > SELF_ONLY
const PRIVACY_PRIORITY = [
  "PUBLIC_TO_EVERYONE",
  "FOLLOWER_OF_CREATOR", 
  "MUTUAL_FOLLOW_FRIENDS",
  "SELF_ONLY",
];

const privacyLevel = PRIVACY_PRIORITY.find(p => privacyLevelOptions.includes(p)) 
  || privacyLevelOptions[0];
```

### Kết quả mong đợi
- App chưa audit → chọn `FOLLOWER_OF_CREATOR` (followers sẽ thấy bài)
- App đã audit → chọn `PUBLIC_TO_EVERYONE` (ai cũng thấy)
- Bài sẽ hiện trên profile TikTok thay vì bị ẩn hoàn toàn

### Lưu ý
Vì app TikTok chưa audit, bài vẫn chưa hiện **công khai** cho tất cả mọi người. Chỉ followers mới thấy. Để đăng `PUBLIC_TO_EVERYONE`, bạn cần hoàn tất TikTok App Review.

