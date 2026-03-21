import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function ZaloCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Đang xử lý kết nối Zalo OA...');
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const username = searchParams.get('username');
    const brandTemplateId = searchParams.get('brand_template_id');
    const packageName = searchParams.get('package_name');
    const warningParam = searchParams.get('warning');

    if (success === 'true') {
      setStatus('success');
      setMessage(username ? `Kết nối ${username} thành công!` : 'Kết nối Zalo OA thành công!');
      
      // Check for basic package warning
      if (warningParam) {
        setWarning(warningParam);
      } else if (packageName && ['Cơ bản', 'Basic'].includes(packageName)) {
        setWarning('OA đang dùng gói Cơ bản. Tính năng đăng bài qua API yêu cầu nâng cấp gói tại oa.zalo.me/home/pricing');
      } else if (packageName) {
        // Show package info for non-basic packages
        setMessage(username ? `Kết nối ${username} thành công! (Gói ${packageName})` : `Kết nối Zalo OA thành công! (Gói ${packageName})`);
      }

      const redirectPath = brandTemplateId ? `/brands/${brandTemplateId}` : '/brands';
      setTimeout(() => navigate(redirectPath), warning ? 4000 : 2000);
    } else if (success === 'false' || error) {
      setStatus('error');
      setMessage(error || 'Kết nối Zalo OA thất bại');
    } else {
      setStatus('error');
      setMessage('Thiếu thông tin phản hồi từ Zalo');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">{message}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-green-600 font-medium">{message}</p>
              {warning && (
                <div className="mt-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-left">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                      <p>{warning}</p>
                      <a
                        href="https://oa.zalo.me/home/pricing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium mt-1 inline-block"
                      >
                        Nâng cấp gói OA →
                      </a>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-2">Đang chuyển hướng...</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-destructive font-medium">{message}</p>
              <button
                onClick={() => navigate('/brands')}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Quay lại
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
