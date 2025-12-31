import { AlertCircle, ExternalLink, Clock, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface TopicCreditsAlertProps {
  errorCode?: string;
  errorMessage?: string;
  retryAfter?: number; // seconds
  onRetry?: () => void;
  className?: string;
}

export function TopicCreditsAlert({
  errorCode,
  errorMessage,
  retryAfter,
  onRetry,
  className,
}: TopicCreditsAlertProps) {
  const [countdown, setCountdown] = useState<number>(retryAfter || 0);
  
  // Handle countdown for rate limit
  useEffect(() => {
    if (retryAfter && retryAfter > 0) {
      setCountdown(retryAfter);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [retryAfter]);

  const isCreditsError = errorCode === 'CREDITS_EXHAUSTED' || errorMessage?.includes('402') || errorMessage?.includes('credits');
  const isQuotaError = errorCode === 'QUOTA_EXCEEDED' || errorMessage?.includes('quota');
  const isRateLimitError = errorCode === 'RATE_LIMIT' || errorMessage?.includes('429') || errorMessage?.includes('rate');

  if (!isCreditsError && !isRateLimitError && !isQuotaError) {
    return null;
  }

  const getTitle = () => {
    if (isCreditsError) return 'AI Credits đã hết';
    if (isQuotaError) return 'Đã hết lượt sử dụng';
    return 'Quá giới hạn request';
  };

  const getMessage = () => {
    if (isCreditsError) {
      return 'Tài khoản AI của bạn đã hết credits. Vui lòng nạp thêm để tiếp tục sử dụng tính năng AI.';
    }
    if (isQuotaError) {
      return 'Bạn đã sử dụng hết quota tháng này. Nâng cấp gói để có thêm lượt sử dụng.';
    }
    if (countdown > 0) {
      return `Bạn đã gửi quá nhiều request. Thử lại sau ${countdown} giây.`;
    }
    return 'Bạn đã gửi quá nhiều request trong thời gian ngắn. Vui lòng thử lại sau vài phút.';
  };

  const getIcon = () => {
    if (isRateLimitError) return <Clock className="h-4 w-4" />;
    if (isQuotaError) return <Zap className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <Alert variant="destructive" className={className}>
      {getIcon()}
      <AlertTitle>{getTitle()}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm">{getMessage()}</p>
        <div className="flex gap-2">
          {(isCreditsError || isQuotaError) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                window.open('/account', '_blank');
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {isQuotaError ? 'Nâng cấp gói' : 'Nạp thêm Credits'}
            </Button>
          )}
          {onRetry && isRateLimitError && countdown === 0 && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Thử lại
            </Button>
          )}
          {isRateLimitError && countdown > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Thử lại sau {countdown}s</span>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
