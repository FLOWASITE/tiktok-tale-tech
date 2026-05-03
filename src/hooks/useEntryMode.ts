import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Channel } from '@/types/multichannel';

export type EntryMode = 'idea' | 'seo';

export const LONG_FORM_CHANNELS: Channel[] = ['website', 'blogger', 'wordpress'] as Channel[];

const STORAGE_KEY = 'mc:entry_mode';
const OVERRIDE_KEY = 'mc:entry_mode_override';

function readMode(): EntryMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'seo' || v === 'idea' ? v : null;
  } catch {
    return null;
  }
}

function readOverride(): boolean {
  try { return localStorage.getItem(OVERRIDE_KEY) === '1'; } catch { return false; }
}

/**
 * Smart-default entry mode for MultiChannel form.
 * - Auto switches to "seo" when ≥1 long-form channel selected.
 * - Auto switches to "idea" when no long-form channel selected.
 * - User manual switch sets override flag → no further auto switching until reset.
 */
export function useEntryMode(channels: Channel[]) {
  const [mode, setModeState] = useState<EntryMode>(() => readMode() ?? 'idea');
  const overrideRef = useRef<boolean>(readOverride());

  // Auto-switch on channel changes
  useEffect(() => {
    if (overrideRef.current) return;
    const hasLongForm = channels.some((c) => LONG_FORM_CHANNELS.includes(c));
    const next: EntryMode = hasLongForm ? 'seo' : 'idea';
    if (next !== mode) {
      setModeState(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      if (next === 'seo') {
        toast.info('Đã chuyển sang chế độ SEO Pillar', {
          description: 'Bạn vừa chọn kênh long-form (Website/Blog).',
        });
      }
    }
  }, [channels, mode]);

  const setMode = useCallback((next: EntryMode) => {
    overrideRef.current = true;
    try {
      localStorage.setItem(STORAGE_KEY, next);
      localStorage.setItem(OVERRIDE_KEY, '1');
    } catch {}
    setModeState(next);
  }, []);

  const resetOverride = useCallback(() => {
    overrideRef.current = false;
    try { localStorage.removeItem(OVERRIDE_KEY); } catch {}
  }, []);

  return { mode, setMode, resetOverride, isOverridden: overrideRef.current };
}
