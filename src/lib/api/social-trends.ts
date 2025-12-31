// Social Trends API Client
// Uses Firecrawl to scrape trend aggregator sites

import { supabase } from '@/integrations/supabase/client';

export interface NormalizedTrend {
  name: string;
  type: 'hashtag' | 'sound' | 'creator' | 'video' | 'topic';
  platform: string;
  metrics?: {
    views?: number;
    followers?: number;
    growth_rate?: string;
    engagement?: string;
    rank?: number;
  };
  description?: string;
  url?: string;
  source: string;
  scraped_at: string;
}

export interface SocialTrendsResponse {
  success: boolean;
  platform?: string;
  trends?: NormalizedTrend[];
  sources?: string[];
  total_count?: number;
  scraped_at?: string;
  error?: string;
  available_platforms?: string[];
  available_sources?: string[];
}

export type Platform = 'tiktok' | 'facebook' | 'youtube' | 'instagram';

export const socialTrendsApi = {
  /**
   * Get available platforms and sources
   */
  async getAvailableSources(): Promise<SocialTrendsResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-trends', {
      method: 'GET',
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  /**
   * Get trends for a specific platform
   */
  async getTrendsForPlatform(
    platform: Platform,
    options?: { forceRefresh?: boolean; industry?: string }
  ): Promise<SocialTrendsResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-trends', {
      body: {
        platform,
        forceRefresh: options?.forceRefresh || false,
        industry: options?.industry,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  /**
   * Scrape a specific trend source
   */
  async scrapeSource(source: string): Promise<SocialTrendsResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-trends', {
      body: { source },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },
};

export default socialTrendsApi;
