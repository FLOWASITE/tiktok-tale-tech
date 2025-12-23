import { AlertTriangle, Ban, XCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContentViolation, ValidationResult } from '@/hooks/useContentValidation';

interface ContentValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validationResult: ValidationResult;
  onConfirm: () => void;
  onCancel: () => void;
}

const channelLabels: Record<string, string> = {
  website: 'Website',
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter/X',
  google_maps: 'Google Maps',
  linkedin: 'LinkedIn',
  email: 'Email',
  youtube: 'YouTube',
  zalo_oa: 'Zalo OA',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  threads: 'Threads',
};

function ViolationItem({ violation }: { violation: ContentViolation }) {
  const isError = violation.severity === 'error';
  
  return (
    <div className={`p-3 rounded-lg border ${
      isError 
        ? 'bg-destructive/5 border-destructive/20' 
        : 'bg-amber-500/5 border-amber-500/20'
    }`}>
      <div className="flex items-start gap-2">
        {isError ? (
          <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium ${isError ? 'text-destructive' : 'text-amber-600'}`}>
              "{violation.term}"
            </span>
            <Badge 
              variant="outline" 
              className={`text-[10px] ${
                isError 
                  ? 'border-destructive/30 text-destructive' 
                  : 'border-amber-500/30 text-amber-600'
              }`}
            >
              {violation.type === 'forbidden_term' && 'Từ cấm'}
              {violation.type === 'forbidden_pattern' && 'Mẫu câu cấm'}
              {violation.type === 'forbidden_word' && 'Từ nên tránh'}
            </Badge>
            {violation.channel && (
              <Badge variant="secondary" className="text-[10px]">
                {channelLabels[violation.channel] || violation.channel}
              </Badge>
            )}
          </div>
          {violation.context && (
            <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 px-2 py-1 rounded">
              {violation.context}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ContentValidationDialog({
  open,
  onOpenChange,
  validationResult,
  onConfirm,
  onCancel,
}: ContentValidationDialogProps) {
  const { hasErrors, hasWarnings, violations, errorCount, warningCount } = validationResult;
  
  const errors = violations.filter(v => v.severity === 'error');
  const warnings = violations.filter(v => v.severity === 'warning');

  // If there are errors, user cannot proceed
  const canProceed = !hasErrors;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasErrors ? (
              <>
                <Ban className="h-5 w-5 text-destructive" />
                <span className="text-destructive">Nội dung vi phạm quy định</span>
              </>
            ) : hasWarnings ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-amber-600">Cảnh báo nội dung</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Nội dung hợp lệ</span>
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {hasErrors && (
                <p className="text-destructive font-medium">
                  Phát hiện {errorCount} vi phạm nghiêm trọng. Bạn cần sửa trước khi lưu.
                </p>
              )}
              {hasWarnings && !hasErrors && (
                <p className="text-amber-600">
                  Phát hiện {warningCount} cảnh báo. Bạn vẫn có thể lưu nhưng nên xem xét chỉnh sửa.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-4">
            {/* Errors Section */}
            {errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" />
                  Vi phạm ({errorCount})
                </h4>
                <div className="space-y-2">
                  {errors.map((violation, index) => (
                    <ViolationItem key={`error-${index}`} violation={violation} />
                  ))}
                </div>
              </div>
            )}

            {/* Warnings Section */}
            {warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-amber-600 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" />
                  Cảnh báo ({warningCount})
                </h4>
                <div className="space-y-2">
                  {warnings.map((violation, index) => (
                    <ViolationItem key={`warning-${index}`} violation={violation} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {hasErrors ? 'Quay lại sửa' : 'Hủy'}
          </AlertDialogCancel>
          {canProceed && (
            <AlertDialogAction 
              onClick={onConfirm}
              className={hasWarnings ? 'bg-amber-500 hover:bg-amber-600' : ''}
            >
              {hasWarnings ? 'Vẫn lưu' : 'Xác nhận'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
