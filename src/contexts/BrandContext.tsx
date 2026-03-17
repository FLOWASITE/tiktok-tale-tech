import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { BrandTemplate } from '@/hooks/useBrandTemplates';

interface BrandContextType {
  brands: BrandTemplate[];
  currentBrand: BrandTemplate | null;
  loading: boolean;
  switchBrand: (brandId: string) => void;
  refreshBrands: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

function getStorageKey(orgId?: string) {
  return orgId ? `flowa_current_brand_${orgId}` : 'flowa_current_brand_personal';
}

function transformDbResponse(data: any): BrandTemplate {
  return {
    ...data,
    content_pillars: Array.isArray(data.content_pillars) ? data.content_pillars : [],
    channel_overrides: data.channel_overrides || null,
    sample_texts: data.sample_texts || null,
    footer_info: data.footer_info || null,
  };
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentOrganization, loading: orgLoading } = useOrganizationContext();
  const [brands, setBrands] = useState<BrandTemplate[]>([]);
  const [currentBrand, setCurrentBrand] = useState<BrandTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  const storageKey = useMemo(
    () => getStorageKey(currentOrganization?.id),
    [currentOrganization?.id]
  );

  const fetchBrands = useCallback(async () => {
    if (!user) {
      setBrands([]);
      setCurrentBrand(null);
      setLoading(false);
      return;
    }
    if (orgLoading) return;

    try {
      let query = supabase
        .from('brand_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (currentOrganization) {
        query = query.eq('organization_id', currentOrganization.id);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const list = (data || []).map(transformDbResponse);
      setBrands(list);

      // Restore or pick default
      const savedId = localStorage.getItem(storageKey);
      const saved = list.find((b) => b.id === savedId);
      if (saved) {
        setCurrentBrand(saved);
      } else {
        const def = list.find((b) => b.is_default) || list[0] || null;
        setCurrentBrand(def);
        if (def) localStorage.setItem(storageKey, def.id);
      }
    } catch (err) {
      console.error('BrandContext fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, currentOrganization?.id, storageKey]);

  useEffect(() => {
    setLoading(true);
    fetchBrands();
  }, [fetchBrands]);

  const switchBrand = useCallback(
    (brandId: string) => {
      const brand = brands.find((b) => b.id === brandId);
      if (brand) {
        setCurrentBrand(brand);
        localStorage.setItem(storageKey, brandId);
      }
    },
    [brands, storageKey]
  );

  const refreshBrands = useCallback(async () => {
    await fetchBrands();
  }, [fetchBrands]);

  return (
    <BrandContext.Provider value={{ brands, currentBrand, loading, switchBrand, refreshBrands }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useCurrentBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useCurrentBrand must be used within a BrandProvider');
  }
  return context;
}
