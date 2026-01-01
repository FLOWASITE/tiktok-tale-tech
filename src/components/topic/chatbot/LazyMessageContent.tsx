// Lazy loading wrapper for heavy message content
import { useState, useEffect, useRef, memo, Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyMessageContentProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}

// Skeleton placeholder for message content
export function MessageContentSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <Skeleton className="h-4 w-3/4 skeleton-loading" />
      <Skeleton className="h-4 w-full skeleton-loading" />
      <Skeleton className="h-4 w-5/6 skeleton-loading" />
    </div>
  );
}

// Lazy loading wrapper using Intersection Observer
export const LazyMessageContent = memo(function LazyMessageContent({
  children,
  placeholder = <MessageContentSkeleton />,
  threshold = 0.1,
  rootMargin = '100px',
}: LazyMessageContentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={ref}>
      {hasLoaded || isVisible ? children : placeholder}
    </div>
  );
});

// HOC for lazy loading components
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ReactNode = <MessageContentSkeleton />
) {
  return function LazyComponent(props: P) {
    return (
      <LazyMessageContent placeholder={fallback}>
        <Component {...props} />
      </LazyMessageContent>
    );
  };
}

// Lazy loaded markdown renderer
const LazyMarkdownRenderer = lazy(() => 
  import('react-markdown').then(mod => ({ default: mod.default }))
);

export function LazyMarkdown({ content }: { content: string }) {
  return (
    <Suspense fallback={<MessageContentSkeleton />}>
      <LazyMarkdownRenderer>{content}</LazyMarkdownRenderer>
    </Suspense>
  );
}
