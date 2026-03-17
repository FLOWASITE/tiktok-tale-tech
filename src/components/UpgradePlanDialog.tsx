import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Loader2, CreditCard, Clock, ArrowRight } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UpgradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLAN_ORDER = ["free", "starter", "pro", "business", "enterprise"] as const;

const PLAN_NAMES: Record<string, string> = {
  free: "Miễn phí",
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
};

export function UpgradePlanDialog({ open, onOpenChange }: UpgradePlanDialogProps) {
  const { subscription, planLimits, currentPlanLimits, usage } = useSubscription();
  const { currentOrganization } = useOrganizationContext();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const currentPlan = subscription?.plan_type || "free";
  const formatPrice = (v: number) => new Intl.NumberFormat("vi-VN").format(v);

  // Calculate proration info
  const getProrateInfo = (targetPlanPrice: number) => {
    if (!subscription?.current_period_start || !subscription?.current_period_end) {
      return null;
    }
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const periodStart = new Date(subscription.current_period_start);
    
    if (periodEnd <= now) return null;

    const daysInPeriod = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / 86400000));
    const daysRemaining = Math.max(1, Math.ceil((periodEnd.getTime() - now.getTime()) / 86400000));
    const proratedPrice = Math.ceil(targetPlanPrice * daysRemaining / daysInPeriod);

    return { daysRemaining, daysInPeriod, proratedPrice };
  };

  const handleUpgrade = async (planType: string) => {
    if (!currentOrganization?.id) {
      toast.error("Vui lòng chọn workspace trước");
      return;
    }

    setLoadingPlan(planType);
    try {
      const { data, error } = await supabase.functions.invoke("create-vnpay-payment", {
        body: {
          organization_id: currentOrganization.id,
          plan_type: planType,
          billing_cycle: isYearly ? "yearly" : "monthly",
          return_url: `${window.location.origin}/payment/result`,
        },
      });

      if (error) throw error;
      if (data?.payment_url) {
        window.location.href = data.payment_url;
      } else {
        throw new Error("No payment URL returned");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error("Không thể tạo thanh toán: " + (err.message || "Lỗi không xác định"));
    } finally {
      setLoadingPlan(null);
    }
  };

  const upgradablePlans = (planLimits || []).filter(
    (p) => p.price_monthly > 0 && PLAN_ORDER.indexOf(p.plan_type as any) > PLAN_ORDER.indexOf(currentPlan as any)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Nâng cấp gói
          </DialogTitle>
          <DialogDescription>
            Chọn gói phù hợp với nhu cầu của workspace. Thanh toán qua VNPay.
          </DialogDescription>
        </DialogHeader>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 py-2">
          <span className={`text-sm ${!isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
            Hàng tháng
          </span>
          <Switch checked={isYearly} onCheckedChange={setIsYearly} />
          <span className={`text-sm ${isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
            Hàng năm
            <span className="ml-1.5 text-xs text-primary font-semibold">-17%</span>
          </span>
        </div>

        {/* Plan cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {upgradablePlans.map((plan) => {
            const fullMonthlyPrice = isYearly ? Math.round(plan.price_yearly / 12) : plan.price_monthly;
            const fullPrice = isYearly ? plan.price_yearly : plan.price_monthly;
            const prorateInfo = getProrateInfo(fullPrice);
            const isLoading = loadingPlan === plan.plan_type;

            return (
              <div
                key={plan.plan_type}
                className="rounded-xl border border-border p-5 space-y-4"
              >
                <div>
                  <h3 className="text-lg font-bold">{PLAN_NAMES[plan.plan_type] || plan.plan_type}</h3>
                  <div className="mt-1">
                    <span className="text-2xl font-extrabold">{formatPrice(fullMonthlyPrice)}₫</span>
                    <span className="text-sm text-muted-foreground">/tháng</span>
                  </div>
                  {isYearly && (
                    <p className="text-xs text-muted-foreground">
                      Thanh toán {formatPrice(plan.price_yearly)}₫/năm
                    </p>
                  )}
                </div>

                {/* Proration notice */}
                {prorateInfo && (
                  <div className="rounded-lg bg-accent/50 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Thanh toán theo ngày còn lại
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Chỉ <span className="font-semibold text-foreground">{formatPrice(prorateInfo.proratedPrice)}₫</span> cho {prorateInfo.daysRemaining} ngày còn lại
                    </p>
                  </div>
                )}

                {/* Usage comparison for current usage */}
                {usage && currentPlanLimits && (
                  <div className="rounded-lg border border-border/50 p-2.5 space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Hạn mức nâng lên</p>
                    {[
                      { label: 'Scripts', used: usage.scripts, oldLimit: currentPlanLimits.monthly_scripts, newLimit: plan.monthly_scripts },
                      { label: 'Carousels', used: usage.carousels, oldLimit: currentPlanLimits.monthly_carousels, newLimit: plan.monthly_carousels },
                      { label: 'Đa kênh', used: usage.multichannel, oldLimit: currentPlanLimits.monthly_multichannel, newLimit: plan.monthly_multichannel },
                      { label: 'Ảnh AI', used: usage.images, oldLimit: currentPlanLimits.monthly_images, newLimit: plan.monthly_images },
                    ].filter(i => i.newLimit !== i.oldLimit).slice(0, 3).map(item => (
                      <div key={item.label} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="flex items-center gap-1 tabular-nums">
                          <span className="text-muted-foreground">{item.used}/{item.oldLimit === -1 ? '∞' : item.oldLimit}</span>
                          <ArrowRight className="h-3 w-3 text-primary" />
                          <span className="font-medium text-foreground">{item.used}/{item.newLimit === -1 ? '∞' : item.newLimit}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <ul className="space-y-1.5 text-sm">
                  {(plan.features || []).map((f: string) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  onClick={() => handleUpgrade(plan.plan_type)}
                  disabled={!!loadingPlan}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {prorateInfo
                    ? `Thanh toán ${formatPrice(prorateInfo.proratedPrice)}₫`
                    : "Thanh toán qua VNPay"}
                </Button>
              </div>
            );
          })}
        </div>

        {upgradablePlans.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Bạn đang sử dụng gói cao nhất. Liên hệ để tùy chỉnh gói Enterprise.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
