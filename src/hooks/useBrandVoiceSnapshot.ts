import { useState, useCallback, useMemo } from 'react';

export type BrandVoiceAttribute = 
  | 'brand_positioning'
  | 'tone_of_voice'
  | 'formality_level'
  | 'language_style'
  | 'allow_emoji'
  | 'preferred_words'
  | 'forbidden_words'
  | 'compliance_rules';

export interface VoiceSnapshot {
  id: string;
  timestamp: Date;
  changedAttribute: BrandVoiceAttribute;
  attributeLabel: string;
  previousValue: unknown;
  newValue: unknown;
  previousSamples: Record<string, string>;
  newSamples: Record<string, string> | null; // null until regenerated
}

interface BrandVoiceState {
  brandPositioning: string;
  toneOfVoice: string[];
  formalityLevel: string;
  languageStyle: string[];
  allowEmoji: boolean;
  preferredWords: string[];
  forbiddenWords: string[];
  complianceRules: string[];
}

const ATTRIBUTE_LABELS: Record<BrandVoiceAttribute, string> = {
  brand_positioning: 'Định vị thương hiệu',
  tone_of_voice: 'Tone of Voice',
  formality_level: 'Mức trang trọng',
  language_style: 'Phong cách viết',
  allow_emoji: 'Cho phép emoji',
  preferred_words: 'Từ NÊN dùng',
  forbidden_words: 'Từ CẤM dùng',
  compliance_rules: 'Quy tắc tuân thủ',
};

export function useBrandVoiceSnapshot() {
  const [snapshots, setSnapshots] = useState<VoiceSnapshot[]>([]);
  const [pendingSnapshot, setPendingSnapshot] = useState<VoiceSnapshot | null>(null);

  // Take a snapshot before making a change
  const takeSnapshot = useCallback((
    attribute: BrandVoiceAttribute,
    previousValue: unknown,
    newValue: unknown,
    currentSamples: Record<string, string>
  ) => {
    const snapshot: VoiceSnapshot = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      changedAttribute: attribute,
      attributeLabel: ATTRIBUTE_LABELS[attribute],
      previousValue,
      newValue,
      previousSamples: { ...currentSamples },
      newSamples: null,
    };
    
    setPendingSnapshot(snapshot);
    return snapshot.id;
  }, []);

  // Update pending snapshot with new samples after regeneration
  const updatePendingWithNewSamples = useCallback((newSamples: Record<string, string>) => {
    if (!pendingSnapshot) return;
    
    const completedSnapshot: VoiceSnapshot = {
      ...pendingSnapshot,
      newSamples: { ...newSamples },
    };
    
    setSnapshots(prev => [completedSnapshot, ...prev].slice(0, 20)); // Keep last 20
    return completedSnapshot;
  }, [pendingSnapshot]);

  // Confirm and save the pending change
  const confirmChange = useCallback(() => {
    setPendingSnapshot(null);
  }, []);

  // Discard the pending change (will be used for undo)
  const discardChange = useCallback(() => {
    const snapshot = pendingSnapshot;
    setPendingSnapshot(null);
    return snapshot;
  }, [pendingSnapshot]);

  // Clear all snapshots
  const clearSnapshots = useCallback(() => {
    setSnapshots([]);
    setPendingSnapshot(null);
  }, []);

  // Get diff between two sample texts
  const getDiff = useCallback((before: string, after: string): { type: 'added' | 'removed' | 'unchanged'; text: string }[] => {
    const beforeWords = before.split(/\s+/);
    const afterWords = after.split(/\s+/);
    const result: { type: 'added' | 'removed' | 'unchanged'; text: string }[] = [];
    
    // Simple word-by-word diff
    const beforeSet = new Set(beforeWords);
    const afterSet = new Set(afterWords);
    
    // Track processed indices
    let bi = 0;
    let ai = 0;
    
    while (bi < beforeWords.length || ai < afterWords.length) {
      if (bi < beforeWords.length && ai < afterWords.length) {
        if (beforeWords[bi] === afterWords[ai]) {
          result.push({ type: 'unchanged', text: beforeWords[bi] });
          bi++;
          ai++;
        } else if (!afterSet.has(beforeWords[bi])) {
          result.push({ type: 'removed', text: beforeWords[bi] });
          bi++;
        } else if (!beforeSet.has(afterWords[ai])) {
          result.push({ type: 'added', text: afterWords[ai] });
          ai++;
        } else {
          result.push({ type: 'removed', text: beforeWords[bi] });
          result.push({ type: 'added', text: afterWords[ai] });
          bi++;
          ai++;
        }
      } else if (bi < beforeWords.length) {
        result.push({ type: 'removed', text: beforeWords[bi] });
        bi++;
      } else {
        result.push({ type: 'added', text: afterWords[ai] });
        ai++;
      }
    }
    
    return result;
  }, []);

  // Format value for display
  const formatValue = useCallback((value: unknown): string => {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '(trống)';
    }
    if (typeof value === 'boolean') {
      return value ? 'Có' : 'Không';
    }
    if (typeof value === 'string') {
      return value || '(trống)';
    }
    return String(value);
  }, []);

  const hasPendingChange = useMemo(() => pendingSnapshot !== null, [pendingSnapshot]);
  const hasHistory = useMemo(() => snapshots.length > 0, [snapshots]);

  return {
    snapshots,
    pendingSnapshot,
    hasPendingChange,
    hasHistory,
    takeSnapshot,
    updatePendingWithNewSamples,
    confirmChange,
    discardChange,
    clearSnapshots,
    getDiff,
    formatValue,
  };
}
