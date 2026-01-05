import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  TrendingUp, 
  Lightbulb, 
  X,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Insight {
  id: string;
  type: 'tip' | 'trend' | 'reminder';
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

const defaultInsights: Insight[] = [
  {
    id: '1',
    type: 'trend',
    title: 'Topic đang hot',
    description: 'Nội dung về AI và Automation đang có engagement cao. Thử tạo bài về chủ đề này!',
    action: { label: 'Tạo nội dung', href: '/multichannel' },
  },
  {
    id: '2',
    type: 'tip',
    title: 'Mẹo tối ưu',
    description: 'Thêm Brand Voice chi tiết hơn để AI tạo nội dung chính xác hơn với phong cách của bạn.',
    action: { label: 'Cập nhật Brand', href: '/brands' },
  },
  {
    id: '3',
    type: 'reminder',
    title: 'Nhắc nhở',
    description: 'Bạn chưa đăng bài LinkedIn trong 3 ngày. Đăng đều đặn giúp tăng reach!',
    action: { label: 'Tạo bài ngay', href: '/multichannel' },
  },
];

interface AIInsightsCardProps {
  className?: string;
}

export function AIInsightsCard({ className }: AIInsightsCardProps) {
  const [insights, setInsights] = useState<Insight[]>(defaultInsights);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentInsight = insights[currentIndex];

  const handleDismiss = (id: string) => {
    setInsights(prev => prev.filter(i => i.id !== id));
    if (currentIndex >= insights.length - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setInsights(defaultInsights);
      setCurrentIndex(0);
      setIsRefreshing(false);
    }, 1000);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % insights.length);
  };

  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'trend':
        return TrendingUp;
      case 'tip':
        return Lightbulb;
      default:
        return Sparkles;
    }
  };

  const getIconColor = (type: Insight['type']) => {
    switch (type) {
      case 'trend':
        return 'text-emerald-500';
      case 'tip':
        return 'text-amber-500';
      default:
        return 'text-primary';
    }
  };

  if (insights.length === 0) {
    return (
      <Card className={`gradient-card border-border/50 ${className}`}>
        <CardContent className="p-4 sm:p-5 text-center">
          <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-3">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Không có insights mới
          </p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </CardContent>
      </Card>
    );
  }

  const Icon = getIcon(currentInsight.type);

  return (
    <Card className={`relative overflow-hidden gradient-card border-border/50 ${className}`}>
      {/* Animated gradient border */}
      <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-r from-primary/50 via-secondary/50 to-primary/50 opacity-50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 animate-gradient-shift" />
      </div>

      <CardContent className="relative p-4 sm:p-5 bg-card rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              AI Insights
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Dots indicator */}
            <div className="flex gap-1 mr-2">
              {insights.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentIndex 
                      ? 'bg-primary w-3' 
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleDismiss(currentInsight.id)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentInsight.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className={`p-2 rounded-lg bg-background ${getIconColor(currentInsight.type)}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-foreground mb-1">
                  {currentInsight.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {currentInsight.description}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              {currentInsight.action ? (
                <Button variant="secondary" size="sm" className="h-8 text-xs" asChild>
                  <a href={currentInsight.action.href}>
                    {currentInsight.action.label}
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              ) : (
                <div />
              )}
              
              {insights.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs text-muted-foreground"
                  onClick={handleNext}
                >
                  Tiếp theo
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
