import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Download, Search, RefreshCw, Loader2, Ban, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import type { SubRow, SortField, SortOrder, ConfirmAction } from "./subscription-types";
import SubscriptionSummaryCards from "./SubscriptionSummaryCards";
import SubscriptionTable from "./SubscriptionTable";
import SubscriptionDetailDrawer from "./SubscriptionDetailDrawer";
import PaymentHistoryDialog from "./PaymentHistoryDialog";

const ITEMS_PER_PAGE = 20;

function escapeCSVValue(value: string): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getDaysRemaining(dateStr: string): number {
  return differenceInDays(new Date(dateStr), new Date());
}

export default function SubscriptionManager() {
  const queryClient = useQueryClient();
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [pendingPlanChange, setPendingPlanChange] = useState<{ subId: string; planType: string } | null>(null);
  const [resetCycle, setResetCycle] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Detail drawer
  const [detailSub, setDetailSub] = useState<SubRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Payment dialog
  const [paymentOrgId, setPaymentOrgId] = useState<string | null>(null);
  const [paymentOrgName, setPaymentOrgName] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Fetch subscriptions
  const subsQuery = useQuery({
    queryKey: ["admin_subscriptions"],
    queryFn: async (): Promise<SubRow[]> => {
      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select("id, organization_id, user_id, plan_type, status, current_period_start, current_period_end, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const orgIds = [...new Set((subs || []).map((s: any) => s.organization_id).filter(Boolean))];
      const userIds = [...new Set((subs || []).map((s: any) => s.user_id).filter(Boolean))];

      const [orgsRes, profilesRes] = await Promise.all([
        supabase.from("organizations").select("id, name").in("id", orgIds),
        userIds.length > 0 ? supabase.from("profiles").select("id, email").in("id", userIds) : Promise.resolve({ data: [] }),
      ]);

      const orgMap: Record<string, string> = {};
      orgsRes.data?.forEach((o: any) => { orgMap[o.id] = o.name; });
      const emailMap: Record<string, string> = {};
      profilesRes.data?.forEach((p: any) => { emailMap[p.id] = p.email; });

      return (subs || []).map((s: any) => ({
        ...s,
        org_name: orgMap[s.organization_id] || "N/A",
        owner_email: emailMap[s.user_id] || "—",
      }));
    },
  });

  // Mutations
  const changePlanMutation = useMutation({
    mutationFn: async ({ subId, planType, shouldResetCycle }: { subId: string; planType: string; shouldResetCycle: boolean }) => {
      const updateData: any = { plan_type: planType };
      if (shouldResetCycle) {
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);
        updateData.current_period_start = new Date().toISOString();
        updateData.current_period_end = periodEnd.toISOString();
      }
      const { error } = await supabase.from("subscriptions").update(updateData).eq("id", subId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_subscriptions"] }); toast.success("Đã đổi gói thành công"); },
    onError: (err) => toast.error("Lỗi: " + err.message),
  });

  const renewMutation = useMutation({
    mutationFn: async (subId: string) => {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);
      const { error } = await supabase.from("subscriptions").update({
        status: "active" as any,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
      }).eq("id", subId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_subscriptions"] }); toast.success("Đã gia hạn thành công"); },
    onError: (err) => toast.error("Lỗi: " + err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (subId: string) => {
      const { error } = await supabase.from("subscriptions").update({ status: "cancelled" as any, cancelled_at: new Date().toISOString() }).eq("id", subId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_subscriptions"] }); toast.success("Đã hủy subscription"); },
    onError: (err) => toast.error("Lỗi: " + err.message),
  });

  const isMutating = changePlanMutation.isPending || renewMutation.isPending || cancelMutation.isPending || !!bulkProgress;

  // Confirm handler
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      switch (confirmAction.type) {
        case "change_plan":
          if (pendingPlanChange) {
            await changePlanMutation.mutateAsync({ ...pendingPlanChange, shouldResetCycle: resetCycle });
            setPendingPlanChange(null);
            setResetCycle(false);
          }
          break;
        case "renew":
          if (confirmAction.subId) await renewMutation.mutateAsync(confirmAction.subId);
          break;
        case "cancel":
          if (confirmAction.subId) await cancelMutation.mutateAsync(confirmAction.subId);
          break;
        case "bulk_renew": {
          const ids = Array.from(selectedIds);
          for (let i = 0; i < ids.length; i++) {
            setBulkProgress({ current: i + 1, total: ids.length });
            await renewMutation.mutateAsync(ids[i]);
          }
          setBulkProgress(null);
          setSelectedIds(new Set());
          break;
        }
        case "bulk_cancel": {
          const ids = Array.from(selectedIds);
          for (let i = 0; i < ids.length; i++) {
            setBulkProgress({ current: i + 1, total: ids.length });
            await cancelMutation.mutateAsync(ids[i]);
          }
          setBulkProgress(null);
          setSelectedIds(new Set());
          break;
        }
      }
    } catch { /* handled by mutation */ }
    setConfirmAction(null);
  };

  // Filter & sort
  const allSubs = subsQuery.data || [];

  const filtered = useMemo(() => {
    let result = allSubs.filter((s) => {
      if (filterPlan !== "all" && s.plan_type !== filterPlan) return false;
      if (filterStatus === "expiring_soon") {
        if (s.status !== "active") return false;
        const days = getDaysRemaining(s.current_period_end);
        return days >= 0 && days <= 7;
      }
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.org_name.toLowerCase().includes(q) || s.owner_email.toLowerCase().includes(q);
      }
      return true;
    });
    result.sort((a, b) => {
      const cmp = String(a[sortField] || "").localeCompare(String(b[sortField] || ""));
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return result;
  }, [allSubs, filterPlan, filterStatus, search, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const stats = useMemo(() => {
    const total = allSubs.length;
    const active = allSubs.filter((s) => s.status === "active").length;
    const cancelledExpired = allSubs.filter((s) => s.status === "cancelled" || s.status === "expired").length;
    const paid = allSubs.filter((s) => s.plan_type !== "free").length;
    const expiringSoon = allSubs.filter((s) => {
      if (s.status !== "active") return false;
      const days = getDaysRemaining(s.current_period_end);
      return days >= 0 && days <= 7;
    }).length;
    return { total, active, cancelledExpired, paid, expiringSoon, paidRatio: total > 0 ? ((paid / total) * 100).toFixed(1) : "0" };
  }, [allSubs]);

  const allPageSelected = paginated.length > 0 && paginated.every((s) => selectedIds.has(s.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };
  const toggleSelectAll = () => {
    if (allPageSelected) {
      const next = new Set(selectedIds);
      paginated.forEach((s) => next.delete(s.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      paginated.forEach((s) => next.add(s.id));
      setSelectedIds(next);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortOrder("asc"); }
    setPage(1);
  };

  const exportCSV = () => {
    const csv = [
      ["Workspace", "Email", "Plan", "Status", "Period Start", "Period End", "Created At"].map(escapeCSVValue).join(","),
      ...filtered.map((r) =>
        [r.org_name, r.owner_email, r.plan_type, r.status, r.current_period_start, r.current_period_end, r.created_at].map(escapeCSVValue).join(",")
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "subscriptions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = subsQuery.isLoading;
  const isRefetching = subsQuery.isRefetching;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <SubscriptionSummaryCards stats={stats} activeFilter={filterStatus} onFilter={(s) => { setFilterStatus(s); setPage(1); }} />

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <CardTitle className="text-lg">Danh sách Subscriptions ({filtered.length})</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => subsQuery.refetch()} disabled={isRefetching}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? "animate-spin" : ""}`} /> Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-1" /> Export CSV
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Tìm workspace hoặc email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8 h-9" />
              </div>
              <Select value={filterPlan} onValueChange={(v) => { setFilterPlan(v); setPage(1); }}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Gói" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả gói</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
                <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring_soon">
                    <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-yellow-500" /> Sắp hết hạn (≤7 ngày)</span>
                  </SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {someSelected && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-lg border border-border/50">
                <span className="text-sm font-medium">Đã chọn {selectedIds.size}</span>
                <Button variant="outline" size="sm" disabled={isMutating}
                  onClick={() => setConfirmAction({ type: "bulk_renew", count: selectedIds.size })}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Gia hạn tất cả
                </Button>
                <Button variant="outline" size="sm" disabled={isMutating}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setConfirmAction({ type: "bulk_cancel", count: selectedIds.size })}
                >
                  <Ban className="h-3.5 w-3.5 mr-1" /> Hủy tất cả
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Bỏ chọn</Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <SubscriptionTable
                paginated={paginated}
                filtered={filtered}
                page={page}
                totalPages={totalPages}
                itemsPerPage={ITEMS_PER_PAGE}
                sortField={sortField}
                sortOrder={sortOrder}
                selectedIds={selectedIds}
                isMutating={isMutating}
                allPageSelected={allPageSelected}
                onSort={handleSort}
                onPageChange={setPage}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onConfirmAction={setConfirmAction}
                onPlanChange={(subId, planType, orgName, currentPlan) => {
                  setPendingPlanChange({ subId, planType });
                  setConfirmAction({ type: "change_plan", subId, planType, orgName, currentPlan });
                }}
                onOpenPayment={(orgId, orgName) => { setPaymentOrgId(orgId); setPaymentOrgName(orgName); setPaymentDialogOpen(true); }}
                onOpenDetail={(sub) => { setDetailSub(sub); setDetailOpen(true); }}
              />
            )}
          </CardContent>
        </Card>

        <PaymentHistoryDialog
          orgId={paymentOrgId}
          orgName={paymentOrgName}
          open={paymentDialogOpen}
          onClose={() => { setPaymentDialogOpen(false); setTimeout(() => { setPaymentOrgId(null); setPaymentOrgName(""); }, 200); }}
        />

        <SubscriptionDetailDrawer sub={detailSub} open={detailOpen} onClose={() => { setDetailOpen(false); setTimeout(() => setDetailSub(null), 200); }} />

        {/* Confirm Action Dialog */}
        <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open && !bulkProgress) { setConfirmAction(null); setPendingPlanChange(null); setResetCycle(false); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmAction?.type === "change_plan" && "Xác nhận đổi gói"}
                {confirmAction?.type === "renew" && "Xác nhận gia hạn"}
                {confirmAction?.type === "cancel" && "Xác nhận hủy subscription"}
                {confirmAction?.type === "bulk_renew" && "Xác nhận gia hạn hàng loạt"}
                {confirmAction?.type === "bulk_cancel" && "Xác nhận hủy hàng loạt"}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  {confirmAction?.type === "change_plan" && (
                    <div className="space-y-3">
                      <p>Đổi gói từ <strong className="capitalize">{confirmAction.currentPlan}</strong> → <strong className="capitalize">{confirmAction.planType}</strong> cho workspace <strong>{confirmAction.orgName}</strong>?</p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={resetCycle} onCheckedChange={(c) => setResetCycle(!!c)} />
                        <span className="text-sm">Reset chu kỳ thanh toán (bắt đầu lại từ hôm nay)</span>
                      </label>
                    </div>
                  )}
                  {confirmAction?.type === "renew" && (
                    <p>Gia hạn thêm 30 ngày cho workspace <strong>{confirmAction.orgName}</strong>?</p>
                  )}
                  {confirmAction?.type === "cancel" && (
                    <p>Bạn chắc chắn muốn hủy subscription của <strong>{confirmAction.orgName}</strong>? Hành động này không thể hoàn tác.</p>
                  )}
                  {confirmAction?.type === "bulk_renew" && (
                    <p>Gia hạn thêm 30 ngày cho <strong>{confirmAction.count}</strong> subscription đã chọn?</p>
                  )}
                  {confirmAction?.type === "bulk_cancel" && (
                    <p>Bạn chắc chắn muốn hủy <strong>{confirmAction.count}</strong> subscription đã chọn? Hành động này không thể hoàn tác.</p>
                  )}
                  {bulkProgress && (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-medium">Đang xử lý {bulkProgress.current}/{bulkProgress.total}...</p>
                      <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isMutating}>Hủy bỏ</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmAction}
                disabled={isMutating}
                className={confirmAction?.type === "cancel" || confirmAction?.type === "bulk_cancel" ? "bg-destructive hover:bg-destructive/90" : ""}
              >
                {isMutating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Xác nhận
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
