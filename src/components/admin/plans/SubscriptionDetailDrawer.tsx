import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { SubRow } from "./subscription-types";

interface SubscriptionDetailDrawerProps {
  sub: SubRow | null;
  open: boolean;
  onClose: () => void;
}

export default function SubscriptionDetailDrawer({ sub, open, onClose }: SubscriptionDetailDrawerProps) {
  // Fetch full subscription record
  const detailQuery = useQuery({
    queryKey: ["admin_sub_detail", sub?.id],
    queryFn: async () => {
      if (!sub?.id) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("id", sub.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!sub?.id,
  });

  // Fetch recent payment orders for timeline
  const timelineQuery = useQuery({
    queryKey: ["admin_sub_timeline", sub?.organization_id],
    queryFn: async () => {
      if (!sub?.organization_id) return [];
      const { data, error } = await supabase
        .from("payment_orders")
        .select("id, created_at, plan_type, amount, status, billing_cycle, vnpay_txn_ref")
        .eq("organization_id", sub.organization_id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!sub?.organization_id,
  });

  const detail = detailQuery.data;
  const daysLeft = sub?.current_period_end ? differenceInDays(new Date(sub.current_period_end), new Date()) : null;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">Chi tiết Subscription</SheetTitle>
        </SheetHeader>

        {!sub ? null : detailQuery.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Basic info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Thông tin</h4>
              <InfoRow label="Workspace" value={sub.org_name} />
              <InfoRow label="Email" value={sub.owner_email} />
              <InfoRow label="Gói" value={<Badge variant="outline" className="capitalize">{sub.plan_type}</Badge>} />
              <InfoRow label="Trạng thái" value={<Badge className="capitalize">{sub.status}</Badge>} />
              {detail?.previous_plan_type && (
                <InfoRow label="Gói trước" value={<span className="capitalize">{detail.previous_plan_type as string}</span>} />
              )}
            </div>

            {/* Period info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Chu kỳ</h4>
              <InfoRow label="Bắt đầu" value={sub.current_period_start ? format(new Date(sub.current_period_start), "dd/MM/yyyy HH:mm") : "—"} />
              <InfoRow label="Hết hạn" value={sub.current_period_end ? format(new Date(sub.current_period_end), "dd/MM/yyyy HH:mm") : "—"} />
              {daysLeft !== null && (
                <InfoRow
                  label="Còn lại"
                  value={
                    <span className={daysLeft < 0 ? "text-destructive font-medium" : daysLeft <= 7 ? "text-yellow-600 font-medium" : ""}>
                      {daysLeft < 0 ? "Đã hết hạn" : `${daysLeft} ngày`}
                    </span>
                  }
                />
              )}
              <InfoRow label="Ngày tạo" value={sub.created_at ? format(new Date(sub.created_at), "dd/MM/yyyy HH:mm") : "—"} />
            </div>

            {/* Extra metadata */}
            {detail && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Metadata</h4>
                {(detail as any).payment_provider && <InfoRow label="Payment Provider" value={(detail as any).payment_provider} />}
                {(detail as any).payment_reference && <InfoRow label="Payment Ref" value={<span className="font-mono text-xs">{(detail as any).payment_reference}</span>} />}
                {(detail as any).trial_end && <InfoRow label="Trial End" value={format(new Date((detail as any).trial_end), "dd/MM/yyyy")} />}
                {(detail as any).cancelled_at && <InfoRow label="Cancelled At" value={format(new Date((detail as any).cancelled_at), "dd/MM/yyyy HH:mm")} />}
              </div>
            )}

            {/* Payment timeline */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Lịch sử thanh toán</h4>
              {timelineQuery.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : timelineQuery.data && timelineQuery.data.length > 0 ? (
                <div className="space-y-2">
                  {timelineQuery.data.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                      <div>
                        <span className="capitalize font-medium">{p.plan_type}</span>
                        <span className="text-muted-foreground ml-2">{format(new Date(p.created_at), "dd/MM/yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={Number(p.amount) < 0 ? "text-destructive font-medium" : "font-medium"}>
                          {Number(p.amount) < 0 ? "Hoàn " : ""}{Math.abs(Number(p.amount)).toLocaleString()}₫
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">{p.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có lịch sử</p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
