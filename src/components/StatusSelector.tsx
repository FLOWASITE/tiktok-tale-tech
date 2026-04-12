import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileEdit, Clock, CheckCircle, Send } from 'lucide-react';

export type ContentStatus = 'draft' | 'review' | 'approved' | 'partially_published' | 'published';

interface StatusSelectorProps {
  status: ContentStatus;
  onStatusChange: (status: ContentStatus) => void;
  disabled?: boolean;
}

export const STATUS_OPTIONS: { value: ContentStatus; label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'outline' | 'destructive' }[] = [
  { value: 'draft', label: 'Nháp', icon: <FileEdit className="w-3.5 h-3.5" />, variant: 'secondary' },
  { value: 'review', label: 'Chờ duyệt', icon: <Clock className="w-3.5 h-3.5" />, variant: 'outline' },
  { value: 'approved', label: 'Đã duyệt', icon: <CheckCircle className="w-3.5 h-3.5" />, variant: 'default' },
  { value: 'partially_published', label: 'Đăng 1 phần', icon: <Send className="w-3.5 h-3.5" />, variant: 'outline' },
  { value: 'published', label: 'Đã đăng', icon: <Send className="w-3.5 h-3.5" />, variant: 'default' },
];

export function StatusSelector({ status, onStatusChange, disabled }: StatusSelectorProps) {
  const currentStatus = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];

  return (
    <Select value={status} onValueChange={(val) => onStatusChange(val as ContentStatus)} disabled={disabled}>
      <SelectTrigger className="w-[140px] h-8">
        <SelectValue>
          <div className="flex items-center gap-1.5">
            {currentStatus.icon}
            <span className="text-sm">{currentStatus.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              {option.icon}
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StatusBadge({ status }: { status: ContentStatus }) {
  const config = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}
