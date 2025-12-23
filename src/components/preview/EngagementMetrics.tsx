import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, ThumbsUp, Eye } from 'lucide-react';

interface EngagementMetricsProps {
  channel: 'facebook' | 'linkedin' | 'instagram' | 'tiktok' | 'email';
  animated?: boolean;
}

const METRICS_CONFIG = {
  facebook: {
    metrics: [
      { icon: ThumbsUp, label: 'Thích', value: 1247, color: 'text-blue-500' },
      { icon: MessageCircle, label: 'Bình luận', value: 89, color: 'text-blue-500' },
      { icon: Share2, label: 'Chia sẻ', value: 34, color: 'text-blue-500' },
    ],
  },
  linkedin: {
    metrics: [
      { icon: ThumbsUp, label: 'Reactions', value: 892, color: 'text-blue-600' },
      { icon: MessageCircle, label: 'Comments', value: 56, color: 'text-blue-600' },
      { icon: Share2, label: 'Reposts', value: 23, color: 'text-blue-600' },
    ],
  },
  instagram: {
    metrics: [
      { icon: Heart, label: 'Thích', value: 3456, color: 'text-red-500' },
      { icon: MessageCircle, label: 'Bình luận', value: 234, color: 'text-foreground' },
      { icon: Bookmark, label: 'Lưu', value: 89, color: 'text-foreground' },
    ],
  },
  tiktok: {
    metrics: [
      { icon: Heart, label: 'Thích', value: 12500, color: 'text-red-500' },
      { icon: MessageCircle, label: 'Bình luận', value: 456, color: 'text-foreground' },
      { icon: Bookmark, label: 'Lưu', value: 234, color: 'text-foreground' },
    ],
  },
  email: {
    metrics: [
      { icon: Eye, label: 'Đã xem', value: 2341, color: 'text-green-500' },
      { icon: MessageCircle, label: 'Phản hồi', value: 45, color: 'text-blue-500' },
    ],
  },
};

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function useCountUp(target: number, duration: number = 1000, enabled: boolean = true): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(target);
      return;
    }

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * target));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [target, duration, enabled]);

  return count;
}

function MetricItem({ 
  icon: Icon, 
  value, 
  color, 
  animated 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  value: number; 
  color: string;
  animated: boolean;
}) {
  const displayValue = useCountUp(value, 800, animated);
  
  return (
    <div className="flex items-center gap-1.5 group cursor-pointer">
      <Icon className={`w-4 h-4 ${color} transition-transform group-hover:scale-110`} />
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        {formatNumber(displayValue)}
      </span>
    </div>
  );
}

export function EngagementMetrics({ channel, animated = true }: EngagementMetricsProps) {
  const config = METRICS_CONFIG[channel];
  
  if (!config) return null;

  return (
    <div className="flex items-center gap-4">
      {config.metrics.map((metric, index) => (
        <MetricItem
          key={index}
          icon={metric.icon}
          value={metric.value}
          color={metric.color}
          animated={animated}
        />
      ))}
    </div>
  );
}
