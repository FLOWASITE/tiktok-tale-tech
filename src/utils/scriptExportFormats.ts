import { ParsedPrompt } from './parsePrompts';
import { Script, VIDEO_TYPE_LABELS, CHARACTER_TYPE_LABELS, DURATION_LABELS } from '@/types/script';

// ============================================
// VEO 3 EXPORT FORMAT
// ============================================

export interface VEO3Prompt {
  promptNumber: number;
  timestamp: string;
  visualDirection: {
    shot: string;
    camera: string;
    lighting: string;
    background: string;
  };
  characterAction: string;
  dialogue: string;
  toneDelivery: string;
  audioNotes: {
    ambience: string;
    sfx: string;
    musicMood: string;
  };
  textOverlay?: string;
}

export interface MinimaxPrompt {
  promptNumber: number;
  visualPrompt: string;
  cameraMotion: string;
  dialogue: string;
}

// Shot types for VEO 3
export const SHOT_TYPES = {
  wide: 'Wide shot (24mm)',
  medium: 'Medium shot (35mm)',
  closeUp: 'Close-up (50mm)',
  extremeCloseUp: 'Extreme close-up (85mm)',
  pov: 'POV shot',
  overShoulder: 'Over-the-shoulder',
} as const;

// Camera movements for VEO 3
export const CAMERA_MOVEMENTS = {
  static: 'Static with subtle breathing movement',
  panLeft: 'Slow pan left',
  panRight: 'Slow pan right',
  tiltUp: 'Gentle tilt up',
  tiltDown: 'Gentle tilt down',
  dollyIn: 'Slow dolly in',
  dollyOut: 'Slow dolly out',
  handheld: 'Handheld documentary style',
  orbit: 'Slow orbit around subject',
} as const;

// Lighting setups for VEO 3
export const LIGHTING_SETUPS = {
  naturalDaylight: 'Soft natural daylight from window',
  studioSoft: 'Soft studio lighting, three-point setup',
  dramaticSide: 'Dramatic side lighting with shadows',
  backlit: 'Backlit with rim light',
  goldenHour: 'Golden hour warm lighting',
  lowKey: 'Low-key moody lighting',
  highKey: 'High-key bright and clean',
} as const;

// Background styles based on video type
export const VIDEO_TYPE_BACKGROUNDS: Record<string, string> = {
  expert_share: 'Modern minimalist office, slightly blurred',
  tutorial_howto: 'Clean workspace with relevant props',
  analyze_explain: 'Professional studio background',
  listicle: 'Neutral backdrop, focus on speaker',
  warning_mistake: 'Simple professional background',
  quick_qa: 'Casual home office setting',
  myth_busting: 'Clean studio with subtle props',
  before_after: 'Relevant context background',
  story_pov: 'Cinematic location-based background',
  day_in_life: 'Natural environment, various locations',
  behind_scenes: 'Raw workspace or production area',
  reaction: 'Casual setup with visible screen/content',
  product_review: 'Clean table setup with product visible',
  case_study: 'Professional office environment',
  transformation: 'Before/after split or timeline visual',
};

/**
 * Calculate timestamp for a prompt based on duration and prompt count
 */
export function calculateTimestamp(promptNumber: number, totalPrompts: number, totalDuration: number): string {
  const promptDuration = totalDuration / totalPrompts;
  const startTime = (promptNumber - 1) * promptDuration;
  const endTime = promptNumber * promptDuration;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return `${formatTime(startTime)}-${formatTime(endTime)}`;
}

/**
 * Convert parsed prompts to VEO 3 format
 */
