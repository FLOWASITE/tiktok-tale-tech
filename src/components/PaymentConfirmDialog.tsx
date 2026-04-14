import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, ArrowRight, Clock, Tag, ShieldCheck, Loader2 } from "lucide-react";

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

interface VoucherInfo {
  code: string;
  discount_type: string;
  discount_value: number;
}

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
  onConfirm: () => void;
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
}: PaymentConfirmDialogProps) {
  const formatPrice = (v: number) => new Intl.NumberFormat("vi-VN").format(v);

  const priceAfterProrate = prorateInfo ? prorateInfo.proratedPrice : basePrice;
  const hasVoucherDiscount = voucher && finalPrice < priceAfterProrate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Xác nhận thanh toán
          </DialogTitle>
          <DialogDescription>
            Vui lòng kiểm tra thông tin đơn hàng trước khi thanh toán.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order details */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            {/* Workspace */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Workspace</span>
              <span className="font-medium text-foreground truncate max-w-[200px]">{workspaceName}</span>
            </div>

            {/* Plan change */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gói</span>
              <span className="flex items-center gap-1.5 font-medium">
                <Badge variant="outline" className="text-xs">{PLAN_NAMES[currentPlan] || currentPlan}</Badge>
                <ArrowRight className="h-3.5 w-3.5 text-primary" />
                <Badge className="text-xs bg-primary text-primary-foreground">{PLAN_NAMES[targetPlan] || targetPlan}</Badge>
              </span>
            </div>

            {/* Billing cycle */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Chu kỳ</span>
              <span className="font-medium text-foreground">
                {billingCycle === "yearly" ? "Hàng năm" : "Hàng tháng"}
              </span>
            </div>

            <Separator />

            {/* Base price */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Giá gốc</span>
              <span className="font-medium text-foreground">{formatPrice(basePrice)}₫</span>
            </div>

            {/* Prorate */}
            {prorateInfo && (
              <div className="flex items-start justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Tính theo ngày
                </span>
                <div className="text-right">
                  <span className="font-medium text-foreground">{formatPrice(prorateInfo.proratedPrice)}₫</span>
                  <p className="text-xs text-muted-foreground">{prorateInfo.daysRemaining} ngày còn lại</p>
                </div>
              </div>
            )}

            {/* Voucher */}
            {hasVoucherDiscount && (
              <div className="flex items-start justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  Voucher
                </span>
                <div className="text-right">
                  <Badge variant="secondary" className="font-mono text-xs">{voucher!.code}</Badge>
                  <p className="text-xs text-primary mt-0.5">
                    {voucher!.discount_type === "percentage"
                      ? `Giảm ${voucher!.discount_value}%`
                      : `Giảm ${formatPrice(voucher!.discount_value)}₫`}
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Tổng thanh toán</span>
              <span className="text-2xl font-extrabold text-primary">{formatPrice(finalPrice)}₫</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="rounded-lg border border-border p-3 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">VNPay</p>
              <p className="text-xs text-muted-foreground">ATM nội địa, QR code, Ví điện tử</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Quay lại
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Xác nhận & Thanh toán
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
