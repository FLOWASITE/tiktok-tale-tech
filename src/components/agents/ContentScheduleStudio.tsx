import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  CalendarDays, Sparkles, Download, Trash2, Plus, RefreshCw,
  Filter, AlertTriangle, ChevronDown, Copy, FileSpreadsheet, FileText,
  Loader2, List as ListIcon, Grid3x3, X, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ChannelIcon, channelIconColors } from '@/components/ui/channel-icon';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  piecesToCSV, piecesToMarkdown, downloadFile, type SchedulePiece,
} from '@/lib/scheduleExport';
import { useRewritePiece } from '@/hooks/agents/useRewritePiece';

const PILLAR_CLASS: Record<string, string> = {
  educate: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  inspire: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
  sell: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  entertain: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
};
const pillarClass = (p?: string) =>
  PILLAR_CLASS[(p || '').toLowerCase()] || 'bg-muted text-muted-foreground border-border';

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

export default function ContentScheduleStudio({
  pieces, onChange, onRegenerate, isGenerating, channels, pillars,
  startDate, duration, campaignTitle, organizationId, brandTemplateId,
  clarificationContext, error,
}: ContentScheduleStudioProps) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterPillar, setFilterPillar] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const { rewrite, loadingId } = useRewritePiece();

  const channelLabel = (id: string) =>
    channels.find((c) => c.id === id)?.label || id;
  const channelKey = (id: string) =>
    channels.find((c) => c.id === id)?.channelKey || 'website';

  const filtered = useMemo(() => {
    return pieces.filter((p) =>
      (filterChannel === 'all' || p.target_channel === filterChannel) &&
      (filterPillar === 'all' || p.pillar === filterPillar) &&
      (filterType === 'all' || p.content_type === filterType),
    );
  }, [pieces, filterChannel, filterPillar, filterType]);

  const sorted = useMemo(
    () => filtered.slice().sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
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
    const overloadDays = Array.from(byDay.entries()).filter(([, c]) => c > 3);
    return { byChannel, byPillar, byDay, overloadDays, total: pieces.length };
  }, [pieces]);

  const updatePiece = (n: number, patch: Partial<SchedulePiece>) => {
    onChange(pieces.map((p) => (p.piece_number === n ? { ...p, ...patch } : p)));
  };
  const deletePiece = (n: number) => {
    onChange(pieces.filter((p) => p.piece_number !== n).map((p, i) => ({ ...p, piece_number: i + 1 })));
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

  // Loading state
  if (isGenerating && pieces.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 text-center space-y-2">
        <Loader2 className="w-5 h-5 text-primary animate-spin mx-auto" />
        <p className="text-[11px] font-medium">AI đang sinh lịch nội dung…</p>
        <p className="text-[10px] text-muted-foreground">Khoảng 5–15 giây</p>
      </div>
    );
  }

  if (pieces.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-4 text-center space-y-2">
        <CalendarDays className="w-5 h-5 text-muted-foreground mx-auto" />
        <p className="text-[11px]">Chưa có lịch nội dung</p>
        {error && <p className="text-[10px] text-destructive">{error}</p>}
        <Button size="sm" variant="outline" onClick={onRegenerate} className="text-[10px] h-7">
          <Sparkles className="w-3 h-3 mr-1" /> Tạo lịch bằng AI
        </Button>
      </div>
    );
  }

  // Calendar grouping
  const calendarGroups = useMemo(() => {
    const map = new Map<string, SchedulePiece[]>();
    sorted.forEach((p) => {
      const arr = map.get(p.scheduled_date) || [];
      arr.push(p);
      map.set(p.scheduled_date, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sorted]);

  // Week groups for list view
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

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-b">
        <CalendarDays className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-medium">Lịch nội dung</span>
        <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-normal">
          {pieces.length} bài
        </Badge>
        <div className="ml-auto flex items-center gap-1">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList className="h-6 p-0.5">
              <TabsTrigger value="list" className="h-5 px-1.5 text-[10px]">
                <ListIcon className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="calendar" className="h-5 px-1.5 text-[10px]">
                <Grid3x3 className="w-3 h-3" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={onRegenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]">
                <Download className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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

      {/* Stats strip */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/30 border-b text-[10px] flex-wrap">
        <span className="font-medium">{stats.total} bài</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{stats.byChannel.size} kênh</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{stats.byPillar.size} pillar</span>
        {stats.overloadDays.length > 0 && (
          <Badge variant="outline" className="ml-auto text-[9px] h-4 px-1.5 bg-destructive/10 text-destructive border-destructive/20">
            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
            {stats.overloadDays.length} ngày quá tải
          </Badge>
        )}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b flex-wrap">
        <Filter className="w-3 h-3 text-muted-foreground" />
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="h-6 text-[10px] w-auto min-w-[90px] gap-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px]">Mọi kênh</SelectItem>
            {Array.from(stats.byChannel.keys()).map((c) => (
              <SelectItem key={c} value={c} className="text-[10px]">{channelLabel(c)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPillar} onValueChange={setFilterPillar}>
          <SelectTrigger className="h-6 text-[10px] w-auto min-w-[90px] gap-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px]">Mọi pillar</SelectItem>
            {Array.from(stats.byPillar.keys()).map((p) => (
              <SelectItem key={p} value={p} className="text-[10px] capitalize">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-6 text-[10px] w-auto min-w-[80px] gap-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px]">Mọi loại</SelectItem>
            {CONTENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-[10px]">{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filterChannel !== 'all' || filterPillar !== 'all' || filterType !== 'all') && (
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => { setFilterChannel('all'); setFilterPillar('all'); setFilterType('all'); }}>
            <X className="w-3 h-3" />
          </Button>
        )}
        <Button size="sm" variant="ghost" className="ml-auto h-6 px-1.5 text-[10px]" onClick={() => addPiece()}>
          <Plus className="w-3 h-3 mr-0.5" /> Thêm
        </Button>
      </div>

      {/* Body */}
      {view === 'list' ? (
        <div className="max-h-[340px] overflow-y-auto p-1.5 space-y-2">
          {weekGroups.map((g) => (
            <div key={g.weekIdx} className="space-y-0.5">
              <div className="flex items-center justify-between px-2 py-1 bg-muted/40 rounded sticky top-0 backdrop-blur-sm">
                <span className="text-[10px] font-semibold">
                  Tuần {g.weekIdx + 1}{' '}
                  <span className="font-normal text-muted-foreground">({g.rangeLabel})</span>
                </span>
                <span className="text-[9px] text-muted-foreground tabular-nums">{g.rows.length} bài</span>
              </div>
              {g.rows.map((p) => {
                const overload = (stats.byDay.get(p.scheduled_date) || 0) > 3;
                const isEditing = editingId === p.piece_number;
                return (
                  <div
                    key={p.piece_number}
                    className={cn(
                      'group flex items-center gap-1.5 px-2 py-1 rounded text-[11px] hover:bg-muted/40',
                      overload && 'bg-destructive/5',
                    )}
                  >
                    {/* Date */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-14 text-[10px] text-muted-foreground tabular-nums hover:text-foreground shrink-0">
                          {format(new Date(p.scheduled_date), 'EEE d/M', { locale: vi })}
                        </button>
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
                    {/* Time */}
                    <Input
                      type="time"
                      value={p.recommended_time || ''}
                      onChange={(e) => updatePiece(p.piece_number, { recommended_time: e.target.value })}
                      className="h-5 px-1 text-[10px] w-16 shrink-0"
                    />
                    {/* Channel */}
                    <Select value={p.target_channel} onValueChange={(v) => updatePiece(p.piece_number, { target_channel: v, recommended_time: p.recommended_time || GOLDEN_HOURS[v] || '09:00' })}>
                      <SelectTrigger className="h-5 px-1 text-[10px] w-24 shrink-0 gap-1">
                        <ChannelIcon channel={channelKey(p.target_channel) as any} size={10} className={channelIconColors[channelKey(p.target_channel) as any]} />
                        <span className="truncate text-[10px]">{channelLabel(p.target_channel)}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {channels.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-[10px]">{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Pillar */}
                    <Select value={p.pillar || 'Mixed'} onValueChange={(v) => updatePiece(p.piece_number, { pillar: v })}>
                      <SelectTrigger className={cn('h-5 px-1.5 text-[9px] w-auto min-w-[60px] border rounded capitalize shrink-0', pillarClass(p.pillar))}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(pillars.length > 0 ? pillars : ['Mixed']).map((pl) => (
                          <SelectItem key={pl} value={pl} className="text-[10px] capitalize">{pl}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Title */}
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
                        className="flex-1 h-5 px-1 text-[10px] min-w-0"
                      />
                    ) : (
                      <button
                        className="flex-1 text-left truncate min-w-0 hover:text-primary"
                        onClick={() => { setDraftTitle(p.title); setEditingId(p.piece_number); }}
                      >
                        {p.title}
                      </button>
                    )}
                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-5 w-5" disabled={loadingId === p.piece_number} onClick={() => doRewrite(p)} title="AI viết lại">
                        {loadingId === p.piece_number ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-primary" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => deletePiece(p.piece_number)} title="Xoá">
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <button
                className="w-full text-left px-2 py-0.5 text-[10px] text-muted-foreground hover:text-primary hover:bg-muted/40 rounded"
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
      ) : (
        <div className="max-h-[340px] overflow-y-auto p-1.5">
          <div className="grid grid-cols-7 gap-0.5 text-[9px]">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
              <div key={d} className="text-center font-semibold text-muted-foreground py-1">{d}</div>
            ))}
            {(() => {
              const start = new Date(startDate);
              start.setHours(0, 0, 0, 0);
              // Align grid: start from Monday of week of start
              const startDow = (start.getDay() + 6) % 7; // 0=Mon
              const gridStart = new Date(start.getTime() - startDow * 86400000);
              const totalDays = Math.ceil((duration + startDow) / 7) * 7;
              return Array.from({ length: totalDays }).map((_, i) => {
                const d = new Date(gridStart.getTime() + i * 86400000);
                const ds = format(d, 'yyyy-MM-dd');
                const inRange = d >= start && d < new Date(start.getTime() + duration * 86400000);
                const items = calendarGroups.find(([k]) => k === ds)?.[1] || [];
                const overload = items.length > 3;
                return (
                  <div
                    key={i}
                    className={cn(
                      'min-h-[60px] border rounded p-1 text-[9px] space-y-0.5',
                      inRange ? 'bg-card' : 'bg-muted/20 opacity-50',
                      overload && 'border-destructive/40 bg-destructive/5',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium tabular-nums">{d.getDate()}</span>
                      {items.length > 0 && (
                        <span className="text-[8px] text-muted-foreground">{items.length}</span>
                      )}
                    </div>
                    {items.slice(0, 2).map((p) => (
                      <div
                        key={p.piece_number}
                        className={cn('truncate px-1 py-0.5 rounded border text-[8px] cursor-pointer', pillarClass(p.pillar))}
                        title={p.title}
                        onClick={() => { setView('list'); setDraftTitle(p.title); setEditingId(p.piece_number); }}
                      >
                        <ChannelIcon channel={channelKey(p.target_channel) as any} size={8} className={cn('inline mr-0.5', channelIconColors[channelKey(p.target_channel) as any])} />
                        {p.title}
                      </div>
                    ))}
                    {items.length > 2 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-[8px] text-primary hover:underline">+{items.length - 2} nữa</button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-60 p-2 space-y-1">
                          <p className="text-[10px] font-medium">{format(d, 'EEEE d/M', { locale: vi })}</p>
                          {items.map((p) => (
                            <div key={p.piece_number} className="text-[10px] flex items-center gap-1">
                              <ChannelIcon channel={channelKey(p.target_channel) as any} size={10} className={channelIconColors[channelKey(p.target_channel) as any]} />
                              <span className="truncate flex-1">{p.title}</span>
                              <Button size="icon" variant="ghost" className="h-4 w-4" onClick={() => deletePiece(p.piece_number)}>
                                <Trash2 className="w-2.5 h-2.5 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </PopoverContent>
                      </Popover>
                    )}
                    {inRange && items.length === 0 && (
                      <button className="w-full text-[8px] text-muted-foreground hover:text-primary" onClick={() => addPiece(ds)}>+</button>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
