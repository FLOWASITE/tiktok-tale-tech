import { useMemo } from 'react';
import { ContentGoal, ContentAngle, ContentRole } from '@/types/multichannel';

// ============================================
// TYPES
// ============================================

export interface StrategyConflict {
  type: 'goal_role' | 'angle_role' | 'goal_angle';
  severity: 'warning' | 'error';
  field1: string;
  field2: string;
  message: string;
  recommendation: string;
}

export interface StrategyValidationResult {
  isValid: boolean;
  conflicts: StrategyConflict[];
  suggestedRole: ContentRole | null;
  hasErrors: boolean;
  hasWarnings: boolean;
  conflictLevel: 'none' | 'warning' | 'severe';
  scorePenalty: number;
}

// ============================================
// CONFLICT MAPPINGS (Mirrored from backend)
// ============================================

const GOAL_ROLE_CONFLICTS: Record<string, StrategyConflict> = {
  'conversion_seed': {
    type: 'goal_role',
    severity: 'error',
    field1: 'conversion',
    field2: 'seed',
    message: 'Goal "Chuyển đổi" cần CTA mạnh, nhưng Seed không push conversion',
    recommendation: 'Nên chọn Harvest để có CTA mạnh, hoặc đổi Goal sang Awareness',
  },
  'conversion_sprout': {
    type: 'goal_role',
    severity: 'warning',
    field1: 'conversion',
    field2: 'sprout',
    message: 'Goal "Chuyển đổi" nên có CTA mạnh hơn Sprout',
    recommendation: 'Sprout phù hợp để build trust, cân nhắc Harvest nếu cần conversion ngay',
  },
  'awareness_harvest': {
    type: 'goal_role',
    severity: 'error',
    field1: 'awareness',
    field2: 'harvest',
    message: 'Goal "Nhận diện" cần soft-sell, nhưng Harvest có CTA mạnh gây khó chịu',
    recommendation: 'Nên chọn Seed cho awareness, hoặc đổi Goal sang Conversion',
  },
  'education_harvest': {
    type: 'goal_role',
    severity: 'warning',
    field1: 'education',
    field2: 'harvest',
    message: 'Goal "Giáo dục" nên chia sẻ giá trị, Harvest quá pushy',
    recommendation: 'Sprout phù hợp hơn cho education content',
  },
  'engagement_harvest': {
    type: 'goal_role',
    severity: 'warning',
    field1: 'engagement',
    field2: 'harvest',
    message: 'Goal "Tương tác" cần discussion, Harvest quá tập trung conversion',
    recommendation: 'Sprout hoặc Seed phù hợp hơn để encourage discussion',
  },
};

const ANGLE_ROLE_CONFLICTS: Record<string, StrategyConflict> = {
  'promotional_seed': {
    type: 'angle_role',
    severity: 'error',
    field1: 'promotional',
    field2: 'seed',
    message: 'Góc "Quảng cáo" cần CTA rõ, nhưng Seed không có selling intent',
    recommendation: 'Harvest phù hợp nhất cho promotional content',
  },
  'promotional_sprout': {
    type: 'angle_role',
    severity: 'warning',
    field1: 'promotional',
    field2: 'sprout',
    message: 'Góc "Quảng cáo" nên có CTA mạnh hơn Sprout',
    recommendation: 'Cân nhắc Harvest để maximize conversion',
  },
  'educational_harvest': {
    type: 'angle_role',
    severity: 'warning',
    field1: 'educational',
    field2: 'harvest',
    message: 'Góc "Kiến thức" nên chia sẻ giá trị, Harvest quá pushy',
    recommendation: 'Sprout phù hợp nhất cho educational content',
  },
  'storytelling_harvest': {
    type: 'angle_role',
    severity: 'warning',
    field1: 'storytelling',
    field2: 'harvest',
    message: 'Góc "Kể chuyện" cần emotional flow, Harvest gián đoạn narrative',
    recommendation: 'Seed hoặc Sprout giữ emotional connection tốt hơn',
  },
  'behind_the_scenes_harvest': {
    type: 'angle_role',
    severity: 'warning',
    field1: 'behind_the_scenes',
    field2: 'harvest',
    message: 'Góc "Hậu trường" cần authenticity, Harvest có thể perceived as fake',
    recommendation: 'Seed phù hợp nhất cho behind-the-scenes',
  },
};

