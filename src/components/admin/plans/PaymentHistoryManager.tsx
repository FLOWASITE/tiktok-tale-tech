import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Loader2, Search, Download, Copy, DollarSign, AlertTriangle, CheckCircle, TrendingUp, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 20;

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function escapeCSV(value: string): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function PaymentHistoryManager() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<"created_at" | "amount">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const paymentsQuery = useQuery({
    queryKey: ["admin_all_payments"],
    queryFn: async () => {
      const { data: payments, error: pErr } = await supabase
        .from("payment_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      const orgIds = [...new Set((payments || []).map((p: any) => p.organization_id).filter(Boolean))];
      let orgMap: Record<string, { name: string; ownerEmail: string }> = {};

      if (orgIds.length > 0) {
        const { data: orgs } = await supabase.from("organizations").select("id, name, owner_id").in("id", orgIds);
        const ownerIds = [...new Set((orgs || []).map((o: any) => o.owner_id).filter(Boolean))];
        let profileMap: Record<string, string> = {};
        if (ownerIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", ownerIds);
          (profiles || []).forEach((p: any) => { profileMap[p.id] = p.email; });
        }
        (orgs || []).forEach((o: any) => {
          orgMap[o.id] = { name: o.name || "N/A", ownerEmail: profileMap[o.owner_id] || "" };
        });
      }

      return (payments || []).map((p: any) => ({
        ...p,
        org_name: orgMap[p.organization_id]?.name || "N/A",
        owner_email: orgMap[p.organization_id]?.ownerEmail || "",
        txn_ref: p.vnpay_txn_ref || (p.metadata as any)?.vnpay_txn_ref || p.payment_reference || "",
      }));
    },
  });

  const allPayments = paymentsQuery.data || [];

  // Summary stats
  const stats = useMemo(() => {
    const total = allPayments.length;
    const successPayments = allPayments.filter((p: any) => p.status === "success" || p.status === "completed");
    const totalRevenue = successPayments.reduce((s: number, p: any) => s + Math.max(0, Number(p.amount || 0)), 0);
    const failedCount = allPayments.filter((p: any) => p.status === "failed").length;
    const successRate = total > 0 ? ((successPayments.length / total) * 100).toFixed(1) : "0";
    return { total, totalRevenue, failedCount, successRate };
  }, [allPayments]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = [...allPayments];
    if (filterStatus !== "all") list = list.filter((p: any) => p.status === filterStatus);
    if (filterPlan !== "all") list = list.filter((p: any) => p.plan_type === filterPlan);
    if (dateFrom) list = list.filter((p: any) => new Date(p.created_at) >= dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      list = list.filter((p: any) => new Date(p.created_at) <= end);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p: any) =>
        p.org_name.toLowerCase().includes(q) ||
        p.owner_email.toLowerCase().includes(q) ||
        (p.txn_ref && p.txn_ref.toLowerCase().includes(q))
      );
    }
    list.sort((a: any, b: any) => {
      const aVal = sortField === "amount" ? Number(a.amount || 0) : new Date(a.created_at).getTime();
      const bVal = sortField === "amount" ? Number(b.amount || 0) : new Date(b.created_at).getTime();
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [allPayments, filterStatus, filterPlan, dateFrom, dateTo, search, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Đã copy mã giao dịch"));
  };

  const exportCSV = () => {
    const header = ["Ngày", "Workspace", "Email", "Gói", "Chu kỳ", "Mã GD", "Số tiền", "Trạng thái"];
    const rows = filtered.map((p: any) => [
      format(new Date(p.created_at), "dd/MM/yyyy HH:mm"),
      p.org_name,
      p.owner_email,
      p.plan_type,
      p.billing_cycle || "",
      p.txn_ref,
      String(p.amount || 0),
      p.status,
    ].map(escapeCSV));
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment_history_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${filtered.length} giao dịch`);
  };

  const toggleSort = (field: "created_at" | "amount") => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("desc"); }
  };

  if (paymentsQuery.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900"><DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-300" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng giao dịch</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-100 dark:bg-green-900"><TrendingUp className="h-5 w-5 text-green-600 dark:text-green-300" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng doanh thu</p>
                <p className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()}₫</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-red-100 dark:bg-red-900"><AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-300" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Giao dịch thất bại</p>
                <p className="text-2xl font-bold">{stats.failedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900"><CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-300" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Tỷ lệ thành công</p>
                <p className="text-2xl font-bold">{stats.successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm workspace, email, mã GD..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="success">Thành công</SelectItem>
            <SelectItem value="pending">Đang chờ</SelectItem>
            <SelectItem value="failed">Thất bại</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPlan} onValueChange={(v) => { setFilterPlan(v); setPage(1); }}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Gói" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả gói</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <CalendarIcon className="h-4 w-4" />
              {dateFrom ? format(dateFrom, "dd/MM") : "Từ"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(1); }} initialFocus />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <CalendarIcon className="h-4 w-4" />
              {dateTo ? format(dateTo, "dd/MM") : "Đến"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(1); }} initialFocus />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setPage(1); }}>Xóa ngày</Button>
        )}
        <Button variant="outline" size="sm" className="gap-1 ml-auto" onClick={exportCSV}>
          <Download className="h-4 w-4" /> CSV ({filtered.length})
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                Ngày {sortField === "created_at" && (sortOrder === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Gói</TableHead>
              <TableHead>Chu kỳ</TableHead>
              <TableHead>Mã GD</TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("amount")}>
                Số tiền {sortField === "amount" && (sortOrder === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Không có giao dịch nào</TableCell></TableRow>
            ) : paginated.map((p: any) => {
              const amount = Number(p.amount || 0);
              const isRefund = amount < 0;
              return (
                <TableRow key={p.id}>
                  <TableCell className="text-sm whitespace-nowrap">{format(new Date(p.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell className="text-sm font-medium max-w-[160px] truncate">{p.org_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{p.owner_email || "—"}</TableCell>
                  <TableCell className="text-sm capitalize">{p.plan_type}</TableCell>
                  <TableCell className="text-sm capitalize">{p.billing_cycle || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {p.txn_ref ? (
                      <button className="flex items-center gap-1 text-primary hover:underline font-mono text-xs" onClick={() => copyToClipboard(p.txn_ref)} title="Click để copy">
                        {p.txn_ref.length > 14 ? p.txn_ref.slice(0, 14) + "…" : p.txn_ref}
                        <Copy className="h-3 w-3" />
                      </button>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className={`text-sm font-medium text-right ${isRefund ? "text-destructive" : ""}`}>
                    {isRefund ? "Hoàn " : ""}{Math.abs(amount).toLocaleString()}₫
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${STATUS_COLORS[p.status] || ""}`}>{p.status}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)); }} />
            </PaginationItem>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) pageNum = i + 1;
              else if (page <= 4) pageNum = i + 1;
              else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
              else pageNum = page - 3 + i;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink href="#" isActive={pageNum === page} onClick={(e) => { e.preventDefault(); setPage(pageNum); }}>
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, page + 1)); }} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <p className="text-xs text-muted-foreground text-right">Hiển thị {paginated.length}/{filtered.length} giao dịch</p>
    </div>
  );
}
