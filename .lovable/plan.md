
# P0: Strategy Validation Layer (Goal-Angle-Role)

## Mục tiêu
Đảm bảo tính nhất quán của chiến lược nội dung từ lúc user chọn (frontend) đến khi AI generate (backend), với warning UI rõ ràng và scoring adjustment khi có conflict.

---

## 1. Kiến trúc tổng quan

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          STRATEGY FLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  STEP 1 (Topic)         STEP 2 (Core)        STEP 3 (Role)              │
│  ┌─────────────┐        ┌─────────────┐      ┌─────────────┐            │
│  │ ContentGoal │───────▶│ContentAngle │─────▶│ ContentRole │            │
│  │ (education) │        │(educational)│      │  (sprout)   │            │
│  └─────────────┘        └─────────────┘      └─────────────┘            │
│        │                       │                    │                    │
│        ▼                       ▼                    ▼                    │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │           STRATEGY VALIDATION LAYER (NEW)               │            │
│  │  ┌────────────────────────────────────────────────┐     │            │
│  │  │ validateStrategy(goal, angle, role) → Result   │     │            │
│  │  │   - conflicts: [{type, severity, message}]     │     │            │
│  │  │   - suggestedRole: ContentRole                 │     │            │
│  │  │   - scorePenalty: number (0-15)               │     │            │
│  │  │   - adjustedPromptInstructions: string        │     │            │
│  │  └────────────────────────────────────────────────┘     │            │
│  └─────────────────────────────────────────────────────────┘            │
│        │                                                                 │
│        ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │              GENERATE-MULTICHANNEL                       │            │
│  │  - Apply scorePenalty to Self-Critique                  │            │
│  │  - Inject adjustedPromptInstructions                    │            │
│  │  - Log strategy conflicts for analytics                 │            │
│  └─────────────────────────────────────────────────────────┘            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tạo Strategy Validation Utility

**File mới:** `supabase/functions/_shared/strategy-validator.ts`

### 2.1 Types & Interfaces

```typescript
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
```

### 2.2 Conflict Mappings (Complete Matrix)

```typescript
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
```

### 2.3 Validation Logic

```typescript
export function validateStrategy(
  goal: ContentGoal | undefined,
  angle: ContentAngle | undefined,
  role: ContentRole | undefined
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
  const conflictLevel = hasError ? 'severe' : hasWarning ? 'warning' : 'none';
  
  // Determine suggested role based on goal + angle
  const suggestedRole = getSuggestedRole(goal, angle);
  
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
  if (angle) {
    const angleRoleMap: Record<ContentAngle, ContentRole> = {
      educational: 'sprout',
      storytelling: 'seed',
      promotional: 'harvest',
      social_proof: 'sprout',
      behind_the_scenes: 'seed',
      qa_faq: 'sprout',
    };
    return angleRoleMap[angle] || null;
  }
  
  if (goal) {
    const goalRoleMap: Record<ContentGoal, ContentRole> = {
      awareness: 'seed',
      education: 'sprout',
      expertise: 'sprout',
      engagement: 'sprout',
      conversion: 'harvest',
    };
    return goalRoleMap[goal] || null;
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
      if (conflict.field1 === 'awareness' && conflict.field2 === 'harvest') {
        adjustments.push('  → Soften CTA language - use "Tìm hiểu thêm" instead of "Mua ngay"');
        adjustments.push('  → Add more storytelling/value before CTA');
      }
    }
    if (conflict.type === 'angle_role') {
      if (conflict.field1 === 'educational' && conflict.field2 === 'harvest') {
        adjustments.push('  → Balance: 70% value, 30% CTA');
        adjustments.push('  → Frame CTA as "next step in learning journey"');
      }
    }
  }
  
  return adjustments.join('\n');
}
```

---

## 3. Tích hợp vào Generate-Multichannel

**File:** `supabase/functions/generate-multichannel/index.ts`

### 3.1 Import và gọi Validation

```typescript
// Add import
import { validateStrategy, StrategyValidationResult } from '../_shared/strategy-validator.ts';

// In main handler, after parsing formData:
const strategyValidation = validateStrategy(
  formData.contentGoal as ContentGoal,
  formData.contentAngle as ContentAngle,
  formData.contentRole as ContentRole
);

// Log for analytics
if (strategyValidation.conflicts.length > 0) {
  console.log(`[strategy-validation] Detected ${strategyValidation.conflicts.length} conflicts:`,
    strategyValidation.conflicts.map(c => `${c.type}: ${c.field1}-${c.field2}`).join(', '));
}
```

### 3.2 Inject Adjustments vào Prompt

```typescript
// When building system prompt, append adjustments:
if (strategyValidation.promptAdjustments) {
  systemPrompt += strategyValidation.promptAdjustments;
}
```

### 3.3 Apply Penalty to Self-Critique

```typescript
// After running Self-Critique, apply penalty:
if (critiqueResult && strategyValidation.scorePenalty > 0) {
  critiqueResult.overall_score = Math.max(0, critiqueResult.overall_score - strategyValidation.scorePenalty);
  critiqueResult.issues.push({
    category: 'structure',
    severity: strategyValidation.conflictLevel === 'severe' ? 'error' : 'warning',
    description: `Strategy conflict: ${strategyValidation.conflicts.map(c => c.message).join('; ')}`,
  });
  critiqueResult.passed = critiqueResult.overall_score >= CRITIQUE_CONFIG.PASS_THRESHOLD;
}
```

---

## 4. Enhanced Frontend Validation

**File:** `src/components/core-content/RoleSelectorCard.tsx`

