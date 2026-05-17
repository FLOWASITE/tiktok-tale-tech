import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  CalendarDays, Sparkles, Download, Trash2, Plus, RefreshCw, AlertTriangle,
  Copy, FileSpreadsheet, FileText, Loader2, List as ListIcon, Grid3x3, X,
  MoreHorizontal, CopyPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ChannelIcon, channelIconColors } from '@/components/ui/channel-icon';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  piecesToCSV, piecesToMarkdown, downloadFile, type SchedulePiece,
} from '@/lib/scheduleExport';
import { useRewritePiece } from '@/hooks/agents/useRewritePiece';

/* ---------- helpers ---------- */

const PILLAR_VAR: Record<string, string> = {
  educate: 'var(--pillar-educate)',
  inspire: 'var(--pillar-inspire)',
  sell: 'var(--pillar-sell)',
  entertain: 'var(--pillar-entertain)',
};
const pillarColor = (p?: string) =>
  `hsl(${PILLAR_VAR[(p || '').toLowerCase()] || 'var(--pillar-default)'})`;

const CONTENT_TYPES = [
  { value: 'multichannel', label: 'Post' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'video_script', label: 'Video' },
];

const GOLDEN_HOURS: Record<string, string> = {
  facebook: '19:30', instagram: '20:00', linkedin: '09:00', threads: '12:00',
  twitter: '09:30', bluesky: '11:00', pinterest: '21:00', telegram: '20:30',
  zalo: '11:30', email: '09:30', website: '09:30', blogger: '09:30',
  wordpress: '09:30', shopify: '09:30', wix: '09:30', medium: '09:30',
  google_maps: '10:00',
};

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const fn = () => setMatches(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [query]);
  return matches;
}

const PillarDot = ({ pillar, size = 8 }: { pillar?: string; size?: number }) => (
  <span
    aria-hidden
    className="inline-block rounded-full shrink-0"
    style={{ width: size, height: size, background: pillarColor(pillar) }}
  />
);

/* ---------- types ---------- */

export type ChannelOption = { id: string; label: string; channelKey: string };

export interface ContentScheduleStudioProps {
  pieces: SchedulePiece[];
  onChange: (next: SchedulePiece[]) => void;
  onRegenerate: () => void;
  isGenerating?: boolean;
  channels: ChannelOption[];
  pillars: string[];
  startDate: string;
  duration: number;
  campaignTitle: string;
  organizationId: string;
  brandTemplateId?: string;
  clarificationContext?: Record<string, any>;
  error?: string | null;
}

/* ---------- main ---------- */

