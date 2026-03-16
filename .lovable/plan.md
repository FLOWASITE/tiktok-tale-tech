

## Plan: Smart Negative Prompt Defaults theo Mode

### Vấn đề
Negative prompt hiện tại luôn trống (`''`), user phải tự gõ. Cần tự động điền defaults hợp lý theo `promptMode`.

### Thay đổi — 2 files

**1. Tạo hằng số defaults (`src/lib/imagePromptDefaults.ts` — file mới)**

```typescript
export const NEGATIVE_PROMPT_DEFAULTS: Record<PromptMode, string> = {
  full: 'watermark, blurry, low quality, distorted face, extra fingers, deformed hands, ugly, amateur',
  brand_only: 'watermark, blurry, low quality, distorted face, extra fingers, deformed hands, ugly, text artifacts',
  raw: 'watermark, blurry, low quality, distorted face, extra fingers, deformed hands',
};
```

Logic:
- **full**: Thêm `amateur` vì mode này cần chất lượng cao nhất
- **brand_only**: Thêm `text artifacts` vì có thể có text overlay
- **raw**: Chỉ giữ cơ bản — user toàn quyền tùy chỉnh thêm

**2. Cập nhật `SimpleImageGenerator.tsx`**

- Import `NEGATIVE_PROMPT_DEFAULTS`
- Thêm `useEffect` trên `promptMode`: khi mode thay đổi, nếu negative prompt đang trống hoặc là default cũ → tự động set default mới
- Khởi tạo `negativePrompt` state với `NEGATIVE_PROMPT_DEFAULTS['full']` thay vì `''`

```typescript
// Track if user has customized the negative prompt
const [isNegativePromptCustomized, setIsNegativePromptCustomized] = useState(false);

useEffect(() => {
  if (!isNegativePromptCustomized) {
    setNegativePrompt(NEGATIVE_PROMPT_DEFAULTS[promptMode]);
  }
}, [promptMode, isNegativePromptCustomized]);

// In onNegativePromptChange handler:
const handleNegativePromptChange = (value: string) => {
  setNegativePrompt(value);
  setIsNegativePromptCustomized(true);
};
```

Logic: Nếu user chưa tự sửa → auto-fill theo mode. Nếu user đã sửa → giữ nguyên.

### Scope
- 1 file mới: `src/lib/imagePromptDefaults.ts` (~10 dòng)
- 1 file sửa: `SimpleImageGenerator.tsx` (~15 dòng)
- Không ảnh hưởng backend — negative prompt vẫn truyền qua pipeline như cũ

