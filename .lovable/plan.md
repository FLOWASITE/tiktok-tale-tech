
# Tao anh nhan vat phu thuoc quoc gia user

## Hien trang

- `brand_templates` da co truong `country_code` va `jurisdiction_code` (hien tai tat ca deu la `VN`)
- `buildImagePrompt()` trong `image-prompt-builder.ts` **khong co** bat ky chi dan nao ve ngoai hinh nhan vat, sac toc, van hoa dia phuong
- `buildPersonaVisualSection()` chi co age, occupation, interests - **khong co ethnicity/nationality**
- Edge function `generate-brand-image` da fetch `brand_templates` nhung **khong lay** `country_code`

## Giai phap

Them 1 section moi trong prompt builder de chi dan AI tao nhan vat nguoi phu hop voi quoc gia cua brand, dua tren `country_code` tu `brand_templates`.

## Chi tiet ky thuat

### 1. Cap nhat Edge Function `generate-brand-image/index.ts`

- Them `country_code` vao SELECT query cua `brand_templates` (dong 263)
- Truyen `countryCode` vao `buildImagePrompt()` params

```text
// Hien tai:
.select("primary_color, secondary_colors, image_style, logo_url, brand_name, industry, organization_id, tone_of_voice, formality_level")

// Sau:
.select("primary_color, secondary_colors, image_style, logo_url, brand_name, industry, organization_id, tone_of_voice, formality_level, country_code")
```

### 2. Cap nhat `_shared/image-prompt-builder.ts`

**2a. Them `countryCode` vao `ImagePromptParams` interface:**

```typescript
export interface ImagePromptParams {
  // ... existing fields
  countryCode?: string; // NEW: ISO country code from brand_templates
}
```

**2b. Tao mapping quoc gia -> chi dan ngoai hinh nhan vat:**

```typescript
const COUNTRY_CHARACTER_DIRECTIVES: Record<string, {
  ethnicity: string;
  culturalContext: string;
  settingHints: string;
}> = {
  VN: {
    ethnicity: 'Vietnamese people with Vietnamese facial features, black hair, warm skin tone',
    culturalContext: 'Vietnamese cultural context, local fashion style, Vietnamese urban/rural settings',
    settingHints: 'Vietnamese street scenes, tropical greenery, modern Vietnamese city aesthetics',
  },
  US: {
    ethnicity: 'Diverse American people reflecting multicultural society',
    culturalContext: 'American cultural context, Western fashion, diverse backgrounds',
    settingHints: 'Modern American urban/suburban settings',
  },
  TH: {
    ethnicity: 'Thai people with Thai facial features, black hair, warm complexion',
    culturalContext: 'Thai cultural context, local fashion, Thai aesthetics',
    settingHints: 'Thai urban settings, tropical environment',
  },
  SG: {
    ethnicity: 'Diverse Singaporean people (Chinese, Malay, Indian descent)',
    culturalContext: 'Singaporean multicultural context, modern Asian fashion',
    settingHints: 'Modern Singapore urban settings, clean city aesthetics',
  },
  MY: {
    ethnicity: 'Malaysian people (Malay, Chinese, Indian descent)',
    culturalContext: 'Malaysian multicultural context, local fashion mix',
    settingHints: 'Malaysian urban and tropical settings',
  },
  ID: {
    ethnicity: 'Indonesian people with Indonesian facial features',
    culturalContext: 'Indonesian cultural context, local fashion',
    settingHints: 'Indonesian tropical urban settings',
  },
  PH: {
    ethnicity: 'Filipino people with Filipino facial features',
    culturalContext: 'Filipino cultural context, local fashion style',
    settingHints: 'Philippine tropical urban settings',
  },
  JP: {
    ethnicity: 'Japanese people with Japanese facial features',
    culturalContext: 'Japanese cultural context, Japanese fashion aesthetics',
    settingHints: 'Japanese urban/modern settings',
  },
  KR: {
    ethnicity: 'Korean people with Korean facial features',
    culturalContext: 'Korean cultural context, Korean fashion trends',
    settingHints: 'Korean modern urban settings',
  },
};
```

**2c. Tao function `buildCountryCharacterSection()`:**

```typescript
function buildCountryCharacterSection(countryCode?: string): string {
  if (!countryCode) return '';
  
  const directive = COUNTRY_CHARACTER_DIRECTIVES[countryCode];
  if (!directive) return '';
  
  return `\n\n## HUMAN CHARACTER APPEARANCE (CRITICAL):
When featuring people/humans in the image:
- Ethnicity: ${directive.ethnicity}
- Cultural Context: ${directive.culturalContext}
- Setting: ${directive.settingHints}
- IMPORTANT: Characters must look authentic and natural for ${countryCode} market`;
}
```

**2d. Goi function trong `buildImagePrompt()`** - dat ngay sau persona section (dong ~713):

```typescript
// Add country-specific character section
prompt += buildCountryCharacterSection(countryCode);
```

### 3. Cap nhat frontend `imagePromptGenerator.ts`

Them `countryCode` vao `PromptContext` interface va them directive tuong tu vao `generateImagePrompt()` de dong bo logic giua frontend va edge function.

## Tac dong

- Khi brand co `country_code = 'VN'` → AI se tao nhan vat nguoi Viet voi net mat, lan da, kieu toc phu hop
- Khi brand co `country_code = 'US'` → AI se tao nhan vat da dang sac toc
- Khi brand co `country_code = 'JP'` → AI se tao nhan vat nguoi Nhat
- Neu khong co `country_code` → Khong them directive (giu nhu cu)
- Khong anh huong den cac anh khong co nguoi (product, abstract, minimalist...)

## File can thay doi

| File | Thay doi |
|------|----------|
| `supabase/functions/generate-brand-image/index.ts` | Them `country_code` vao SELECT + truyen vao `buildImagePrompt` |
| `supabase/functions/_shared/image-prompt-builder.ts` | Them interface, mapping, function `buildCountryCharacterSection` |
| `src/lib/imagePromptGenerator.ts` | Them `countryCode` vao `PromptContext` + directive tuong tu |
