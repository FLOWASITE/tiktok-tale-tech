
# Đề Xuất Phong Cách Ảnh Dựa Trên Brand

## Tổng Quan

Thêm tính năng AI tự động đề xuất phong cách ảnh phù hợp nhất dựa trên thông tin Brand đã có sẵn, giúp người dùng không phải đoán và tạo ra ảnh nhất quán với identity thương hiệu.

---

## Dữ Liệu Brand Có Sẵn Để Đề Xuất

| Field | Ví dụ | Ảnh hưởng đến Visual Style |
|-------|-------|---------------------------|
| `industry` | ["Beauty", "Skincare"] | Beauty → Minimalist, Cinematic |
| `tone_of_voice` | ["expert", "friendly"] | Expert → Clean, Professional |
| `image_style` | "modern_minimalist" | Đã có preference → ưu tiên |
| `formality_level` | "semi_formal" | Formal → Photorealistic |
| `target_age_range` | "25-35" | Gen Z → Illustration, Flat |

---

## Logic Đề Xuất Phong Cách

### 1. Industry → Style Mapping

```text
┌─────────────────────┬────────────────────────────┐
│ Industry            │ Suggested Styles           │
├─────────────────────┼────────────────────────────┤
│ Beauty, Fashion     │ minimalist, cinematic      │
│ Tech, SaaS          │ 3d_render, flat_design     │
│ Food & Beverage     │ photorealistic, watercolor │
│ Education           │ illustration, flat_design  │
│ Healthcare          │ photorealistic, minimalist │
│ Real Estate         │ photorealistic, cinematic  │
│ Art, Creative       │ watercolor, illustration   │
│ Finance             │ minimalist, photorealistic │
│ E-commerce          │ photorealistic, 3d_render  │
└─────────────────────┴────────────────────────────┘
```

### 2. Tone of Voice → Style Adjustment

```text
┌─────────────────────┬────────────────────────────┐
│ Tone                │ Style Boost                │
├─────────────────────┼────────────────────────────┤
│ expert, calm        │ +minimalist, +photorealistic│
│ friendly, playful   │ +illustration, +flat_design │
│ inspirational       │ +cinematic, +watercolor    │
│ professional        │ +photorealistic            │
│ trendy, bold        │ +3d_render, +cinematic     │
└─────────────────────┴────────────────────────────┘
```

### 3. Scoring Algorithm

```text
For each style preset:
  score = 0
  
  if brand.industry matches INDUSTRY_STYLE_MAP:
    score += 3 (primary match)
    score += 1 (secondary match)
  
  for each tone in brand.tone_of_voice:
    if tone maps to this style:
      score += 2
  
  if brand.image_style explicitly set:
    score += 5 (user preference priority)
  
  if brand.formality_level === 'formal':
    boost photorealistic, minimalist
  
Return top 2 styles sorted by score
```

---

## UI Changes

### Hiện tại:
```
[Phong cách ảnh]
🔘 Tự động (Theo brand style)  ← Không rõ sẽ chọn gì
🔘 Chân thực
🔘 Minh họa
...
```

### Sau khi cải thiện:
```
[Phong cách ảnh]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Gợi ý cho Beauty brand với tone Expert, Friendly:

🔘 ⭐ Tối giản     ← Match: Industry + Tone (Recommended)
🔘 ⭐ Chân thực   ← Match: Industry (85%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📷 Tất cả phong cách:
🔘 Minh họa
🔘 3D Render
🔘 Flat Design
...
```

---

## Implementation Details

### File Changes:

| File | Thay đổi |
|------|----------|
| `src/utils/imageStyleSuggestion.ts` | **NEW** - Logic đề xuất style |
| `src/components/multichannel/UnifiedImageGenerator.tsx` | Hiển thị suggested styles |
| `supabase/functions/_shared/image-prompt-builder.ts` | Backend auto-selection khi style='auto' |

---

### 1. New Utility: `imageStyleSuggestion.ts`