export default function ContentScheduleStudio({
  pieces, onChange, onRegenerate, isGenerating, channels, pillars,
  startDate, duration, campaignTitle, organizationId, brandTemplateId,
  clarificationContext, error,
}: ContentScheduleStudioProps) {
  const isWide = useMediaQuery('(min-width: 640px)');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterPillar, setFilterPillar] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const { rewrite, loadingId } = useRewritePiece();

  const channelLabel = (id: string) => channels.find((c) => c.id === id)?.label || id;
  const channelKey = (id: string) => channels.find((c) => c.id === id)?.channelKey || 'website';

  const filtered = useMemo(() => pieces.filter((p) =>
    (filterChannel === 'all' || p.target_channel === filterChannel) &&
    (filterPillar === 'all' || p.pillar === filterPillar) &&
    (filterType === 'all' || p.content_type === filterType) &&
    (!filterDate || p.scheduled_date === filterDate),
  ), [pieces, filterChannel, filterPillar, filterType, filterDate]);

  const sorted = useMemo(
    () => filtered.slice().sort((a, b) =>
      a.scheduled_date.localeCompare(b.scheduled_date) ||
      (a.recommended_time || '').localeCompare(b.recommended_time || ''),
    ),
    [filtered],
  );

  const stats = useMemo(() => {
    const byChannel = new Map<string, number>();
    const byPillar = new Map<string, number>();
    const byDay = new Map<string, number>();
    pieces.forEach((p) => {
      byChannel.set(p.target_channel, (byChannel.get(p.target_channel) || 0) + 1);
      const pl = p.pillar || 'Mixed';
      byPillar.set(pl, (byPillar.get(pl) || 0) + 1);
      byDay.set(p.scheduled_date, (byDay.get(p.scheduled_date) || 0) + 1);
    });
    const overloadDays = Array.from(byDay.entries())
      .filter(([, c]) => c > 3)
      .sort((a, b) => a[0].localeCompare(b[0]));
    return { byChannel, byPillar, byDay, overloadDays, total: pieces.length };
  }, [pieces]);

  const updatePiece = (n: number, patch: Partial<SchedulePiece>) => {
    onChange(pieces.map((p) => (p.piece_number === n ? { ...p, ...patch } : p)));
  };
  const deletePiece = (n: number) => {
    onChange(pieces.filter((p) => p.piece_number !== n).map((p, i) => ({ ...p, piece_number: i + 1 })));
  };
  const duplicatePiece = (p: SchedulePiece) => {
    const copy: SchedulePiece = { ...p, piece_number: pieces.length + 1, title: `${p.title} (bản sao)` };
    onChange([...pieces, copy]);
  };
  const addPiece = (dateStr?: string) => {
    const newP: SchedulePiece = {
      piece_number: pieces.length + 1,
      title: 'Bài mới',
      target_channel: channels[0]?.id || 'facebook',
      scheduled_date: dateStr || startDate,
      recommended_time: GOLDEN_HOURS[channels[0]?.id || 'facebook'] || '09:00',
      pillar: pillars[0] || 'Mixed',
      content_type: 'multichannel',
      content_role: 'seed',
      angle: 'educational',
      format: 'post',
      key_message: '',
      status: 'planned',
    };
    onChange([...pieces, newP]);
  };

  const doRewrite = async (p: SchedulePiece) => {
    const res = await rewrite(p, {
      organizationId, brandTemplateId, campaignTitle,
      clarificationContext, existingTitles: pieces.map((x) => x.title),
    });
    if (res) {
      updatePiece(p.piece_number, { title: res.title, key_message: res.key_message });
      toast.success('AI đã viết lại tiêu đề');
    } else {
      toast.error('AI không tạo được gợi ý mới');
    }
  };

  const doExport = (kind: 'csv' | 'md' | 'copy') => {
    if (kind === 'csv') {
      downloadFile(`lich-noi-dung-${campaignTitle || 'campaign'}.csv`, piecesToCSV(sorted), 'text/csv');
      toast.success('Đã tải CSV');
    } else {
      const md = piecesToMarkdown(sorted);
      if (kind === 'md') {
        downloadFile(`lich-noi-dung-${campaignTitle || 'campaign'}.md`, md, 'text/markdown');
        toast.success('Đã tải Markdown');
      } else {
        navigator.clipboard.writeText(md);
        toast.success('Đã copy vào clipboard');
      }
    }
  };

  const clearFilters = () => {
    setFilterChannel('all'); setFilterPillar('all'); setFilterType('all'); setFilterDate(null);
  };
  const hasActiveFilter = filterChannel !== 'all' || filterPillar !== 'all' || filterType !== 'all' || !!filterDate;

  /* ---------- loading / empty / error ---------- */

  if (isGenerating && pieces.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <p className="text-sm font-medium">AI đang phân bổ lịch nội dung…</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Đang sắp xếp bài theo kênh, pillar và giờ vàng. Mất 5–15 giây.
        </p>
        <div className="space-y-1.5 pt-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-md bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (pieces.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-6 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-muted mx-auto flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Chưa có lịch nội dung</p>
          <p className="text-xs text-muted-foreground">Để AI phân bổ tự động hoặc thêm thủ công.</p>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button size="sm" onClick={onRegenerate} className="h-8 text-xs gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Tạo bằng AI
          </Button>
          <Button size="sm" variant="outline" onClick={() => addPiece()} className="h-8 text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Thêm thủ công
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- grouping ---------- */

  const dayGroups = useMemo(() => {
    const map = new Map<string, SchedulePiece[]>();
    sorted.forEach((p) => {
      const arr = map.get(p.scheduled_date) || [];
      arr.push(p);
      map.set(p.scheduled_date, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sorted]);

  const weekGroups = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    type G = { weekIdx: number; rangeLabel: string; rows: SchedulePiece[] };
    const groups: G[] = [];
    sorted.forEach((p) => {
      const d = new Date(p.scheduled_date);
      const diff = Math.floor((d.getTime() - start.getTime()) / 86400000);
      const w = Math.max(0, Math.floor(diff / 7));
      let g = groups.find((x) => x.weekIdx === w);
      if (!g) {
        const ws = new Date(start.getTime() + w * 7 * 86400000);
        const we = new Date(ws.getTime() + 6 * 86400000);
        g = {
          weekIdx: w,
          rangeLabel: `${ws.getDate()}/${ws.getMonth() + 1} – ${we.getDate()}/${we.getMonth() + 1}`,
          rows: [],
        };
        groups.push(g);
      }
      g.rows.push(p);
    });
    return groups;
  }, [sorted, startDate]);

  /* ---------- mini bar ---------- */

  const MiniBar = ({ entries }: { entries: [string, number][] }) => {
    const total = entries.reduce((s, [, c]) => s + c, 0) || 1;
    const top = entries.slice().sort((a, b) => b[1] - a[1]).slice(0, 5);
    return (
      <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-muted">
        {top.map(([k, c], i) => (
          <div
            key={k}
            className="h-full"
            style={{
              width: `${(c / total) * 100}%`,
              background: `hsl(240 4% ${30 + i * 10}%)`,
            }}
            title={`${k}: ${c}`}
          />
        ))}
      </div>
    );
  };

  /* ---------- row ---------- */

  const ScheduleRow = ({ p }: { p: SchedulePiece }) => {
    const overload = (stats.byDay.get(p.scheduled_date) || 0) > 3;
    const isEditing = editingId === p.piece_number;
    return (
      <div
        className={cn(
          'group flex items-start gap-2 px-3 py-2 rounded-md border border-transparent hover:bg-accent/40 hover:border-border/60 transition-colors',
          overload && 'border-l-2 border-l-amber-500/70',
        )}
      >
        <PillarDot pillar={p.pillar} size={8} />
        <div className="flex-1 min-w-0 space-y-1">
          {isEditing ? (
            <Input
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={() => { updatePiece(p.piece_number, { title: draftTitle }); setEditingId(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { updatePiece(p.piece_number, { title: draftTitle }); setEditingId(null); }
                if (e.key === 'Escape') setEditingId(null);
              }}
              className="h-7 px-2 text-sm"
            />
          ) : (
            <button
              className="text-left text-sm font-medium leading-snug line-clamp-2 hover:text-primary w-full"
              onClick={() => { setDraftTitle(p.title); setEditingId(p.piece_number); }}
            >
              {p.title}
            </button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground tabular-nums">
                <span>{format(new Date(p.scheduled_date), 'EEE d/M', { locale: vi })}</span>
                <span className="opacity-50">·</span>
                <span>{p.recommended_time || '—'}</span>
                <span className="opacity-50">·</span>
                <ChannelIcon
                  channel={channelKey(p.target_channel) as any}
                  size={11}
                  className={channelIconColors[channelKey(p.target_channel) as any]}
                />
                <span>{channelLabel(p.target_channel)}</span>
                {p.pillar && (
                  <>
                    <span className="opacity-50">·</span>
                    <span className="capitalize">{p.pillar}</span>
                  </>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3 space-y-2.5">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Ngày</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 w-full justify-start text-xs font-normal">
                      <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                      {format(new Date(p.scheduled_date), 'EEEE d/M/yyyy', { locale: vi })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={new Date(p.scheduled_date)}
                      onSelect={(d) => d && updatePiece(p.piece_number, { scheduled_date: format(d, 'yyyy-MM-dd') })}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Giờ đăng</label>
                  <Input
                    type="time"
                    value={p.recommended_time || ''}
                    onChange={(e) => updatePiece(p.piece_number, { recommended_time: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Loại</label>
                  <Select value={p.content_type} onValueChange={(v) => updatePiece(p.piece_number, { content_type: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Kênh</label>
                <Select
                  value={p.target_channel}
                  onValueChange={(v) => updatePiece(p.piece_number, { target_channel: v, recommended_time: p.recommended_time || GOLDEN_HOURS[v] || '09:00' })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {channels.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Pillar</label>
                <Select value={p.pillar || 'Mixed'} onValueChange={(v) => updatePiece(p.piece_number, { pillar: v })}>
                  <SelectTrigger className="h-8 text-xs capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(pillars.length > 0 ? pillars : ['Mixed']).map((pl) => (
                      <SelectItem key={pl} value={pl} className="text-xs capitalize">{pl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              disabled={loadingId === p.piece_number}
              onClick={() => doRewrite(p)}
            >
              {loadingId === p.piece_number
                ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5 mr-2 text-primary" />}
              AI viết lại
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => duplicatePiece(p)}>
              <CopyPlus className="w-3.5 h-3.5 mr-2" /> Nhân bản
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => deletePiece(p.piece_number)} className="text-destructive focus:text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Xoá
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  /* ---------- render ---------- */

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b">
        <CalendarDays className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Lịch nội dung</span>
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium">
          {pieces.length} bài
        </Badge>
        <div className="ml-auto flex items-center gap-1.5">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList className="h-7 p-0.5">
              <TabsTrigger value="list" className="h-6 px-2 text-[11px] gap-1">
                <ListIcon className="w-3 h-3" />
                {isWide && <span>Danh sách</span>}
              </TabsTrigger>
              <TabsTrigger value="calendar" className="h-6 px-2 text-[11px] gap-1">
                <Grid3x3 className="w-3 h-3" />
                {isWide && <span>Lịch</span>}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onRegenerate} disabled={isGenerating}>
                {isGenerating
                  ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
                AI sinh lại toàn bộ
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-muted-foreground font-normal">Xuất dữ liệu</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => doExport('csv')}>
                <FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Tải CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => doExport('md')}>
                <FileText className="w-3.5 h-3.5 mr-2" /> Tải Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => doExport('copy')}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Copy clipboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="px-3 py-2.5 border-b bg-muted/20 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Tổng</span>
              <span className="text-sm font-semibold tabular-nums">{stats.total}</span>
            </div>
            <div className="h-1.5 rounded-full bg-foreground/70" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Kênh</span>
              <span className="text-sm font-semibold tabular-nums">{stats.byChannel.size}</span>
            </div>
            <MiniBar entries={Array.from(stats.byChannel.entries())} />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Pillar</span>
              <span className="text-sm font-semibold tabular-nums">{stats.byPillar.size}</span>
            </div>
            <MiniBar entries={Array.from(stats.byPillar.entries())} />
          </div>
        </div>
        {stats.overloadDays.length > 0 && (
          <div className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>
              {stats.overloadDays.length} ngày &gt;3 bài:{' '}
              {stats.overloadDays.slice(0, 4).map(([d], i) => (
                <button
                  key={d}
                  className="underline-offset-2 hover:underline"
                  onClick={() => setFilterDate(d)}
                >
                  {format(new Date(d), 'd/M', { locale: vi })}{i < Math.min(stats.overloadDays.length, 4) - 1 ? ', ' : ''}
                </button>
              ))}
              {stats.overloadDays.length > 4 && ` +${stats.overloadDays.length - 4}`}
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="px-3 py-2 border-b space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Select value={filterChannel} onValueChange={setFilterChannel}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[110px] gap-1"><SelectValue placeholder="Mọi kênh" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Mọi kênh</SelectItem>
              {Array.from(stats.byChannel.keys()).map((c) => (
                <SelectItem key={c} value={c} className="text-xs">{channelLabel(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPillar} onValueChange={setFilterPillar}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[110px] gap-1"><SelectValue placeholder="Mọi pillar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Mọi pillar</SelectItem>
              {Array.from(stats.byPillar.keys()).map((p) => (
                <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[100px] gap-1"><SelectValue placeholder="Mọi loại" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Mọi loại</SelectItem>
              {CONTENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="ml-auto h-7 text-xs gap-1" onClick={() => addPiece()}>
            <Plus className="w-3 h-3" /> Thêm bài
          </Button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <span className="text-muted-foreground">
            Hiện <span className="font-medium text-foreground tabular-nums">{filtered.length}</span> / {pieces.length} bài
          </span>
          {filterDate && (
            <Badge variant="secondary" className="h-5 text-[10px] gap-1 font-normal">
              Ngày {format(new Date(filterDate), 'd/M', { locale: vi })}
              <button onClick={() => setFilterDate(null)}><X className="w-2.5 h-2.5" /></button>
            </Badge>
          )}
          {hasActiveFilter && (
            <button onClick={clearFilters} className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline ml-auto">
              Xoá filter
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {view === 'list' ? (
        <div className="max-h-[420px] overflow-y-auto p-2 space-y-3">
          {weekGroups.map((g) => (
            <div key={g.weekIdx} className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1 sticky top-0 bg-card/95 backdrop-blur-sm z-10 border-b border-border/60">
                <span className="text-xs font-semibold">
                  Tuần {g.weekIdx + 1}{' '}
                  <span className="font-normal text-muted-foreground">({g.rangeLabel})</span>
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{g.rows.length} bài</span>
              </div>
              <div className="space-y-0.5">
                {g.rows.map((p) => (<ScheduleRow key={p.piece_number} p={p} />))}
              </div>
              <button
                className="w-full text-left px-3 py-1.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-accent/40 rounded-md transition-colors"
                onClick={() => {
                  const ws = new Date(new Date(startDate).getTime() + g.weekIdx * 7 * 86400000);
                  addPiece(format(ws, 'yyyy-MM-dd'));
                }}
              >
                + Thêm bài vào tuần này
              </button>
            </div>
          ))}
        </div>
      ) : isWide ? (
        <CalendarGrid
          startDate={startDate} duration={duration} dayGroups={dayGroups}
          channelKey={channelKey} channelLabel={channelLabel}
          onAdd={addPiece} onDelete={deletePiece}
          onEdit={(p) => { setView('list'); setDraftTitle(p.title); setEditingId(p.piece_number); }}
        />
      ) : (
        /* Calendar fallback for narrow screens: grouped by day */
        <div className="max-h-[420px] overflow-y-auto p-2 space-y-3">
          {dayGroups.map(([day, items]) => (
            <div key={day} className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1 bg-muted/40 rounded">
                <span className="text-xs font-semibold capitalize">
                  {format(new Date(day), 'EEEE d/M', { locale: vi })}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{items.length} bài</span>
              </div>
              <div className="space-y-0.5">
                {items.map((p) => (<ScheduleRow key={p.piece_number} p={p} />))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- calendar grid (wide only) ---------- */

function CalendarGrid({
  startDate, duration, dayGroups, channelKey, channelLabel, onAdd, onDelete, onEdit,
}: {
  startDate: string;
  duration: number;
  dayGroups: [string, SchedulePiece[]][];
  channelKey: (id: string) => string;
  channelLabel: (id: string) => string;
  onAdd: (d: string) => void;
  onDelete: (n: number) => void;
  onEdit: (p: SchedulePiece) => void;
}) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const startDow = (start.getDay() + 6) % 7;
  const gridStart = new Date(start.getTime() - startDow * 86400000);
  const totalDays = Math.ceil((duration + startDow) / 7) * 7;
  const end = new Date(start.getTime() + duration * 86400000);

  return (
    <div className="max-h-[460px] overflow-y-auto p-2">
      <div className="grid grid-cols-7 gap-1">
        {['Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'CN'].map((d) => (
          <div key={d} className="text-center font-medium text-[10px] text-muted-foreground py-1.5 border-b border-border/60">
            {d}
          </div>
        ))}
        {Array.from({ length: totalDays }).map((_, i) => {
          const d = new Date(gridStart.getTime() + i * 86400000);
          const ds = format(d, 'yyyy-MM-dd');
          const inRange = d >= start && d < end;
          const items = dayGroups.find(([k]) => k === ds)?.[1] || [];
          const overload = items.length > 3;
          return (
            <div
              key={i}
              className={cn(
                'min-h-[80px] border rounded-md p-1.5 space-y-1 transition-colors',
                inRange ? 'bg-card hover:bg-accent/30' : 'bg-muted/30 border-dashed',
                overload && 'border-amber-500/50',
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn('text-[11px] tabular-nums', inRange ? 'font-semibold' : 'text-muted-foreground')}>
                  {d.getDate()}
                </span>
                {items.length > 0 && (
                  <span className="text-[9px] text-muted-foreground tabular-nums">{items.length}</span>
                )}
              </div>
              {items.slice(0, 3).map((p) => (
                <button
                  key={p.piece_number}
                  className="w-full flex items-center gap-1 px-1 py-0.5 rounded text-[10px] text-left bg-muted/60 hover:bg-muted truncate"
                  title={p.title}
                  onClick={() => onEdit(p)}
                >
                  <PillarDot pillar={p.pillar} size={6} />
                  <ChannelIcon
                    channel={channelKey(p.target_channel) as any}
                    size={9}
                    className={cn('shrink-0', channelIconColors[channelKey(p.target_channel) as any])}
                  />
                  <span className="truncate">{p.title}</span>
                </button>
              ))}
              {items.length > 3 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-[10px] text-primary hover:underline">+{items.length - 3} nữa</button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64 p-2 space-y-1">
                    <p className="text-[11px] font-medium capitalize">{format(d, 'EEEE d/M', { locale: vi })}</p>
                    {items.map((p) => (
                      <div key={p.piece_number} className="flex items-center gap-1.5 text-[11px] py-0.5">
                        <PillarDot pillar={p.pillar} size={6} />
                        <ChannelIcon channel={channelKey(p.target_channel) as any} size={10} className={channelIconColors[channelKey(p.target_channel) as any]} />
                        <button className="truncate flex-1 text-left hover:text-primary" onClick={() => onEdit(p)} title={p.title}>
                          {p.title}
                        </button>
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => onDelete(p.piece_number)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
              {inRange && items.length === 0 && (
                <button
                  className="w-full text-[10px] text-muted-foreground hover:text-primary py-0.5"
                  onClick={() => onAdd(ds)}
                >
                  +
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