export function formatForVEO3(
  prompts: ParsedPrompt[], 
  script: Script
): VEO3Prompt[] {
  const totalPrompts = prompts.length;
  const background = VIDEO_TYPE_BACKGROUNDS[script.video_type] || 'Professional studio background';
  
  return prompts.map((prompt) => {
    const timestamp = calculateTimestamp(prompt.promptNumber, totalPrompts, script.duration);
    
    return {
      promptNumber: prompt.promptNumber,
      timestamp,
      visualDirection: {
        shot: prompt.shotType || SHOT_TYPES.medium,
        camera: prompt.cameraMovement || CAMERA_MOVEMENTS.static,
        lighting: prompt.lighting || LIGHTING_SETUPS.naturalDaylight,
        background: prompt.background || background,
      },
      characterAction: prompt.motion || prompt.characterAction || '',
      dialogue: prompt.dialogue,
      toneDelivery: prompt.tone || '',
      audioNotes: {
        ambience: prompt.ambience || 'Quiet ambient sound',
        sfx: prompt.sfx || 'None',
        musicMood: prompt.musicMood || 'Subtle background',
      },
      textOverlay: prompt.textOverlay,
    };
  });
}

/**
 * Export VEO 3 prompts as formatted text
 */
export function exportVEO3Text(veo3Prompts: VEO3Prompt[], options?: {
  includeTimestamp?: boolean;
  includeAudio?: boolean;
  includeTextOverlay?: boolean;
}): string {
  const {
    includeTimestamp = true,
    includeAudio = true,
    includeTextOverlay = true,
  } = options || {};

  return veo3Prompts.map((prompt) => {
    const parts: string[] = [];
    
    // Header
    if (includeTimestamp) {
      parts.push(`PROMPT ${prompt.promptNumber} [${prompt.timestamp}]:`);
    } else {
      parts.push(`PROMPT ${prompt.promptNumber}:`);
    }
    parts.push('');
    
    // Visual Direction
    parts.push('[VISUAL DIRECTION]');
    parts.push(`• Shot: ${prompt.visualDirection.shot}`);
    parts.push(`• Camera: ${prompt.visualDirection.camera}`);
    parts.push(`• Lighting: ${prompt.visualDirection.lighting}`);
    parts.push(`• Background: ${prompt.visualDirection.background}`);
    parts.push('');
    
    // Character Action
    parts.push('[CHARACTER ACTION]');
    parts.push(`(${prompt.characterAction})`);
    parts.push('');
    
    // Dialogue
    parts.push('[DIALOGUE - Verbatim for Minimax]');
    parts.push(`"${prompt.dialogue}"`);
    parts.push('');
    
    // Tone & Delivery
    parts.push('[TONE & DELIVERY]');
    parts.push(prompt.toneDelivery);
    parts.push('');
    
    // Audio Notes
    if (includeAudio) {
      parts.push('[AUDIO NOTES - For VEO 3]');
      parts.push(`• Ambience: ${prompt.audioNotes.ambience}`);
      parts.push(`• SFX: ${prompt.audioNotes.sfx}`);
      parts.push(`• Music mood: ${prompt.audioNotes.musicMood}`);
      parts.push('');
    }
    
    // Text Overlay
    if (includeTextOverlay && prompt.textOverlay) {
      parts.push('[TEXT OVERLAY]');
      parts.push(`"${prompt.textOverlay}"`);
      parts.push('');
    }
    
    return parts.join('\n');
  }).join('\n' + '─'.repeat(50) + '\n\n');
}

/**
 * Export only visual prompts for VEO 3 (without dialogue)
 */
export function exportVEO3VisualOnly(veo3Prompts: VEO3Prompt[]): string {
  return veo3Prompts.map((prompt) => {
    const parts: string[] = [];
    
    parts.push(`SCENE ${prompt.promptNumber} [${prompt.timestamp}]:`);
    parts.push('');
    parts.push(`Shot: ${prompt.visualDirection.shot}`);
    parts.push(`Camera: ${prompt.visualDirection.camera}`);
    parts.push(`Lighting: ${prompt.visualDirection.lighting}`);
    parts.push(`Background: ${prompt.visualDirection.background}`);
    parts.push('');
    parts.push(`Action: ${prompt.characterAction}`);
    parts.push('');
    parts.push(`Audio: ${prompt.audioNotes.ambience}`);
    if (prompt.audioNotes.sfx !== 'None') {
      parts.push(`SFX: ${prompt.audioNotes.sfx}`);
    }
    
    return parts.join('\n');
  }).join('\n\n' + '═'.repeat(40) + '\n\n');
}

