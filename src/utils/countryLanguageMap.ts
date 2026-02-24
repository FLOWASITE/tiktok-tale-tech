const SUPPORTED_UI_LANGUAGES = ['vi', 'en', 'th'] as const;
type SupportedLanguage = typeof SUPPORTED_UI_LANGUAGES[number];

const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
  VN: 'vi',
  TH: 'th',
  US: 'en',
  SG: 'en',
  ID: 'id',
  MY: 'en',
  PH: 'en',
  JP: 'ja',
  KR: 'ko',
  EU: 'en',
  GLOBAL: 'en',
};

/**
 * Maps a country code to a supported UI language.
 * Falls back to 'vi' if the mapped language isn't supported in i18n.
 */
export function getUILanguageFromCountry(countryCode?: string | null): SupportedLanguage {
  if (!countryCode) return 'vi';
  const mapped = COUNTRY_LANGUAGE_MAP[countryCode.toUpperCase()];
  if (mapped && SUPPORTED_UI_LANGUAGES.includes(mapped as SupportedLanguage)) {
    return mapped as SupportedLanguage;
  }
  return 'vi';
}
