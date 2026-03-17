import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  details: unknown;
  created_at: string;
  ip_address: string | null;
}

interface ProfileMap {
  [id: string]: { email: string; full_name: string | null };
}

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create_user: { label: "Tạo user", color: "bg-green-500/10 text-green-500" },
  delete_user: { label: "Xóa user", color: "bg-red-500/10 text-red-500" },
  ban_user: { label: "Ban user", color: "bg-amber-500/10 text-amber-500" },
  unban_user: { label: "Unban user", color: "bg-blue-500/10 text-blue-500" },
  reset_password: { label: "Reset mật khẩu", color: "bg-purple-500/10 text-purple-500" },
  reset_usage: { label: "Reset usage", color: "bg-muted text-muted-foreground" },
  change_role: { label: "Đổi role", color: "bg-primary/10 text-primary" },
  change_subscription: { label: "Đổi subscription", color: "bg-primary/10 text-primary" },
  update_profile: { label: "Sửa profile", color: "bg-blue-500/10 text-blue-500" },
  add_to_org: { label: "Thêm vào org", color: "bg-green-500/10 text-green-500" },
  remove_from_org: { label: "Xóa khỏi org", color: "bg-red-500/10 text-red-500" },
  update_org_role: { label: "Đổi role org", color: "bg-purple-500/10 text-purple-500" },
};

export function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  async function fetchLogs() {
    setLoading(true);
    try {
      let query = supabase
        .from("admin_audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      setLogs((data || []) as AuditLog[]);
      setTotalCount(count || 0);

      // Fetch profiles for admin_ids and target_user_ids
      const userIds = new Set<string>();
      (data || []).forEach((log: AuditLog) => {
        userIds.add(log.admin_id);
        if (log.target_user_id) userIds.add(log.target_user_id);
      });

      if (userIds.size > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", Array.from(userIds));

        const map: ProfileMap = {};
        (profileData || []).forEach((p) => {
          map[p.id] = { email: p.email, full_name: p.full_name };
        });
        setProfiles(map);
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [currentPage, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const filteredLogs = searchQuery
    ? logs.filter((log) => {
        const adminEmail = profiles[log.admin_id]?.email || "";
        const targetEmail = log.target_user_id ? profiles[log.target_user_id]?.email || "" : "";
        const q = searchQuery.toLowerCase();
        return adminEmail.toLowerCase().includes(q) || targetEmail.toLowerCase().includes(q);
      })
    : logs;

  const formatDetails = (details: Record<string, unknown> | null) => {
    if (!details || Object.keys(details).length === 0) return "—";
    return Object.entries(details)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join(", ");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Hành động" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>User mục tiêu</TableHead>
                <TableHead>Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Không có log nào
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: "bg-muted text-muted-foreground" };
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {profiles[log.admin_id]?.email || log.admin_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <Badge className={actionInfo.color}>{actionInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.target_user_id
                          ? profiles[log.target_user_id]?.email || log.target_user_id.slice(0, 8)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {formatDetails(log.details as Record<string, unknown> | null)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Tổng {totalCount} logs
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{currentPage} / {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
