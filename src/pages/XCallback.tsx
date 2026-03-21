import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Twitter, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ERROR_MAP: Record<string, { title: string; message: string; hint?: string }> = {
  x_client_not_enrolled: {
    title: 'App X chưa đủ quyền truy cập',
    message: 'App X chưa đủ quyền API v2. Có thể do chưa gắn Project, API tier không phù hợp, hoặc Client ID/Secret không khớp.',
    hint: 'Checklist: (1) App phải nằm trong Project trên developer.x.com, (2) Project cần API access Basic trở lên, (3) X_CLIENT_ID và X_CLIENT_SECRET phải khớp app đã gắn Project.',
  },
  x_token_exchange_failed: {
    title: 'Không thể xác thực',
    message: 'Không đổi được mã xác thực từ X.',
    hint: 'Thử kết nối lại. Nếu vẫn lỗi, kiểm tra cấu hình Redirect URI trong X Developer Portal.',
  },
  access_denied: {
    title: 'Đã từ chối quyền truy cập',
    message: 'Bạn đã từ chối cấp quyền cho ứng dụng.',
  },
  x_missing_params: {
    title: 'Thiếu thông tin',
    message: 'Không nhận được thông tin xác thực từ X.',
  },
  x_callback_failed: {
    title: 'Kết nối thất bại',
    message: 'Đã xảy ra lỗi khi kết nối X. Vui lòng thử lại.',
  },
};

export default function XCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'warning' | 'error'>('loading');
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string; hint?: string } | null>(null);
  const [username, setUsername] = useState('');
  const [warningCode, setWarningCode] = useState<string | null>(null);
  const brandTemplateId = searchParams.get('brand_template_id');

  const goBack = () => navigate(brandTemplateId ? `/brands/${brandTemplateId}` : '/brands', { replace: true });

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const errorHint = searchParams.get('error_hint');
    const usernameParam = searchParams.get('username');
    const displayName = searchParams.get('display_name');
    const warning = searchParams.get('warning');

    if (success === 'true') {
      if (warning) {
        setStatus('warning');
        setWarningCode(warning);
        setUsername(usernameParam || displayName || 'X Account');
        toast({ title: 'Kết nối hạn chế', description: 'Token đã lưu nhưng chưa lấy được thông tin profile. Kiểm tra API access trên X Developer Portal.' });
        setTimeout(goBack, 5000);
      } else {
        setStatus('success');
        setUsername(usernameParam || displayName || 'X Account');
        toast({ title: 'Kết nối thành công!', description: `Tài khoản X @${usernameParam} đã được kết nối.` });
        setTimeout(goBack, 3000);
      }
    } else if (error) {
      setStatus('error');
      const mapped = ERROR_MAP[error] || {
        title: 'Kết nối thất bại',
        message: errorDescription || 'Đã xảy ra lỗi không xác định.',
      };
      if (errorHint) mapped.hint = errorHint;
      setErrorInfo(mapped);
      toast({ title: mapped.title, description: mapped.message, variant: 'destructive' });
    } else {
      // Still loading / no params yet
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900">
            <Twitter className="h-8 w-8 text-foreground" />
          </div>
          <CardTitle className="text-xl">
            {status === 'loading' && 'Đang kết nối X...'}
            {status === 'success' && 'Kết nối thành công!'}
            {status === 'warning' && 'Kết nối hạn chế'}
            {status === 'error' && (errorInfo?.title || 'Kết nối thất bại')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-muted-foreground">Đang xử lý kết nối X...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div className="space-y-2">
                <p className="font-medium">@{username}</p>
                <p className="text-xs text-muted-foreground">Tự động chuyển hướng sau 3 giây...</p>
              </div>
              <Button onClick={goBack} className="w-full">Đi đến Thương hiệu</Button>
            </>
          )}

          {status === 'warning' && (
            <>
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
              <div className="space-y-2">
                <p className="font-medium text-amber-600">Token đã lưu thành công</p>
                <p className="text-sm text-muted-foreground">
                  Kết nối đã được lưu nhưng chưa lấy được thông tin profile từ X.
                </p>
              </div>
              <div className="flex items-start gap-2 text-left bg-muted/50 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Để hoạt động đầy đủ, kiểm tra:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>App đã gắn vào Project trên developer.x.com</li>
                    <li>Project có API access <strong>Basic</strong> trở lên</li>
                    <li>Client ID/Secret khớp đúng app trong Project</li>
                  </ol>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Tự động chuyển hướng sau 5 giây...</p>
              <Button onClick={goBack} className="w-full">Đi đến Thương hiệu</Button>
            </>
          )}

          {status === 'error' && errorInfo && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-muted-foreground text-sm">{errorInfo.message}</p>
              {errorInfo.hint && (
                <div className="flex items-start gap-2 text-left bg-muted/50 rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{errorInfo.hint}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={goBack} className="flex-1">Thử lại</Button>
                <Button onClick={goBack} className="flex-1">Quay lại</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
