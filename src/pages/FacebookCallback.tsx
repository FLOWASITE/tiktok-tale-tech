import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Facebook, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface FbPage {
  id: string;
  name: string;
  category?: string;
  picture?: string | null;
  fan_count?: number | null;
  followers_count?: number | null;
}

type Mode = 'loading' | 'picker' | 'success' | 'error';

export default function FacebookCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [pages, setPages] = useState<FbPage[]>([]);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [attaching, setAttaching] = useState<string | null>(null);
  const [justAttached, setJustAttached] = useState<string[]>([]);

  const sessionId = searchParams.get('session_id');
  const brandTemplateId = searchParams.get('brand_template_id');
  const successFlag = searchParams.get('success');
  const errorFlag = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const pageNameParam = searchParams.get('page_name');

  const goBack = () =>
    navigate(brandTemplateId ? `/brands/${brandTemplateId}` : '/brands', { replace: true });

  // Legacy success path (kept for backwards compat with old redirects)
  useEffect(() => {
    if (successFlag === 'true' && !sessionId) {
      setMode('success');
      toast({
        title: 'Kết nối thành công',
        description: `Facebook Page "${pageNameParam || ''}" đã được kết nối.`,
      });
      const t = setTimeout(goBack, 2500);
      return () => clearTimeout(t);
    }
    if (errorFlag) {
      setMode('error');
      let msg = 'Đã xảy ra lỗi khi kết nối Facebook';
      if (errorFlag === 'no_pages') {
        msg = 'Không tìm thấy Facebook Page nào. Bạn cần có quyền quản lý ít nhất một Page.';
      } else if (errorFlag === 'access_denied') {
        msg = 'Bạn đã từ chối quyền truy cập. Vui lòng thử lại và chấp nhận các quyền cần thiết.';
      } else if (errorDescription) {
        msg = decodeURIComponent(errorDescription);
      }
      setErrorMsg(msg);
      toast({ title: 'Kết nối thất bại', description: msg, variant: 'destructive' });
    }
  }, [successFlag, errorFlag]); // eslint-disable-line react-hooks/exhaustive-deps

  // New flow: load page list from session
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('facebook-list-session-pages', {
          body: { session_id: sessionId },
        });
        if (cancelled) return;
        if (error || !data?.success) {
          const msg = data?.error || error?.message || 'Không thể tải danh sách Page';
          setErrorMsg(msg);
          setMode('error');
          return;
        }
        setPages(data.pages || []);
        setConnectedIds(data.connected_page_ids || []);
        setMode('picker');
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : 'Không thể tải danh sách Page');
        setMode('error');
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const handleAttach = async (page: FbPage) => {
    if (!sessionId) return;
    setAttaching(page.id);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-attach-page', {
        body: {
          session_id: sessionId,
          page_id: page.id,
          set_default: connectedIds.length === 0 && justAttached.length === 0,
        },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Kết nối Page thất bại');
      }
      setJustAttached((prev) => [...prev, page.id]);
      setConnectedIds((prev) => Array.from(new Set([...prev, page.id])));
      toast({
        title: 'Đã kết nối',
        description: `Facebook Page "${page.name}" đã được thêm vào thương hiệu.`,
      });
    } catch (e) {
      toast({
        title: 'Lỗi',
        description: e instanceof Error ? e.message : 'Kết nối Page thất bại',
        variant: 'destructive',
      });
    } finally {
      setAttaching(null);
    }
  };

  const renderPicker = () => (
    <Card className="w-full max-w-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <Facebook className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle className="text-xl">Chọn Fanpage để kết nối</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Tìm thấy <strong>{pages.length}</strong> Page. Chọn một hoặc nhiều Page để gắn vào thương hiệu.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {pages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-6">
            Tài khoản của bạn không quản lý Page nào.
          </div>
        )}

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {pages.map((p) => {
            const already = connectedIds.includes(p.id) || justAttached.includes(p.id);
            const isAttaching = attaching === p.id;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/40 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.picture || undefined} alt={p.name} />
                  <AvatarFallback>
                    <Facebook className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {p.category && <span className="truncate">{p.category}</span>}
                    {(p.fan_count || p.followers_count) != null && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {(p.followers_count || p.fan_count || 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                {already ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Đã kết nối
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleAttach(p)}
                    disabled={isAttaching || !!attaching}
                  >
                    {isAttaching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Kết nối'
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-3 border-t">
          <Button variant="outline" onClick={goBack} className="flex-1">
            Hủy
          </Button>
          <Button onClick={goBack} className="flex-1" disabled={!!attaching}>
            {justAttached.length > 0 ? `Hoàn tất (${justAttached.length})` : 'Xong'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {mode === 'picker' ? (
        renderPicker()
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Facebook className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl">
              {mode === 'loading' && 'Đang xử lý kết nối Facebook...'}
              {mode === 'success' && 'Kết nối thành công!'}
              {mode === 'error' && 'Kết nối thất bại'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {mode === 'loading' && (
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            )}
            {mode === 'success' && (
              <>
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-muted-foreground text-sm">
                  Facebook Page "{pageNameParam}" đã được kết nối.
                </p>
                <Button onClick={goBack} className="w-full">Đi đến Thương hiệu</Button>
              </>
            )}
            {mode === 'error' && (
              <>
                <XCircle className="h-12 w-12 text-destructive mx-auto" />
                <p className="text-muted-foreground text-sm">{errorMsg}</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={goBack} className="flex-1">Quay lại</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
