/**
 * Persona Fit Scoring Types
 * 
 * Frontend types for persona alignment scoring system.
 */

// ============================================
// CORE TYPES
// ============================================

export interface PersonaFitResult {
  overallScore: number;  // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: PersonaFitBreakdown;
  matchedElements: PersonaMatchedElements;
  suggestions: string[];
  personaName: string;
  personaId: string;
}

export interface PersonaFitBreakdown {
  painPointsScore: number;      // 0-30
  desiresScore: number;         // 0-25
  communicationScore: number;   // 0-20
  objectionsScore: number;      // 0-15
  triggersScore: number;        // 0-10
}

export interface PersonaMatchedElements {
  painPointsAddressed: string[];
  desiresReferenced: string[];
  objectionsHandled: string[];
  triggersUsed: string[];
  toneMatch: boolean;
}

export interface MultiChannelPersonaFitResult {
  averageScore: number;
  averageGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  channelScores: Record<string, PersonaFitResult>;
  topSuggestions: string[];
  overallMatchedElements: PersonaMatchedElements;
}

// ============================================
// CONSTANTS
// ============================================

export const PERSONA_FIT_WEIGHTS = {
  painPoints: 30,
  desires: 25,
  communication: 20,
  objections: 15,
  triggers: 10,
} as const;

export const GRADE_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  A: { label: 'Xuất sắc', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  B: { label: 'Tốt', color: 'text-green-600', bgColor: 'bg-green-500/10' },
  C: { label: 'Khá', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
  D: { label: 'Trung bình', color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
  F: { label: 'Cần cải thiện', color: 'text-red-600', bgColor: 'bg-red-500/10' },
};

export const DIMENSION_LABELS: Record<keyof PersonaFitBreakdown, string> = {
  painPointsScore: 'Pain Points',
  desiresScore: 'Mong muốn',
  communicationScore: 'Phong cách',
  objectionsScore: 'Objections',
  triggersScore: 'Triggers',
};

// ============================================
// HELPERS
// ============================================

export function getGradeInfo(grade: string) {
  return GRADE_LABELS[grade] || GRADE_LABELS.F;
}

export function getDimensionProgress(score: number, maxScore: number): number {
  return Math.round((score / maxScore) * 100);
}

export function formatPersonaFitScore(score: number): string {
  return `${score}/100`;
}
