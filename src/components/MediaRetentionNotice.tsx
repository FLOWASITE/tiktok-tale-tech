import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaRetentionNoticeProps {
  /** localStorage key — pass distinct key per surface to allow per-surface dismissal. Only used by `banner` variant. */
  storageKey?: string;
  className?: string;
  /** `banner` = dismissable card; `inline` = small footnote that always renders */
  variant?: "banner" | "inline";
}

const MESSAGE = "Ảnh và video tự động xóa sau 7 ngày. Tải về nếu muốn giữ lại.";

/**
 * Thông báo policy: ảnh/video tự động xóa sau 7 ngày.
 * - `banner`: dismissable, lưu trạng thái vào localStorage
 * - `inline`: footnote nhỏ, luôn hiển thị (không dismiss)
 */
export function MediaRetentionNotice({
  storageKey = "media-retention-notice-dismissed",
  className,
  variant = "banner",
}: MediaRetentionNoticeProps) {
  // Inline variant always renders, no dismiss state needed
  if (variant === "inline") {
    return (
      <p className={cn("text-xs text-muted-foreground flex items-center gap-1.5", className)}>
        <Info className="h-3 w-3 shrink-0" />
        <span>{MESSAGE}</span>
      </p>
    );
  }

  return <DismissableBanner storageKey={storageKey} className={className} />;
}

function DismissableBanner({ storageKey, className }: { storageKey: string; className?: string }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "1");
    setDismissed(true);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Info className="h-3.5 w-3.5 shrink-0 text-primary/70" />
        <span className="truncate">
          💡 Ảnh và video tự động xóa sau <strong className="text-foreground">7 ngày</strong>. Tải về nếu muốn giữ lại.
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded p-1 hover:bg-background/60 transition-colors"
        aria-label="Đóng thông báo"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
