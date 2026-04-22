import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface ReconnectBannerDetail {
  platform: string; // e.g. 'zalo_oa'
  platformLabel?: string; // e.g. 'Zalo OA'
  message?: string;
}

const EVENT_NAME = 'flowa:social-reconnect-needed';

export function emitReconnectNeeded(detail: ReconnectBannerDetail) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
}

export function ReconnectBanner() {
  const [info, setInfo] = useState<ReconnectBannerDetail | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ReconnectBannerDetail>).detail;
      if (detail?.platform) setInfo(detail);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  if (!info) return null;

  const label = info.platformLabel || info.platform;

  return (
    <div className="px-4 sm:px-6 pt-3">
      <Alert variant="destructive" className="relative pr-12">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Token {label} đã hết hạn</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
          <span className="flex-1">
            {info.message || `Kết nối ${label} đã hết hạn. Vui lòng kết nối lại để tiếp tục đăng bài.`}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setInfo(null);
              navigate('/connections');
            }}
          >
            Kết nối lại {label}
          </Button>
        </AlertDescription>
        <button
          onClick={() => setInfo(null)}
          className="absolute top-3 right-3 text-destructive/70 hover:text-destructive"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </Alert>
    </div>
  );
}
