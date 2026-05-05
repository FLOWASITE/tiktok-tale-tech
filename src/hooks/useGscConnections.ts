import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export interface GscConnection {
  id: string;
  organization_id: string;
  brand_template_id: string | null;
  site_url: string;
  google_email: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export interface GscMetricRow {
  date: string;
  page: string | null;
  query: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export function useGscConnections() {
  const { currentOrganization } = useOrganization();
  const qc = useQueryClient();

  const connections = useQuery({
    queryKey: ["gsc-connections", currentOrganization?.id],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gsc_connections" as any)
        .select("id, organization_id, brand_template_id, site_url, google_email, is_active, last_synced_at, created_at")
        .eq("organization_id", currentOrganization!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as GscConnection[];
    },
  });

  const startOAuth = useMutation({
    mutationFn: async (return_url?: string) => {
      if (!currentOrganization?.id) throw new Error("Chưa có workspace");
      const { data, error } = await supabase.functions.invoke("gsc-oauth-start", {
        body: { organization_id: currentOrganization.id, return_url },
      });
      if (error) throw error;
      return data as { auth_url: string };
    },
    onSuccess: (data) => {
      const popup = window.open(data.auth_url, "gsc-oauth", "width=520,height=640");
      if (!popup) { window.location.href = data.auth_url; return; }
      const handler = (e: MessageEvent) => {
        if (e.data?.type === "gsc_oauth") {
          window.removeEventListener("message", handler);
          if (e.data.ok) { toast.success(e.data.message || "Đã kết nối GSC"); qc.invalidateQueries({ queryKey: ["gsc-connections"] }); }
          else toast.error(e.data.message || "Kết nối thất bại");
        }
      };
      window.addEventListener("message", handler);
    },
    onError: (e: Error) => toast.error(e.message || "Không thể khởi tạo OAuth"),
  });

  const sync = useMutation({
    mutationFn: async (connection_ids?: string[]) => {
      const { data, error } = await supabase.functions.invoke("gsc-sync-metrics", {
        body: { connection_ids, days: 7 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Đã đồng bộ GSC"); qc.invalidateQueries({ queryKey: ["gsc-connections"] }); qc.invalidateQueries({ queryKey: ["gsc-metrics"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gsc_connections" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Đã ngắt kết nối"); qc.invalidateQueries({ queryKey: ["gsc-connections"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { connections, startOAuth, sync, disconnect };
}

export function useGscMetrics(connectionId: string | null, days: number = 28) {
  const { currentOrganization } = useOrganization();
  return useQuery({
    queryKey: ["gsc-metrics", connectionId, days, currentOrganization?.id],
    enabled: !!connectionId && !!currentOrganization?.id,
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("gsc_metrics_daily" as any)
        .select("date, page, query, impressions, clicks, ctr, position")
        .eq("connection_id", connectionId!)
        .gte("date", since.toISOString().slice(0, 10))
        .order("date", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as unknown as GscMetricRow[];
    },
  });
}
