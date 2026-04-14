import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, RefreshCw, Loader2, History, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface SubRow {
  id: string;
  organization_id: string;
  user_id: string | null;
  plan_type: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  org_name: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  expired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  trial: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export default function SubscriptionManager() {
  const queryClient = useQueryClient();
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [paymentOrgId, setPaymentOrgId] = useState<string | null>(null);

  const subsQuery = useQuery({
    queryKey: ["admin_subscriptions"],
    queryFn: async (): Promise<SubRow[]> => {
      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select("id, organization_id, user_id, plan_type, status, current_period_start, current_period_end")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const orgIds = [...new Set((subs || []).map((s: any) => s.organization_id).filter(Boolean))];
      const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", orgIds);
      const orgMap: Record<string, string> = {};
      orgs?.forEach((o: any) => { orgMap[o.id] = o.name; });

      return (subs || []).map((s: any) => ({
        ...s,
        org_name: orgMap[s.organization_id] || "N/A",
      }));
    },
  });

  const paymentQuery = useQuery({
    queryKey: ["admin_payments", paymentOrgId],
    queryFn: async () => {
      if (!paymentOrgId) return [];
      const { data, error } = await supabase
        .from("payment_orders")
        .select("*")
        .eq("organization_id", paymentOrgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!paymentOrgId,
  });

  const changePlanMutation = useMutation({
    mutationFn: async ({ subId, planType }: { subId: string; planType: "free" | "starter" | "pro" | "enterprise" }) => {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan_type: planType,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .eq("id", subId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_subscriptions"] });
      toast.success("Đã đổi gói");
    },
    onError: (err) => toast.error("Lỗi: " + err.message),
  });

  const renewMutation = useMutation({
    mutationFn: async (subId: string) => {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .eq("id", subId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_subscriptions"] });
      toast.success("Đã gia hạn");
    },
    onError: (err) => toast.error("Lỗi: " + err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (subId: string) => {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", subId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_subscriptions"] });
      toast.success("Đã hủy subscription");
    },
    onError: (err) => toast.error("Lỗi: " + err.message),
  });

  const exportCSV = () => {
    const rows = filtered;
    const csv = [
      ["Workspace", "Plan", "Status", "Period Start", "Period End"].join(","),
      ...rows.map((r) =>
        [r.org_name, r.plan_type, r.status, r.current_period_start, r.current_period_end].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscriptions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const allSubs = subsQuery.data || [];
  const filtered = allSubs.filter((s) => {
    if (filterPlan !== "all" && s.plan_type !== filterPlan) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (search && !s.org_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const isLoading = subsQuery.isLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <CardTitle className="text-lg">Danh sách Subscriptions ({filtered.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm workspace..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Gói" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả gói</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Gói</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hết hạn</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{sub.org_name}</TableCell>
                    <TableCell>
                      <Select
                        value={sub.plan_type}
                        onValueChange={(val) => changePlanMutation.mutate({ subId: sub.id, planType: val })}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[sub.status] || ""}>{sub.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.current_period_end ? format(new Date(sub.current_period_end), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => renewMutation.mutate(sub.id)}
                        title="Gia hạn"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setPaymentOrgId(sub.organization_id)} title="Lịch sử thanh toán">
                            <History className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Lịch sử thanh toán — {sub.org_name}</DialogTitle>
                          </DialogHeader>
                          <div className="max-h-[400px] overflow-y-auto">
                            {paymentQuery.isLoading ? (
                              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                            ) : paymentQuery.data && paymentQuery.data.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Ngày</TableHead>
                                    <TableHead>Gói</TableHead>
                                    <TableHead>Số tiền</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paymentQuery.data.map((p: any) => (
                                    <TableRow key={p.id}>
                                      <TableCell className="text-sm">{format(new Date(p.created_at), "dd/MM/yyyy")}</TableCell>
                                      <TableCell className="text-sm capitalize">{p.plan_type}</TableCell>
                                      <TableCell className="text-sm">{Number(p.amount).toLocaleString()}₫</TableCell>
                                      <TableCell><Badge variant="outline" className="text-xs">{p.status}</Badge></TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">Chưa có lịch sử thanh toán</p>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      {sub.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => cancelMutation.mutate(sub.id)}
                          title="Hủy"
                        >
                          ✕
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Không tìm thấy subscription nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
