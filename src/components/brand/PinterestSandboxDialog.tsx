import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Loader2, FlaskConical, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string | null;
  brandTemplateId?: string | null;
  onConnected?: () => void;
}

export const PinterestSandboxDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  organizationId,
  brandTemplateId,
  onConnected,
}) => {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      toast.error('Vui lòng dán access token sandbox');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('connect-pinterest-sandbox', {
        body: {
          accessToken: trimmed,
          organizationId: organizationId ?? null,
          brandTemplateId: brandTemplateId ?? null,
        },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Kết nối thất bại');
      }
      toast.success('Đã kết nối Pinterest Sandbox', {
        description: data?.message,
      });
      setToken('');
      onOpenChange(false);
      onConnected?.();
    } catch (e: any) {
      toast.error('Không kết nối được sandbox', { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-muted-foreground" />
            Kết nối Pinterest Sandbox (test)
          </DialogTitle>
          <DialogDescription>
            Sandbox dùng để kiểm thử khi app Pinterest chưa được duyệt Standard access.
            Pin tạo ra <strong>không hiển thị trên Pinterest thật</strong> — chỉ verify code path.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertDescription className="text-sm space-y-2">
            <p className="font-medium">Cách lấy access token sandbox:</p>
            <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
              <li>
                Mở{' '}
                <a
                  href="https://developers.pinterest.com/apps/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline inline-flex items-center gap-1"
                >
                  developers.pinterest.com/apps
                  <ExternalLink className="w-3 h-3" />
                </a>
                {' '}→ chọn app của bạn.
              </li>
              <li>Cuộn tới mục "Tạo Mã truy cập", chọn môi trường <strong>Sandbox</strong>.</li>
              <li>Bấm "Tạo mã truy cập" → copy chuỗi bắt đầu bằng <code>pina_</code>.</li>
              <li>Dán vào ô bên dưới và bấm Kết nối.</li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="pinterest-sandbox-token">Sandbox access token</Label>
          <div className="relative">
            <Input
              id="pinterest-sandbox-token"
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="pina_..."
              className="pr-10 font-mono text-xs"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowToken((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Token sandbox hết hạn sau 30 ngày. Lưu trữ mã hóa AES-256.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !token.trim()}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang kiểm tra...
              </>
            ) : (
              'Kết nối Sandbox'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
