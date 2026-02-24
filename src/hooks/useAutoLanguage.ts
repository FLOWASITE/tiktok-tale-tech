import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { getUILanguageFromCountry } from '@/utils/countryLanguageMap';

const OVERRIDE_KEY = 'flowa_lang_override';

export function useAutoLanguage() {
  const { i18n } = useTranslation();
  const { templates } = useBrandTemplates();

  const defaultBrand = templates.find((t) => t.is_default) || templates[0];
  const countryCode = defaultBrand?.country_code;

  useEffect(() => {
    const override = localStorage.getItem(OVERRIDE_KEY);
    if (override) return; // user chose manually, respect it

    const targetLang = getUILanguageFromCountry(countryCode);
    if (i18n.language !== targetLang) {
      i18n.changeLanguage(targetLang);
    }
  }, [countryCode, i18n]);

  const setManualOverride = useCallback((langCode: string) => {
    localStorage.setItem(OVERRIDE_KEY, langCode);
    i18n.changeLanguage(langCode);
  }, [i18n]);

  const clearOverride = useCallback(() => {
    localStorage.removeItem(OVERRIDE_KEY);
    const targetLang = getUILanguageFromCountry(countryCode);
    i18n.changeLanguage(targetLang);
  }, [countryCode, i18n]);

  return { setManualOverride, clearOverride };
}
