import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Loader2, ShoppingBag, Package, FileText, Images, Layers, Wand2, Palette } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PaymentGateway } from "@/components/PaymentConfirmDialog";
import { PaymentConfirmDialog } from "@/components/PaymentConfirmDialog";

interface AddonPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

interface ConfirmState {
  planType: string;
  basePrice: number;
  finalPrice: number;
}

export function AddonPurchaseDialog({ open, onOpenChange }: AddonPurchaseDialogProps) {
  const { planLimits } = useSubscription();
  const { currentOrganization } = useOrganizationContext();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const formatPrice = (v: number) => new Intl.NumberFormat("vi-VN").format(v);

  const buyablePlans = (planLimits || []).filter((p) => p.price_monthly > 0);

  const handleSelectPlan = (planType: string) => {
    if (!currentOrganization?.id) {
      toast.error("Vui lòng chọn workspace trước");
      return;
    }
    const plan = buyablePlans.find(p => p.plan_type === planType);
    if (!plan) return;
    const price = isYearly ? plan.price_yearly : plan.price_monthly;
    setConfirmState({ planType, basePrice: price, finalPrice: price });
  };

  const handleConfirmPayment = async (_bankCode?: string, gateway?: PaymentGateway) => {
    if (!confirmState || !currentOrganization?.id) return;
    const selectedGateway = gateway || "payos";
    setLoadingPlan(confirmState.planType);

    try {
      const functionName = selectedGateway === "payos" ? "create-payos-payment" : "create-vnpay-payment";
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          organization_id: currentOrganization.id,
          plan_type: confirmState.planType,
          billing_cycle: isYearly ? "yearly" : "monthly",
          return_url: `${window.location.origin}/payment/result`,
          purchase_type: "addon",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const redirectUrl = data?.payment_url || data?.checkout_url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error("No payment URL returned");
      }
    } catch (err: any) {
      console.error("Addon payment error:", err);
      toast.error("Không thể tạo thanh toán: " + (err.message || "Lỗi không xác định"));
    } finally {
      setLoadingPlan(null);
    }
  };

  const getAddonFeatures = (planType: string) => {
    const plan = buyablePlans.find(p => p.plan_type === planType);
    if (!plan) return undefined;
    return [
      { label: "Scripts", value: plan.monthly_scripts === -1 ? "∞" : String(plan.monthly_scripts) },
      { label: "Bài đa kênh", value: plan.monthly_multichannel === -1 ? "∞" : String(plan.monthly_multichannel) },
      { label: "Ảnh AI", value: plan.monthly_images === -1 ? "∞" : String(plan.monthly_images) },
      { label: "Carousels", value: plan.monthly_carousels === -1 ? "∞" : String(plan.monthly_carousels) },
      { label: "Brands", value: plan.monthly_brands === -1 ? "∞" : String(plan.monthly_brands) },
    ];
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Mua thêm gói hạn mức
            </DialogTitle>
            <DialogDescription>
              Mua thêm hạn mức bổ sung cho workspace. Hạn mức sẽ được cộng dồn vào gói hiện tại và hết hạn cùng chu kỳ.
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
          <div className="grid gap-4 sm:grid-cols-3">
            {buyablePlans.map((plan) => {
              const price = isYearly ? plan.price_yearly : plan.price_monthly;
              const monthlyPrice = isYearly ? Math.round(plan.price_yearly / 12) : plan.price_monthly;

              const quotaItems = [
                { icon: FileText, label: "Scripts", value: plan.monthly_scripts },
                { icon: Layers, label: "Đa kênh", value: plan.monthly_multichannel },
                { icon: Wand2, label: "Ảnh AI", value: plan.monthly_images },
                { icon: Images, label: "Carousels", value: plan.monthly_carousels },
                { icon: Palette, label: "Brands", value: plan.monthly_brands },
              ];

              return (
                <div key={plan.plan_type} className="rounded-xl border border-border p-4 space-y-3 hover:border-primary/50 transition-colors">
                  <div>
                    <Badge variant="outline" className="text-xs mb-2">
                      {PLAN_NAMES[plan.plan_type] || plan.plan_type}
                    </Badge>
                    <div>
                      <span className="text-xl font-extrabold">{formatPrice(monthlyPrice)}₫</span>
                      <span className="text-xs text-muted-foreground">/tháng</span>
                    </div>
                    {isYearly && (
                      <p className="text-[10px] text-muted-foreground">
                        {formatPrice(price)}₫/năm
                      </p>
                    )}
                  </div>

                  {/* Quota items */}
                  <div className="space-y-1.5 border-t border-border pt-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Hạn mức được cộng thêm
                    </p>
                    {quotaItems.map(item => (
                      <div key={item.label} className="flex items-center gap-1.5 text-xs">
                        <item.icon className="h-3 w-3 text-primary" />
                        <span className="text-muted-foreground">{item.label}:</span>
                        <span className="font-semibold">
                          +{item.value === -1 ? "∞" : item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full"
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectPlan(plan.plan_type)}
                    disabled={!!loadingPlan}
                  >
                    {loadingPlan === plan.plan_type ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                        Mua thêm
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {confirmState && (
        <PaymentConfirmDialog
          open={!!confirmState}
          onOpenChange={(open) => { if (!open) setConfirmState(null); }}
          workspaceName={currentOrganization?.name || "Workspace"}
          currentPlan="addon"
          targetPlan={confirmState.planType}
          billingCycle={isYearly ? "yearly" : "monthly"}
          basePrice={confirmState.basePrice}
          prorateInfo={null}
          voucher={null}
          finalPrice={confirmState.finalPrice}
          isLoading={!!loadingPlan}
          onConfirm={handleConfirmPayment}
          planFeatures={getAddonFeatures(confirmState.planType)}
          applicablePlan={confirmState.planType}
        />
      )}
    </>
  );
}
