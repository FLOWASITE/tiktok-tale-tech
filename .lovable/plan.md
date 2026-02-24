

# Auto-switch Dashboard Language by Brand Country

## Overview
Khi user chọn brand có `country_code`, giao diện dashboard sẽ tự động chuyển ngôn ngữ tương ứng (VN → vi, TH → th, US → en). User vẫn có thể override thủ công bằng nút chuyển ngôn ngữ trên header.

## How It Works

```text
Brand (country_code: "TH")
        │
        ▼
  useAutoLanguage hook
        │
        ├── Checks localStorage for manual override
        │   ├── YES → Keep user's chosen language
        │   └── NO  → Auto-set i18n to "th"
        │
        ▼
  Dashboard renders in Thai
        │
  User clicks LanguageSwitcher → picks "EN"
        │
        ▼
  Sets override flag in localStorage
  Dashboard renders in English (sticky until cleared)
```

## Implementation Steps

### 1. Frontend Country-Language Map (`src/utils/countryLanguageMap.ts`)
- Simple mapping object: `{ VN: 'vi', TH: 'th', US: 'en', SG: 'en', ID: 'id', MY: 'en', PH: 'en', JP: 'ja', KR: 'ko', EU: 'en', GLOBAL: 'en' }`
- Function `getUILanguageFromCountry(countryCode)` that returns a supported i18n language code (`vi`, `en`, `th`), falling back to `vi` for unsupported mappings.

### 2. Auto-Language Hook (`src/hooks/useAutoLanguage.ts`)
- Reads the default brand's `country_code` from `useBrandTemplates()`
- Checks `localStorage` key `flowa_lang_override` for manual override
- If no override exists: calls `i18n.changeLanguage()` to match brand's country
- If override exists: respects user's manual choice
- Exposes `clearOverride()` to reset back to auto mode

### 3. Add LanguageSwitcher to Dashboard Header (`src/components/AppLayout.tsx`)
- Import the existing `LanguageSwitcher` component (pill variant) into the header bar
- Place it between `ThemeToggle` and `UserAvatar`

### 4. Modify LanguageSwitcher to Set Override Flag (`src/components/landing/LanguageSwitcher.tsx`)
- When user manually clicks a language in the dashboard, set `localStorage.setItem('flowa_lang_override', langCode)`
- This prevents auto-switching from overriding user's explicit choice

### 5. Wire Hook in AppLayout
- Call `useAutoLanguage()` inside `AppLayout` so it runs on every dashboard page load
- The hook watches `brand.country_code` changes and reacts accordingly

## Technical Details

### localStorage Keys
| Key | Purpose | Example |
|-----|---------|---------|
| `i18nextLng` | Current i18n language (managed by i18next) | `"th"` |
| `flowa_lang_override` | Manual override flag | `"en"` or absent |

### Override Logic
- **Brand changes** → if no override, auto-switch language
- **User clicks LanguageSwitcher** → set override, language stays
- **User clicks "Auto" / reset** → remove override key, revert to brand-based language

### Files to Create
- `src/utils/countryLanguageMap.ts` — country code to UI language mapping
- `src/hooks/useAutoLanguage.ts` — auto-sync hook

### Files to Modify
- `src/components/AppLayout.tsx` — add LanguageSwitcher + wire hook
- `src/components/landing/LanguageSwitcher.tsx` — set override flag on manual selection

