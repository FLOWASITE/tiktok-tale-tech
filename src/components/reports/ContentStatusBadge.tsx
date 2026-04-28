import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, AlertTriangle, Send, FileEdit } from 'lucide-react';
import type { DerivedStatus } from '@/hooks/reports/useContentReport';

const MAP: Record<
  DerivedStatus,
  { label: string; className: string; Icon: typeof Circle }
> = {
  draft: {
    label: 'Nháp',
    className: 'bg-muted text-muted-foreground border-transparent',
    Icon: FileEdit,
  },
  approved: {
    label: 'Đã duyệt',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    Icon: CheckCircle2,
  },
  scheduled: {
    label: 'Đã lên lịch',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    Icon: Clock,
  },
  published: {
    label: 'Đã đăng',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    Icon: Send,
  },
  partially_published: {
    label: 'Đăng một phần',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    Icon: Send,
  },
  failed: {
    label: 'Thất bại',
    className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    Icon: AlertTriangle,
  },
};

export function ContentStatusBadge({ status }: { status: DerivedStatus }) {
  const { label, className, Icon } = MAP[status] ?? MAP.draft;
  return (
    <Badge variant="outline" className={`gap-1 font-normal ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export const STATUS_LABELS: Record<DerivedStatus, string> = Object.fromEntries(
  Object.entries(MAP).map(([k, v]) => [k, v.label]),
) as Record<DerivedStatus, string>;
