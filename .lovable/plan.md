

# Cải thiện Caption & CTA chuẩn Marketing cho Carousel

## Vấn đề hiện tại

Prompt tạo Caption và CTA quá sơ sài:
- `captionSuggestion`: chỉ mô tả "Gợi ý caption đăng bài phù hợp với nền tảng" — không có hướng dẫn cấu trúc hay kỹ thuật marketing
- `ctaSuggestion`: chỉ mô tả "Gợi ý CTA kéo tương tác" — không có framework cụ thể
- Không phân biệt caption theo platform (Facebook vs TikTok có chiến lược khác nhau)
- Không có công thức marketing (AIDA, PAS, hook lines, hashtag strategy...)

## Giải pháp

### File: `supabase/functions/generate-carousel/index.ts`

**1. Nâng cấp tool definition cho `captionSuggestion`** (dòng ~799-806)

Thay description đơn giản bằng hướng dẫn chi tiết:
- Cấu trúc caption theo công thức: **Hook line → Body → CTA → Hashtags**
- Hook line: Câu đầu tiên phải gây tò mò/shock (dưới 125 ký tự để không bị cắt trên Facebook)
- Body: 2-4 câu ngắn, sử dụng emoji phù hợp, line breaks tạo nhịp đọc
- Hashtags: 3-5 hashtags có liên quan (Facebook) hoặc 5-10 hashtags trending (TikTok)
- Phải kèm emoji strategy

**2. Nâng cấp tool definition cho `ctaSuggestion`** 

Thay bằng CTA structure:
- CTA chính: 1 câu hành động rõ ràng (Save, Share, Comment, Follow, Link in bio)
- Engagement hook: Câu hỏi mở để kéo comment
- FOMO/Urgency element nếu phù hợp

**3. Thêm hướng dẫn Caption & CTA vào System Prompt** (dòng ~571-599)

Thêm section mới trong `getSystemPrompt()`:

```
## NGUYÊN TẮC VIẾT CAPTION & CTA (CHUẨN MARKETING)

### CAPTION — Công thức HOOK-BODY-CTA-HASHTAG:
1. HOOK LINE (dòng đầu tiên): 
   - Phải gây TÒ MÒ hoặc SHOCK — khiến người đọc nhấn "Xem thêm"
   - Dưới 125 ký tự (Facebook cắt sau 125 ký tự)
   - Kỹ thuật: câu hỏi, số liệu gây sốc, statement ngược đời, "Đừng...", "Sai lầm..."
   
2. BODY (2-4 dòng):
   - Mỗi dòng 1 ý, dùng emoji đầu dòng
   - Tạo nhịp đọc bằng line breaks
   - Tóm tắt giá trị carousel mang lại
   
3. CTA LINE:
   - Kêu gọi hành động cụ thể: 💾 Save, ↗️ Share, 💬 Comment
   - Hoặc câu hỏi mở kéo tương tác
   
4. HASHTAGS:
   - Facebook: 3-5 hashtags (ít hơn, targeted)
   - TikTok: 5-8 hashtags (nhiều hơn, mix trending + niche)

### CTA SUGGESTION — Công thức đa tầng:
Viết 2-3 dòng CTA alternatives:
1. CTA chính: Hành động trực tiếp ("Save ngay để áp dụng!")
2. Engagement CTA: Câu hỏi mở ("Bạn đã thử tip nào rồi? Comment cho mình biết!")  
3. Share CTA: Lý do chia sẻ ("Tag người bạn cần đọc bài này!")
```

**4. Tách `ctaSuggestion` thành structured object** (optional nhưng nên làm)

Thay vì 1 string, trả về object:
```json
{
  "ctaSuggestion": {
    "primary": "💾 Save ngay để áp dụng khi cần!",
    "engagement": "Bạn đã gặp sai lầm nào? Comment chia sẻ nhé!",
    "share": "Tag ngay người bạn đang cần biết điều này 👇"
  }
}
```

→ Tuy nhiên để tránh breaking change với DB (column `cta_suggestion` là text), sẽ giữ format string nhưng hướng dẫn AI viết multi-line với labels rõ ràng.

## Tóm tắt thay đổi

| Vị trí | Thay đổi |
|--------|----------|
| System prompt (`getSystemPrompt`) | Thêm section "NGUYÊN TẮC VIẾT CAPTION & CTA" với công thức marketing |
| Tool definition `captionSuggestion` | Mô tả chi tiết cấu trúc Hook-Body-CTA-Hashtags, yêu cầu emoji + line breaks |
| Tool definition `ctaSuggestion` | Mô tả 3 tầng CTA (primary + engagement + share), platform-aware |
| User prompt | Thêm nhắc "Caption must follow HOOK-BODY-CTA-HASHTAG formula" |

Chỉ sửa 1 file: `supabase/functions/generate-carousel/index.ts`

