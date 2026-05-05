import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface ExternalLink {
  id: string;
  source_type: "wordpress" | "blogger" | "wordpress_com" | "sitemap" | "manual";
  source_ref_id: string | null;
  domain: string;
  url: string;
  title: string | null;
  excerpt: string | null;
  keywords: string[];
  published_at: string | null;
  last_synced_at: string;
  status: string;
  metadata: any;
}

export interface ExternalLinksFilter {
  search?: string;
  domain?: string;
  sourceType?: string;
  page?: number;
  pageSize?: number;
}

export function useExternalLinks(filter: ExternalLinksFilter = {}) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const page = filter.page ?? 0;
  const pageSize = filter.pageSize ?? 50;

  return useQuery({
    queryKey: ["external-links", orgId, filter],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("external_link_sources")
        .select("*", { count: "exact" })
        .eq("organization_id", orgId!)
        .eq("status", "active")
        .order("published_at", { ascending: false, nullsFirst: false });
      if (filter.domain && filter.domain !== "all") q = q.eq("domain", filter.domain);
      if (filter.sourceType && filter.sourceType !== "all") q = q.eq("source_type", filter.sourceType);
      if (filter.search) q = q.or(`title.ilike.%${filter.search}%,url.ilike.%${filter.search}%`);
      q = q.range(page * pageSize, page * pageSize + pageSize - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data || []) as ExternalLink[], total: count ?? 0, page, pageSize };
    },
  });
}

export function useExternalLinkStats() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  return useQuery({
    queryKey: ["external-links-stats", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("external_link_sources")
        .select("domain, source_type, last_synced_at")
        .eq("organization_id", orgId!)
        .eq("status", "active")
        .limit(2000);
      const rows = data || [];
      const bySource: Record<string, number> = {};
      const domains = new Set<string>();
      let lastSync = "";
      rows.forEach((r) => {
        bySource[r.source_type] = (bySource[r.source_type] || 0) + 1;
        if (r.domain) domains.add(r.domain);
        if (!lastSync || r.last_synced_at > lastSync) lastSync = r.last_synced_at;
      });
      return { total: rows.length, bySource, domains: Array.from(domains).sort(), lastSync };
    },
  });
}

export function useSyncExternalLinks() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  return useMutation({
    mutationFn: async (input: { connectionId?: string; sitemapUrl?: string; brandTemplateId?: string | null }) => {
      const { data, error } = await supabase.functions.invoke("sync-external-links", {
        body: { ...input, organizationId: currentOrganization?.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { total: number; inserted: number; sourceType: string; domain: string };
    },
    onSuccess: (d) => {
      toast.success(`Đã sync ${d.inserted}/${d.total} URL từ ${d.domain || d.sourceType}`);
      qc.invalidateQueries({ queryKey: ["external-links"] });
      qc.invalidateQueries({ queryKey: ["external-links-stats"] });
    },
    onError: (e: any) => toast.error(`Sync thất bại: ${e?.message || e}`),
  });
}

export interface LongformConnection {
  id: string;
  platform: string;
  platform_display_name: string | null;
  metadata: any;
}

export function useLongformConnections() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  return useQuery({
    queryKey: ["longform-connections", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_connections")
        .select("id, platform, platform_display_name, metadata, is_active")
        .eq("organization_id", orgId!)
        .in("platform", ["wordpress", "wordpress_com", "blogger", "website"])
        .eq("is_active", true)
        .order("platform");
      if (error) throw error;
      return (data || []) as LongformConnection[];
    },
  });
}
