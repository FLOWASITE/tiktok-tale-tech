import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, Loader2, ArrowRight, RotateCcw, Receipt, Clock, CreditCard, Hash, ShieldCheck } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

const VNPAY_ERRORS: Record<string, string> = {
  "07": "Trừ tiền thành công nhưng giao dịch bị nghi ngờ gian lận",
  "09": "Thẻ/Tài khoản chưa đăng ký Internet Banking",
  "10": "Xác thực thông tin thẻ/tài khoản sai quá 3 lần",
  "11": "Đã hết hạn chờ thanh toán",
  "12": "Thẻ/Tài khoản bị khóa",
  "13": "Nhập sai mật khẩu xác thực (OTP)",
  "24": "Khách hàng hủy giao dịch",
  "51": "Tài khoản không đủ số dư",
  "65": "Tài khoản đã vượt quá hạn mức giao dịch trong ngày",
  "75": "Ngân hàng thanh toán đang bảo trì",
  "79": "Nhập sai mật khẩu quá số lần quy định",
  "99": "Lỗi không xác định",
};

const PLAN_NAMES: Record<string, string> = {
  free: "Miễn phí",
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
};

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refetch } = useSubscription();
  const [countdown, setCountdown] = useState(10);
  const [showDetails, setShowDetails] = useState(false);

  // Detect payment provider
  const responseCode = searchParams.get("vnp_ResponseCode");
  const payosCancel = searchParams.get("payos_cancel");
  const payosCode = searchParams.get("code");
  const payosOrderCode = searchParams.get("orderCode");
  const payosStatus = searchParams.get("status");

  // Determine which provider was used
  const isPayOS = !!payosOrderCode || !!payosCancel || !!payosCode;
  const isVNPay = !!responseCode;

  const txnRef = isVNPay ? searchParams.get("vnp_TxnRef") : payosOrderCode;
  const amount = isVNPay ? searchParams.get("vnp_Amount") : searchParams.get("amount");
  const bankCode = searchParams.get("vnp_BankCode");
  const orderInfo = searchParams.get("vnp_OrderInfo");
  const payDate = searchParams.get("vnp_PayDate");
  const transactionNo = isVNPay ? searchParams.get("vnp_TransactionNo") : searchParams.get("reference");

  const isSuccess = isPayOS
    ? (payosStatus === "PAID" || payosCode === "00") && !payosCancel
    : responseCode === "00";

  const formattedAmount = amount
    ? new Intl.NumberFormat("vi-VN").format(isVNPay ? parseInt(amount) / 100 : parseInt(amount)) + "₫"
    : "";

  const formattedDate = useMemo(() => {
    if (!payDate || payDate.length < 14) return null;
    const y = payDate.slice(0, 4);
    const m = payDate.slice(4, 6);
    const d = payDate.slice(6, 8);
    const h = payDate.slice(8, 10);
    const min = payDate.slice(10, 12);
    const s = payDate.slice(12, 14);
    return `${h}:${min}:${s} — ${d}/${m}/${y}`;
  }, [payDate]);

  // Extract plan from orderInfo (format: "Nang cap goi PRO ...")
  const planFromOrder = useMemo(() => {
    if (!orderInfo) return null;
    const match = orderInfo.match(/goi\s+(\w+)/i);
    return match ? match[1].toLowerCase() : null;
  }, [orderInfo]);

  // Confetti on success
  useEffect(() => {
    if (isSuccess) {
      refetch();
      const timer = setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b"],
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, refetch]);

  // Countdown redirect on success
  useEffect(() => {
    if (!isSuccess) return;
    if (countdown <= 0) {
      navigate("/account");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [isSuccess, countdown, navigate]);

  const bankCodeLabel = useMemo(() => {
    const map: Record<string, string> = {
      VNPAYQR: "QR Code",
      VNBANK: "ATM nội địa",
      VNPAYEWALLET: "Ví điện tử",
      INTCARD: "Thẻ quốc tế",
    };
    return bankCode ? (map[bankCode] || bankCode) : null;
  }, [bankCode]);

  if (!responseCode) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const errorMessage = !isSuccess ? (VNPAY_ERRORS[responseCode] || "Giao dịch không thành công") : "";

  const transactionDetails = [
    { label: "Mã giao dịch", value: txnRef, icon: Hash },
    { label: "Mã VNPay", value: transactionNo, icon: Receipt },
    { label: "Phương thức", value: bankCodeLabel, icon: CreditCard },
    { label: "Thời gian", value: formattedDate, icon: Clock },
  ].filter((d) => d.value);

  return (
    <div className="container max-w-lg py-8 sm:py-16 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
      >
        <Card className="overflow-hidden border-border/50">
          {/* Status header */}
          <div className={`px-6 pt-8 pb-6 text-center ${isSuccess ? "bg-green-500/5" : "bg-destructive/5"}`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            >
              {isSuccess ? (
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-10 w-10 text-destructive" />
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                {isSuccess ? "Thanh toán thành công!" : "Thanh toán thất bại"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isSuccess
                  ? "Gói của bạn đã được nâng cấp. Cảm ơn bạn đã tin tưởng!"
                  : errorMessage}
              </p>
              {!isSuccess && responseCode && (
                <Badge variant="secondary" className="mt-2 text-xs font-mono">
                  Mã lỗi: {responseCode}
                </Badge>
              )}
            </motion.div>
          </div>

          <CardContent className="p-6 space-y-5">
            {/* Amount highlight */}
            {formattedAmount && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 }}
                className="rounded-xl bg-muted/40 p-4 text-center"
              >
                <p className="text-xs text-muted-foreground mb-1">Số tiền thanh toán</p>
                <p className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${isSuccess ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
                  {formattedAmount}
                </p>
                {planFromOrder && PLAN_NAMES[planFromOrder] && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    Gói {PLAN_NAMES[planFromOrder]}
                  </Badge>
                )}
              </motion.div>
            )}

            {/* Transaction details */}
            {transactionDetails.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
              >
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5" />
                    Chi tiết giao dịch
                  </span>
                  <motion.span
                    animate={{ rotate: showDetails ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs"
                  >
                    ▼
                  </motion.span>
                </button>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
                        {transactionDetails.map((detail) => (
                          <div key={detail.label} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <detail.icon className="w-3.5 h-3.5" />
                              {detail.label}
                            </span>
                            <span className="font-medium text-foreground font-mono text-xs">
                              {detail.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            <Separator />

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              {isSuccess ? (
                <>
                  <Button className="w-full" onClick={() => navigate("/account")}>
                    Về tài khoản
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Tự động chuyển hướng sau{" "}
                    <span className="font-semibold text-foreground tabular-nums">{countdown}s</span>
                  </p>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button className="flex-1" onClick={() => navigate("/pricing")}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Thử lại
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => navigate("/account")}>
                    Về tài khoản
                  </Button>
                </div>
              )}
            </motion.div>

            {/* Security footer */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60 pt-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Giao dịch bảo mật bởi VNPay</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
