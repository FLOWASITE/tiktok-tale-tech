

## Plan: Optimize Overlay Text Quality for Hybrid Mode

### Problem
The current AI decomposition prompt only **extracts** text fragments from the user's description. When the input is a content summary (e.g., a blog about tax policy), the banner, hero text, and cards end up with raw/meaningless fragments or are left empty — instead of being contextually crafted infographic elements.

### Root Cause
The system prompt in `decompose-image-request` tells Gemini to "split the description" but doesn't instruct it to **generate meaningful, concise infographic content** when the source text is narrative rather than structured.

### Changes

**1. `supabase/functions/decompose-image-request/index.ts` — Enhanced system prompt**

Upgrade the system prompt to instruct Gemini to:
- **Generate** (not just extract) meaningful overlay content from the narrative
- Create a punchy banner label (2-4 words, e.g., "CHÍNH SÁCH MỚI", "CẬP NHẬT QUAN TRỌNG")
- Create a compelling hero text (key statistic or headline number/phrase)
- Generate exactly 4 meaningful card labels that summarize key points from the content
- Generate a CTA if the content is promotional
- Always produce Vietnamese text that is grammatically correct and contextually relevant

Add explicit examples in the prompt showing input narrative → expected structured output.

Also add validation: if `cards.items` has fewer than 4 items for infographic layouts, pad with contextually relevant items.

~30 lines changed in system prompt.

**2. `supabase/functions/decompose-image-request/index.ts` — Post-processing validation**

After parsing Gemini's tool call response, add a validation layer:
- Ensure `banner.text` is non-empty and ≤ 30 chars
- Ensure `heroText.text` is non-empty and ≤ 20 chars
- Ensure cards have at least 2 items, each label ≤ 50 chars
- Trim excessive whitespace
- Fallback defaults if any element is empty

~20 lines added.

**3. `src/lib/hybridImageGenerator.ts` — Improve regex fallback quality**

Update the regex-based `decomposeRequest()` fallback to also generate meaningful defaults:
- If no banner detected, generate a default banner from the first meaningful keyword
- If no hero text, extract the first number or key phrase
- If fewer than 2 cards, generate summary bullets from the content
- Add a `generateDefaultOverlayFromSummary()` helper that creates sensible defaults

~25 lines changed.

### Total: ~75 lines across 2 files. No new files. No breaking changes.

