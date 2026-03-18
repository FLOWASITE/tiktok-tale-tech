import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Threads icon component
const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 192 192" fill="currentColor">
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C120.092 17.1113 137.63 24.6614 149.184 39.1722C154.894 46.3388 159.199 55.1787 162.037 65.1076L177.859 60.6592C174.196 47.7592 168.419 36.6326 160.516 27.5765C145.099 9.29983 122.666 0.0682937 97.0666 0.000165032C97.0469 0.000## ThreadsCallback page 165032 97.0272 0 97.0075 0C71.0666 0.0682937 48.6325 9.26853 33.0599 27.1746C19.0661 43.1968 11.8124 65.81 11.6052 94.9553L11.6052 96L11.6052 97.0447C11.8124 126.19 19.0661 148.803 33.0599 164.825C48.5616 183.045 70.8518 192.377 96.9528 192.43L97.0135 192.43L97.0742 192.43C122.109 192.377 145.015 182.626 160.048 161.635C173.521 142.72 171.791 118.977 162.978 104.199C156.629 93.5048 145.763 86.1737 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z"/>
  </svg>
);

export default function ThreadsCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const brandTemplateId = searchParams.get('brand_template_id');

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const usernameParam = searchParams.get('username');

    if (success === 'true') {
      setStatus('success');
      setUsername(usernameParam || 'Threads');
      setMessage(`Đã kết nối thành công với @${usernameParam || 'Threads'}!`);
      
      toast({
        title: 'Kết nối thành công!',
        description: `Threads @${usernameParam} đã được kết nối.`,
      });

      // Auto redirect after 3 seconds
      setTimeout(() => {
        navigate(brandTemplateId ? `/brands/${brandTemplateId}` : '/brands', { replace: true });
      }, 3000);
    } else if (error) {
      setStatus('error');
      
      let errorMessage = 'Đã xảy ra lỗi khi kết nối Threads';
      
      if (error === 'access_denied') {
        errorMessage = 'Bạn đã từ chối quyền truy cập. Vui lòng thử lại và chấp nhận các quyền cần thiết.';
      } else if (errorDescription) {
        errorMessage = decodeURIComponent(errorDescription);
      }
      
      setMessage(errorMessage);
      
      toast({
        title: 'Kết nối thất bại',
        description: errorMessage,
        variant: 'destructive',
      });
    } else {
      // Still loading or waiting for redirect from OAuth
      setMessage('Đang xử lý kết nối Threads...');
    }
  }, [searchParams, navigate, toast]);

  const handleRetry = () => {
    navigate(brandTemplateId ? `/brands/${brandTemplateId}` : '/brands', { replace: true });
  };

  const handleGoToBrands = () => {
    navigate(brandTemplateId ? `/brands/${brandTemplateId}` : '/brands', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ThreadsIcon className="h-8 w-8 text-slate-800 dark:text-slate-200" />
          </div>
          <CardTitle className="text-xl">
            {status === 'loading' && 'Đang kết nối Threads...'}
            {status === 'success' && 'Kết nối thành công!'}
            {status === 'error' && 'Kết nối thất bại'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-600" />
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div className="space-y-2">
                <p className="font-medium">@{username}</p>
                <p className="text-muted-foreground text-sm">{message}</p>
                <p className="text-xs text-muted-foreground">
                  Tự động chuyển hướng sau 3 giây...
                </p>
              </div>
              <Button onClick={handleGoToBrands} className="w-full">
                Đi đến Thương hiệu
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-muted-foreground text-sm">{message}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetry} className="flex-1">
                  Thử lại
                </Button>
                <Button onClick={handleGoToBrands} className="flex-1">
                  Quay lại
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
