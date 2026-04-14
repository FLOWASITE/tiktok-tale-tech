import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Download, Search, RefreshCw, Loader2, History, ArrowUpDown, Users, CheckCircle, XCircle, CreditCard, Ban, ChevronUp, ChevronDown } from "lucide-react";
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
  created_at: string;
  org_name: string;
  owner_email: string;
}

type SortField = "org_name" | "plan_type" | "status" | "current_period_end" | "created_at";
type SortOrder = "asc" | "desc";

interface ConfirmAction {
  type: "change_plan" | "renew" | "cancel" | "bulk_renew" | "bulk_cancel";
  subId?: string;
  planType?: string;
  orgName?: string;
  currentPlan?: string;
  count?: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  expired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  trial: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const ITEMS_PER_PAGE = 20;

export default function SubscriptionManager() {
  const queryClient = useQueryClient();
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [paymentOrgId, setPaymentOrgId] = useState<string | null>(null);
  const [paymentOrgName, setPaymentOrgName] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [pendingPlanChange, setPendingPlanChange] = useState<{ subId: string; planType: string } | null>(null);

  // Fetch subscriptions with owner emails
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

  // Payment history
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

  // Mutations
  const changePlanMutation = useMutation({
    mutationFn: async ({ subId, planType }: { subId: string; planType: string }) => {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan_type: planType as any,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .eq("id", subId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_subscriptions"] });
      toast.success("Đã đổi gói thành công");
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
          status: "active" as any,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .eq("id", subId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_subscriptions"] });
      toast.success("Đã gia hạn thành công");
    },
    onError: (err) => toast.error("Lỗi: " + err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (subId: string) => {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "cancelled" as any, cancelled_at: new Date().toISOString() })
        .eq("id", subId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_subscriptions"] });
      toast.success("Đã hủy subscription");
    },
    onError: (err) => toast.error("Lỗi: " + err.message),
  });

  // Confirm action handler
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      switch (confirmAction.type) {
        case "change_plan":
          if (pendingPlanChange) {
            await changePlanMutation.mutateAsync(pendingPlanChange as any);
            setPendingPlanChange(null);
          }
          break;
        case "renew":
          if (confirmAction.subId) await renewMutation.mutateAsync(confirmAction.subId);
          break;
        case "cancel":
          if (confirmAction.subId) await cancelMutation.mutateAsync(confirmAction.subId);
          break;
        case "bulk_renew":
          for (const id of selectedIds) {
            await renewMutation.mutateAsync(id);
          }
          setSelectedIds(new Set());
          break;
        case "bulk_cancel":
          for (const id of selectedIds) {
            await cancelMutation.mutateAsync(id);
          }
          setSelectedIds(new Set());
          break;
      }
    } catch {
      // errors handled by mutation callbacks
    }
    setConfirmAction(null);
  };

  // Sort & filter
  const allSubs = subsQuery.data || [];

  const filtered = useMemo(() => {
    let result = allSubs.filter((s) => {
      if (filterPlan !== "all" && s.plan_type !== filterPlan) return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.org_name.toLowerCase().includes(q) || s.owner_email.toLowerCase().includes(q);
      }
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      const aVal = a[sortField] || "";
      const bVal = b[sortField] || "";
      cmp = String(aVal).localeCompare(String(bVal));
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [allSubs, filterPlan, filterStatus, search, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Summary stats
  const stats = useMemo(() => {
    const total = allSubs.length;
    const active = allSubs.filter((s) => s.status === "active").length;
    const cancelledExpired = allSubs.filter((s) => s.status === "cancelled" || s.status === "expired").length;
    const paid = allSubs.filter((s) => s.plan_type !== "free").length;
    return { total, active, cancelledExpired, paid, paidRatio: total > 0 ? ((paid / total) * 100).toFixed(1) : "0" };
  }, [allSubs]);

  // Selection helpers
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
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortOrder === "asc" ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const exportCSV = () => {
    const rows = filtered;
    const csv = [
      ["Workspace", "Email", "Plan", "Status", "Period Start", "Period End", "Created At"].join(","),
      ...rows.map((r) =>
        [r.org_name, r.owner_email, r.plan_type, r.status, r.current_period_start, r.current_period_end, r.created_at].join(",")
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

  const openPaymentDialog = (orgId: string, orgName: string) => {
    setPaymentOrgId(orgId);
    setPaymentOrgName(orgName);
    setPaymentDialogOpen(true);
  };

  const closePaymentDialog = () => {
    setPaymentDialogOpen(false);
    setPaymentOrgId(null);
    setPaymentOrgName("");
  };

  const paymentTotal = useMemo(() => {
    if (!paymentQuery.data) return 0;
    return paymentQuery.data
      .filter((p: any) => p.status === "success" || p.status === "completed")
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  }, [paymentQuery.data]);

  const isLoading = subsQuery.isLoading;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Tổng cộng</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Đang hoạt động</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.cancelledExpired}</p>
              <p className="text-xs text-muted-foreground">Đã hủy / Hết hạn</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.paidRatio}%</p>
              <p className="text-xs text-muted-foreground">Tỷ lệ trả phí ({stats.paid})</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
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
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk action toolbar */}
          {someSelected && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-lg border border-border/50">
              <span className="text-sm font-medium">Đã chọn {selectedIds.size}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction({ type: "bulk_renew", count: selectedIds.size })}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Gia hạn tất cả
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setConfirmAction({ type: "bulk_cancel", count: selectedIds.size })}
              >
                <Ban className="h-3.5 w-3.5 mr-1" /> Hủy tất cả
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Bỏ chọn
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox checked={allPageSelected} onCheckedChange={toggleSelectAll} />
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("org_name")}>
                        <div className="flex items-center">Workspace <SortIcon field="org_name" /></div>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">Email</TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("plan_type")}>
                        <div className="flex items-center">Gói <SortIcon field="plan_type" /></div>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                        <div className="flex items-center">Trạng thái <SortIcon field="status" /></div>
                      </TableHead>
                      <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => handleSort("created_at")}>
                        <div className="flex items-center">Ngày tạo <SortIcon field="created_at" /></div>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("current_period_end")}>
                        <div className="flex items-center">Hết hạn <SortIcon field="current_period_end" /></div>
                      </TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((sub) => (
                      <TableRow key={sub.id} className={selectedIds.has(sub.id) ? "bg-primary/5" : ""}>
                        <TableCell>
                          <Checkbox checked={selectedIds.has(sub.id)} onCheckedChange={() => toggleSelect(sub.id)} />
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{sub.org_name}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[180px] truncate">
                          {sub.owner_email}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={sub.plan_type}
                            onValueChange={(val) => {
                              setPendingPlanChange({ subId: sub.id, planType: val });
                              setConfirmAction({
                                type: "change_plan",
                                subId: sub.id,
                                planType: val,
                                orgName: sub.org_name,
                                currentPlan: sub.plan_type,
                              });
                            }}
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
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {sub.created_at ? format(new Date(sub.created_at), "dd/MM/yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {sub.current_period_end ? format(new Date(sub.current_period_end), "dd/MM/yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmAction({ type: "renew", subId: sub.id, orgName: sub.org_name })}
                            title="Gia hạn"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPaymentDialog(sub.organization_id, sub.org_name)}
                            title="Lịch sử thanh toán"
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                          {sub.status === "active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setConfirmAction({ type: "cancel", subId: sub.id, orgName: sub.org_name })}
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
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Không tìm thấy subscription nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Hiển thị {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} / {filtered.length}
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              isActive={pageNum === page}
                              onClick={() => setPage(pageNum)}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment History Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => { if (!open) closePaymentDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lịch sử thanh toán — {paymentOrgName}</DialogTitle>
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
                    <TableHead>Chu kỳ</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentQuery.data.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{format(new Date(p.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-sm capitalize">{p.plan_type}</TableCell>
                      <TableCell className="text-sm capitalize">{p.billing_cycle || "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{Number(p.amount).toLocaleString()}₫</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${PAYMENT_STATUS_COLORS[p.status] || ""}`}>
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Chưa có lịch sử thanh toán</p>
            )}
          </div>
          {paymentTotal > 0 && (
            <div className="flex justify-between items-center pt-3 border-t border-border/50">
              <span className="text-sm text-muted-foreground">Tổng chi tiêu</span>
              <span className="text-lg font-bold text-primary">{paymentTotal.toLocaleString()}₫</span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) { setConfirmAction(null); setPendingPlanChange(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "change_plan" && "Xác nhận đổi gói"}
              {confirmAction?.type === "renew" && "Xác nhận gia hạn"}
              {confirmAction?.type === "cancel" && "Xác nhận hủy subscription"}
              {confirmAction?.type === "bulk_renew" && "Xác nhận gia hạn hàng loạt"}
              {confirmAction?.type === "bulk_cancel" && "Xác nhận hủy hàng loạt"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "change_plan" && (
                <>Đổi gói từ <strong className="capitalize">{confirmAction.currentPlan}</strong> → <strong className="capitalize">{confirmAction.planType}</strong> cho workspace <strong>{confirmAction.orgName}</strong>?</>
              )}
              {confirmAction?.type === "renew" && (
                <>Gia hạn thêm 30 ngày cho workspace <strong>{confirmAction.orgName}</strong>?</>
              )}
              {confirmAction?.type === "cancel" && (
                <>Bạn chắc chắn muốn hủy subscription của <strong>{confirmAction.orgName}</strong>? Hành động này không thể hoàn tác.</>
              )}
              {confirmAction?.type === "bulk_renew" && (
                <>Gia hạn thêm 30 ngày cho <strong>{confirmAction.count}</strong> subscription đã chọn?</>
              )}
              {confirmAction?.type === "bulk_cancel" && (
                <>Bạn chắc chắn muốn hủy <strong>{confirmAction.count}</strong> subscription đã chọn? Hành động này không thể hoàn tác.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={confirmAction?.type === "cancel" || confirmAction?.type === "bulk_cancel" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
