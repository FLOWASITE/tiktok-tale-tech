import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ChannelIcon } from '@/components/ChannelIcon';

const ERROR_MAP: Record<string, { title: string; message: string; hint?: string }> = {
  bluesky_missing_params: {
    title: 'Thiếu thông tin xác thực',
    message: 'Bluesky không trả về đủ tham số code/state.',
  },
  bluesky_state_invalid: {
    title: 'Phiên xác thực hết hạn',
    message: 'State không hợp lệ hoặc đã hết hạn. Vui lòng kết nối lại.',
  },
  bluesky_token_exchange_failed: {
    title: 'Không đổi được token',
    message: 'Bluesky từ chối mã xác thực. Có thể do client-metadata.json chưa truy cập được, hoặc DPoP key không khớp.',
    hint: 'Thử kết nối lại. Nếu vẫn lỗi, kiểm tra https://app.flowa.one/oauth/bluesky/client-metadata.json đã accessible chưa.',
  },
  access_denied: {
    title: 'Đã từ chối quyền truy cập',
    message: 'Bạn đã từ chối cấp quyền cho Flowa.',
  },
  bluesky_callback_failed: {
    title: 'Kết nối thất bại',
    message: 'Đã xảy ra lỗi khi kết nối Bluesky. Vui lòng thử lại.',
  },
};

export default function BlueskyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string; hint?: string } | null>(null);
  const [handle, setHandle] = useState('');
  const brandTemplateId = searchParams.get('brand_template_id');

  const goBack = () =>
    navigate(brandTemplateId ? `/brands/${brandTemplateId}` : '/brands', { replace: true });

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const handleParam = searchParams.get('handle');

    if (success === 'true') {
      setStatus('success');
      setHandle(handleParam || 'Bluesky Account');
      toast({
        title: 'Kết nối Bluesky thành công!',
        description: `@${handleParam} đã được kết nối qua OAuth.`,
      });
      setTimeout(goBack, 2500);
    } else if (error) {
      setStatus('error');
      const mapped = ERROR_MAP[error] || {
        title: 'Kết nối thất bại',
        message: errorDescription || 'Đã xảy ra lỗi không xác định.',
      };
      setErrorInfo(mapped);
      toast({ title: mapped.title, description: mapped.message, variant: 'destructive' });
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChannelIcon channel="bluesky" size={22} />
            Kết nối Bluesky
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang xử lý xác thực...
            </div>
          )}
          {status === 'success' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span>Đã kết nối @{handle}</span>
              </div>
              <p className="text-sm text-muted-foreground">Đang quay lại trang Brand...</p>
            </div>
          )}
          {status === 'error' && errorInfo && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-destructive">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">{errorInfo.title}</span>
              </div>
              <p className="text-sm text-muted-foreground">{errorInfo.message}</p>
              {errorInfo.hint && (
                <p className="text-xs text-muted-foreground border-l-2 border-muted pl-3">
                  {errorInfo.hint}
                </p>
              )}
              <Button onClick={goBack} className="w-full">
                Quay lại
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
