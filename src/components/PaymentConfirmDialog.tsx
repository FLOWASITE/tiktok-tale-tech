import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CreditCard, ArrowRight, Clock, Tag, ShieldCheck, Loader2, Lock, Sparkles, TrendingDown, X, QrCode, Landmark, Wallet, Globe, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PaymentGateway = "vnpay" | "payos";

const PLAN_NAMES: Record<string, string> = {
  free: "Miễn phí",
  starter: "Starter",
  pro: "Pro",
  professional: "Pro",
  business: "Business",
  enterprise: "Enterprise",
};

interface ProrateInfo {
  daysRemaining: number;
  daysInPeriod: number;
  proratedPrice: number;
}

export interface VoucherInfo {
  code: string;
  discount_type: string;
  discount_value: number;
  applicable_plans?: string[] | null;
}

export interface PlanFeatureSummary {
  label: string;
  value: string;
}

const PAYMENT_GATEWAYS = [
  { code: "vnpay" as PaymentGateway, label: "VNPay", desc: "QR, ATM, Ví, Thẻ quốc tế", icon: CreditCard },
  { code: "payos" as PaymentGateway, label: "payOS", desc: "QR VietQR — tiền về ngay", icon: Zap },
] as const;

const VNPAY_METHODS = [
  { code: "VNPAYQR", label: "QR Code", desc: "Quét mã QR", icon: QrCode },
  { code: "VNBANK", label: "ATM nội địa", desc: "Internet Banking", icon: Landmark },
  { code: "VNPAYEWALLET", label: "Ví điện tử", desc: "VNPay, MoMo...", icon: Wallet },
  { code: "INTCARD", label: "Thẻ quốc tế", desc: "Visa/Master/JCB", icon: Globe },
] as const;

export interface PaymentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceName: string;
  currentPlan: string;
  targetPlan: string;
  billingCycle: "monthly" | "yearly";
  basePrice: number;
  prorateInfo?: ProrateInfo | null;
  voucher?: VoucherInfo | null;
  finalPrice: number;
  isLoading: boolean;
  onConfirm: (bankCode?: string) => void;
  yearlyDiscount?: number;
  planFeatures?: PlanFeatureSummary[];
  onVoucherChange?: (voucher: VoucherInfo | null, newPrice: number) => void;
  applicablePlan?: string;
}

