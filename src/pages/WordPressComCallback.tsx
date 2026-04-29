import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function WordPressComCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Đang xử lý kết nối WordPress.com...');

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const site = searchParams.get('site');

    if (success === 'true') {
      setStatus('success');
      setMessage(site ? `Đã kết nối WordPress.com: ${site}` : 'Kết nối WordPress.com thành công!');
      const t = setTimeout(() => {
        if (window.opener) {
          window.close();
        } else {
          navigate('/brands');
        }
      }, 1500);
      return () => clearTimeout(t);
    }

    if (success === 'false' || error) {
      setStatus('error');
      setMessage(error ? decodeURIComponent(error) : 'Kết nối WordPress.com thất bại');
      return;
    }

    setStatus('error');
    setMessage('Không nhận được phản hồi từ WordPress.com');
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
                onClick={() => (window.opener ? window.close() : navigate('/brands'))}
                className="mt-4 text-sm text-primary hover:underline"
              >
                {window.opener ? 'Đóng cửa sổ' : 'Quay lại'}
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
