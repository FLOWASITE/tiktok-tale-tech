import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SeamlessRegenBannerProps {
  needsRegeneration: boolean;
  seamlessScore?: number | null;
  issues?: string[] | null;
  affectedSlides?: number[];
  onRegenerate?: () => void;
  regenerating?: boolean;
}

/**
 * Banner cảnh báo khi tính liên tục thị giác của carousel < 60.
 * Hiển thị khi auto-validation (sequential_v2) phát hiện slide bị lệch.
 */
export function SeamlessRegenBanner({
  needsRegeneration,
  seamlessScore,
  issues,
  affectedSlides,
  onRegenerate,
  regenerating,
}: SeamlessRegenBannerProps) {
  if (!needsRegeneration) return null;

  const scoreLabel = typeof seamlessScore === 'number' ? `${seamlessScore}/100` : 'thấp';

  return (
    <div
      className={cn(
        'rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 space-y-3',
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Tính liên tục thị giác: {scoreLabel} — một số slide chưa khớp
          </p>
          <p className="text-xs text-muted-foreground">
            Hệ thống đã tự kiểm tra và phát hiện các slide bị lệch màu sắc / ánh sáng / bố cục.
            Bạn nên tạo lại để đảm bảo carousel liền mạch.
          </p>

          {affectedSlides && affectedSlides.length > 0 && (
            <p className="text-xs text-foreground/80">
              <span className="font-medium">Slide cần xem lại:</span>{' '}
              {affectedSlides.map((n) => `#${n}`).join(', ')}
            </p>
          )}

          {issues && issues.length > 0 && (
            <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
              {issues.slice(0, 3).map((issue, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-yellow-600 shrink-0">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {onRegenerate && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRegenerate}
            disabled={regenerating}
            className="shrink-0 gap-1.5 border-yellow-500/40 hover:bg-yellow-500/10"
          >
            {regenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span className="text-xs">Tạo lại slide bị lệch</span>
          </Button>
        )}
      </div>
    </div>
  );
}
