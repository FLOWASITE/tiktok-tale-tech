import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Copy, Download, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

interface PaymentHistoryDialogProps {
  orgId: string | null;
  orgName: string;
  open: boolean;
  onClose: () => void;
}

function escapeCSV(value: string): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function PaymentHistoryDialog({ orgId, orgName, open, onClose }: PaymentHistoryDialogProps) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const paymentQuery = useQuery({
    queryKey: ["admin_payments", orgId],
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
    enabled: !!orgId && open,
  });

  const filtered = useMemo(() => {
    if (!paymentQuery.data) return [];
    let list = [...paymentQuery.data];
    if (dateFrom) list = list.filter((p: any) => new Date(p.created_at) >= dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      list = list.filter((p: any) => new Date(p.created_at) <= end);
    }
    return list;
  }, [paymentQuery.data, dateFrom, dateTo]);

  const paymentTotal = useMemo(() => {
    return filtered
      .filter((p: any) => p.status === "success" || p.status === "completed")
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  }, [filtered]);

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
        p.status,
      ].map(escapeCSV);
    });
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_${orgName.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${filtered.length} giao dịch`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setDateFrom(undefined); setDateTo(undefined); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lịch sử thanh toán — {orgName}</DialogTitle>
        </DialogHeader>

        {/* Date filter + Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <CalendarIcon className="h-3 w-3" />
                {dateFrom ? format(dateFrom, "dd/MM") : "Từ"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <CalendarIcon className="h-3 w-3" />
                {dateTo ? format(dateTo, "dd/MM") : "Đến"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
            </PopoverContent>
          </Popover>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>Xóa</Button>
          )}
          <Button variant="outline" size="sm" className="gap-1 text-xs ml-auto" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-3 w-3" /> CSV
          </Button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {paymentQuery.isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Gói</TableHead>
                  <TableHead>Chu kỳ</TableHead>
                  <TableHead>Mã GD</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p: any) => {
                  const txnRef = p.vnpay_txn_ref || (p.metadata as any)?.vnpay_txn_ref || p.payment_reference || "—";
                  const amount = Number(p.amount || 0);
                  const isRefund = amount < 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{format(new Date(p.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-sm capitalize">{p.plan_type}</TableCell>
                      <TableCell className="text-sm capitalize">{p.billing_cycle || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {txnRef !== "—" ? (
                          <button
                            className="flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                            onClick={() => copyToClipboard(txnRef)}
                            title="Click để copy"
                          >
                            {txnRef.length > 16 ? txnRef.slice(0, 16) + "…" : txnRef}
                            <Copy className="h-3 w-3" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className={`text-sm font-medium ${isRefund ? "text-destructive" : ""}`}>
                        {isRefund ? "Hoàn " : ""}{Math.abs(amount).toLocaleString()}₫
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${PAYMENT_STATUS_COLORS[p.status] || ""}`}>{p.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
  );
}
