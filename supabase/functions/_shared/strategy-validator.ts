/**
 * Strategy Validation Layer
 * 
 * Ensures consistency between Content Goal, Content Angle, and Content Role (Seed/Sprout/Harvest).
 * Detects conflicts and provides prompt adjustments to compensate.
 */

// Strategy types
export type ContentGoal = 'education' | 'awareness' | 'engagement' | 'expertise' | 'conversion';
export type ContentAngle = 'educational' | 'storytelling' | 'promotional' | 'social_proof' | 'behind_the_scenes' | 'qa_faq';
export type ContentRole = 'seed' | 'sprout' | 'harvest';

// Validation result
export interface StrategyValidationResult {
  isValid: boolean;
  conflicts: StrategyConflict[];
  suggestedRole: ContentRole | null;
  scorePenalty: number;  // 0-15 points penalty to apply to Self-Critique
  promptAdjustments: string;  // Additional instructions to inject into prompt
  conflictLevel: 'none' | 'warning' | 'severe';
}

export interface StrategyConflict {
  type: 'goal_role' | 'angle_role' | 'goal_angle';
  severity: 'warning' | 'error';
  field1: string;
  field2: string;
  message: string;
  recommendation: string;
}

// ============================================
// CONFLICT MAPPINGS
// ============================================

// GOAL + ROLE Conflicts
const GOAL_ROLE_CONFLICTS: Record<string, StrategyConflict> = {
  // HIGH-INTENT GOAL + LOW-INTENT ROLE
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
  
  // LOW-INTENT GOAL + HIGH-INTENT ROLE
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

// ANGLE + ROLE Conflicts
const ANGLE_ROLE_CONFLICTS: Record<string, StrategyConflict> = {
  // PROMOTIONAL ANGLE + LOW-INTENT ROLE
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
  
  // EDUCATIONAL ANGLE + HIGH-INTENT ROLE
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

// GOAL + ANGLE Conflicts (Less common but possible)
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
// MAIN VALIDATION FUNCTION
// ============================================

export function validateStrategy(
  goal: ContentGoal | string | undefined,
  angle: ContentAngle | string | undefined,
  role: ContentRole | string | undefined
): StrategyValidationResult {
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
  
  // Calculate penalty and conflict level
  const hasError = conflicts.some(c => c.severity === 'error');
  const hasWarning = conflicts.some(c => c.severity === 'warning');
  
  const scorePenalty = hasError ? 10 : hasWarning ? 5 : 0;
  const conflictLevel: 'none' | 'warning' | 'severe' = hasError ? 'severe' : hasWarning ? 'warning' : 'none';
  
  // Determine suggested role based on goal + angle
  const suggestedRole = getSuggestedRole(goal as ContentGoal, angle as ContentAngle);
  
  // Build prompt adjustments to compensate for conflicts
  const promptAdjustments = buildPromptAdjustments(conflicts);
  
  return {
    isValid: conflicts.length === 0,
    conflicts,
    suggestedRole,
    scorePenalty,
    promptAdjustments,
    conflictLevel,
  };
}

function getSuggestedRole(goal?: ContentGoal, angle?: ContentAngle): ContentRole | null {
  // Angle takes priority over Goal
  if (angle && ANGLE_ROLE_MAP[angle]) {
    return ANGLE_ROLE_MAP[angle];
  }
  
  if (goal && GOAL_ROLE_MAP[goal]) {
    return GOAL_ROLE_MAP[goal];
  }
  
  return null;
}

function buildPromptAdjustments(conflicts: StrategyConflict[]): string {
  if (conflicts.length === 0) return '';
  
  const adjustments: string[] = [
    '\n## ⚠️ STRATEGY CONFLICT DETECTED - ADJUST GENERATION:',
  ];
  
  for (const conflict of conflicts) {
    adjustments.push(`- ${conflict.message}`);
    
    // Add specific compensation instructions
    if (conflict.type === 'goal_role') {
      if (conflict.field1 === 'conversion' && conflict.field2 === 'seed') {
        adjustments.push('  → Ensure AT LEAST soft CTA despite Seed role');
        adjustments.push('  → Include problem/benefit framing that leads to solution');
      }
      if (conflict.field1 === 'conversion' && conflict.field2 === 'sprout') {
        adjustments.push('  → Add stronger CTA than typical Sprout content');
        adjustments.push('  → Balance trust-building with clear next steps');
      }
      if (conflict.field1 === 'awareness' && conflict.field2 === 'harvest') {
        adjustments.push('  → Soften CTA language - use "Tìm hiểu thêm" instead of "Mua ngay"');
        adjustments.push('  → Add more storytelling/value before CTA');
      }
      if (conflict.field1 === 'education' && conflict.field2 === 'harvest') {
        adjustments.push('  → Balance: 70% value, 30% CTA');
        adjustments.push('  → Frame CTA as "next step in learning journey"');
      }
      if (conflict.field1 === 'engagement' && conflict.field2 === 'harvest') {
        adjustments.push('  → Include discussion questions despite Harvest role');
        adjustments.push('  → End with engagement CTA, not just sales CTA');
      }
    }
    
    if (conflict.type === 'angle_role') {
      if (conflict.field1 === 'promotional' && conflict.field2 === 'seed') {
        adjustments.push('  → Focus on problem awareness rather than product push');
        adjustments.push('  → Mention benefits subtly, save hard sell for later');
      }
      if (conflict.field1 === 'promotional' && conflict.field2 === 'sprout') {
        adjustments.push('  → Add testimonials/proof to justify promotional angle');
        adjustments.push('  → Build trust before presenting offer');
      }
      if (conflict.field1 === 'educational' && conflict.field2 === 'harvest') {
        adjustments.push('  → Lead with value, end with CTA as natural next step');
        adjustments.push('  → Frame product as solution to problem taught');
      }
      if (conflict.field1 === 'storytelling' && conflict.field2 === 'harvest') {
        adjustments.push('  → Weave CTA into story conclusion naturally');
        adjustments.push('  → Use story climax to introduce solution');
      }
      if (conflict.field1 === 'behind_the_scenes' && conflict.field2 === 'harvest') {
        adjustments.push('  → Keep authentic tone, add CTA as "if you want more..."');
        adjustments.push('  → Avoid hard sell that breaks authenticity');
      }
    }
    
    if (conflict.type === 'goal_angle') {
      if (conflict.field1 === 'conversion' && conflict.field2 === 'educational') {
        adjustments.push('  → End educational content with clear action step');
        adjustments.push('  → Position product/service as next logical step');
      }
      if (conflict.field1 === 'awareness' && conflict.field2 === 'promotional') {
        adjustments.push('  → Soften promotional language for cold audience');
        adjustments.push('  → Focus on problem, hint at solution without hard push');
      }
    }
  }
  
  return adjustments.join('\n');
}

// ============================================
// EXPORTS FOR FRONTEND USE
// ============================================

export {
  GOAL_ROLE_CONFLICTS,
  ANGLE_ROLE_CONFLICTS,
  GOAL_ANGLE_CONFLICTS,
  ANGLE_ROLE_MAP,
  GOAL_ROLE_MAP,
};