const GOAL_ANGLE_CONFLICTS: Record<string, StrategyConflict> = {
  'conversion_educational': {
    type: 'goal_angle',
    severity: 'warning',
    field1: 'conversion',
    field2: 'educational',
    message: 'Goal "Chuyển đổi" + Góc "Kiến thức" có thể conflict intent',
    recommendation: 'Ensure educational content still leads to clear CTA',
  },
  'awareness_promotional': {
    type: 'goal_angle',
    severity: 'warning',
    field1: 'awareness',
    field2: 'promotional',
    message: 'Goal "Nhận diện" + Góc "Quảng cáo" có thể quá aggressive cho cold audience',
    recommendation: 'Consider softer approach or change goal to Conversion',
  },
};

// ============================================
// SUGGESTED ROLE MAPPINGS
// ============================================

const ANGLE_ROLE_MAP: Record<ContentAngle, ContentRole> = {
  educational: 'sprout',
  storytelling: 'seed',
  promotional: 'harvest',
  social_proof: 'sprout',
  behind_the_scenes: 'seed',
  qa_faq: 'sprout',
};

const GOAL_ROLE_MAP: Record<ContentGoal, ContentRole> = {
  awareness: 'seed',
  education: 'sprout',
  expertise: 'sprout',
  engagement: 'sprout',
  conversion: 'harvest',
};

// ============================================
// HOOK
// ============================================

export function useStrategyValidation(
  goal?: ContentGoal,
  angle?: ContentAngle,
  role?: ContentRole
): StrategyValidationResult {
  return useMemo(() => {
    const conflicts: StrategyConflict[] = [];
    
    // Check Goal + Role conflicts
    if (goal && role) {
      const goalRoleKey = `${goal}_${role}`;
      if (GOAL_ROLE_CONFLICTS[goalRoleKey]) {
        conflicts.push(GOAL_ROLE_CONFLICTS[goalRoleKey]);
      }
    }
    
    // Check Angle + Role conflicts
    if (angle && role) {
      const angleRoleKey = `${angle}_${role}`;
      if (ANGLE_ROLE_CONFLICTS[angleRoleKey]) {
        conflicts.push(ANGLE_ROLE_CONFLICTS[angleRoleKey]);
      }
    }
    
    // Check Goal + Angle conflicts
    if (goal && angle) {
      const goalAngleKey = `${goal}_${angle}`;
      if (GOAL_ANGLE_CONFLICTS[goalAngleKey]) {
        conflicts.push(GOAL_ANGLE_CONFLICTS[goalAngleKey]);
      }
    }
    
    // Calculate results
    const hasErrors = conflicts.some(c => c.severity === 'error');
    const hasWarnings = conflicts.some(c => c.severity === 'warning');
    
    // Determine suggested role (angle takes priority)
    let suggestedRole: ContentRole | null = null;
    if (angle && ANGLE_ROLE_MAP[angle]) {
      suggestedRole = ANGLE_ROLE_MAP[angle];
    } else if (goal && GOAL_ROLE_MAP[goal]) {
      suggestedRole = GOAL_ROLE_MAP[goal];
    }
    
    return {
      isValid: conflicts.length === 0,
      conflicts,
      suggestedRole,
      hasErrors,
      hasWarnings,
      conflictLevel: hasErrors ? 'severe' : hasWarnings ? 'warning' : 'none',
      scorePenalty: hasErrors ? 10 : hasWarnings ? 5 : 0,
    };
  }, [goal, angle, role]);
}

// Export mappings for use in other components
export { GOAL_ROLE_MAP, ANGLE_ROLE_MAP };
