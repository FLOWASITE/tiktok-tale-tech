

## Vấn đề

`handleRefine` trong `topic-ai/index.ts` không inject date context → AI dùng kiến thức training data cũ, có thể đề cập năm 2024/2025 trong topic đã refine.

Các handler khác (suggest, generate-multichannel, generate-script...) đều gọi `buildLocalizedDateContext()` nhưng `handleRefine` thì không.

## Giải pháp

### File: `supabase/functions/topic-ai/index.ts`

1. Import `buildLocalizedDateContext` từ `_shared/country-language-map.ts`
2. Trong `handleRefine`, sau khi build basePrompt, inject date context:

```ts
import { buildLocalizedDateContext } from "../_shared/country-language-map.ts";

// Inside handleRefine, after basePrompt:
const lang = brandContext?.languageCode || 'vi';
const dateContext = buildLocalizedDateContext(lang);
promptParts.push(dateContext);
```

Chỉ cần thêm 2-3 dòng. Hàm `buildLocalizedDateContext` đã có sẵn, trả về context với năm hiện tại động (`new Date().getFullYear()`), đảm bảo AI luôn dùng đúng năm.

