import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Facebook } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function FacebookCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [pageName, setPageName] = useState('');
  const brandTemplateId = searchParams.get('brand_template_id');

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const pageNameParam = searchParams.get('page_name');

    if (success === 'true') {
      setStatus('success');
      setPageName(pageNameParam || 'Facebook Page');
      setMessage(`Đã kết nối thành công với ${pageNameParam || 'Facebook Page'}!`);
      
      toast({
        title: 'Kết nối thành công!',
        description: `Facebook Page "${pageNameParam}" đã được kết nối.`,
      });

      // Auto redirect after 3 seconds
      setTimeout(() => {
        navigate(brandTemplateId ? `/brands/${brandTemplateId}` : '/brands', { replace: true });
      }, 3000);
    } else if (error) {
      setStatus('error');
      
      let errorMessage = 'Đã xảy ra lỗi khi kết nối Facebook';
      
      if (error === 'no_pages') {
        errorMessage = 'Không tìm thấy Facebook Page nào. Bạn cần có quyền quản lý ít nhất một Page để sử dụng tính năng này.';
      } else if (error === 'access_denied') {
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
      setMessage('Đang xử lý kết nối Facebook...');
    }
  }, [searchParams, navigate, toast]);

  const handleRetry = () => {
    navigate('/brands', { replace: true });
  };

  const handleGoToBrands = () => {
    navigate('/brands', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Facebook className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-xl">
            {status === 'loading' && 'Đang kết nối Facebook...'}
            {status === 'success' && 'Kết nối thành công!'}
            {status === 'error' && 'Kết nối thất bại'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div className="space-y-2">
                <p className="font-medium">{pageName}</p>
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
