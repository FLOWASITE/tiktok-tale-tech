

## Findings & Plan

### Part A — Decorations Rendering (Read-Only Audit)

**A1-A3: overlay-text-canvas DOES render decorations.** All 5 decoration types are fully implemented in Satori JSX:

| Decoration | Rendered? | Location |
|---|---|---|
| `slideNumberBadge` | ✅ Yes | Line 1720 — top-left circle with number |
| `progressDots` | ✅ Yes | Line 1862 — bottom center dot row |
| `stepIndicator` | ✅ Yes | Line 1757 — top-right "Bước X/Y" pill |
| `accentDivider` | ✅ Yes | Line 1845 — horizontal accent bar |
| `hotBadge` | ✅ Yes | Line 1806 — top-right "HOT" badge |

**A4-A6: generate-carousel-image creates decorations correctly:**

| Condition | Decorations Added |
|---|---|
| `listicle` + `body` slide | `slideNumberBadge` + `progressDots` |
| `educational` + non-hook slide | `stepIndicator` |
| `flat_design` preset (any style) | `accentDivider` |
| `product_only` preset + `hook` slide | `hotBadge` |

**Conclusion: No fix needed for Part A.** Decorations are generated and rendered correctly.

---

### Part B — Fix CarouselSlide Type Mismatch

**File:** `supabase/functions/generate-carousel/index.ts`, lines 36-45

**Current:** `textContent: string` — incorrect, AI tool schema returns structured object.

**Fix:** Add `StructuredTextContent` interface and change `textContent` to `string | StructuredTextContent`.

```typescript
interface StructuredTextContent {
  headline: string;
  subtitle?: string;
  caption?: string;
  dataValue?: string;
  dataLabel?: string;
}

interface CarouselSlide {
  slideNumber: number;
  objective: string;
  textContent: string | StructuredTextContent;
  designStyle: string;
  colorLayout: string;
  aspectRatio: string;
  technicalRequirements: string;
  fullPrompt: string;
}
```

Single edit, lines 36-45. No runtime behavior change — TypeScript safety improvement only.

