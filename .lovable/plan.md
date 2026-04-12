

# Cấu hình lại độ dài mặc định cho X (Twitter) theo chuẩn nền tảng

## Vấn đề hiện tại

Cấu hình Twitter đang mâu thuẫn: `max_length: 280 chars` nhưng `format_description` lại ghi "Thread 5-7 tweets, mỗi tweet ≤280 ký tự". Hệ thống đang giới hạn toàn bộ output chỉ 280 ký tự — quá ngắn cho thread format.

## Chuẩn X hiện tại (2025)

- **Free**: 280 ký tự/post
- **X Premium**: 4,000 ký tự/post (Basic), 25,000 ký tự/post (Premium+)
- **Thread**: nhiều post, mỗi post ≤280 ký tự

Hệ thống nên tạo **thread 5-7 tweets** → tổng khoảng **1,400-1,960 ký tự**, tương đương **~200-350 từ**.

## Thay đổi cấu hình mới

Chuyển từ `chars` sang `words` và set giới hạn hợp lý cho thread format:

| Field | Hiện tại | Mới |
|-------|----------|-----|
| `min_length` | 0 | 150 |
| `max_length` | 280 | 350 |
| `length_unit` | chars | words |
| `word_budget` | 250 | 250 |
| `format_description` | Thread 280 ký tự | Thread 5-7 tweets, mỗi tweet ≤280 ký tự |

## Files cần sửa (4 files + 2 frontend)

### Backend (Edge Functions)

1. **`supabase/functions/generate-multichannel/index.ts`** (dòng 796-803)
2. **`supabase/functions/generate-sample-text/index.ts`** (dòng 70-79)
3. **`supabase/functions/ai-edit-channel/index.ts`** (dòng 70-78)
4. **`supabase/functions/_shared/length-validator.ts`** (dòng 47)
5. **`supabase/functions/_shared/channel-prompt-builder.ts`** (dòng 79-85)
6. **`supabase/functions/_shared/dynamic-tokens.ts`** (dòng 75-78) — tăng token range

### Frontend

7. **`src/types/channel-transform.ts`** — cập nhật extractionRange và wordCountMultiplier cho twitter

### Giá trị cụ thể cho từng file

**DEFAULT_CHANNEL_SETTINGS (3 files)**:
```
twitter: {
  min_length: 150, max_length: 350, length_unit: 'words',
  hook_required: true, hook_style: 'Quan điểm sắc nét',
  bullet_allowed: false, cta_policy: 'none',
  emoji_allowed: false, emoji_limit: 0,
  hashtag_limit: 2, hashtag_position: 'end',
  line_break_style: 'minimal', link_position: 'allowed',
  format_description: 'Thread 5-7 tweets đánh số (1/, 2/...), mỗi tweet ≤280 ký tự, KHÔNG emoji, hashtag cuối thread'
}
```

**length-validator.ts**:
```
twitter: { min_length: 150, max_length: 350, length_unit: 'words', word_budget: 250, tolerance_percent: 10 }
```

**channel-prompt-builder.ts**:
```
twitter: { maxChars: 280, hashtagRange: [1, 2], emojiLevel: 'none', format: 'Thread 5-7 tweets, mỗi tweet ≤280 ký tự', platform: 'X' }
```

**dynamic-tokens.ts** — tăng token budget cho thread:
```
twitter: { minTokens: 400, maxTokens: 1200, bufferMultiplier: 1.3 }
```

**channel-transform.ts** (frontend):
```
twitter: { extractionLabel: 'Cô đọng', extractionRange: '15-25%', focusLabel: 'Hook + Thread', colorClass: 'bg-amber-500/10 text-amber-600' }
```
và multiplier: `twitter: [0.10, 0.25]`

### Deploy
- Redeploy: `generate-multichannel`, `generate-sample-text`, `ai-edit-channel`

