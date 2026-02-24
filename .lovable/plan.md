

# Fix LanguageSwitcher Not Working

## Root Cause Analysis

There are two likely issues preventing the LanguageSwitcher from working correctly:

1. **Language code mismatch**: `i18n.language` can return region-qualified codes like `vi-VN` or `en-US` (from browser detection), but the switcher compares against short codes (`vi`, `en`, `th`). This means the active indicator never highlights, and the button appears unresponsive even though the language might actually change.

2. **`useAutoLanguage` overriding user selection**: The hook's `useEffect` runs on `[countryCode, i18n]` changes. When `templates` are loading, `countryCode` is initially `undefined`, causing it to set language to `vi` (fallback) -- potentially reverting a manual selection before the override flag is set, or fighting with the LanguageSwitcher's own `handleLanguageChange`.

## Changes

### 1. Normalize language comparison in LanguageSwitcher (`src/components/landing/LanguageSwitcher.tsx`)

- Extract the base language code from `i18n.language` (e.g., `en-US` becomes `en`) for all comparisons.
- This ensures the active pill highlights correctly and click feedback works.

### 2. Harden `useAutoLanguage` hook (`src/hooks/useAutoLanguage.ts`)

- Remove `i18n` from the `useEffect` dependency array (keep only `countryCode`) to prevent unnecessary re-runs.
- Add a guard: skip auto-switching while `countryCode` is still `undefined` (templates loading).

### 3. Sync `handleLanguageChange` with i18next localStorage key

- In `handleLanguageChange`, also update `i18nextLng` in localStorage so i18next's own detector stays in sync and doesn't revert language on next page load.

## Technical Details

### File: `src/components/landing/LanguageSwitcher.tsx`
- Add helper: `const activeLang = i18n.language?.split('-')[0] || 'vi'`
- Replace all `i18n.language === lang.code` with `activeLang === lang.code`

### File: `src/hooks/useAutoLanguage.ts`
- Change deps from `[countryCode, i18n]` to `[countryCode]`
- Add early return when `countryCode` is `undefined`
- Use `i18n.language?.split('-')[0]` for comparison

