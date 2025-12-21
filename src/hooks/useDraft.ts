import { useState, useEffect, useCallback, useRef } from 'react';

interface DraftData {
  content: string;
  timestamp: number;
  contentId: string;
  channel: string;
}

interface UseDraftOptions {
  debounceMs?: number;
  storageKey?: string;
}

const DRAFT_STORAGE_PREFIX = 'multichannel_draft_';

export function useDraft(
  contentId: string | null,
  channel: string | null,
  options: UseDraftOptions = {}
) {
  const { debounceMs = 1000, storageKey = DRAFT_STORAGE_PREFIX } = options;
  
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getDraftKey = useCallback(() => {
    if (!contentId || !channel) return null;
    return `${storageKey}${contentId}_${channel}`;
  }, [contentId, channel, storageKey]);

  // Load draft from localStorage
  const loadDraft = useCallback((): string | null => {
    const key = getDraftKey();
    if (!key) return null;

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const draft: DraftData = JSON.parse(stored);
      
      // Check if draft is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - draft.timestamp > maxAge) {
        localStorage.removeItem(key);
        return null;
      }

      setHasDraft(true);
      setLastSaved(new Date(draft.timestamp));
      return draft.content;
    } catch (error) {
      console.error('Error loading draft:', error);
      return null;
    }
  }, [getDraftKey]);

  // Save draft to localStorage (debounced)
  const saveDraft = useCallback((content: string) => {
    const key = getDraftKey();
    if (!key || !contentId || !channel) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsSaving(true);

    timeoutRef.current = setTimeout(() => {
      try {
        const draft: DraftData = {
          content,
          timestamp: Date.now(),
          contentId,
          channel,
        };
        localStorage.setItem(key, JSON.stringify(draft));
        setHasDraft(true);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Error saving draft:', error);
      } finally {
        setIsSaving(false);
      }
    }, debounceMs);
  }, [getDraftKey, contentId, channel, debounceMs]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    const key = getDraftKey();
    if (!key) return;

    try {
      localStorage.removeItem(key);
      setHasDraft(false);
      setLastSaved(null);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, [getDraftKey]);

  // Check if draft exists
  const checkDraft = useCallback(() => {
    const key = getDraftKey();
    if (!key) {
      setHasDraft(false);
      return false;
    }

    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        setHasDraft(false);
        return false;
      }

      const draft: DraftData = JSON.parse(stored);
      const maxAge = 24 * 60 * 60 * 1000;
      
      if (Date.now() - draft.timestamp > maxAge) {
        localStorage.removeItem(key);
        setHasDraft(false);
        return false;
      }

      setHasDraft(true);
      setLastSaved(new Date(draft.timestamp));
      return true;
    } catch {
      setHasDraft(false);
      return false;
    }
  }, [getDraftKey]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Check for existing draft when contentId/channel changes
  useEffect(() => {
    checkDraft();
  }, [checkDraft]);

  return {
    hasDraft,
    lastSaved,
    isSaving,
    loadDraft,
    saveDraft,
    clearDraft,
    checkDraft,
  };
}

// Utility to clear all drafts
export function clearAllDrafts() {
  try {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(DRAFT_STORAGE_PREFIX)
    );
    keys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing all drafts:', error);
  }
}
