import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function ZaloCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Đang xử lý kết nối Zalo OA...');

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const username = searchParams.get('username');
    const brandTemplateId = searchParams.get('brand_template_id');

    if (success === 'true') {
      setStatus('success');
      setMessage(username ? `Kết nối ${username} thành công!` : 'Kết nối Zalo OA thành công!');
      const redirectPath = brandTemplateId ? `/brands/${brandTemplateId}` : '/brands';
      setTimeout(() => navigate(redirectPath), 2000);
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
