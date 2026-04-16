import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileEdit, Clock, CheckCircle, Send } from 'lucide-react';

export type ContentStatus = 'draft' | 'review' | 'approved' | 'partially_published' | 'published';

type StatusOption = {
  value: ContentStatus;
  label: string;
  icon: React.ReactNode;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
};

interface StatusSelectorProps {
  status: ContentStatus;
  onStatusChange: (status: ContentStatus) => void;
  disabled?: boolean;
}

const APPROVAL_OPTIONS: StatusOption[] = [
  { value: 'draft', label: 'Nháp', icon: <FileEdit className="w-3.5 h-3.5" />, variant: 'secondary' },
  { value: 'review', label: 'Chờ duyệt', icon: <Clock className="w-3.5 h-3.5" />, variant: 'outline' },
  { value: 'approved', label: 'Đã duyệt', icon: <CheckCircle className="w-3.5 h-3.5" />, variant: 'default' },
];

const PUBLISH_OPTIONS: StatusOption[] = [
  { value: 'partially_published', label: 'Đăng 1 phần', icon: <Send className="w-3.5 h-3.5" />, variant: 'outline' },
  { value: 'published', label: 'Đã đăng', icon: <Send className="w-3.5 h-3.5" />, variant: 'default' },
];

const NOT_PUBLISHED_BADGE = {
  label: 'Chưa đăng',
  icon: <Send className="w-3.5 h-3.5" />,
  variant: 'secondary' as const,
};

export const STATUS_OPTIONS = [...APPROVAL_OPTIONS, ...PUBLISH_OPTIONS];

const isPublishStatus = (status: ContentStatus) => status === 'partially_published' || status === 'published';

const getApprovalStatus = (status: ContentStatus): Extract<ContentStatus, 'draft' | 'review' | 'approved'> => {
  if (status === 'partially_published' || status === 'published') return 'approved';
  return status;
};

const getPublishConfig = (status: ContentStatus) => {
  if (status === 'partially_published' || status === 'published') {
    return PUBLISH_OPTIONS.find((option) => option.value === status) ?? PUBLISH_OPTIONS[0];
  }

  return NOT_PUBLISHED_BADGE;
};

export function StatusSelector({ status, onStatusChange, disabled }: StatusSelectorProps) {
  const approvalStatus = getApprovalStatus(status);
  const currentApprovalStatus = APPROVAL_OPTIONS.find((option) => option.value === approvalStatus) ?? APPROVAL_OPTIONS[0];
  const publishConfig = getPublishConfig(status);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={approvalStatus}
        onValueChange={(val) => onStatusChange(val as ContentStatus)}
        disabled={disabled || isPublishStatus(status)}
      >
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue>
            <div className="flex items-center gap-1.5">
              {currentApprovalStatus.icon}
              <span className="text-sm">{currentApprovalStatus.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {APPROVAL_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                {option.icon}
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Badge variant={publishConfig.variant} className="gap-1 h-8 px-3 shrink-0">
        {publishConfig.icon}
        <span className="text-sm">{publishConfig.label}</span>
      </Badge>
    </div>
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
