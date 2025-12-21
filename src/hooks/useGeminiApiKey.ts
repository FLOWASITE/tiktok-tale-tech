import { useState, useEffect } from 'react';

const STORAGE_KEY = 'gemini_api_key';

export function useGeminiApiKey() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem(STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
      setIsConfigured(true);
    }
  }, []);

  const saveApiKey = (key: string) => {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
      setApiKey(key.trim());
      setIsConfigured(true);
    }
  };

  const clearApiKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey('');
    setIsConfigured(false);
  };

  return {
    apiKey,
    isConfigured,
    saveApiKey,
    clearApiKey,
  };
}
