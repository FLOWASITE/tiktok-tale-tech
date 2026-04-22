import { Loader2 } from 'lucide-react';

// ============ Types =============
export type TelegramMiniApp = {
  initDataUnsafe?: { user?: { id?: number } };
  HapticFeedback?: { notificationOccurred?: (type: 'success' | 'error' | 'warning') => void };
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
};

export function getTelegramMiniApp(): TelegramMiniApp | undefined {
  return (window as unknown as { Telegram?: { WebApp?: TelegramMiniApp } }).Telegram?.WebApp;
}

// ============ Date helpers =============
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (isNaN(d)) return '';
  const diff = Date.now() - d;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'vừa xong';
  if (min < 60) return `${min} phút trước`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  return formatDateTime(iso);
}

// ============ Channel mapping =============
// Map UI channel key → channel-publisher action name (matches existing publisher routes).
export const CHANNEL_PUBLISH_ACTION: Record<string, string> = {
  facebook: 'publish-facebook',
  instagram: 'publish-instagram',
  linkedin: 'publish-linkedin',
  threads: 'publish-threads',
  twitter: 'publish-x',
  tiktok: 'publish-tiktok',
  zalo_oa: 'publish-zalo',
  google_maps: 'publish-google-business',
  website: 'publish-website',
  youtube: 'publish-youtube',
};

export const CHANNEL_LABEL: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  threads: 'Threads',
  twitter: 'X (Twitter)',
  tiktok: 'TikTok',
  zalo_oa: 'Zalo OA',
  google_maps: 'Google Business',
  website: 'Website',
  youtube: 'YouTube',
  email: 'Email',
};

export const CHANNEL_EMOJI: Record<string, string> = {
  facebook: '📘',
  instagram: '📸',
  linkedin: '💼',
  threads: '🧵',
  twitter: '🐦',
  tiktok: '🎵',
  zalo_oa: '💬',
  google_maps: '📍',
  website: '🌐',
  youtube: '📺',
  email: '✉️',
};

// Quick post supports text-friendly platforms only (no TikTok/YouTube which need video).
export const QUICK_POST_CHANNELS = [
  'facebook', 'instagram', 'linkedin', 'threads', 'twitter', 'zalo_oa', 'google_maps', 'website',
] as const;

// ============ Schedule slot helpers =============
export type ScheduleSlot = {
  key: string;
  label: string;
  toIso: () => string;
};

export function getScheduleSlots(): ScheduleSlot[] {
  return [
    { key: '+1h', label: '+1 giờ', toIso: () => new Date(Date.now() + 60 * 60_000).toISOString() },
    { key: '+3h', label: '+3 giờ', toIso: () => new Date(Date.now() + 3 * 60 * 60_000).toISOString() },
    {
      key: 'tomorrow_9',
      label: 'Mai 9:00',
      toIso: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d.toISOString();
      },
    },
    {
      key: 'tomorrow_14',
      label: 'Mai 14:00',
      toIso: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(14, 0, 0, 0);
        return d.toISOString();
      },
    },
  ];
}

// ============ UI helpers =============
export function Loading({ label }: { label?: string }) {
  return (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
      {label && <p className="mt-2 text-xs text-muted-foreground">{label}</p>}
    </div>
  );
}

// Open link outside Telegram WebView (OAuth, web app deeplinks).
export function openExternal(url: string) {
  const tg = getTelegramMiniApp();
  if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

// Friendly extraction of expired-token error from invoke response.
export function isTokenExpiredError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /token|expired|unauthor|reconnect|hết hạn|kết nối lại/i.test(msg);
}
