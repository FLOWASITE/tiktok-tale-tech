

# Nâng model tạo prompt carousel lên Gemini 2.5 Pro

## Thay đổi

**File: `supabase/functions/_shared/ai-config.ts`** (dòng 39)

Đổi model mặc định của function `generate-carousel` từ `google/gemini-2.5-flash` sang `google/gemini-2.5-pro`.

```
// Trước
model: 'google/gemini-2.5-flash'

// Sau  
model: 'google/gemini-2.5-pro'
```

Gemini 2.5 Pro là model mạnh nhất trong dòng Gemini cho reasoning phức tạp + context lớn, sẽ cải thiện chất lượng nội dung slide và fullPrompt đáng kể so với Flash.

Không cần thay đổi gì khác — hệ thống đã có fallback và DB override sẵn.

