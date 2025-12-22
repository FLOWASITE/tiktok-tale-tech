import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { MultiChannelContent, CONTENT_STATUSES } from '@/types/multichannel';

type ApprovalAction = 'approve' | 'reject' | 'submit';

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: MultiChannelContent | null;
  action: ApprovalAction;
  onConfirm: (contentId: string, action: ApprovalAction, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

const ACTION_CONFIG = {
  submit: {
    title: 'Gửi duyệt nội dung',
    description: 'Nội dung sẽ được gửi đến quản trị viên để phê duyệt.',
    icon: Send,
    iconClass: 'text-amber-500',
    buttonLabel: 'Gửi duyệt',
    buttonClass: 'bg-amber-500 hover:bg-amber-600 text-white',
    requireReason: false,
    reasonLabel: 'Ghi chú cho người duyệt (tùy chọn)',
    reasonPlaceholder: 'Thêm ghi chú cho người duyệt...',
  },
  approve: {
    title: 'Phê duyệt nội dung',
    description: 'Nội dung sẽ được đánh dấu là đã duyệt và sẵn sàng đăng.',
    icon: CheckCircle2,
    iconClass: 'text-green-500',
    buttonLabel: 'Phê duyệt',
    buttonClass: 'bg-green-500 hover:bg-green-600 text-white',
    requireReason: false,
    reasonLabel: 'Ghi chú phê duyệt (tùy chọn)',
    reasonPlaceholder: 'Thêm ghi chú phê duyệt...',
  },
  reject: {
    title: 'Từ chối nội dung',
    description: 'Nội dung sẽ được chuyển về trạng thái nháp để chỉnh sửa.',
    icon: XCircle,
    iconClass: 'text-red-500',
    buttonLabel: 'Từ chối',
    buttonClass: 'bg-red-500 hover:bg-red-600 text-white',
    requireReason: true,
    reasonLabel: 'Lý do từ chối *',
    reasonPlaceholder: 'Vui lòng nhập lý do từ chối để người tạo nội dung có thể chỉnh sửa...',
  },
};

export function ApprovalDialog({
  open,
  onOpenChange,
  content,
  action,
  onConfirm,
  isLoading = false,
}: ApprovalDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const config = ACTION_CONFIG[action];
  const Icon = config.icon;
  const statusConfig = CONTENT_STATUSES.find(s => s.value === content?.status);

  const handleConfirm = async () => {
    if (config.requireReason && !reason.trim()) {
      setError('Vui lòng nhập lý do từ chối');
      return;
    }
    
    if (content) {
      await onConfirm(content.id, action, reason.trim() || undefined);
      setReason('');
      setError('');
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason('');
      setError('');
    }
    onOpenChange(open);
  };

  if (!content) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              action === 'approve' ? 'bg-green-500/15' : 
              action === 'reject' ? 'bg-red-500/15' : 
              'bg-amber-500/15'
            }`}>
              <Icon className={`w-5 h-5 ${config.iconClass}`} />
            </div>
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription className="mt-0.5">
                {config.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Preview */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm line-clamp-1">{content.title}</h4>
            {statusConfig && (
              <Badge 
                variant="outline" 
                className={`text-[10px] shrink-0 ${statusConfig.bgClass} ${statusConfig.textClass} ${statusConfig.borderClass}`}
              >
                {statusConfig.label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{content.topic}</p>
          <div className="flex flex-wrap gap-1">
            {content.selected_channels.slice(0, 4).map(ch => (
              <Badge key={ch} variant="secondary" className="text-[10px] py-0 px-1.5">
                {ch}
              </Badge>
            ))}
            {content.selected_channels.length > 4 && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                +{content.selected_channels.length - 4}
              </Badge>
            )}
          </div>
        </div>

        {/* Reason Input */}
        <div className="space-y-2">
          <Label htmlFor="reason" className="text-sm">
            {config.reasonLabel}
          </Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder={config.reasonPlaceholder}
            className={`min-h-[80px] resize-none ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
          />
          {error && (
            <div className="flex items-center gap-1.5 text-red-500 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className={config.buttonClass}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Icon className="w-4 h-4 mr-2" />
                {config.buttonLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}