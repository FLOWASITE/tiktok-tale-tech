import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, XCircle } from 'lucide-react';

/**
 * Proxy page for Zalo OA OAuth callback.
 * Zalo redirects here (GET with code+state), then we forward to the edge function via POST.
 */
export default function ZaloOAuthProxy() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const forward = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (!code || !state) {
        setError('Thiếu thông tin xác thực từ Zalo');
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke('auth-gateway', {
          body: { platform: 'zalo', code, state },
        });

        if (fnError) throw fnError;

        if (data?.success) {
          const params = new URLSearchParams({
            success: 'true',
            platform: 'zalo_oa',
            ...(data.username ? { username: data.username } : {}),
            ...(data.brand_template_id ? { brand_template_id: data.brand_template_id } : {}),
            ...(data.package_name ? { package_name: data.package_name } : {}),
            ...(data.warning ? { warning: data.warning } : {}),
          });
          navigate(`/auth/zalo/callback?${params}`, { replace: true });
        } else {
          throw new Error(data?.error || 'Kết nối thất bại');
        }
      } catch (err: any) {
        setError(err.message || 'Có lỗi xảy ra khi kết nối Zalo OA');
      }
    };

    forward();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive font-medium">{error}</p>
            <button
              onClick={() => navigate('/brands')}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Quay lại
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Đang xử lý kết nối Zalo OA...</p>
        </CardContent>
      </Card>
    </div>
  );
}
