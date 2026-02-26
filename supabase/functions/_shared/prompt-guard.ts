// ============================================
// Lightweight Prompt Injection Protection
// Input sanitization + suspicious pattern detection
// ============================================

// ---- Types ----

export interface SanitizeResult {
  sanitizedMessage: string;
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  flaggedPatterns: string[];
  wasTruncated: boolean;
  originalLength: number;
}

// ---- Constants ----

const MAX_INPUT_LENGTH = 10_000;

// Patterns that indicate prompt injection attempts
const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; label: string; severity: 'low' | 'medium' | 'high' }> = [
  // Direct instruction override
  { pattern: /ignore\s+(all\s+)?previous\s+instructions/gi, label: 'instruction_override', severity: 'high' },
  { pattern: /disregard\s+(all\s+)?prior\s+(instructions|context)/gi, label: 'instruction_override', severity: 'high' },
  { pattern: /forget\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|context)/gi, label: 'instruction_override', severity: 'high' },

  // System prompt extraction
  { pattern: /system\s*prompt\s*:/gi, label: 'prompt_extraction', severity: 'high' },
  { pattern: /show\s+(me\s+)?(your|the)\s+system\s+(prompt|instructions)/gi, label: 'prompt_extraction', severity: 'high' },
  { pattern: /repeat\s+(your\s+)?initial\s+(instructions|prompt)/gi, label: 'prompt_extraction', severity: 'medium' },
  { pattern: /what\s+(are|is)\s+your\s+(system\s+)?(instructions|prompt|rules)/gi, label: 'prompt_extraction', severity: 'medium' },

  // Role hijacking
  { pattern: /you\s+are\s+now\s+(a|an|the)/gi, label: 'role_hijack', severity: 'high' },
  { pattern: /act\s+as\s+(a|an|the)\s+(different|new)/gi, label: 'role_hijack', severity: 'medium' },
  { pattern: /ADMIN\s*MODE/gi, label: 'role_hijack', severity: 'high' },
  { pattern: /DAN\s*mode/gi, label: 'role_hijack', severity: 'high' },
  { pattern: /jailbreak/gi, label: 'jailbreak', severity: 'high' },
  { pattern: /developer\s*mode\s*(enabled|on|active)/gi, label: 'role_hijack', severity: 'high' },

  // Delimiter injection
  { pattern: /```system/gi, label: 'delimiter_injection', severity: 'medium' },
  { pattern: /\[SYSTEM\]/gi, label: 'delimiter_injection', severity: 'medium' },
  { pattern: /<\/?system>/gi, label: 'delimiter_injection', severity: 'medium' },

  // Data exfiltration attempts
  { pattern: /output\s+(all|every)\s+(data|information|context)/gi, label: 'data_exfil', severity: 'medium' },
  { pattern: /list\s+(all\s+)?(api|secret)\s*keys/gi, label: 'data_exfil', severity: 'high' },

  // Vietnamese injection patterns
  { pattern: /bỏ\s+qua\s+(tất\s+cả\s+)?(hướng\s+dẫn|chỉ\s+thị)\s+trước/gi, label: 'instruction_override_vi', severity: 'high' },
  { pattern: /bạn\s+bây\s+giờ\s+là/gi, label: 'role_hijack_vi', severity: 'medium' },
];

// ---- Public API ----

/**
 * Sanitize user input message.
 * Returns sanitized message with risk assessment.
 */
export function sanitizeInput(message: string): SanitizeResult {
  const originalLength = message.length;
  let sanitized = message;
  let wasTruncated = false;
  const flaggedPatterns: string[] = [];

  // 1. Length check
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_INPUT_LENGTH);
    wasTruncated = true;
  }

  // 2. Pattern detection (detect but DON'T strip — just flag)
  let maxSeverity: 'none' | 'low' | 'medium' | 'high' = 'none';

  for (const { pattern, label, severity } of DANGEROUS_PATTERNS) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    if (pattern.test(sanitized)) {
      flaggedPatterns.push(label);
      if (severity === 'high') maxSeverity = 'high';
      else if (severity === 'medium' && maxSeverity !== 'high') maxSeverity = 'medium';
      else if (severity === 'low' && maxSeverity === 'none') maxSeverity = 'low';
    }
  }

  // 3. For high severity: strip the dangerous patterns
  if (maxSeverity === 'high') {
    for (const { pattern, severity } of DANGEROUS_PATTERNS) {
      if (severity === 'high') {
        pattern.lastIndex = 0;
        sanitized = sanitized.replace(pattern, '[removed]');
      }
    }
  }

  return {
    sanitizedMessage: sanitized.trim(),
    riskLevel: maxSeverity,
    flaggedPatterns,
    wasTruncated,
    originalLength,
  };
}

/**
 * Log suspicious input to database for analysis.
 * Fire-and-forget — never blocks the main flow.
 */
export async function logSecurityEvent(
  supabase: any,
  userId: string | undefined,
  organizationId: string | undefined,
  result: SanitizeResult
): Promise<void> {
  if (result.riskLevel === 'none') return;

  try {
    await supabase.from('security_events').insert({
      user_id: userId || null,
      organization_id: organizationId || null,
      event_type: 'prompt_injection_attempt',
      risk_level: result.riskLevel,
      flagged_patterns: result.flaggedPatterns,
      original_length: result.originalLength,
      was_truncated: result.wasTruncated,
      details: {
        pattern_count: result.flaggedPatterns.length,
      },
    });
  } catch (err) {
    console.warn('[PromptGuard] Failed to log security event:', err);
  }
}
