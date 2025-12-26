import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TopicErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  onRetry?: () => void;
  className?: string;
}

interface TopicErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class TopicErrorBoundary extends Component<TopicErrorBoundaryProps, TopicErrorBoundaryState> {
  constructor(props: TopicErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): TopicErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TopicErrorBoundary caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle, fallbackDescription, className } = this.props;

      return (
        <Card className={cn('border-destructive/30 bg-destructive/5', className)}>
          <CardContent className="py-8 text-center">
            {/* Animated Error Icon */}
            <div className="relative mx-auto mb-4 w-16 h-16">
              <div className="absolute inset-0 bg-destructive/20 rounded-full animate-ping" />
              <div className="relative flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </div>

            {/* Error Message */}
            <h4 className="font-medium text-foreground mb-2">
              {fallbackTitle || 'Đã xảy ra lỗi'}
            </h4>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
              {fallbackDescription || 'Không thể tải nội dung. Vui lòng thử lại.'}
            </p>

            {/* Error Details (dev only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-left mx-auto max-w-md">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Chi tiết lỗi
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Thử lại
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={this.handleGoHome}
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                Về trang chủ
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// HOC for functional components
export function withTopicErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    fallbackTitle?: string;
    fallbackDescription?: string;
  }
) {
  return function WithErrorBoundary(props: P) {
    return (
      <TopicErrorBoundary
        fallbackTitle={options?.fallbackTitle}
        fallbackDescription={options?.fallbackDescription}
      >
        <WrappedComponent {...props} />
      </TopicErrorBoundary>
    );
  };
}
