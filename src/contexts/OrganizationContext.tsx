import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Organization, OrganizationWithRole, OrgRole } from '@/types/organization';

interface OrganizationContextType {
  organizations: OrganizationWithRole[];
  currentOrganization: OrganizationWithRole | null;
  currentRole: OrgRole | null;
  loading: boolean;
  switchOrganization: (orgId: string) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const STORAGE_KEY = 'flowa_current_org';

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<OrganizationWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch organizations with user's role
      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          organization:organizations (
            id,
            name,
            slug,
            logo_url,
            primary_color,
            owner_id,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching organizations:', error);
        setLoading(false);
        return;
      }

      const orgsWithRoles: OrganizationWithRole[] = (memberships || [])
        .filter((m) => m.organization)
        .map((m) => ({
          ...(m.organization as unknown as Organization),
          role: m.role as OrgRole,
        }));

      setOrganizations(orgsWithRoles);

      // Restore or set current organization
      const savedOrgId = localStorage.getItem(STORAGE_KEY);
      const savedOrg = orgsWithRoles.find((o) => o.id === savedOrgId);
      
      if (savedOrg) {
        setCurrentOrganization(savedOrg);
      } else if (orgsWithRoles.length > 0) {
        // Default to first org (prefer owner role)
        const defaultOrg = orgsWithRoles.find((o) => o.role === 'owner') || orgsWithRoles[0];
        setCurrentOrganization(defaultOrg);
        localStorage.setItem(STORAGE_KEY, defaultOrg.id);
      }
    } catch (error) {
      console.error('Error in fetchOrganizations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const switchOrganization = useCallback((orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
      localStorage.setItem(STORAGE_KEY, orgId);
    }
  }, [organizations]);

  const refreshOrganizations = useCallback(async () => {
    await fetchOrganizations();
  }, [fetchOrganizations]);

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        currentRole: currentOrganization?.role || null,
        loading,
        switchOrganization,
        refreshOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganizationContext must be used within an OrganizationProvider');
  }
  return context;
}
