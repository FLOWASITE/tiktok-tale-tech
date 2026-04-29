import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Clock, Send, AlertTriangle, RotateCcw, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { ContentRow, HistoryEvent } from '@/hooks/reports/useContentReport';
import { useContentPreview } from '@/hooks/reports/useContentPreview';
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
  onOpenDetail?: (row: ContentRow) => void;
}

export function ContentHistorySheet({ open, onOpenChange, row, events, onOpenDetail }: Props) {
  const preview = useContentPreview(row?.type ?? null, row?.id ?? null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
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
              {onOpenDetail && (
                <div>
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => onOpenDetail(row)}>
                    <ExternalLink className="h-3 w-3" /> Mở chi tiết
                  </Button>
                </div>
              )}
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

            <Tabs defaultValue="preview" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview">Nội dung</TabsTrigger>
                <TabsTrigger value="history">Lịch sử ({events.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="mt-4 space-y-3">
                {preview.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                ) : preview.isError ? (
                  <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Không tải được nội dung.
                  </p>
                ) : (
                  <>
                    {preview.data?.fields && preview.data.fields.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-3 text-xs">
                        {preview.data.fields.map((f) => (
                          <div key={f.label} className="space-y-0.5 min-w-0">
                            <div className="text-muted-foreground">{f.label}</div>
                            <div className="truncate font-medium">{f.value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(preview.data?.channels?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {preview.data!.channels!.map((c) => (
                          <Badge key={c} variant="outline" className="text-[10px] font-normal">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {(preview.data?.imageUrls?.length ?? 0) > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {preview.data!.imageUrls!.map((url, i) => (
                          <div key={i} className="aspect-square overflow-hidden rounded border bg-muted">
                            <img src={url} alt={`slide ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                          </div>
                        ))}
                      </div>
                    )}

                    {preview.data?.caption && (
                      <div>
                        <div className="mb-1 text-xs font-medium text-muted-foreground">Caption</div>
                        <p className="whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm">
                          {preview.data.caption}
                        </p>
                      </div>
                    )}

                    {preview.data?.body && (
                      <div>
                        <div className="mb-1 text-xs font-medium text-muted-foreground">Nội dung</div>
                        <p className="whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm max-h-72 overflow-auto">
                          {preview.data.body}
                        </p>
                      </div>
                    )}

                    {(preview.data?.hashtags?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {preview.data!.hashtags!.map((h) => (
                          <Badge key={h} variant="secondary" className="text-[10px] font-normal">
                            #{h.replace(/^#/, '')}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {!preview.data?.caption &&
                      !preview.data?.body &&
                      !(preview.data?.imageUrls?.length) && (
                        <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                          <ImageIcon className="mx-auto mb-1 h-4 w-4 opacity-50" />
                          Chưa có nội dung chi tiết.
                        </p>
                      )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-4">
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
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