// ============================================
// MINIMAX/HAILUO EXPORT FORMAT
// ============================================

// Camera motion syntax for Minimax
export const MINIMAX_CAMERA_MOTIONS = {
  static: '[Static shot]',
  panLeft: '[Pan left]',
  panRight: '[Pan right]',
  tiltUp: '[Tilt up]',
  tiltDown: '[Tilt down]',
  zoomIn: '[Zoom in]',
  zoomOut: '[Zoom out]',
  pedestalUp: '[Pedestal up]',
  pedestalDown: '[Pedestal down]',
  dollyIn: '[Dolly in]',
  dollyOut: '[Dolly out]',
  tracking: '[Tracking shot]',
} as const;

/**
 * Map camera movement to Minimax syntax
 */
function mapToMinimaxCamera(cameraMovement: string): string {
  const movement = cameraMovement.toLowerCase();
  if (movement.includes('pan left')) return MINIMAX_CAMERA_MOTIONS.panLeft;
  if (movement.includes('pan right')) return MINIMAX_CAMERA_MOTIONS.panRight;
  if (movement.includes('tilt up')) return MINIMAX_CAMERA_MOTIONS.tiltUp;
  if (movement.includes('tilt down')) return MINIMAX_CAMERA_MOTIONS.tiltDown;
  if (movement.includes('dolly in') || movement.includes('zoom in')) return MINIMAX_CAMERA_MOTIONS.dollyIn;
  if (movement.includes('dolly out') || movement.includes('zoom out')) return MINIMAX_CAMERA_MOTIONS.dollyOut;
  if (movement.includes('orbit') || movement.includes('tracking')) return MINIMAX_CAMERA_MOTIONS.tracking;
  return MINIMAX_CAMERA_MOTIONS.static;
}

/**
 * Convert parsed prompts to Minimax/Hailuo format
 */
export function formatForMinimax(prompts: ParsedPrompt[], script: Script): MinimaxPrompt[] {
  const background = VIDEO_TYPE_BACKGROUNDS[script.video_type] || 'Professional studio';
  
  return prompts.map((prompt) => {
    const cameraMotion = mapToMinimaxCamera(prompt.cameraMovement || '');
    const shot = prompt.shotType || 'Medium shot';
    
    // Build visual prompt for Minimax
    const visualParts: string[] = [];
    visualParts.push(`${shot}, ${background}`);
    if (prompt.motion || prompt.characterAction) {
      visualParts.push(`Person ${prompt.motion || prompt.characterAction}`);
    }
    visualParts.push(prompt.lighting || 'Soft natural lighting');
    
    return {
      promptNumber: prompt.promptNumber,
      visualPrompt: visualParts.join('. '),
      cameraMotion,
      dialogue: prompt.dialogue,
    };
  });
}

/**
 * Export Minimax prompts as formatted text
 */
export function exportMinimaxText(minimaxPrompts: MinimaxPrompt[]): string {
  return minimaxPrompts.map((prompt) => {
    return [
      `CLIP ${prompt.promptNumber}:`,
      '',
      `[VISUAL]`,
      `${prompt.visualPrompt} ${prompt.cameraMotion}`,
      '',
      `[AUDIO/VOICE]`,
      `"${prompt.dialogue}"`,
    ].join('\n');
  }).join('\n\n' + '─'.repeat(40) + '\n\n');
}

/**
 * Export only visual prompts for Minimax (for video generation)
 */
export function exportMinimaxVisualOnly(minimaxPrompts: MinimaxPrompt[]): string {
  return minimaxPrompts.map((prompt) => {
    return `CLIP ${prompt.promptNumber}: ${prompt.visualPrompt} ${prompt.cameraMotion}`;
  }).join('\n\n');
}

// ============================================
// CLEAN DIALOGUE EXPORT
// ============================================

export interface DialogueExportOptions {
  separator?: 'newline' | 'paragraph' | 'numbered';
  includePromptNumber?: boolean;
  joinAll?: boolean;
}

