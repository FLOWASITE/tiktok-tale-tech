/**
 * Propagation Notifications Badge - Shows pending auto-detected propagations
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface PendingPropagation {
  id: string;
  change_type: string;
  change_summary: string;
  priority: string;
  created_at: string;
  impact_analysis: {
    auto_detected?: boolean;
    source?: string;
    disclaimer?: string;
  } | null;
}

interface PropagationNotificationsBadgeProps {
  onNavigateToPropagation?: () => void;
}

export function PropagationNotificationsBadge({
  onNavigateToPropagation,
}: PropagationNotificationsBadgeProps) {
  const { data: pendingPropagations = [], isLoading } = useQuery({
    queryKey: ['pending-auto-propagations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulation_propagation_log')
        .select('id, change_type, change_summary, priority, created_at, impact_analysis')
        .eq('propagation_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Filter for auto-detected only
      return (data || []).filter((item: PendingPropagation) => {
        const analysis = item.impact_analysis;
        return analysis && typeof analysis === 'object' && 'auto_detected' in analysis && analysis.auto_detected === true;
      }) as PendingPropagation[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-destructive text-destructive-foreground';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const count = pendingPropagations.length;

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Quy Định Auto-Detected</h4>
            {count > 0 && (
              <Badge variant="secondary" className="text-xs">
                {count} pending
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Quy định phát hiện tự động cần xem xét
          </p>
        </div>

        {count === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Không có quy định mới</p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-64">
              <div className="divide-y">
                {pendingPropagations.map((prop) => (
                  <div key={prop.id} className="p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-xs px-1.5 py-0 ${getPriorityColor(prop.priority)}`}>
                            {prop.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {prop.change_type}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium line-clamp-2">
                          {prop.change_summary}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>
                            {formatDistanceToNow(new Date(prop.created_at), { addSuffix: true, locale: vi })}
                          </span>
                          {prop.impact_analysis?.source && (
                            <>
                              <span>•</span>
                              <span className="truncate">{prop.impact_analysis.source}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={onNavigateToPropagation}
              >
                Xem tất cả trong Propagation
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default PropagationNotificationsBadge;