```typescript
// Industry → Primary styles mapping
const INDUSTRY_STYLE_MAP: Record<string, ImageStylePreset[]> = {
  // Beauty & Fashion
  beauty: ['minimalist', 'cinematic'],
  skincare: ['minimalist', 'photorealistic'],
  fashion: ['cinematic', 'photorealistic'],
  cosmetics: ['minimalist', 'cinematic'],
  
  // Technology
  technology: ['3d_render', 'flat_design'],
  saas: ['flat_design', 'minimalist'],
  software: ['flat_design', '3d_render'],
  
  // Food
  food: ['photorealistic', 'watercolor'],
  restaurant: ['photorealistic', 'cinematic'],
  beverage: ['photorealistic', 'minimalist'],
  
  // Professional Services
  finance: ['minimalist', 'photorealistic'],
  healthcare: ['photorealistic', 'minimalist'],
  education: ['illustration', 'flat_design'],
  consulting: ['minimalist', 'photorealistic'],
  
  // Creative
  art: ['watercolor', 'illustration'],
  design: ['minimalist', 'illustration'],
  photography: ['cinematic', 'photorealistic'],
  
  // Real Estate
  realestate: ['photorealistic', 'cinematic'],
  property: ['photorealistic', 'cinematic'],
};

// Tone → Style affinity
const TONE_STYLE_AFFINITY: Record<string, ImageStylePreset[]> = {
  expert: ['minimalist', 'photorealistic'],
  professional: ['photorealistic', 'minimalist'],
  calm: ['minimalist', 'watercolor'],
  friendly: ['illustration', 'flat_design'],
  playful: ['illustration', 'flat_design', '3d_render'],
  bold: ['cinematic', '3d_render'],
  inspirational: ['cinematic', 'watercolor'],
  trendy: ['3d_render', 'cinematic'],
  warm: ['watercolor', 'photorealistic'],
  elegant: ['minimalist', 'cinematic'],
};

export interface StyleSuggestion {
  style: ImageStylePreset;
  score: number;
  reasons: string[];
  isRecommended: boolean;
}

export function suggestImageStyles(
  industry?: string[],
  toneOfVoice?: string[],
  explicitImageStyle?: string,
  formalityLevel?: string
): StyleSuggestion[] {
  // Scoring algorithm implementation
  // Returns sorted array of suggestions with reasons
}
```

---

### 2. Frontend UI Update

```tsx
// In UnifiedImageGenerator.tsx

// New state for suggestions
const [styleSuggestions, setStyleSuggestions] = useState<StyleSuggestion[]>([]);

// Compute suggestions when brand info available
useEffect(() => {
  if (brandIndustry || content.brand_template_id) {
    const suggestions = suggestImageStyles(
      brandIndustry,
      brandTemplate?.tone_of_voice,
      brandTemplate?.image_style,
      brandTemplate?.formality_level
    );
    setStyleSuggestions(suggestions);
    
    // Auto-select recommended if current is 'auto'
    if (imageStyle === 'auto' && suggestions[0]?.isRecommended) {
      setImageStyle(suggestions[0].style);
    }
  }
}, [brandIndustry, brandTemplate]);

// Render suggested styles section
{styleSuggestions.length > 0 && (
  <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
    <div className="flex items-center gap-2 mb-2">
      <Wand2 className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium">Gợi ý cho thương hiệu của bạn</span>
    </div>
    <div className="flex flex-wrap gap-2">
      {styleSuggestions.slice(0, 2).map((suggestion) => (
        <button
          key={suggestion.style}
          onClick={() => setImageStyle(suggestion.style)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
            imageStyle === suggestion.style 
              ? "border-primary bg-primary/10 text-primary" 
              : "border-border hover:border-primary/50"
          )}
        >
          {IMAGE_STYLES.find(s => s.value === suggestion.style)?.icon}
          <span className="text-sm font-medium">
            {IMAGE_STYLES.find(s => s.value === suggestion.style)?.label}
          </span>
          {suggestion.isRecommended && (
            <Badge variant="secondary" className="text-[10px]">
              Best match
            </Badge>
          )}
        </button>
      ))}
    </div>
    <p className="text-xs text-muted-foreground mt-2">
      {styleSuggestions[0]?.reasons.join(' • ')}
    </p>
  </div>
)}
```

---

### 3. Backend Enhancement

Khi frontend gửi `imageStylePreset: undefined` (auto), backend sẽ tự chọn dựa trên brand data đã fetch:

```typescript
// In generate-brand-image/index.ts

// If no explicit style, compute suggestion
if (!imageStylePreset && brandTemplate) {
  const suggestedStyle = computeStyleFromBrand(
    brandTemplate.industry,
    brandTemplate.tone_of_voice,
    brandTemplate.image_style,
    brandTemplate.formality_level
  );
  imageStylePreset = suggestedStyle;
  console.log(`[generate-brand-image] Auto-selected style: ${suggestedStyle}`);
}
```

---

## User Experience Flow

```text
1. User opens Image Generator
   └─> System detects brand: "GlowSkin" 
       Industry: ["Beauty", "Skincare"]
       Tone: ["expert", "friendly"]

2. AI analyzes and suggests:
   ┌─────────────────────────────────────────┐
   │ ✨ Gợi ý cho GlowSkin:                  │
   │                                         │
   │ ⭐ Tối giản   (Beauty + Expert match)   │
   │ ⭐ Chân thực  (Skincare + Pro match)    │
   │                                         │
   │ Lý do: Industry Beauty thường dùng     │
   │ style tối giản, tone Expert phù hợp    │
   │ với hình ảnh chuyên nghiệp.            │
   └─────────────────────────────────────────┘

3. User can:
   - Click suggested style (recommended)
   - Override with any other style
   - Keep "Tự động" to let backend decide

4. Generated image matches brand identity ✓
```

---

## Ước Tính Thời Gian

| Task | Thời gian |
|------|-----------|
| Create `imageStyleSuggestion.ts` utility | 10 phút |
| Update `UnifiedImageGenerator.tsx` UI | 15 phút |
| Backend auto-selection logic | 5 phút |
| Testing & refinement | 5 phút |
| **Total** | **~35 phút** |

