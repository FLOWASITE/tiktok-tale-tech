import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  onRetry?: () => void;
  className?: string;
  /** Size variant for the fallback UI */
  size?: 'sm' | 'md' | 'lg';
}

interface ImageErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for image components.
 * Catches rendering errors in image galleries, streaming cards, etc.
 * Provides a graceful fallback UI instead of crashing the whole page.
 */
export class ImageErrorBoundary extends Component<ImageErrorBoundaryProps, ImageErrorBoundaryState> {
  constructor(props: ImageErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ImageErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ImageErrorBoundary caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    const { size = 'md', className, fallbackTitle, fallbackDescription } = this.props;

    if (this.state.hasError) {
      const sizeClasses = {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      };

      const iconSizes = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
      };

      return (
        <div
          className={cn(
            'flex flex-col items-center justify-center text-center bg-muted/50 rounded-lg border border-dashed border-muted-foreground/30',
            sizeClasses[size],
            className
          )}
        >
          <div className="relative mb-2">
            <ImageOff className={cn('text-muted-foreground/50', iconSizes[size])} />
            <AlertTriangle className="w-3 h-3 text-amber-500 absolute -bottom-0.5 -right-0.5" />
          </div>

          <p className="text-sm font-medium text-muted-foreground">
            {fallbackTitle || 'Không thể hiển thị ảnh'}
          </p>
          
          {fallbackDescription && (
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
              {fallbackDescription}
            </p>
          )}

          {this.props.onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={this.handleRetry}
              className="mt-2 gap-1.5 text-xs h-7"
            >
              <RefreshCw className="w-3 h-3" />
              Thử lại
            </Button>
          )}

          {/* Dev error details */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-2 text-left w-full max-w-[250px]">
              <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                Chi tiết lỗi
              </summary>
              <pre className="mt-1 p-1.5 bg-muted rounded text-[10px] overflow-auto max-h-20">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap any component with ImageErrorBoundary
 */
export function withImageErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    fallbackTitle?: string;
    fallbackDescription?: string;
    size?: 'sm' | 'md' | 'lg';
  }
) {
  return function WithImageErrorBoundary(props: P & { onImageRetry?: () => void }) {
    return (
      <ImageErrorBoundary
        fallbackTitle={options?.fallbackTitle}
        fallbackDescription={options?.fallbackDescription}
        size={options?.size}
        onRetry={props.onImageRetry}
      >
        <WrappedComponent {...props} />
      </ImageErrorBoundary>
    );
  };
}

/**
 * Simple fallback component for broken images
 * Use this as onError handler for <img> tags
 */
export function ImageLoadError({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-muted/50 rounded-lg border border-dashed border-muted-foreground/20',
        sizeClasses[size],
        className
      )}
    >
      <ImageOff className={cn('text-muted-foreground/40', iconSizes[size])} />
    </div>
  );
}
