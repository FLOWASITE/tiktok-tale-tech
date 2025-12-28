import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface IndustryUpgradeInfo {
  industryTemplateId: string;
  industryName: string;
  currentVersion: string;
  latestVersion: string;
  hasUpgrade: boolean;
}

export function useIndustryUpgradeCheck(brandTemplateId: string | null | undefined) {
  const { user } = useAuth();
  const [upgradeInfo, setUpgradeInfo] = useState<IndustryUpgradeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkForUpgrade = useCallback(async () => {
    if (!brandTemplateId || !user) {
      setUpgradeInfo(null);
      return;
    }

    setIsLoading(true);
    try {
      // Get brand template with industry link
      const { data: brand, error: brandError } = await supabase
        .from('brand_templates')
        .select('industry_template_id')
        .eq('id', brandTemplateId)
        .single();

      if (brandError || !brand?.industry_template_id) {
        setUpgradeInfo(null);
        return;
      }

      // Get current industry template version
      const { data: industry, error: industryError } = await supabase
        .from('industry_templates')
        .select('id, version, code')
        .eq('id', brand.industry_template_id)
        .single();

      if (industryError || !industry) {
        setUpgradeInfo(null);
        return;
      }

      // Get industry name from translations
      const { data: translation } = await supabase
        .from('industry_template_translations')
        .select('name')
        .eq('industry_template_id', industry.id)
        .eq('language_code', 'vi')
        .single();

      const industryName = translation?.name || industry.code;
      const latestVersion = industry.version || '1.0';

      // Check if any content uses older version
      const { data: contents } = await supabase
        .from('multi_channel_contents')
        .select('industry_template_version')
        .eq('brand_template_id', brandTemplateId)
        .not('industry_template_version', 'is', null)
        .limit(1);

      // Find oldest version in content
      const contentVersions = contents?.map(c => c.industry_template_version).filter(Boolean) || [];
      const hasOlderContent = contentVersions.some(v => v && v !== latestVersion);

      setUpgradeInfo({
        industryTemplateId: industry.id,
        industryName,
        currentVersion: contentVersions[0] || latestVersion,
        latestVersion,
        hasUpgrade: hasOlderContent || false,
      });
    } catch (error) {
      console.error('Error checking industry upgrade:', error);
      setUpgradeInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [brandTemplateId, user]);

  useEffect(() => {
    checkForUpgrade();
  }, [checkForUpgrade]);

  // Subscribe to industry template changes for realtime updates
  useEffect(() => {
    if (!brandTemplateId) return;

    const channel = supabase
      .channel('industry-upgrade-check')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'industry_templates',
        },
        () => {
          // Recheck on any industry template update
          checkForUpgrade();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brandTemplateId, checkForUpgrade]);

  return {
    upgradeInfo,
    isLoading,
    refetch: checkForUpgrade,
  };
}

// Hook specifically for content viewer - checks if content version is outdated
export function useContentVersionCheck(
  contentVersion: string | null | undefined,
  industryTemplateId: string | null | undefined
) {
  const [isOutdated, setIsOutdated] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [industryName, setIndustryName] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (!contentVersion || !industryTemplateId) {
        setIsOutdated(false);
        return;
      }

      try {
        const { data: industry } = await supabase
          .from('industry_templates')
          .select('version, code')
          .eq('id', industryTemplateId)
          .single();

        if (industry?.version && industry.version !== contentVersion) {
          setIsOutdated(true);
          setLatestVersion(industry.version);

          // Get name
          const { data: translation } = await supabase
            .from('industry_template_translations')
            .select('name')
            .eq('industry_template_id', industryTemplateId)
            .eq('language_code', 'vi')
            .single();

          setIndustryName(translation?.name || industry.code);
        } else {
          setIsOutdated(false);
        }
      } catch (error) {
        console.error('Error checking content version:', error);
      }
    }

    check();
  }, [contentVersion, industryTemplateId]);

  return { isOutdated, latestVersion, industryName };
}
