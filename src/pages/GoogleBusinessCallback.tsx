import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function GoogleBusinessCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Đang xử lý kết nối Google Business...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Lỗi từ Google: ${error}`);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Thiếu thông tin xác thực từ Google');
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke('auth-gateway', {
          body: { platform: 'google-business', code, state }
        });

        if (fnError) throw fnError;

        if (data?.success) {
          setStatus('success');
          setMessage(data.message || 'Kết nối Google Business thành công!');
          setTimeout(() => navigate('/connections'), 2000);
        } else {
          throw new Error(data?.error || 'Kết nối thất bại');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Có lỗi xảy ra khi kết nối Google Business');
      }
    };

    handleCallback();
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
                onClick={() => navigate('/connections')}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Quay lại cài đặt
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
