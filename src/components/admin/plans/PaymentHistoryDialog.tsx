import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy } from "lucide-react";
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

export default function PaymentHistoryDialog({ orgId, orgName, open, onClose }: PaymentHistoryDialogProps) {
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

  const paymentTotal = useMemo(() => {
    if (!paymentQuery.data) return 0;
    return paymentQuery.data
      .filter((p: any) => p.status === "success" || p.status === "completed")
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  }, [paymentQuery.data]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Đã copy mã giao dịch"));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lịch sử thanh toán — {orgName}</DialogTitle>
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
                  <TableHead>Mã GD</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentQuery.data.map((p: any) => {
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
