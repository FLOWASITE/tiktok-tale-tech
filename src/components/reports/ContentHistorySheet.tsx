import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Send, AlertTriangle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { ContentRow, HistoryEvent } from '@/hooks/reports/useContentReport';
import { ContentStatusBadge } from './ContentStatusBadge';

const TYPE_META: Record<HistoryEvent['type'], { label: string; Icon: typeof Clock; className: string }> = {
  approval: { label: 'Duyệt', Icon: CheckCircle2, className: 'text-blue-600 bg-blue-500/10' },
  scheduled: { label: 'Lên lịch', Icon: Clock, className: 'text-amber-600 bg-amber-500/10' },
  published: { label: 'Đã đăng', Icon: Send, className: 'text-emerald-600 bg-emerald-500/10' },
  failed: { label: 'Thất bại', Icon: AlertTriangle, className: 'text-rose-600 bg-rose-500/10' },
  rescheduled: { label: 'Đổi lịch', Icon: RotateCcw, className: 'text-violet-600 bg-violet-500/10' },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: ContentRow | null;
  events: HistoryEvent[];
}

export function ContentHistorySheet({ open, onOpenChange, row, events }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {row && (
          <>
            <SheetHeader className="space-y-2">
              <SheetTitle className="line-clamp-2 text-left text-base">{row.title}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2 text-left">
                <ContentStatusBadge status={row.derivedStatus} />
                {row.brand_name && <Badge variant="secondary" className="font-normal">{row.brand_name}</Badge>}
                <span className="text-xs">
                  Tạo {format(new Date(row.created_at), 'dd/MM/yy HH:mm', { locale: vi })}
                </span>
              </SheetDescription>
            </SheetHeader>

            {/* Quick stats */}
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Đã lên lịch</div>
                <div className="tabular-nums text-sm font-medium">{row.scheduledCount ?? 0}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Thất bại</div>
                <div className="tabular-nums text-sm font-medium">{row.failedCount ?? 0}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Lịch tiếp theo</div>
                <div className="tabular-nums text-xs font-medium">
                  {row.nextScheduledAt
                    ? format(new Date(row.nextScheduledAt), 'dd/MM HH:mm', { locale: vi })
                    : '—'}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="mb-3 text-sm font-medium">Lịch sử duyệt &amp; đăng</h4>
              {events.length === 0 ? (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Chưa có hoạt động nào.
                </p>
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {events.map((e, i) => {
                    const meta = TYPE_META[e.type] ?? TYPE_META.published;
                    const Icon = meta.Icon;
                    return (
                      <li key={i} className="relative">
                        <span
                          className={`absolute -left-[26px] flex h-5 w-5 items-center justify-center rounded-full ${meta.className}`}
                        >
                          <Icon className="h-3 w-3" />
                        </span>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="text-sm font-medium">
                            {meta.label}
                            {e.channel && (
                              <Badge variant="outline" className="ml-2 text-xs font-normal">
                                {e.channel}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {format(new Date(e.at), 'dd/MM/yy HH:mm', { locale: vi })}
                          </span>
                        </div>
                        {e.notes && <p className="mt-1 text-xs text-muted-foreground">{e.notes}</p>}
                        {e.error && (
                          <p className="mt-1 rounded bg-rose-500/10 px-2 py-1 text-xs text-rose-700 dark:text-rose-300">
                            {e.error}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
