import { useState, useEffect, useCallback } from 'react';
import { AIProvidersConfig, AIProviderType, AIProviderConfig, DEFAULT_AI_CONFIG } from '@/types/aiProvider';

const STORAGE_KEY = 'ai_providers_config';
const LEGACY_GEMINI_KEY = 'gemini_api_key';

export function useAIProviders() {
  const [config, setConfig] = useState<AIProvidersConfig>(DEFAULT_AI_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  // Load config from localStorage and migrate legacy data
  useEffect(() => {
    const loadConfig = () => {
      try {
        const storedConfig = localStorage.getItem(STORAGE_KEY);
        
        if (storedConfig) {
          const parsed = JSON.parse(storedConfig) as AIProvidersConfig;
          setConfig(parsed);
        } else {
          // Migrate from legacy Gemini-only config
          const legacyGeminiKey = localStorage.getItem(LEGACY_GEMINI_KEY);
          if (legacyGeminiKey) {
            const migratedConfig: AIProvidersConfig = {
              selectedProvider: 'gemini',
              providers: {
                gemini: { apiKey: legacyGeminiKey },
              },
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedConfig));
            setConfig(migratedConfig);
          }
        }
      } catch (error) {
        console.error('Error loading AI providers config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Save config to localStorage
  const saveConfig = useCallback((newConfig: AIProvidersConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    setConfig(newConfig);
  }, []);

  // Get active provider config
  const getActiveProvider = useCallback((): { type: AIProviderType; config: AIProviderConfig | undefined } => {
    return {
      type: config.selectedProvider,
      config: config.providers[config.selectedProvider],
    };
  }, [config]);

  // Check if active provider is configured
  const isConfigured = useCallback((): boolean => {
    const provider = config.providers[config.selectedProvider];
    return !!provider?.apiKey;
  }, [config]);

  // Set selected provider
  const setSelectedProvider = useCallback((provider: AIProviderType) => {
    const newConfig = { ...config, selectedProvider: provider };
    saveConfig(newConfig);
  }, [config, saveConfig]);

  // Save provider config
  const saveProviderConfig = useCallback((provider: AIProviderType, providerConfig: AIProviderConfig) => {
    const newConfig: AIProvidersConfig = {
      ...config,
      providers: {
        ...config.providers,
        [provider]: providerConfig,
      },
    };
    saveConfig(newConfig);

    // Also update legacy key for backward compatibility
    if (provider === 'gemini') {
      localStorage.setItem(LEGACY_GEMINI_KEY, providerConfig.apiKey);
    }
  }, [config, saveConfig]);

  // Clear provider config
  const clearProviderConfig = useCallback((provider: AIProviderType) => {
    const newProviders = { ...config.providers };
    delete newProviders[provider];
    
    const newConfig: AIProvidersConfig = {
      ...config,
      providers: newProviders,
    };
    saveConfig(newConfig);

    // Also clear legacy key
    if (provider === 'gemini') {
      localStorage.removeItem(LEGACY_GEMINI_KEY);
    }
  }, [config, saveConfig]);

  // Get provider config by type
  const getProviderConfig = useCallback((provider: AIProviderType): AIProviderConfig | undefined => {
    return config.providers[provider];
  }, [config]);

  return {
    config,
    isLoading,
    getActiveProvider,
    isConfigured,
    setSelectedProvider,
    saveProviderConfig,
    clearProviderConfig,
    getProviderConfig,
  };
}
