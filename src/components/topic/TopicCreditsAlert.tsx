import { AlertCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface TopicCreditsAlertProps {
  errorCode?: string;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
}

export function TopicCreditsAlert({
  errorCode,
  errorMessage,
  onRetry,
  className,
}: TopicCreditsAlertProps) {
  const isCreditsError = errorCode === 'CREDITS_EXHAUSTED' || errorMessage?.includes('402') || errorMessage?.includes('credits');
  const isRateLimitError = errorCode === 'RATE_LIMIT' || errorMessage?.includes('429') || errorMessage?.includes('rate');

  if (!isCreditsError && !isRateLimitError) {
    return null;
  }

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {isCreditsError ? 'AI Credits đã hết' : 'Quá giới hạn request'}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm">
          {isCreditsError 
            ? 'Tài khoản AI của bạn đã hết credits. Vui lòng nạp thêm để tiếp tục sử dụng tính năng AI.'
            : 'Bạn đã gửi quá nhiều request trong thời gian ngắn. Vui lòng thử lại sau vài phút.'}
        </p>
        <div className="flex gap-2">
          {isCreditsError && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                // Open settings in new tab - user should navigate to Settings -> Usage
                window.open('/account', '_blank');
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Nạp thêm Credits
            </Button>
          )}
          {onRetry && isRateLimitError && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Thử lại
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
