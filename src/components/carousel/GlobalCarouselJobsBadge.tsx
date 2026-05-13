import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Image as ImageIcon, X, ExternalLink, AlertTriangle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useCarouselGeneration } from '@/contexts/CarouselGenerationContext';
import { cn } from '@/lib/utils';

/**
 * Floating badge shown app-wide whenever there are background carousel jobs
 * (prompt streaming OR image batch). Click → opens a sheet listing all jobs
 * with progress, current step, and quick actions.
 */
export function GlobalCarouselJobsBadge() {
  const { jobs, dismissJob, cancelJob } = useCarouselGeneration();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const active = jobs.filter((j) => j.status === 'generating');
  const errored = jobs.filter((j) => j.status === 'error');
  const total = active.length + errored.length;
  if (total === 0) return null;

  const hasError = errored.length > 0;
  const hasImage = active.some((j) => j.kind === 'image');
  const hasPrompt = active.some((j) => j.kind === 'prompt');

  const Icon = hasError ? AlertTriangle : hasImage && !hasPrompt ? ImageIcon : Sparkles;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            'fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur-md transition-all hover:shadow-xl',
            hasError ? 'border-destructive/40' : 'border-border/60',
          )}
          aria-label="Carousel đang chạy nền"
        >
          <Icon
            className={cn(
              'h-4 w-4',
              hasError ? 'text-destructive' : 'text-foreground',
              !hasError && active.length > 0 && 'animate-pulse',
            )}
          />
          <span className="text-sm font-medium">
            {active.length > 0
              ? `${active.length} đang tạo`
              : `${errored.length} lỗi`}
          </span>
          {active.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {Math.round(
                active.reduce((s, j) => s + (j.progress || 0), 0) / active.length,
              )}
              %
            </Badge>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Carousel đang chạy nền</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
          {jobs
            .filter((j) => j.status !== 'done' || j.rehydrated)
            .map((j) => {
              const label =
                j.kind === 'image' ? 'Đang tạo ảnh' : 'Đang tạo nội dung';
              return (
                <div
                  key={j.id}
                  className="rounded-lg border border-border/60 bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {j.kind === 'image' ? (
                          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {label}
                        </span>
                        {j.rehydrated && (
                          <Badge variant="outline" className="h-4 px-1 text-[9px]">
                            khôi phục
                          </Badge>
                        )}
                      </div>
                      <h4 className="mt-1 truncate text-sm font-medium">
                        {j.formData.topic || 'Carousel'}
                      </h4>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => dismissJob(j.id)}
                      aria-label="Bỏ qua"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {j.status === 'generating' && (
                    <>
                      <Progress value={j.progress || 0} className="mt-3 h-1.5" />
                      <p className="mt-1.5 truncate text-xs text-muted-foreground">
                        {j.currentStep}
                      </p>
                      {j.totalSlides > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          {j.completedSlides}/{j.totalSlides} slide
                        </p>
                      )}
                      <div className="mt-2 flex gap-2">
                        {j.carouselId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              setOpen(false);
                              navigate(`/carousel/${j.carouselId}`);
                            }}
                          >
                            <ExternalLink className="mr-1 h-3 w-3" />
                            Mở
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => cancelJob(j.id)}
                        >
                          Hủy
                        </Button>
                      </div>
                    </>
                  )}

                  {j.status === 'error' && (
                    <>
                      <p className="mt-2 text-xs text-destructive">
                        {j.error || 'Tạo thất bại'}
                      </p>
                      <div className="mt-2 flex gap-2">
                        {j.carouselId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              setOpen(false);
                              navigate(`/carousel/${j.carouselId}`);
                            }}
                          >
                            Mở (một phần)
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
