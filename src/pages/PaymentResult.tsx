import { useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refetch } = useSubscription();

  const responseCode = searchParams.get("vnp_ResponseCode");
  const txnRef = searchParams.get("vnp_TxnRef");
  const amount = searchParams.get("vnp_Amount");

  const isSuccess = responseCode === "00";
  const formattedAmount = amount
    ? new Intl.NumberFormat("vi-VN").format(parseInt(amount) / 100) + "₫"
    : "";

  useEffect(() => {
    if (isSuccess) {
      refetch();
    }
  }, [isSuccess, refetch]);

  if (!responseCode) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-lg py-16">
      <Card>
        <CardHeader className="text-center">
          {isSuccess ? (
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          )}
          <CardTitle className="text-2xl">
            {isSuccess ? "Thanh toán thành công!" : "Thanh toán thất bại"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {isSuccess ? (
            <>
              <p className="text-muted-foreground">
                Gói của bạn đã được nâng cấp thành công. Cảm ơn bạn đã tin tưởng sử dụng!
              </p>
              {formattedAmount && (
                <p className="text-lg font-semibold">Số tiền: {formattedAmount}</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              Thanh toán không thành công. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.
              {responseCode && <span className="block text-xs mt-1">Mã lỗi: {responseCode}</span>}
            </p>
          )}

          <div className="flex gap-3 justify-center pt-4">
            <Button onClick={() => navigate("/account")}>
              Về tài khoản
            </Button>
            {!isSuccess && (
              <Button variant="outline" onClick={() => navigate("/account")}>
                Thử lại
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