### 4.1 Move validation logic to shared hook

**File mới:** `src/hooks/useStrategyValidation.ts`

```typescript
export function useStrategyValidation(
  goal?: ContentGoal,
  angle?: ContentAngle,
  role?: ContentRole
) {
  return useMemo(() => {
    const conflicts = [];
    
    // Same conflict detection logic as backend
    // ... (reuse GOAL_ROLE_CONFLICTS, ANGLE_ROLE_CONFLICTS, GOAL_ANGLE_CONFLICTS)
    
    return {
      isValid: conflicts.length === 0,
      conflicts,
      suggestedRole: getSuggestedRole(goal, angle),
      hasErrors: conflicts.some(c => c.severity === 'error'),
      hasWarnings: conflicts.some(c => c.severity === 'warning'),
    };
  }, [goal, angle, role]);
}
```

### 4.2 Add Block/Confirm Dialog for Severe Conflicts

Trong `MultiChannelFormWizard.tsx`:

```typescript
const strategyValidation = useStrategyValidation(
  formData.contentGoal,
  coreContentAngle === '__none__' ? undefined : coreContentAngle,
  formData.contentRole
);

// Block proceeding with severe conflicts (optional - can be warning only)
const handleSubmit = async () => {
  if (strategyValidation.hasErrors) {
    // Show confirmation dialog
    setShowStrategyConflictDialog(true);
    return;
  }
  // ... proceed with generation
};
```

---

## 5. Strategy Conflict Dialog Component

**File mới:** `src/components/multichannel/StrategyConflictDialog.tsx`

```typescript
export function StrategyConflictDialog({
  open,
  onOpenChange,
  conflicts,
  suggestedRole,
  onConfirm,
  onChangeRole,
}: StrategyConflictDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            Chiến lược có thể không tối ưu
          </AlertDialogTitle>
          <AlertDialogDescription>
            Phát hiện {conflicts.length} conflict trong chiến lược content:
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <ScrollArea className="max-h-[200px]">
          {conflicts.map((conflict, i) => (
            <div key={i} className="p-3 rounded-lg bg-amber-500/10 mb-2">
              <p className="text-sm font-medium text-amber-600">{conflict.message}</p>
              <p className="text-xs text-muted-foreground mt-1">
                → {conflict.recommendation}
              </p>
            </div>
          ))}
        </ScrollArea>

        {suggestedRole && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm">
              Gợi ý: Đổi sang role <strong>{suggestedRole}</strong>
            </span>
            <Button size="sm" variant="outline" onClick={() => onChangeRole(suggestedRole)}>
              Áp dụng
            </Button>
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel>Quay lại sửa</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-amber-500 hover:bg-amber-600"
          >
            Vẫn tiếp tục
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## 6. Response Enhancement

**File:** `supabase/functions/generate-multichannel/index.ts`

### 6.1 Include Strategy Validation in Response

```typescript
// Add to response object:
const response = {
  id: newContent.id,
  // ... existing fields
  strategyValidation: {
    conflicts: strategyValidation.conflicts.map(c => ({
      type: c.type,
      severity: c.severity,
      message: c.message,
    })),
    scorePenalty: strategyValidation.scorePenalty,
    wasAdjusted: strategyValidation.promptAdjustments.length > 0,
  },
  critique_score: critiqueResult?.overall_score,
  critique_details: critiqueResult,
};
```

---

## 7. Chi tiết Implementation Steps

### Phase A: Backend (1-2 ngày)
1. Tạo file `strategy-validator.ts` với full conflict mappings
2. Integrate vào `generate-multichannel/index.ts`:
   - Import và gọi validation
   - Inject prompt adjustments
   - Apply score penalty
3. Add to response schema
4. Deploy và test

### Phase B: Frontend (1 ngày)
1. Tạo hook `useStrategyValidation.ts`
2. Tạo component `StrategyConflictDialog.tsx`
3. Update `MultiChannelFormWizard.tsx` để show dialog khi có severe conflicts
4. Update `RoleSelectorCard.tsx` để sử dụng shared hook

### Phase C: Testing (0.5 ngày)
1. Test các combination conflict
2. Verify score penalty applied correctly
3. Test UI flows with conflicts

---

## 8. Conflict Matrix Summary

| Goal | Angle | Seed | Sprout | Harvest |
|------|-------|------|--------|---------|
| **Awareness** | Any | ✅ Best | ⚠️ OK | ❌ Conflict |
| **Education** | Educational | ✅ OK | ✅ Best | ⚠️ Conflict |
| **Engagement** | Q&A | ✅ OK | ✅ Best | ⚠️ Conflict |
| **Expertise** | Social Proof | ⚠️ OK | ✅ Best | ⚠️ OK |
| **Conversion** | Promotional | ❌ Conflict | ⚠️ OK | ✅ Best |

**Legend:**
- ✅ Best: Optimal combination
- ⚠️ OK/Conflict: Warning, but allowed
- ❌ Conflict: Severe conflict, needs confirmation

---

## 9. Kết quả mong đợi

1. **User Experience:**
   - Clear warnings khi chọn strategy không phù hợp
   - Gợi ý role phù hợp tự động
   - Confirmation dialog cho severe conflicts

2. **Content Quality:**
   - AI nhận prompt adjustments để compensate conflicts
   - Self-Critique score phản ánh đúng strategy alignment
   - Generated content vẫn usable dù có conflict

3. **Analytics:**
   - Log conflicts cho analysis
   - Track which combinations users override
   - Identify common anti-patterns
