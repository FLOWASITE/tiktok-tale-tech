/**
 * GlobalOperationStatus - Shows active operations status in header
 */

import { Loader2, X, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface OperationState {
  id: string;
  label: string;
  progress?: number;
  total?: number;
  current?: number;
  status: 'running' | 'completed' | 'error';
  onCancel?: () => void;
}

interface GlobalOperationStatusProps {
  operations: OperationState[];
  onDismiss?: (id: string) => void;
  className?: string;
}

export function GlobalOperationStatus({ 
  operations, 
  onDismiss,
  className 
}: GlobalOperationStatusProps) {
  const activeOperations = operations.filter(op => op.status === 'running');
  const completedOperations = operations.filter(op => op.status === 'completed');
  
  if (operations.length === 0) return null;

  return (
    <div className={cn('fixed bottom-4 right-4 z-50 space-y-2 max-w-sm', className)}>
      {/* Active operations */}
      {activeOperations.map(op => (
        <Card key={op.id} className="p-3 shadow-lg border-primary/20 bg-background/95 backdrop-blur">
          <div className="flex items-start gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{op.label}</span>
                {op.onCancel && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    onClick={op.onCancel}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {op.progress !== undefined && (
                <div className="mt-2 space-y-1">
                  <Progress value={op.progress} className="h-1.5" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{Math.round(op.progress)}%</span>
                    {op.current !== undefined && op.total !== undefined && (
                      <span>{op.current}/{op.total}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}

      {/* Completed operations (auto-dismiss after 3s) */}
      {completedOperations.map(op => (
        <Card 
          key={op.id} 
          className="p-3 shadow-lg border-green-500/20 bg-background/95 backdrop-blur animate-in slide-in-from-right"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <span className="text-sm font-medium flex-1 truncate">{op.label}</span>
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Hoàn thành
            </Badge>
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                onClick={() => onDismiss(op.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

// Hook for managing operation states
import { useState, useCallback } from 'react';

export function useOperationStatus() {
  const [operations, setOperations] = useState<OperationState[]>([]);

  const addOperation = useCallback((op: Omit<OperationState, 'status'> & { status?: OperationState['status'] }) => {
    setOperations(prev => [...prev, { ...op, status: op.status || 'running' }]);
  }, []);

  const updateOperation = useCallback((id: string, updates: Partial<OperationState>) => {
    setOperations(prev => prev.map(op => op.id === id ? { ...op, ...updates } : op));
  }, []);

  const completeOperation = useCallback((id: string) => {
    setOperations(prev => prev.map(op => op.id === id ? { ...op, status: 'completed' } : op));
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setOperations(prev => prev.filter(op => op.id !== id));
    }, 3000);
  }, []);

  const removeOperation = useCallback((id: string) => {
    setOperations(prev => prev.filter(op => op.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setOperations(prev => prev.filter(op => op.status !== 'completed'));
  }, []);

  return {
    operations,
    addOperation,
    updateOperation,
    completeOperation,
    removeOperation,
    clearCompleted,
  };
}
