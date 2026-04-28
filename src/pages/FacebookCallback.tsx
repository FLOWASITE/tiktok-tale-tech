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

  const [resetting, setResetting] = useState(false);

  const handleReauthorize = () => {
    toast({
      title: 'Mở Facebook để cấp quyền thêm Page',
      description:
        'Vào Facebook → Settings → Business Integrations → chọn app Flowa → "Edit settings" và bật các Page bạn muốn thêm. Sau đó quay lại bấm "Thêm Fanpage khác".',
    });
    goBack();
  };

  const handleResetPermissions = async () => {
    if (!brandTemplateId) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Không xác định được thương hiệu để reset.',
        variant: 'destructive',
      });
      return;
    }
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-reset-app-permissions', {
        body: { brand_template_id: brandTemplateId },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Reset quyền thất bại');
      }

      // Manual path: token unusable → open Facebook Business Tools so user removes app there
      if (data.manual_action_required) {
        toast({
          title: 'Cần thao tác thủ công',
          description: data.message || 'Mở Facebook Settings để remove app Flowa.',
        });
        if (data.manual_url) {
          window.open(data.manual_url, '_blank', 'noopener');
        }
        return;
      }

      // Diagnostic: account thật chỉ có ≤1 Page
      if (typeof data.actual_pages_count === 'number' && data.actual_pages_count <= 1) {
        toast({
          title: 'Tài khoản Facebook chỉ quản lý 1 Page',
          description:
            'Reset OK nhưng Facebook báo bạn chỉ là Admin của 1 Page duy nhất. Hãy đăng nhập Facebook và kiểm tra tại facebook.com/pages, hoặc dùng Facebook Business Manager để được cấp quyền thêm Page khác.',
        });
        return;
      }

      // Happy path: revoked + multiple pages exist → auto trigger fresh OAuth
      toast({
        title: 'Đã reset quyền Facebook',
        description: 'Đang mở lại cửa sổ Facebook để bạn chọn Page...',
      });

      const { data: connectData, error: connectError } = await supabase.functions.invoke(
        'connect-social',
        {
          body: { platform: 'facebook', brandTemplateId },
        }
      );
      if (connectError || !connectData?.url) {
        toast({
          title: 'Reset xong nhưng không tự mở được OAuth',
          description: 'Hãy quay lại trang Brand và bấm "Kết nối Facebook" thủ công.',
          variant: 'destructive',
        });
        goBack();
        return;
      }
      // Redirect this window straight to Facebook OAuth
      window.location.href = connectData.url;
    } catch (e) {
      toast({
        title: 'Không reset được quyền',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    } finally {
      setResetting(false);
    }
  };

  const allAlreadyConnected =
    pages.length > 0 && pages.every((p) => connectedIds.includes(p.id) || justAttached.includes(p.id));

  const renderPicker = () => (
    <Card className="w-full max-w-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <Facebook className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle className="text-xl">Chọn Fanpage để kết nối</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Facebook trả về <strong>{pages.length}</strong> Page mà bạn đã cấp quyền cho ứng dụng. Chọn một hoặc nhiều Page để gắn vào thương hiệu.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {pages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-6">
            Tài khoản của bạn không quản lý Page nào.
          </div>
        )}

        {allAlreadyConnected && justAttached.length === 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-2">
            <p className="font-medium">Tất cả Page Facebook trả về đã được kết nối.</p>
            <p>
              Facebook chỉ trả về các Page bạn đã cấp quyền cho ứng dụng. Để chọn thêm Page khác, hãy:
            </p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>
                <strong>Cách 1 (nhanh):</strong> Bấm <strong>"Reset quyền &amp; chọn lại"</strong> bên dưới rồi kết nối lại Facebook — màn hình chọn Page sẽ hiện đầy đủ các Page bạn quản lý.
              </li>
              <li>
                <strong>Cách 2 (thủ công):</strong> Vào <strong>Facebook → Settings &amp; privacy → Settings → Business Integrations</strong>, chọn ứng dụng Flowa, bấm <strong>"Edit settings"</strong> và bật thêm Page, sau đó kết nối lại.
              </li>
            </ol>
            <Button
              size="sm"
              variant="outline"
              className="mt-1"
              onClick={() =>
                window.open(
                  'https://www.facebook.com/settings?tab=business_tools',
                  '_blank',
                  'noopener'
                )
              }
            >
              Mở Facebook Settings
            </Button>
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

        <div className="flex flex-col gap-2 pt-3 border-t sm:flex-row">
          <Button
            variant="outline"
            onClick={handleResetPermissions}
            className="flex-1"
            disabled={resetting || !!attaching}
          >
            {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Reset quyền &amp; chọn lại
          </Button>
          <Button variant="outline" onClick={handleReauthorize} className="flex-1" disabled={!!attaching}>
            Hướng dẫn cấp thêm Page
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
