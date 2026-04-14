import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Check, Loader2, CreditCard, Clock, ArrowRight, Tag, X } from "lucide-react";
import type { PaymentGateway } from "@/components/PaymentConfirmDialog";
import { useSubscription } from "@/hooks/useSubscription";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PaymentConfirmDialog } from "@/components/PaymentConfirmDialog";

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

interface VoucherInfo {
  code: string;
  discount_type: string;
  discount_value: number;
  applicable_plans: string[] | null;
}

interface ConfirmState {
  planType: string;
  basePrice: number;
  prorateInfo: { daysRemaining: number; daysInPeriod: number; proratedPrice: number } | null;
  finalPrice: number;
}

export function UpgradePlanDialog({ open, onOpenChange }: UpgradePlanDialogProps) {
  const { subscription, planLimits, currentPlanLimits, usage } = useSubscription();
  const { currentOrganization } = useOrganizationContext();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherInfo | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const currentPlan = subscription?.plan_type || "free";
  const formatPrice = (v: number) => new Intl.NumberFormat("vi-VN").format(v);

  const getProrateInfo = (targetPlanPrice: number) => {
    if (!subscription?.current_period_start || !subscription?.current_period_end) return null;
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const periodStart = new Date(subscription.current_period_start);
    if (periodEnd <= now) return null;
    const daysInPeriod = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / 86400000));
    const daysRemaining = Math.max(1, Math.ceil((periodEnd.getTime() - now.getTime()) / 86400000));
    const proratedPrice = Math.ceil(targetPlanPrice * daysRemaining / daysInPeriod);
    return { daysRemaining, daysInPeriod, proratedPrice };
  };

  const getDiscountedPrice = (price: number, planType: string) => {
    if (!appliedVoucher) return price;
    if (appliedVoucher.applicable_plans && appliedVoucher.applicable_plans.length > 0 && !appliedVoucher.applicable_plans.includes(planType)) {
      return price;
    }
    if (appliedVoucher.discount_type === 'percentage') {
      return Math.max(1000, price - Math.ceil(price * Math.min(appliedVoucher.discount_value, 100) / 100));
    }
    return Math.max(1000, price - appliedVoucher.discount_value);
  };

  const handleApplyVoucher = async () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;

    setVoucherLoading(true);
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('code, discount_type, discount_value, applicable_plans, is_active, max_uses, used_count, starts_at, expires_at')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        toast.error("Mã voucher không tồn tại hoặc không hợp lệ");
        return;
      }

      const now = new Date();
      if (data.starts_at && new Date(data.starts_at) > now) {
        toast.error("Mã voucher chưa có hiệu lực");
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < now) {
        toast.error("Mã voucher đã hết hạn");
        return;
      }
      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        toast.error("Mã voucher đã hết lượt sử dụng");
        return;
      }

      setAppliedVoucher({
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        applicable_plans: data.applicable_plans,
      });
      toast.success(`Áp dụng mã ${data.code} thành công!`);
    } catch {
      toast.error("Không thể kiểm tra mã voucher");
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput("");
  };

  const handleSelectPlan = (planType: string, fullPrice: number, prorateInfo: ReturnType<typeof getProrateInfo>, finalPrice: number) => {
    if (!currentOrganization?.id) {
      toast.error("Vui lòng chọn workspace trước");
      return;
    }
    setConfirmState({ planType, basePrice: fullPrice, prorateInfo, finalPrice });
  };

  const getPlanFeatures = (planType: string) => {
    const plan = (planLimits || []).find(p => p.plan_type === planType);
    if (!plan) return undefined;
    return [
      { label: "Thương hiệu", value: String(plan.monthly_brands ?? 0) },
      { label: "Bài đa kênh/tháng", value: String(plan.monthly_multichannel ?? 0) },
      { label: "Ảnh AI/tháng", value: String(plan.monthly_images ?? 0) },
      { label: "Scripts/tháng", value: String(plan.monthly_scripts ?? 0) },
      { label: "Carousels/tháng", value: String(plan.monthly_carousels ?? 0) },
    ];
  };

  const getYearlyDiscount = (planType: string) => {
    if (!isYearly) return undefined;
    const plan = (planLimits || []).find(p => p.plan_type === planType);
    if (!plan) return undefined;
    return Math.max(0, plan.price_monthly * 12 - plan.price_yearly);
  };

  const handleConfirmPayment = async (bankCode?: string, gateway?: PaymentGateway) => {
    if (!confirmState || !currentOrganization?.id) return;

    const selectedGateway = gateway || "vnpay";
    setLoadingPlan(confirmState.planType);
    try {
      const functionName = selectedGateway === "payos" ? "create-payos-payment" : "create-vnpay-payment";
      const bodyPayload: Record<string, unknown> = {
        organization_id: currentOrganization.id,
        plan_type: confirmState.planType,
        billing_cycle: isYearly ? "yearly" : "monthly",
        return_url: `${window.location.origin}/payment/result`,
        voucher_code: appliedVoucher?.code || undefined,
      };
      if (selectedGateway === "vnpay" && bankCode) {
        bodyPayload.bank_code = bankCode;
      }

      const { data, error } = await supabase.functions.invoke(functionName, { body: bodyPayload });

      if (error) throw error;
      const redirectUrl = data?.payment_url || data?.checkout_url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Nâng cấp gói
            </DialogTitle>
            <DialogDescription>
              Chọn gói phù hợp với nhu cầu của workspace.
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

          {/* Voucher input */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Tag className="h-4 w-4 text-primary" />
              Mã voucher
            </div>
            {appliedVoucher ? (
              <div className="flex items-center justify-between bg-primary/10 rounded-md px-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono">{appliedVoucher.code}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {appliedVoucher.discount_type === 'percentage'
                      ? `Giảm ${appliedVoucher.discount_value}%`
                      : `Giảm ${formatPrice(appliedVoucher.discount_value)}₫`}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleRemoveVoucher} className="h-7 w-7 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Nhập mã voucher"
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyVoucher}
                  disabled={!voucherInput.trim() || voucherLoading}
                >
                  {voucherLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Áp dụng"}
                </Button>
              </div>
            )}
          </div>

          {/* Plan cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {upgradablePlans.map((plan) => {
              const fullMonthlyPrice = isYearly ? Math.round(plan.price_yearly / 12) : plan.price_monthly;
              const fullPrice = isYearly ? plan.price_yearly : plan.price_monthly;
              const prorateInfo = getProrateInfo(fullPrice);
              const priceBeforeDiscount = prorateInfo ? prorateInfo.proratedPrice : fullPrice;
              const finalPrice = getDiscountedPrice(priceBeforeDiscount, plan.plan_type);
              const hasDiscount = appliedVoucher && finalPrice < priceBeforeDiscount;

              return (
                <div key={plan.plan_type} className="rounded-xl border border-border p-5 space-y-4">
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

                  {/* Voucher discount notice */}
                  {hasDiscount && (
                    <div className="rounded-lg bg-primary/10 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                        <Tag className="h-3.5 w-3.5" />
                        Voucher {appliedVoucher.code}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="line-through">{formatPrice(priceBeforeDiscount)}₫</span>
                        <span className="ml-1.5 font-semibold text-primary">{formatPrice(finalPrice)}₫</span>
                      </p>
                    </div>
                  )}

                  {/* Usage comparison */}
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
                    onClick={() => handleSelectPlan(plan.plan_type, fullPrice, prorateInfo, finalPrice)}
                    disabled={!!loadingPlan}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {hasDiscount
                      ? `Thanh toán ${formatPrice(finalPrice)}₫`
                      : prorateInfo
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

      {/* Payment confirmation dialog */}
      {confirmState && (
        <PaymentConfirmDialog
          open={!!confirmState}
          onOpenChange={(open) => { if (!open) setConfirmState(null); }}
          workspaceName={currentOrganization?.name || "Workspace"}
          currentPlan={currentPlan}
          targetPlan={confirmState.planType}
          billingCycle={isYearly ? "yearly" : "monthly"}
          basePrice={confirmState.basePrice}
          prorateInfo={confirmState.prorateInfo}
          voucher={appliedVoucher ? { code: appliedVoucher.code, discount_type: appliedVoucher.discount_type, discount_value: appliedVoucher.discount_value } : null}
          finalPrice={confirmState.finalPrice}
          isLoading={!!loadingPlan}
          onConfirm={handleConfirmPayment}
          planFeatures={getPlanFeatures(confirmState.planType)}
          yearlyDiscount={getYearlyDiscount(confirmState.planType)}
          applicablePlan={confirmState.planType}
          onVoucherChange={(newVoucher, newPrice) => {
            if (newVoucher) {
              setAppliedVoucher({ ...newVoucher, applicable_plans: newVoucher.applicable_plans ?? null });
            } else {
              setAppliedVoucher(null);
            }
            setConfirmState(prev => prev ? { ...prev, finalPrice: newPrice } : null);
          }}
        />
      )}
    </>
  );
}
