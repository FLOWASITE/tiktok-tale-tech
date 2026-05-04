import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface InternalLinkRow {
  content_id: string;
  title: string;
  in_count: number;   // số bài blog khác link đến bài này
  out_count: number;  // số link bài này trỏ ra
  backlink_count: number; // số social backlinks (publish_attempts)
  cluster: string | null;
}

export function useInternalLinksOverview() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ["internal-links-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      // 1. fetch internal_links rows
      const { data: links, error } = await supabase
        .from("internal_links" as any)
        .select("source_content_id, target_content_id, status")
        .eq("organization_id", orgId!)
        .eq("status", "approved");
      if (error) throw error;

      const inMap = new Map<string, number>();
      const outMap = new Map<string, number>();
      const allIds = new Set<string>();
      (links || []).forEach((l: any) => {
        outMap.set(l.source_content_id, (outMap.get(l.source_content_id) || 0) + 1);
        inMap.set(l.target_content_id, (inMap.get(l.target_content_id) || 0) + 1);
        allIds.add(l.source_content_id);
        allIds.add(l.target_content_id);
      });

      // 2. fetch social backlinks per content
      const { data: backlinks } = await supabase
        .from("publish_attempts")
        .select("content_id")
        .eq("organization_id", orgId!)
        .eq("status", "success")
        .not("external_post_url", "is", null);
      const backMap = new Map<string, number>();
      (backlinks || []).forEach((b: any) => {
        if (b.content_id) {
          backMap.set(b.content_id, (backMap.get(b.content_id) || 0) + 1);
          allIds.add(b.content_id);
        }
      });

      // 3. fetch titles
      const ids = Array.from(allIds);
      const titleMap = new Map<string, string>();
      if (ids.length) {
        const { data: contents } = await supabase
          .from("multi_channel_contents")
          .select("id, title")
          .in("id", ids);
        contents?.forEach((c) => titleMap.set(c.id, c.title || ""));
      }

      const rows: InternalLinkRow[] = ids.map((id) => ({
        content_id: id,
        title: titleMap.get(id) || "(no title)",
        in_count: inMap.get(id) || 0,
        out_count: outMap.get(id) || 0,
        backlink_count: backMap.get(id) || 0,
        cluster: null,
      }));

      // sort by total link equity desc
      rows.sort((a, b) =>
        (b.in_count + b.backlink_count) - (a.in_count + a.backlink_count)
      );

      const totals = {
        totalInternal: links?.length || 0,
        pagesWithLinks: ids.length,
        starvedPages: rows.filter((r) => r.in_count <= 1 && r.backlink_count === 0).length,
        strongPages: rows.filter((r) => r.in_count + r.backlink_count >= 3).length,
      };

      return { rows, totals };
    },
  });
}
