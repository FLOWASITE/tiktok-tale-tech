import { useCallback, useState } from 'react';
import type { Channel } from '@/types/multichannel';

export type EntryMode = 'idea' | 'seo';

export const LONG_FORM_CHANNELS: Channel[] = ['website', 'blogger', 'wordpress'] as Channel[];

const STORAGE_KEY = 'mc:entry_mode';

function readMode(): EntryMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'seo' || v === 'idea' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Entry mode for MultiChannel form.
 * - Default: 'idea' (system default for all users / channel combos).
 * - 'seo' is opt-in: only activates when user explicitly clicks the switcher.
 * - User selection persists in localStorage across sessions.
 */
export function useEntryMode() {
  const [mode, setModeState] = useState<EntryMode>(() => readMode() ?? 'idea');

  const setMode = useCallback((next: EntryMode) => {
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    setModeState(next);
  }, []);

  return { mode, setMode };
}
