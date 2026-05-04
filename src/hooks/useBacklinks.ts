import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface BacklinkRow {
  id: string;
  platform: string;
  channel: string | null;
  external_post_url: string;
  external_post_id: string | null;
  status: string;
  attempted_at: string;
  completed_at: string | null;
  content_id: string | null;
  error_message: string | null;
  request_payload: any;
  response_payload: any;
  // Joined
  title: string | null;
}

export interface BacklinksFilter {
  search?: string;
  platform?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

const LONGFORM = new Set(["website", "blogger", "wordpress"]);

export function isLongformPlatform(p: string) {
  return LONGFORM.has((p || "").toLowerCase());
}

export function useBacklinks(filters: BacklinksFilter = {}) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? 50;

  return useQuery({
    queryKey: ["backlinks", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("publish_attempts")
        .select(
          "id, platform, channel, external_post_url, external_post_id, status, attempted_at, completed_at, content_id, error_message, request_payload, response_payload",
          { count: "exact" }
        )
        .eq("organization_id", orgId!)
        .not("external_post_url", "is", null)
        .order("attempted_at", { ascending: false });

      if (filters.platform && filters.platform !== "all") {
        q = q.eq("platform", filters.platform);
      }
      if (filters.status && filters.status !== "all") {
        q = q.eq("status", filters.status);
      }
      if (filters.dateFrom) q = q.gte("attempted_at", filters.dateFrom);
      if (filters.dateTo) q = q.lte("attempted_at", filters.dateTo);
      if (filters.search) {
        q = q.ilike("external_post_url", `%${filters.search}%`);
      }
      q = q.range(page * pageSize, page * pageSize + pageSize - 1);

      const { data, error, count } = await q;
      if (error) throw error;

      const contentIds = Array.from(
        new Set((data ?? []).map((r) => r.content_id).filter(Boolean))
      ) as string[];
      const titleMap = new Map<string, string>();
      if (contentIds.length) {
        const { data: contents } = await supabase
          .from("multi_channel_contents")
          .select("id, title")
          .in("id", contentIds);
        contents?.forEach((c) => titleMap.set(c.id, c.title || ""));
      }

      const rows: BacklinkRow[] = (data ?? []).map((r) => ({
        ...r,
        title: r.content_id ? titleMap.get(r.content_id) ?? null : null,
      }));

      return { rows, total: count ?? rows.length, page, pageSize };
    },
  });
}

export function useBacklinkStats() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ["backlinks-stats", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publish_attempts")
        .select("platform, status, attempted_at")
        .eq("organization_id", orgId!)
        .not("external_post_url", "is", null);
      if (error) throw error;

      const total = data.length;
      const byPlatform: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
      let last7 = 0;
      data.forEach((r) => {
        byPlatform[r.platform] = (byPlatform[r.platform] || 0) + 1;
        byStatus[r.status] = (byStatus[r.status] || 0) + 1;
        if (new Date(r.attempted_at).getTime() >= sevenDaysAgo) last7++;
      });
      return { total, byPlatform, byStatus, last7 };
    },
  });
}
