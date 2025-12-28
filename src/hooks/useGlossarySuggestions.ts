import { useState, useEffect, useCallback, useMemo } from 'react';
import { useIndustryGlossary } from './useIndustryGlossary';
import type { IndustryGlossaryTermWithTranslation } from '@/types/industryGlossary';

interface UseGlossarySuggestionsOptions {
  industryTemplateId?: string;
  languageCode?: string;
  debounceMs?: number;
  maxSuggestions?: number;
  minChars?: number;
}

export function useGlossarySuggestions(options: UseGlossarySuggestionsOptions = {}) {
  const {
    industryTemplateId,
    languageCode = 'vi',
    debounceMs = 150,
    maxSuggestions = 5,
    minChars = 2,
  } = options;

  const [searchText, setSearchText] = useState('');
  const [debouncedText, setDebouncedText] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch all glossary terms for the industry
  const { glossary, isLoading } = useIndustryGlossary({
    industryTemplateId,
    languageCode,
  });

  // Debounce search text
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText(searchText);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchText, debounceMs]);

  // Filter suggestions based on search text
  const suggestions = useMemo(() => {
    if (!debouncedText || debouncedText.length < minChars) {
      return [];
    }

    const searchLower = debouncedText.toLowerCase();
    
    return glossary
      .filter(term => {
        const termMatch = term.term.toLowerCase().includes(searchLower);
        const abbrevMatch = term.abbreviation?.toLowerCase().includes(searchLower);
        const relatedMatch = term.related_terms?.some(rt => 
          rt.toLowerCase().includes(searchLower)
        );
        return termMatch || abbrevMatch || relatedMatch;
      })
      .sort((a, b) => {
        // Prioritize exact matches and preferred terms
        const aExact = a.term.toLowerCase().startsWith(searchLower);
        const bExact = b.term.toLowerCase().startsWith(searchLower);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        if (a.is_preferred && !b.is_preferred) return -1;
        if (!a.is_preferred && b.is_preferred) return 1;
        return 0;
      })
      .slice(0, maxSuggestions);
  }, [glossary, debouncedText, maxSuggestions, minChars]);

  // Update suggestions visibility
  useEffect(() => {
    setIsOpen(suggestions.length > 0);
  }, [suggestions]);

  const handleInputChange = useCallback((text: string) => {
    // Extract the last word being typed
    const words = text.split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    setSearchText(lastWord);
  }, []);

  const handleSelect = useCallback((term: IndustryGlossaryTermWithTranslation) => {
    setIsOpen(false);
    setSearchText('');
    return term;
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchText('');
  }, []);

  return {
    suggestions,
    isLoading,
    isOpen,
    searchText,
    handleInputChange,
    handleSelect,
    handleClose,
    setIsOpen,
  };
}
