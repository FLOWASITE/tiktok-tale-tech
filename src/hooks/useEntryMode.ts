import { useCallback, useState } from 'react';
import type { Channel } from '@/types/multichannel';

export type EntryMode = 'idea' | 'seo';

export const LONG_FORM_CHANNELS: Channel[] = ['website', 'blogger', 'wordpress'] as Channel[];

const STORAGE_KEY = 'mc:entry_mode';
const DEFAULT_KEY = 'mc:entry_mode_default';

function readKey(key: string): EntryMode | null {
  try {
    const v = localStorage.getItem(key);
    return v === 'seo' || v === 'idea' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Entry mode for MultiChannel form.
 * - Default fallback: 'idea'.
 * - User can pin a personal default via setAsDefault() → persists across sessions.
 * - setMode() only updates the current session (also lightly persisted to survive reload).
 */
export function useEntryMode() {
  const [defaultMode, setDefaultModeState] = useState<EntryMode>(
    () => readKey(DEFAULT_KEY) ?? 'idea',
  );
  const [mode, setModeState] = useState<EntryMode>(
    () => readKey(STORAGE_KEY) ?? readKey(DEFAULT_KEY) ?? 'idea',
  );

  const setMode = useCallback((next: EntryMode) => {
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    setModeState(next);
  }, []);

  const setAsDefault = useCallback(() => {
    try { localStorage.setItem(DEFAULT_KEY, mode); } catch {}
    setDefaultModeState(mode);
  }, [mode]);

  const resetDefault = useCallback(() => {
    try { localStorage.removeItem(DEFAULT_KEY); } catch {}
    setDefaultModeState('idea');
  }, []);

  return {
    mode,
    setMode,
    defaultMode,
    setAsDefault,
    resetDefault,
    isCurrentDefault: mode === defaultMode,
  };
}
