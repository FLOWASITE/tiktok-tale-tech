import { useState, useEffect } from 'react';
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
import { IndustryComplianceChecklist, ComplianceResult } from '@/components/IndustryComplianceChecklist';
import { useIndustryMemoryById } from '@/hooks/useIndustryMemory';
import { IndustryMemorySnapshot } from '@/hooks/useApprovalLogs';

type ApprovalAction = 'approve' | 'reject' | 'submit';

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: MultiChannelContent | null;
  action: ApprovalAction;
  onConfirm: (
    contentId: string, 
    action: ApprovalAction, 
    reason?: string,
    industryMemorySnapshot?: IndustryMemorySnapshot
  ) => Promise<void>;
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
    showComplianceChecklist: false,
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
    showComplianceChecklist: true,
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
    showComplianceChecklist: true,
  },
};

// Helper to get content text for compliance checking
function getContentText(content: MultiChannelContent): string {
  const texts = [
    content.facebook_content,
    content.instagram_content,
    content.tiktok_content,
    content.linkedin_content,
    content.twitter_content,
    content.threads_content,
    content.youtube_content,
    content.telegram_content,
    content.zalo_oa_content,
    content.email_content,
    content.website_content,
    content.google_maps_content,
  ].filter(Boolean);
  
  return texts.join('\n');
}

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
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);

  // Fetch industry memory if content has brand_template_id
  const { data: industryMemory, isLoading: isLoadingIndustry } = useIndustryMemoryById(
    content?.brand_template_id || undefined
  );

  const config = ACTION_CONFIG[action];
  const Icon = config.icon;
  const statusConfig = CONTENT_STATUSES.find(s => s.value === content?.status);

  // Reset compliance result when dialog opens/closes or content changes
  useEffect(() => {
    setComplianceResult(null);
  }, [open, content?.id]);

  const handleComplianceChange = (result: ComplianceResult) => {
    setComplianceResult(result);
  };

  const handleConfirm = async () => {
    if (config.requireReason && !reason.trim()) {
      setError('Vui lòng nhập lý do từ chối');
      return;
    }

    // For approve action with industry memory, check compliance
    if (action === 'approve' && industryMemory && complianceResult) {
      if (!complianceResult.reviewer_confirmed) {
        setError('Vui lòng xác nhận tuân thủ Industry Rules trước khi phê duyệt');
        return;
      }
    }
    
    if (content) {
      // Build industry memory snapshot for logging
      const snapshot: IndustryMemorySnapshot | undefined = complianceResult ? {
        industry_template_id: complianceResult.industry_template_id,
        industry_name: complianceResult.industry_name,
        version: complianceResult.version,
        compliance_passed: complianceResult.compliance_passed,
        checklist: complianceResult.checklist,
        reviewer_confirmed: complianceResult.reviewer_confirmed,
        rejected_rules: complianceResult.rejected_rules,
      } : undefined;

      await onConfirm(content.id, action, reason.trim() || undefined, snapshot);
      setReason('');
      setError('');
      setComplianceResult(null);
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason('');
      setError('');
      setComplianceResult(null);
    }
    onOpenChange(open);
  };

  if (!content) return null;

  const contentText = getContentText(content);
  const showChecklist = config.showComplianceChecklist && industryMemory;
  const canApprove = action !== 'approve' || !industryMemory || 
    (complianceResult?.compliance_passed && complianceResult?.reviewer_confirmed);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

        {/* Industry Compliance Checklist */}
        {showChecklist && !isLoadingIndustry && (
          <IndustryComplianceChecklist
            industryMemory={industryMemory}
            contentText={contentText}
            onComplianceChange={handleComplianceChange}
            isReviewMode={action === 'approve'}
          />
        )}

        {/* Loading state for industry memory */}
        {config.showComplianceChecklist && isLoadingIndustry && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Đang tải Industry Memory...
            </span>
          </div>
        )}

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
            disabled={isLoading || (action === 'approve' && industryMemory && !canApprove)}
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