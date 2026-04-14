import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Loader2, Copy, Download, CalendarIcon, DollarSign, Receipt, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 15;

const STATUS_LABELS: Record<string, string> = {
  success: "Thành công",
  completed: "Thành công",
  pending: "Đang chờ",
  failed: "Thất bại",
};

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

export default function PaymentHistory() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);

  const orgId = currentOrganization?.id;

  const paymentsQuery = useQuery({
    queryKey: ["user_payments", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("payment_orders")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && !!user,
  });

  const allPayments = paymentsQuery.data || [];

  const stats = useMemo(() => {
    const successPayments = allPayments.filter((p: any) => p.status === "success" || p.status === "completed");
    const totalSpent = successPayments.reduce((s: number, p: any) => s + Math.max(0, Number(p.amount || 0)), 0);
    return { total: allPayments.length, successCount: successPayments.length, totalSpent };
  }, [allPayments]);

  const filtered = useMemo(() => {
    let list = [...allPayments];
    if (filterStatus !== "all") list = list.filter((p: any) => p.status === filterStatus);
    if (dateFrom) list = list.filter((p: any) => new Date(p.created_at) >= dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      list = list.filter((p: any) => new Date(p.created_at) <= end);
    }
    return list;
  }, [allPayments, filterStatus, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Đã copy mã giao dịch"));
  };

  const exportCSV = () => {
    const header = ["Ngày", "Gói", "Chu kỳ", "Mã GD", "Số tiền", "Trạng thái"];
    const rows = filtered.map((p: any) => {
      const txnRef = p.vnpay_txn_ref || (p.metadata as any)?.vnpay_txn_ref || p.payment_reference || "";
      return [
        format(new Date(p.created_at), "dd/MM/yyyy HH:mm"),
        p.plan_type,
        p.billing_cycle || "",
        txnRef,
        String(p.amount || 0),
        STATUS_LABELS[p.status] || p.status,
      ].map(escapeCSV);
    });
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lich_su_thanh_toan_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${filtered.length} giao dịch`);
  };

  if (!orgId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Vui lòng chọn workspace để xem lịch sử thanh toán.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lịch sử thanh toán</h1>
        <p className="text-muted-foreground">Xem lại các giao dịch thanh toán của workspace</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900"><Receipt className="h-5 w-5 text-blue-600 dark:text-blue-300" /></div>
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
              <div className="p-2 rounded-md bg-green-100 dark:bg-green-900"><CheckCircle className="h-5 w-5 text-green-600 dark:text-green-300" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Thành công</p>
                <p className="text-2xl font-bold">{stats.successCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900"><DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-300" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng chi tiêu</p>
                <p className="text-2xl font-bold">{stats.totalSpent.toLocaleString()}₫</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="success">Thành công</SelectItem>
            <SelectItem value="pending">Đang chờ</SelectItem>
            <SelectItem value="failed">Thất bại</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <CalendarIcon className="h-4 w-4" />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Từ ngày"}
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
              {dateTo ? format(dateTo, "dd/MM/yyyy") : "Đến ngày"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(1); }} initialFocus />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setPage(1); }}>Xóa bộ lọc ngày</Button>
        )}
        <Button variant="outline" size="sm" className="gap-1 ml-auto" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="h-4 w-4" /> Xuất CSV
        </Button>
      </div>

      {/* Table */}
      {paymentsQuery.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày</TableHead>
                <TableHead>Gói</TableHead>
                <TableHead>Chu kỳ</TableHead>
                <TableHead>Mã giao dịch</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Chưa có giao dịch nào</TableCell></TableRow>
              ) : paginated.map((p: any) => {
                const txnRef = p.vnpay_txn_ref || (p.metadata as any)?.vnpay_txn_ref || p.payment_reference || "";
                const amount = Number(p.amount || 0);
                const isRefund = amount < 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm whitespace-nowrap">{format(new Date(p.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell className="text-sm capitalize">{p.plan_type}</TableCell>
                    <TableCell className="text-sm capitalize">{p.billing_cycle || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {txnRef ? (
                        <button className="flex items-center gap-1 text-primary hover:underline font-mono text-xs" onClick={() => copyToClipboard(txnRef)} title="Click để copy">
                          {txnRef.length > 18 ? txnRef.slice(0, 18) + "…" : txnRef}
                          <Copy className="h-3 w-3" />
                        </button>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className={`text-sm font-medium text-right ${isRefund ? "text-destructive" : ""}`}>
                      {isRefund ? "Hoàn " : ""}{Math.abs(amount).toLocaleString()}₫
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_COLORS[p.status] || ""}`}>
                        {STATUS_LABELS[p.status] || p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)); }} />
            </PaginationItem>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
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
    </div>
  );
}
