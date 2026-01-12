// ============================================
// Realtime Graph Updates Hook
// Subscribe to knowledge graph changes
// ============================================

import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { knowledgeGraphKeys } from "@/hooks/useKnowledgeGraph";
import { graphVisualizationKeys } from "@/hooks/useGraphVisualization";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// ============================================
// Types
// ============================================

interface GraphChangeEvent {
  type: 'node' | 'edge' | 'propagation';
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  timestamp: string;
}

interface UseRealtimeGraphOptions {
  enabled?: boolean;
  showNotifications?: boolean;
  onNodeChange?: (event: GraphChangeEvent) => void;
  onEdgeChange?: (event: GraphChangeEvent) => void;
  onPropagationChange?: (event: GraphChangeEvent) => void;
}

// ============================================
// Main Hook
// ============================================

export function useRealtimeGraph(options: UseRealtimeGraphOptions = {}) {
  const {
    enabled = true,
    showNotifications = true,
    onNodeChange,
    onEdgeChange,
    onPropagationChange,
  } = options;

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<GraphChangeEvent | null>(null);
  const [eventCount, setEventCount] = useState(0);

  // Handle node changes
  const handleNodeChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const event: GraphChangeEvent = {
        type: 'node',
        action: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        data: payload.new || payload.old || {},
        timestamp: new Date().toISOString(),
      };

      setLastEvent(event);
      setEventCount((c) => c + 1);
      onNodeChange?.(event);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.nodes() });
      queryClient.invalidateQueries({ queryKey: graphVisualizationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["graph-statistics"] });

      if (showNotifications && payload.eventType === 'INSERT') {
        const nodeName = (payload.new as any)?.display_name?.vi || 
                        (payload.new as any)?.display_name?.en || 
                        (payload.new as any)?.node_key || 'Unknown';
        toast({
          title: "Node Added",
          description: `New node "${nodeName}" added to the graph`,
        });
      }
    },
    [queryClient, showNotifications, toast, onNodeChange]
  );

  // Handle edge changes
  const handleEdgeChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const event: GraphChangeEvent = {
        type: 'edge',
        action: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        data: payload.new || payload.old || {},
        timestamp: new Date().toISOString(),
      };

      setLastEvent(event);
      setEventCount((c) => c + 1);
      onEdgeChange?.(event);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.edges() });
      queryClient.invalidateQueries({ queryKey: graphVisualizationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["graph-statistics"] });
    },
    [queryClient, onEdgeChange]
  );

  // Handle propagation changes
  const handlePropagationChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const event: GraphChangeEvent = {
        type: 'propagation',
        action: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        data: payload.new || payload.old || {},
        timestamp: new Date().toISOString(),
      };

      setLastEvent(event);
      setEventCount((c) => c + 1);
      onPropagationChange?.(event);

      // Invalidate propagation queries
      queryClient.invalidateQueries({ queryKey: ["regulation-propagation"] });

      if (showNotifications && payload.eventType === 'INSERT') {
        toast({
          title: "New Regulation Update",
          description: "A new regulation propagation has been queued for review",
        });
      }
    },
    [queryClient, showNotifications, toast, onPropagationChange]
  );

  // Set up realtime subscriptions
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('knowledge-graph-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'industry_knowledge_nodes',
        },
        handleNodeChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'industry_knowledge_edges',
        },
        handleEdgeChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'regulation_propagation_log',
        },
        handlePropagationChange
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      channel.unsubscribe();
    };
  }, [enabled, handleNodeChange, handleEdgeChange, handlePropagationChange]);

  return {
    isConnected,
    lastEvent,
    eventCount,
    resetEventCount: () => setEventCount(0),
  };
}

// ============================================
// Realtime Status Indicator Component
// ============================================

export function RealtimeStatusIndicator() {
  const { isConnected, eventCount } = useRealtimeGraph({ showNotifications: false });

  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
        }`}
      />
      <span className="text-muted-foreground">
        {isConnected ? "Realtime" : "Offline"}
        {eventCount > 0 && ` (${eventCount} events)`}
      </span>
    </div>
  );
}