/**
 * Export only dialogue/text from prompts
 */
export function exportCleanDialogue(prompts: ParsedPrompt[], options?: DialogueExportOptions): string {
  const {
    separator = 'numbered',
    includePromptNumber = true,
    joinAll = false,
  } = options || {};

  if (joinAll) {
    return prompts.map(p => p.dialogue).join(' ');
  }

  return prompts.map((prompt) => {
    const dialogue = prompt.dialogue;
    
    switch (separator) {
      case 'numbered':
        return includePromptNumber 
          ? `[${prompt.promptNumber}] ${dialogue}`
          : dialogue;
      case 'paragraph':
        return includePromptNumber 
          ? `ĐOẠN ${prompt.promptNumber}:\n${dialogue}`
          : dialogue;
      case 'newline':
      default:
        return dialogue;
    }
  }).join(separator === 'paragraph' ? '\n\n' : '\n');
}

/**
 * Export dialogue with timing for TTS
 */
export function exportDialogueWithTiming(prompts: ParsedPrompt[], totalDuration: number): string {
  const totalPrompts = prompts.length;
  
  return prompts.map((prompt) => {
    const timestamp = calculateTimestamp(prompt.promptNumber, totalPrompts, totalDuration);
    return `[${timestamp}]\n${prompt.dialogue}`;
  }).join('\n\n');
}

/**
 * Export as per-prompt separate files content
 */
export function exportPerPromptDialogue(prompts: ParsedPrompt[]): Array<{ filename: string; content: string }> {
  return prompts.map((prompt) => ({
    filename: `prompt_${prompt.promptNumber.toString().padStart(2, '0')}.txt`,
    content: prompt.dialogue,
  }));
}

// ============================================
// LEGACY/STANDARD EXPORTS
// ============================================

/**
 * Export as plain TXT
 */
export function exportTXT(script: Script): string {
  const lines = [
    script.title,
    '='.repeat(50),
    '',
    `Chủ đề: ${script.topic}`,
    `Thời lượng: ${DURATION_LABELS[script.duration as keyof typeof DURATION_LABELS]}`,
    `Thể loại: ${VIDEO_TYPE_LABELS[script.video_type as keyof typeof VIDEO_TYPE_LABELS]}`,
    `Nhân vật: ${CHARACTER_TYPE_LABELS[script.character_type as keyof typeof CHARACTER_TYPE_LABELS]}`,
    '',
    '='.repeat(50),
    '',
    script.content,
  ];
  
  return lines.join('\n');
}

/**
 * Export as Word-compatible HTML
 */
export function exportWordHTML(script: Script): string {
  return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${script.title}</title></head>
      <body>
        <h1>${script.title}</h1>
        <hr/>
        <p><strong>Chủ đề:</strong> ${script.topic}</p>
        <p><strong>Thời lượng:</strong> ${DURATION_LABELS[script.duration as keyof typeof DURATION_LABELS]}</p>
        <p><strong>Thể loại:</strong> ${VIDEO_TYPE_LABELS[script.video_type as keyof typeof VIDEO_TYPE_LABELS]}</p>
        <p><strong>Nhân vật:</strong> ${CHARACTER_TYPE_LABELS[script.character_type as keyof typeof CHARACTER_TYPE_LABELS]}</p>
        <hr/>
        <pre style="font-family: Arial; white-space: pre-wrap;">${script.content}</pre>
      </body>
    </html>
  `;
}

// ============================================
// DOWNLOAD HELPERS
// ============================================

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
}

/**
 * Export VEO 3 as JSON
 */
export function exportVEO3JSON(veo3Prompts: VEO3Prompt[], script: Script): string {
  return JSON.stringify({
    metadata: {
      title: script.title,
      topic: script.topic,
      duration: script.duration,
      videoType: script.video_type,
      characterType: script.character_type,
      exportedAt: new Date().toISOString(),
      format: 'VEO 3',
    },
    prompts: veo3Prompts,
  }, null, 2);
}
