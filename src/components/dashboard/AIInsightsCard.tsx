import { useState, useEffect, useRef } from 'react';
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
  Trophy,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithTimeout } from '@/lib/invokeEdgeFunctionWithTimeout';
import { InsightsSkeleton } from './InsightsSkeleton';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

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

interface InsightMetadata {
  currentStreak: number;
  longestStreak: number;
  weeklyProgress: number;
}

interface AIInsightsResponse {
  insights: Insight[];
  fromCache: boolean;
  cachedAt?: string;
  metadata?: InsightMetadata;
  creditsError?: 'CREDITS_EXHAUSTED' | 'RATE_LIMIT';
}

interface AIInsightsCardProps {
  className?: string;
}

const DISMISSED_STORAGE_KEY = 'dashboard-insights-dismissed';
const CELEBRATED_STORAGE_KEY = 'dashboard-insights-celebrated';

export function AIInsightsCard({ className }: AIInsightsCardProps) {
  const { user, loading: authLoading } = useAuth();
  
  // Load dismissed IDs from localStorage
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(DISMISSED_STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Load celebrated achievement IDs
  const [celebratedIds, setCelebratedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(CELEBRATED_STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const viewStartTime = useRef<number>(Date.now());
  const { toast } = useToast();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-insights', user?.id],
    queryFn: async (): Promise<AIInsightsResponse> => {
      if (!user) return { insights: [], fromCache: false };

      const { data, error } = await invokeWithTimeout<any>('analyze-dashboard-insights', {
        timeoutMs: 30_000,
      });

      if (error) {
        // invokeWithTimeout error message format: "Edge Function error (402): <body>"
        const match = error.message.match(/Edge Function error \((\d+)\):\s*(.*)$/s);
        const status = match ? Number(match[1]) : null;
        const rawBody = match ? match[2] : null;

        if (status === 402 && rawBody) {
          try {
            const body = JSON.parse(rawBody);
            if (body?.errorCode === 'CREDITS_EXHAUSTED') {
              return { insights: [], fromCache: false, creditsError: 'CREDITS_EXHAUSTED' };
            }
          } catch {
            // ignore
          }
          return { insights: [], fromCache: false, creditsError: 'CREDITS_EXHAUSTED' };
        }

        if (status === 429) {
          return { insights: [], fromCache: false, creditsError: 'RATE_LIMIT' };
        }

        // Transient Edge Runtime errors (503/502/504 cold-start) — return empty
        // gracefully instead of throwing red error to UI. React Query will retry.
        if (
          (status === 503 || status === 502 || status === 504) ||
          /SUPABASE_EDGE_RUNTIME_ERROR|temporarily unavailable|Failed to fetch|timed out/i.test(error.message)
        ) {
          console.warn('[AIInsightsCard] Transient edge error, returning empty:', error.message);
          return { insights: [], fromCache: false };
        }

        console.error('Error fetching insights:', error);
        throw error;
      }

      return {
        insights: (data?.insights || []) as Insight[],
        fromCache: data?.fromCache || false,
        cachedAt: data?.cachedAt,
        metadata: data?.metadata,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache 5 minutes in React Query
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    enabled: !!user && !authLoading, // Only run query when user is authenticated AND auth is finished loading
  });

  const insights = data?.insights || [];
  const visibleInsights = insights.filter(i => !dismissedIds.has(i.id));
  const currentInsight = visibleInsights[currentIndex];

  // Sync dismissed to localStorage
  useEffect(() => {
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...dismissedIds]));
  }, [dismissedIds]);

  // Sync celebrated to localStorage
  useEffect(() => {
    localStorage.setItem(CELEBRATED_STORAGE_KEY, JSON.stringify([...celebratedIds]));
  }, [celebratedIds]);

  // Clean up old dismissed IDs when insights change
  useEffect(() => {
    if (insights.length > 0) {
      const currentIds = new Set(insights.map(i => i.id));
      const validDismissed = [...dismissedIds].filter(id => currentIds.has(id)).slice(-20);
      if (validDismissed.length !== dismissedIds.size) {
        setDismissedIds(new Set(validDismissed));
      }
    }
  }, [insights]);

  // Confetti for achievements
  useEffect(() => {
    if (currentInsight?.type === 'achievement' && !celebratedIds.has(currentInsight.id)) {
      // Fire confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#8B5CF6', '#EC4899', '#F59E0B']
      });
      
      setCelebratedIds(prev => new Set([...prev, currentInsight.id]));
    }
  }, [currentInsight?.id, celebratedIds]);

  // Reset view timer when insight changes
  useEffect(() => {
    viewStartTime.current = Date.now();
  }, [currentInsight?.id]);

  // Track analytics
  const trackAnalytics = async (
    insightId: string, 
    insightType: string, 
    actionType: 'viewed' | 'clicked' | 'dismissed' | 'acted',
    actionHref?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const timeSpent = Date.now() - viewStartTime.current;
      
      await supabase.from('insight_analytics').insert({
        user_id: user.id,
        insight_id: insightId,
        insight_type: insightType,
        action_type: actionType,
        time_spent_ms: timeSpent,
        action_href: actionHref
      });
    } catch (error) {
      console.error('Error tracking insight analytics:', error);
    }
  };

  const handleDismiss = async (id: string) => {
    await trackAnalytics(id, currentInsight?.type || 'unknown', 'dismissed');
    setDismissedIds(prev => new Set([...prev, id]));
    if (currentIndex >= visibleInsights.length - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  const handleActionClick = async (insight: Insight) => {
    await trackAnalytics(insight.id, insight.type, 'acted', insight.action?.href);
  };

  const handleRefresh = async (forceRefresh = false) => {
    if (forceRefresh) {
      setDismissedIds(new Set());
    }
    setCurrentIndex(0);
    try {
      // Force refresh bypasses cache
      if (forceRefresh) {
        const { error } = await invokeWithTimeout('analyze-dashboard-insights', {
          body: { forceRefresh: true },
          timeoutMs: 30_000,
        });

        if (error) {
          if (error.message.includes('(402)')) {
            toast({
              title: 'AI credits đã hết',
              description: 'Vui lòng nạp thêm tại Settings → Usage.',
            });
            return;
          }
          throw error;
        }
      }

      await refetch();
      toast({
        title: "Đã cập nhật insights",
        description: forceRefresh ? "AI đã phân tích dữ liệu mới nhất" : "Insights đã được làm mới",
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

  // Not authenticated or auth still loading - don't show insights
  if (!user || authLoading) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return <InsightsSkeleton />;
  }

  // Credits exhausted - show graceful message instead of error
  if (data?.creditsError === 'CREDITS_EXHAUSTED') {
    return (
      <Card className={`gradient-card border-border/50 ${className}`}>
        <CardContent className="p-4 sm:p-5 text-center">
          <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-3">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            AI Insights tạm ngưng
          </p>
          <p className="text-xs text-muted-foreground">
            Đã hết credits AI. Insights sẽ hoạt động lại khi credits được nạp thêm.
          </p>
        </CardContent>
      </Card>
    );
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
          <Button variant="outline" size="sm" onClick={() => handleRefresh(true)} disabled={isFetching}>
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
            {/* Streak badge */}
            {data?.metadata?.currentStreak && data.metadata.currentStreak >= 2 && (
              <div className="flex items-center gap-0.5 text-[10px] text-orange-500 font-medium">
                <Flame className="w-3 h-3" />
                <span>{data.metadata.currentStreak}</span>
              </div>
            )}
            {data?.fromCache && data?.cachedAt && (
              <span className="text-[10px] text-muted-foreground/70">
                • {formatDistanceToNow(new Date(data.cachedAt), { locale: vi, addSuffix: true })}
              </span>
            )}
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
              <div className={`relative p-2 rounded-lg bg-background ${getIconColor(currentInsight.type)}`}>
                <Icon className="w-4 h-4" />
                {/* Achievement celebration indicator */}
                {currentInsight.type === 'achievement' && (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-1 -right-1 text-sm"
                  >
                    🎉
                  </motion.span>
                )}
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
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="h-8 text-xs" 
                  asChild
                  onClick={() => handleActionClick(currentInsight)}
                >
                  <Link to={currentInsight.action.href}>
                    {currentInsight.action.label}
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Link>
                </Button>
              ) : (
                <div />
              )}
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleRefresh(true)}
                  disabled={isFetching}
                  title="Force refresh insights"
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