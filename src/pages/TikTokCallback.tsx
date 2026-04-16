import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const TikTokIcon = () => (
  <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2 6.34 6.34 0 0 0 9.49 21.5a6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 3.76.92V6.21a4.87 4.87 0 0 1-.01.48z"/>
  </svg>
);

export default function TikTokCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const username = searchParams.get('username');
    const brandTemplateId = searchParams.get('brandTemplateId');

    if (success === 'true') {
      setStatus('success');
      setMessage(`Đã kết nối thành công với ${username || 'TikTok'}`);
      toast.success(`Đã kết nối TikTok: ${username}`);
      
      setTimeout(() => {
        if (brandTemplateId) {
          navigate(`/brands/${brandTemplateId}`);
        } else {
          navigate('/brands');
        }
      }, 2000);
    } else if (error) {
      setStatus('error');
      setMessage(error);
      toast.error(`Lỗi kết nối TikTok: ${error}`);
    } else {
      setStatus('loading');
      setMessage('Đang xử lý kết nối...');
    }
  }, [searchParams, navigate]);

  const handleRetry = () => {
    navigate('/brands');
  };

  const handleClose = () => {
    const brandTemplateId = searchParams.get('brandTemplateId');
    if (brandTemplateId) {
      navigate(`/brands/${brandTemplateId}`);
    } else {
      navigate('/brands');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-foreground">
            <TikTokIcon />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
            {status === 'loading' && 'Đang kết nối...'}
            {status === 'success' && 'Kết nối thành công!'}
            {status === 'error' && 'Kết nối thất bại'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <p className="text-center text-sm text-muted-foreground">
              Đang chuyển hướng...
            </p>
          )}
          {status === 'error' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Đóng
              </Button>
              <Button onClick={handleRetry} className="flex-1">
                Thử lại
              </Button>
            </div>
          )}
          {status === 'loading' && (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
