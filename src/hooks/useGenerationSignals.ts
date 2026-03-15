import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PromptMode } from '@/hooks/useSocialImageGeneration';

interface SignalData {
  brandId?: string;
  promptMode: PromptMode;
  channel: string;
  imageStyle?: string;
}

/**
 * Tracks implicit user signals after image generation for future smart defaults.
 * Zero UX impact — runs in background.
 */
export function useGenerationSignals() {
  const activeSignalId = useRef<string | null>(null);
  const generationTimestamp = useRef<number | null>(null);

  /** Record a new signal when image generation completes */
  const recordGeneration = useCallback(async (data: SignalData) => {
    generationTimestamp.current = Date.now();

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) return;

      const { data: row, error } = await supabase
        .from('generation_signals')
        .insert({
          brand_id: data.brandId || null,
          user_id: user.user.id,
          prompt_mode: data.promptMode,
          channel: data.channel,
          image_style: data.imageStyle || null,
        })
        .select('id')
        .single();

      if (!error && row) {
        activeSignalId.current = row.id;
      }
    } catch {
      // Silent fail — tracking should never break UX
    }
  }, []);

  /** Update the active signal with user action */
  const updateSignal = useCallback(async (updates: Partial<{
    accepted: boolean;
    regenerated: boolean;
    edited_background: boolean;
    edited_text: boolean;
    switched_mode: boolean;
  }>) => {
    const signalId = activeSignalId.current;
    if (!signalId) return;

    // Calculate time_to_accept if accepting
    const extra: Record<string, unknown> = {};
    if (updates.accepted && generationTimestamp.current) {
      extra.time_to_accept_ms = Date.now() - generationTimestamp.current;
    }

    try {
      await supabase
        .from('generation_signals')
        .update({ ...updates, ...extra })
        .eq('id', signalId);
    } catch {
      // Silent fail
    }
  }, []);

  /** Mark current image as accepted (user proceeded) */
  const markAccepted = useCallback(() => updateSignal({ accepted: true }), [updateSignal]);

  /** Mark current image as regenerated */
  const markRegenerated = useCallback(() => updateSignal({ regenerated: true }), [updateSignal]);

  /** Mark background edited */
  const markEditedBackground = useCallback(() => updateSignal({ edited_background: true }), [updateSignal]);

  /** Mark text edited */
  const markEditedText = useCallback(() => updateSignal({ edited_text: true }), [updateSignal]);

  /** Mark mode switched */
  const markSwitchedMode = useCallback(() => updateSignal({ switched_mode: true }), [updateSignal]);

  return {
    recordGeneration,
    markAccepted,
    markRegenerated,
    markEditedBackground,
    markEditedText,
    markSwitchedMode,
  };
}
