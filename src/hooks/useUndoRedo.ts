import { useState, useCallback, useRef } from 'react';

interface UseUndoRedoOptions {
  maxHistory?: number;
}

export function useUndoRedo<T>(initialValue: T, options: UseUndoRedoOptions = {}) {
  const { maxHistory = 50 } = options;
  
  const [present, setPresent] = useState<T>(initialValue);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  const set = useCallback((newValue: T | ((prev: T) => T)) => {
    const resolvedValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(present)
      : newValue;
    
    // Only add to history if value actually changed
    if (resolvedValue !== present) {
      pastRef.current = [...pastRef.current, present].slice(-maxHistory);
      futureRef.current = [];
      setPresent(resolvedValue);
    }
  }, [present, maxHistory]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [present, ...futureRef.current];
    setPresent(previous);
  }, [present]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current, present];
    setPresent(next);
  }, [present]);

  const reset = useCallback((newValue: T) => {
    pastRef.current = [];
    futureRef.current = [];
    setPresent(newValue);
  }, []);

  const clear = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
  }, []);

  return {
    value: present,
    set,
    undo,
    redo,
    reset,
    clear,
    canUndo,
    canRedo,
    historyCount: pastRef.current.length,
    futureCount: futureRef.current.length,
  };
}
