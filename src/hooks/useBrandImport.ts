import { useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BrandSuggestion {
  brand_name?: string | null;
  tagline?: string | null;
  mission?: string | null;
  industry_suggestion?: string | null;
  target_audience?: {
    age_range?: string | null;
    gender?: string | null;
    locations?: string[] | null;
  } | null;
  tone_of_voice?: string[] | null;
  content_pillars?: Array<{ name: string; description?: string }> | null;
  usps?: string[] | null;
  sample_texts?: string[] | null;
  primary_color_suggestion?: string | null;
}

export interface BrandImportResult {
  success: true;
  suggestion: BrandSuggestion;
  raw_meta: Record<string, any>;
  source: 'website' | 'fanpage';
}

export type ImportableField =
  | 'brand_name'
  | 'tagline'
  | 'mission'
  | 'industry'
  | 'target_audience'
  | 'tone_of_voice'
  | 'brand_positioning'
  | 'formality_level'
  | 'content_pillars'
  | 'usps'
  | 'sample_texts'
  | 'logo_url'
  | 'primary_color'
  | 'footer_info'
  | 'attach_fanpage';

export interface BrandImportProgress {
  step: string;
  percent: number;
  message: string;
}

export interface BrandImportEvent {
  id: string;
  kind: 'progress' | 'subpage' | 'posts' | 'model_attempt' | 'model_fallback' | 'info';
  message: string;
  status: 'active' | 'done' | 'warn';
}

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface RunStreamArgs {
  fn: 'import-brand-from-website' | 'import-brand-from-fanpage';
  body: Record<string, unknown>;
  source: 'website' | 'fanpage';
  onProgress: (p: BrandImportProgress) => void;
  onEvent: (e: BrandImportEvent) => void;
  signal: AbortSignal;
}

async function runStream(args: RunStreamArgs): Promise<BrandImportResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Vui lòng đăng nhập lại');

  const resp = await fetch(`${FN_BASE}/${args.fn}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ ...args.body, stream: true }),
    signal: args.signal,
  });

  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    let code: string | undefined;
    try {
      const j = await resp.json();
      msg = j?.error || msg;
      code = j?.code;
    } catch { /* ignore */ }
    const err = new Error(msg) as any;
    err.status = resp.status;
    err.code = code;
    throw err;
  }

  const ctype = resp.headers.get('content-type') || '';
  // Backward compat: server returned JSON instead of SSE
  if (!ctype.includes('text/event-stream')) {
    const data = await resp.json();
    if (!data?.success) throw new Error(data?.error || 'AI không phân tích được nội dung');
    return { ...data, source: args.source } as BrandImportResult;
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error('Không đọc được stream');
  const decoder = new TextDecoder();
  let buffer = '';
  let result: BrandImportResult | null = null;
  let evtSeq = 0;
  const newId = () => `evt-${Date.now()}-${++evtSeq}`;

  // Watchdog 60s
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  const ac = new AbortController();
  args.signal.addEventListener('abort', () => ac.abort());
  const resetWatchdog = () => {
    if (watchdog) clearTimeout(watchdog);
    watchdog = setTimeout(() => ac.abort(), 60000);
  };
  resetWatchdog();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (ac.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      resetWatchdog();
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        let evt: any;
        try { evt = JSON.parse(line.slice(6).trim()); } catch { continue; }

        if (evt.type === 'progress') {
          args.onProgress({ step: evt.step, percent: evt.percent ?? 0, message: evt.message || '' });
          args.onEvent({ id: newId(), kind: 'progress', message: evt.message || evt.step, status: 'active' });
        } else if (evt.type === 'subpage_done') {
          args.onEvent({
            id: newId(),
            kind: 'subpage',
            message: evt.success
              ? `Đã đọc ${shortUrl(evt.url)}`
              : `Bỏ qua ${shortUrl(evt.url)}: ${evt.error || 'lỗi'}`,
            status: evt.success ? 'done' : 'warn',
          });
        } else if (evt.type === 'posts_loaded') {
          args.onEvent({
            id: newId(),
            kind: 'posts',
            message: `Đã lấy ${evt.count} bài viết để phân tích`,
            status: 'done',
          });
        } else if (evt.type === 'model_attempt' || evt.type === 'model_fallback') {
          const isFallback = evt.type === 'model_fallback';
          args.onEvent({
            id: newId(),
            kind: isFallback ? 'model_fallback' : 'model_attempt',
            message: isFallback
              ? `Fallback sang ${evt.model}${evt.reason ? ` (lý do: ${truncate(evt.reason, 60)})` : ''}`
              : `Đang dùng model ${evt.model} (${evt.attempt}/${evt.total})`,
            status: isFallback ? 'warn' : 'active',
          });
        } else if (evt.type === 'result') {
          result = {
            success: true,
            suggestion: evt.suggestion,
            raw_meta: evt.raw_meta,
            source: args.source,
          };
          args.onProgress({ step: 'done', percent: 100, message: 'Hoàn thành' });
        } else if (evt.type === 'error') {
          const err = new Error(evt.message || 'Lỗi không xác định') as any;
          err.status = evt.status;
          err.code = evt.code;
          throw err;
        }
      }
    }
  } finally {
    if (watchdog) clearTimeout(watchdog);
  }

  if (!result) throw new Error('Stream kết thúc mà không có kết quả');
  return result;
}

function shortUrl(u: string): string {
  try { return new URL(u).pathname || u; } catch { return u; }
}
function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function useBrandImport() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<BrandImportProgress>({ step: '', percent: 0, message: '' });
  const [events, setEvents] = useState<BrandImportEvent[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const reset = () => {
    setProgress({ step: '', percent: 0, message: '' });
    setEvents([]);
  };

  const handleError = (e: any, sourceLabel: string): null => {
    if (e?.name === 'AbortError') return null;
    const status = e?.status;
    const msg = (e?.message || '').toLowerCase();
    if (status === 402 || msg.includes('402') || msg.includes('quota') || msg.includes('credit')) {
      toast.error('Hết credit AI', {
        description: 'Vui lòng nạp thêm credit để tiếp tục import.',
        action: { label: 'Nạp credit', onClick: () => window.location.assign('/settings/usage') },
      });
      return null;
    }
    if (status === 503) {
      toast.warning('Tính năng tạm ngưng', { description: 'Admin đã tắt Import Brand.' });
      return null;
    }
    console.error(`[useBrandImport.${sourceLabel}]`, e);
    toast.error(`Không import được ${sourceLabel}`, { description: e?.message });
    return null;
  };

  const importFromWebsite = useCallback(async (
    url: string,
    options?: { extra_paths?: string[]; organization_id?: string },
  ): Promise<BrandImportResult | null> => {
    setLoading(true);
    reset();
    abortRef.current = new AbortController();
    try {
      return await runStream({
        fn: 'import-brand-from-website',
        body: {
          url,
          extra_paths: options?.extra_paths || [],
          organization_id: options?.organization_id,
          locale: 'vi',
        },
        source: 'website',
        onProgress: setProgress,
        onEvent: (e) => setEvents((prev) => [...prev, e].slice(-12)),
        signal: abortRef.current.signal,
      });
    } catch (e) {
      return handleError(e, 'website');
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, []);

  const importFromFanpage = useCallback(async (
    socialConnectionId: string,
    options?: { organization_id?: string },
  ): Promise<BrandImportResult | null> => {
    setLoading(true);
    reset();
    abortRef.current = new AbortController();
    try {
      return await runStream({
        fn: 'import-brand-from-fanpage',
        body: {
          social_connection_id: socialConnectionId,
          organization_id: options?.organization_id,
          locale: 'vi',
        },
        source: 'fanpage',
        onProgress: setProgress,
        onEvent: (e) => setEvents((prev) => [...prev, e].slice(-12)),
        signal: abortRef.current.signal,
      });
    } catch (e) {
      return handleError(e, 'fanpage');
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  return { loading, progress, events, importFromWebsite, importFromFanpage, cancel };
}
