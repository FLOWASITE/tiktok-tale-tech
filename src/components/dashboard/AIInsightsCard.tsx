import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  TrendingUp, 
  Lightbulb, 
  X,
  ChevronRight,
  RefreshCw,
  Bell,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { InsightsSkeleton } from './InsightsSkeleton';
import { useToast } from '@/hooks/use-toast';

interface Insight {
  id: string;
  type: 'tip' | 'trend' | 'reminder' | 'achievement';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: {
    label: string;
    href: string;
  };
}

interface AIInsightsCardProps {
  className?: string;
}

export function AIInsightsCard({ className }: AIInsightsCardProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();

  const { data: insights = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-insights'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('analyze-dashboard-insights');
      
      if (error) {
        console.error('Error fetching insights:', error);
        throw error;
      }
      
      return (data?.insights || []) as Insight[];
    },
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const visibleInsights = insights.filter(i => !dismissedIds.has(i.id));
  const currentInsight = visibleInsights[currentIndex];

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    if (currentIndex >= visibleInsights.length - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  const handleRefresh = async () => {
    setDismissedIds(new Set());
    setCurrentIndex(0);
    try {
      await refetch();
      toast({
        title: "Đã cập nhật insights",
        description: "AI đã phân tích dữ liệu mới nhất của bạn",
      });
    } catch {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật insights. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % visibleInsights.length);
  };

  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'trend':
        return TrendingUp;
      case 'tip':
        return Lightbulb;
      case 'reminder':
        return Bell;
      case 'achievement':
        return Trophy;
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
      case 'reminder':
        return 'text-blue-500';
      case 'achievement':
        return 'text-purple-500';
      default:
        return 'text-primary';
    }
  };

  const getPriorityBadge = (priority: Insight['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'low':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
  };

  // Loading state
  if (isLoading) {
    return <InsightsSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <Card className={`gradient-card border-border/50 ${className}`}>
        <CardContent className="p-4 sm:p-5 text-center">
          <div className="p-3 rounded-full bg-destructive/10 w-fit mx-auto mb-3">
            <Sparkles className="w-5 h-5 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Không thể tải insights
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Thử lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (visibleInsights.length === 0) {
    return (
      <Card className={`gradient-card border-border/50 ${className}`}>
        <CardContent className="p-4 sm:p-5 text-center">
          <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-3">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Không có insights mới
          </p>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
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
            {currentInsight.priority === 'high' && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getPriorityBadge(currentInsight.priority)}`}>
                Quan trọng
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Dots indicator */}
            <div className="flex gap-1 mr-2">
              {visibleInsights.map((_, idx) => (
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
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleRefresh}
                  disabled={isFetching}
                >
                  <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
                {visibleInsights.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs text-muted-foreground"
                    onClick={handleNext}
                  >
                    Tiếp
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