export function PaymentConfirmDialog({
  open,
  onOpenChange,
  workspaceName,
  currentPlan,
  targetPlan,
  billingCycle,
  basePrice,
  prorateInfo,
  voucher,
  finalPrice,
  isLoading,
  onConfirm,
  yearlyDiscount,
  planFeatures,
  onVoucherChange,
  applicablePlan,
}: PaymentConfirmDialogProps) {
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [localVoucher, setLocalVoucher] = useState<VoucherInfo | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("VNPAYQR");

  const formatPrice = (v: number) => new Intl.NumberFormat("vi-VN").format(v);

  const activeVoucher = localVoucher ?? voucher ?? null;
  const priceAfterProrate = prorateInfo ? prorateInfo.proratedPrice : basePrice;

  const calculateDiscountedPrice = (price: number, v: VoucherInfo | null) => {
    if (!v) return price;
    if (v.applicable_plans && v.applicable_plans.length > 0 && !v.applicable_plans.includes(applicablePlan || targetPlan)) {
      return price;
    }
    if (v.discount_type === "percentage") {
      return Math.max(1000, price - Math.ceil(price * Math.min(v.discount_value, 100) / 100));
    }
    return Math.max(1000, price - v.discount_value);
  };

  const displayFinalPrice = localVoucher
    ? calculateDiscountedPrice(priceAfterProrate, localVoucher)
    : finalPrice;

  const hasVoucherDiscount = activeVoucher && displayFinalPrice < priceAfterProrate;
  const hasAnyDiscount = hasVoucherDiscount || !!prorateInfo;

  const handleApplyVoucher = async () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;

    setVoucherLoading(true);
    try {
      const { data, error } = await supabase
        .from("vouchers")
        .select("code, discount_type, discount_value, applicable_plans, is_active, max_uses, used_count, starts_at, expires_at")
        .eq("code", code)
        .eq("is_active", true)
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

      const planToCheck = applicablePlan || targetPlan;
      if (data.applicable_plans && data.applicable_plans.length > 0 && !data.applicable_plans.includes(planToCheck)) {
        toast.error("Mã voucher không áp dụng cho gói này");
        return;
      }

      const newVoucher: VoucherInfo = {
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        applicable_plans: data.applicable_plans,
      };
      setLocalVoucher(newVoucher);

      const newPrice = calculateDiscountedPrice(priceAfterProrate, newVoucher);
      onVoucherChange?.(newVoucher, newPrice);

      toast.success(`Áp dụng mã ${data.code} thành công!`);
    } catch {
      toast.error("Không thể kiểm tra mã voucher");
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setLocalVoucher(null);
    setVoucherInput("");
    onVoucherChange?.(null, priceAfterProrate);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="p-4 sm:p-6"
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                  Xác nhận thanh toán
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Vui lòng kiểm tra thông tin đơn hàng trước khi thanh toán.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                {/* Order details */}
                <div className="rounded-xl border border-border bg-muted/30 p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                  {/* Workspace */}
                  <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                    <span className="text-muted-foreground shrink-0">Workspace</span>
                    <span className="font-medium text-foreground truncate max-w-[140px] sm:max-w-[200px]">{workspaceName}</span>
                  </div>

                  {/* Plan change */}
                  <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                    <span className="text-muted-foreground shrink-0">Gói</span>
                    <span className="flex items-center gap-1 sm:gap-1.5 font-medium flex-wrap justify-end">
                      <Badge variant="outline" className="text-[10px] sm:text-xs">{PLAN_NAMES[currentPlan] || currentPlan}</Badge>
                      <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" />
                      <Badge className="text-[10px] sm:text-xs bg-primary text-primary-foreground">{PLAN_NAMES[targetPlan] || targetPlan}</Badge>
                    </span>
                  </div>

                  {/* Billing cycle */}
                  <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                    <span className="text-muted-foreground shrink-0">Chu kỳ</span>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
                      <span className="font-medium text-foreground">
                        {billingCycle === "yearly" ? "Hàng năm" : "Hàng tháng"}
                      </span>
                      {billingCycle === "yearly" && yearlyDiscount && yearlyDiscount > 0 && (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs text-primary gap-0.5 sm:gap-1">
                          <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span className="hidden xs:inline">Tiết kiệm </span>{formatPrice(yearlyDiscount)}₫
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Base price */}
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Giá gốc</span>
                    <span className={`font-medium ${hasAnyDiscount ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {formatPrice(basePrice)}₫
                    </span>
                  </div>

                  {/* Prorate */}
                  {prorateInfo && (
                    <div className="flex items-start justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                        <span className="hidden sm:inline">Tính theo ngày</span>
                        <span className="sm:hidden">Theo ngày</span>
                      </span>
                      <div className="text-right">
                        <span className="font-medium text-foreground">{formatPrice(prorateInfo.proratedPrice)}₫</span>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{prorateInfo.daysRemaining} ngày còn lại</p>
                      </div>
                    </div>
                  )}

                  {/* Voucher display when applied */}
                  {hasVoucherDiscount && (
                    <div className="flex items-start justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                        Voucher
                      </span>
                      <div className="text-right">
                        <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs">{activeVoucher!.code}</Badge>
                        <p className="text-[10px] sm:text-xs text-primary mt-0.5">
                          {activeVoucher!.discount_type === "percentage"
                            ? `Giảm ${activeVoucher!.discount_value}%`
                            : `Giảm ${formatPrice(activeVoucher!.discount_value)}₫`}
                        </p>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Total */}
                  <div className="flex items-center justify-between rounded-lg bg-primary/5 p-2.5 sm:p-3 -mx-1">
                    <span className="font-semibold text-foreground text-sm sm:text-base">Tổng thanh toán</span>
                    <span className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      {formatPrice(displayFinalPrice)}₫
                    </span>
                  </div>
                </div>

                {/* Voucher input section */}
                <div className="rounded-xl border border-border p-3 sm:p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                    <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    Mã voucher
                  </div>
                  {activeVoucher ? (
                    <div className="flex items-center justify-between bg-primary/10 rounded-md px-2.5 sm:px-3 py-2 gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs shrink-0">{activeVoucher.code}</Badge>
                        <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {activeVoucher.discount_type === "percentage"
                            ? `Giảm ${activeVoucher.discount_value}%`
                            : `Giảm ${formatPrice(activeVoucher.discount_value)}₫`}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleRemoveVoucher} className="h-6 w-6 sm:h-7 sm:w-7 p-0 shrink-0">
                        <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nhập mã voucher"
                        value={voucherInput}
                        onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyVoucher()}
                        className="font-mono text-xs sm:text-sm h-8 sm:h-10"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyVoucher}
                        disabled={!voucherInput.trim() || voucherLoading}
                        className="h-8 sm:h-10 px-3 text-xs sm:text-sm shrink-0"
                      >
                        {voucherLoading ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : "Áp dụng"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Plan features */}
                {planFeatures && planFeatures.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5 mb-2 sm:mb-3">
                      <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      Tính năng gói {PLAN_NAMES[targetPlan] || targetPlan}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {planFeatures.map((feat, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-background/60 px-2 sm:px-3 py-1.5 sm:py-2">
                          <span className="text-muted-foreground text-[10px] sm:text-xs">{feat.label}</span>
                          <span className="font-semibold text-foreground text-[10px] sm:text-xs">{feat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment method selector */}
                <div className="rounded-xl border border-border p-3 sm:p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                    <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    Phương thức thanh toán
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((method) => {
                      const isSelected = paymentMethod === method.code;
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.code}
                          type="button"
                          onClick={() => setPaymentMethod(method.code)}
                          className={`relative flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 sm:p-3 transition-all duration-200 text-center cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/40 hover:bg-muted/30"
                          }`}
                        >
                          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={`text-[11px] sm:text-xs font-medium leading-tight ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                            {method.label}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 leading-tight">
                            {method.desc}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 mt-3 sm:mt-4">
                <Button onClick={() => onConfirm(paymentMethod)} disabled={isLoading} className="w-full sm:w-auto order-1 sm:order-2">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Xác nhận & Thanh toán
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="w-full sm:w-auto order-2 sm:order-1">
                  Quay lại
                </Button>
              </DialogFooter>

              {/* Security & terms footer */}
              <div className="mt-3 sm:mt-4 flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Bảo mật bởi VNPay</span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground/70 text-center">
                  Bằng việc thanh toán, bạn đồng ý với{" "}
                  <a href="/terms" className="underline hover:text-foreground transition-colors">
                    Điều khoản sử dụng
                  </a>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
