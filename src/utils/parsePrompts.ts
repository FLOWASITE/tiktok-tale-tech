import { ScriptPurpose } from '@/types/script';

export interface ParsedPrompt {
  promptNumber: number;
  duration: string;
  motion: string;
  dialogue: string;
  tone: string;
  rawContent: string;
  // VEO 3 enhanced fields
  timestamp?: string;
  shotType?: string;
  cameraMovement?: string;
  lighting?: string;
  background?: string;
  characterAction?: string;
  ambience?: string;
  sfx?: string;
  musicMood?: string;
  textOverlay?: string;
  // Minimax fields
  scene?: string;
  voice?: string;
  cameraMotion?: string;
  // Teleprompter fields
  cue?: string;
  emphasis?: string;
  pause?: string;
  // Voice-over fields
  voiceGuide?: string;
  tempo?: string;
  emotion?: string;
  // Production fields
  camera?: string;
  audio?: string;
  editorNotes?: string;
}

// Get block pattern based on script purpose
function getBlockPattern(purpose?: ScriptPurpose): RegExp {
  switch(purpose) {
    case 'teleprompter':
      return /(?=---\s*ĐOẠN\s*\d+|ĐOẠN\s*\d+)/i;
    case 'production':
      return /(?=SCENE\s*\d+|SHOT\s*\d+)/i;
    default: // ai_video — try PROMPT first, fallback CLIP handled in parseScriptContent
      return /(?=PROMPT\s*\d+|CLIP\s*\d+)/i;
  }
}

// Get block number pattern based on purpose
function getBlockNumberPattern(purpose?: ScriptPurpose): RegExp {
  switch(purpose) {
    case 'teleprompter':
      return /ĐOẠN\s*(\d+)/i;
    case 'production':
      return /(?:SCENE|SHOT)\s*(\d+)/i;
    default: // ai_video — match both PROMPT and CLIP
      return /(?:PROMPT|CLIP)\s*(\d+)/i;
  }
}

// Parse VEO 3 format
function parseVeo3Block(block: string, promptNumber: number): ParsedPrompt {
  // Extract timestamp [00:00-00:08]
  const timestampMatch = block.match(/\[(\d{2}:\d{2}[-–]\d{2}:\d{2})\]/);
  const timestamp = timestampMatch ? timestampMatch[1] : undefined;
  
  // Extract duration/time
  const durationMatch = block.match(/(?:Thời lượng|Duration|Giây|seconds?)[\s:]*([^\n]+)/i) 
    || block.match(/\((\d+[-–]\d+\s*(?:giây|s|seconds?))\)/i)
    || block.match(/(\d+[-–]\d+\s*(?:giây|s))/i);
  const duration = durationMatch ? durationMatch[1].trim() : '';
  
  // Extract VEO 3 Visual Direction fields
  const shotMatch = block.match(/(?:Shot|Góc quay)[\s:]*([^\n]+)/i);
  const shotType = shotMatch ? shotMatch[1].trim() : undefined;
  
  const cameraMatch = block.match(/(?:Camera|Chuyển động camera)[\s:]*([^\n]+)/i);
  const cameraMovement = cameraMatch ? cameraMatch[1].trim() : undefined;
  
  const lightingMatch = block.match(/(?:Lighting|Ánh sáng)[\s:]*([^\n]+)/i);
  const lighting = lightingMatch ? lightingMatch[1].trim() : undefined;
  
  const backgroundMatch = block.match(/(?:Background|Phông nền|Bối cảnh)[\s:]*([^\n]+)/i);
  const background = backgroundMatch ? backgroundMatch[1].trim() : undefined;
  
  // Extract motion/action
  const motionMatch = block.match(/(?:Chuyển động|Motion|Hành động|Action)[\s:]*([^\n]+(?:\n(?![A-Z\[\]]+:)[^\n]+)*)/i)
    || block.match(/\[Chuyển động[^\]]*\][\s:]*([^\n]+)/i)
    || block.match(/\[CHARACTER ACTION\][\s\n]*\(([^)]+)\)/i);
  const motion = motionMatch ? motionMatch[1].trim().replace(/^\(|\)$/g, '') : '';
  
  const characterActionMatch = block.match(/\[CHARACTER ACTION\][\s\n]*\(([^)]+)\)/i);
  const characterAction = characterActionMatch ? characterActionMatch[1].trim() : undefined;
  
  // Extract dialogue
  const dialogueMatch = block.match(/(?:Lời thoại|Dialogue|Script|Thoại)[\s:]*([^\n]+(?:\n(?![A-Z\[\]]+:)[^\n]+)*)/i)
    || block.match(/\[DIALOGUE[^\]]*\][\s\n]*"([^"]+)"/i)
    || block.match(/"([^"]+)"/);
  const dialogue = dialogueMatch ? dialogueMatch[1].trim().replace(/^[""]|[""]$/g, '') : '';
  
  // Extract tone
  const toneMatch = block.match(/(?:Giọng điệu|Tone|Cảm xúc|Emotion|TONE & DELIVERY)[\s:]*([^\n]+(?:\n(?![A-Z\[\]]+:)[^\n]+)*)/i);
  const tone = toneMatch ? toneMatch[1].trim() : '';
  
  // Extract VEO 3 Audio fields
  const ambienceMatch = block.match(/(?:Ambience|Âm thanh nền)[\s:]*([^\n]+)/i);
  const ambience = ambienceMatch ? ambienceMatch[1].trim() : undefined;
  
  const sfxMatch = block.match(/(?:SFX|Sound effects|Hiệu ứng âm thanh)[\s:]*([^\n]+)/i);
  const sfx = sfxMatch ? sfxMatch[1].trim() : undefined;
  
  const musicMoodMatch = block.match(/(?:Music mood|Nhạc nền|Music)[\s:]*([^\n]+)/i);
  const musicMood = musicMoodMatch ? musicMoodMatch[1].trim() : undefined;
  
  // Extract text overlay
  const textOverlayMatch = block.match(/(?:TEXT OVERLAY|Text overlay|Chữ hiển thị)[\s:]*"?([^"\n]+)"?/i);
  const textOverlay = textOverlayMatch ? textOverlayMatch[1].trim() : undefined;

  return {
    promptNumber,
    duration,
    motion,
    dialogue,
    tone,
    rawContent: block.trim(),
    timestamp,
    shotType,
    cameraMovement,
    lighting,
    background,
    characterAction: characterAction || motion,
    ambience,
    sfx,
    musicMood,
    textOverlay,
  };
}

// Parse Minimax format
function parseMinimaxBlock(block: string, promptNumber: number): ParsedPrompt {
  // Scene description
  const sceneMatch = block.match(/(?:Scene|Cảnh|Mô tả)[\s:]*([^\n]+(?:\n(?![A-Z]+:)[^\n]+)*)/i);
  const scene = sceneMatch ? sceneMatch[1].trim() : '';
  
  // Camera motion (e.g., [zoom in], [pan left])
  const cameraMotionMatch = block.match(/(?:Camera motion|Camera|Chuyển động camera)[\s:]*([^\n]+)/i)
    || block.match(/\[(zoom|pan|dolly|tilt|track)[^\]]*\]/i);
  const cameraMotion = cameraMotionMatch ? cameraMotionMatch[1] || cameraMotionMatch[0] : undefined;
  
  // Voice/Narration
  const voiceMatch = block.match(/(?:Voice|Giọng|Lời thoại|Narration)[\s:]*"?([^"\n]+)"?/i);
  const voice = voiceMatch ? voiceMatch[1].trim() : '';
  
  // Duration
  const durationMatch = block.match(/(?:Duration|Thời lượng)[\s:]*([^\n]+)/i)
    || block.match(/(\d+[-–]?\d*\s*(?:giây|s|seconds?))/i);
  const duration = durationMatch ? durationMatch[1].trim() : '';

  return {
    promptNumber,
    duration,
    motion: '',
    dialogue: voice,
    tone: '',
    rawContent: block.trim(),
    scene,
    voice,
    cameraMotion,
  };
}

// Parse Teleprompter format (unified with voice-over)
function parseTeleprompterBlock(block: string, promptNumber: number): ParsedPrompt {
  // Cue card
  const cueMatch = block.match(/(?:Cue|Gợi ý|Cue card|CUE)[\s:]*([^\n]+)/i);
  const cue = cueMatch ? cueMatch[1].trim() : undefined;
  
  // Main dialogue/script text
  const dialogueMatch = block.match(/(?:Dialogue|Lời thoại|Script|Nội dung)[\s:]*([^\n]+(?:\n(?![A-Z]+:|\*\*)[^\n]+)*)/i)
    || block.match(/"([^"]+)"/);
  const dialogue = dialogueMatch ? dialogueMatch[1].trim().replace(/^[""]|[""]$/g, '') : '';
  
  // Emphasis markers (bold words, underline)
  const emphasisMatch = block.match(/(?:Emphasis|Nhấn mạnh)[\s:]*([^\n]+)/i);
  const emphasis = emphasisMatch ? emphasisMatch[1].trim() : undefined;
  
  // Pause markers
  const pauseMatch = block.match(/(?:Pause|Nghỉ|Dừng)[\s:]*([^\n]+)/i);
  const pause = pauseMatch ? pauseMatch[1].trim() : undefined;
  
  // Duration
  const durationMatch = block.match(/(?:Duration|Thời lượng)[\s:]*([^\n]+)/i);
  const duration = durationMatch ? durationMatch[1].trim() : '';

  // Voice guidance fields (merged from voice-over)
  const voiceGuideMatch = block.match(/(?:Voice guide|Hướng dẫn giọng|HƯỚNG DẪN GIỌNG)[\s:]*([^\n]+(?:\n(?![A-Z]+:)[^\n]+)*)/i);
  const voiceGuide = voiceGuideMatch ? voiceGuideMatch[1].trim() : undefined;

  const toneMatch = block.match(/(?:Tone|Giọng điệu|Emotion|Cảm xúc)[\s:]*([^\n]+)/i);
  const tone = toneMatch ? toneMatch[1].trim() : '';

  const tempoMatch = block.match(/(?:Tempo|Nhịp độ|Speed)[\s:]*([^\n]+)/i);
  const tempo = tempoMatch ? tempoMatch[1].trim() : undefined;

  const emotionMatch = block.match(/(?:Emotion|Cảm xúc giọng)[\s:]*([^\n]+)/i);
  const emotion = emotionMatch ? emotionMatch[1].trim() : undefined;

  return {
    promptNumber,
    duration,
    motion: '',
    dialogue,
    tone,
    rawContent: block.trim(),
    cue,
    emphasis,
    pause,
    voiceGuide,
    tempo,
    emotion,
  };
}

// Parse Voice-over format
function parseVoiceoverBlock(block: string, promptNumber: number): ParsedPrompt {
  // Clean dialogue
  const dialogueMatch = block.match(/(?:Dialogue|Lời thoại|Script|Nội dung)[\s:]*([^\n]+(?:\n(?![A-Z]+:|\*\*)[^\n]+)*)/i)
    || block.match(/"([^"]+)"/);
  const dialogue = dialogueMatch ? dialogueMatch[1].trim().replace(/^[""]|[""]$/g, '') : '';
  
  // Voice guide (tone guidance)
  const voiceGuideMatch = block.match(/(?:Voice guide|Hướng dẫn giọng|Tone)[\s:]*([^\n]+(?:\n(?![A-Z]+:)[^\n]+)*)/i);
  const voiceGuide = voiceGuideMatch ? voiceGuideMatch[1].trim() : undefined;
  
  // Tone
  const toneMatch = block.match(/(?:Giọng điệu|Emotion|Cảm xúc)[\s:]*([^\n]+)/i);
  const tone = toneMatch ? toneMatch[1].trim() : '';
  
  // Tempo
  const tempoMatch = block.match(/(?:Tempo|Nhịp độ|Speed)[\s:]*([^\n]+)/i);
  const tempo = tempoMatch ? tempoMatch[1].trim() : undefined;
  
  // Emphasis
  const emphasisMatch = block.match(/(?:Emphasis|Nhấn mạnh)[\s:]*([^\n]+)/i);
  const emphasis = emphasisMatch ? emphasisMatch[1].trim() : undefined;
  
  // Pause markers
  const pauseMatch = block.match(/(?:Pause|Nghỉ|Dừng)[\s:]*([^\n]+)/i);
  const pause = pauseMatch ? pauseMatch[1].trim() : undefined;
  
  // Emotion
  const emotionMatch = block.match(/(?:Emotion|Cảm xúc giọng)[\s:]*([^\n]+)/i);
  const emotion = emotionMatch ? emotionMatch[1].trim() : undefined;
  
  // Duration
  const durationMatch = block.match(/(?:Duration|Thời lượng)[\s:]*([^\n]+)/i);
  const duration = durationMatch ? durationMatch[1].trim() : '';

  return {
    promptNumber,
    duration,
    motion: '',
    dialogue,
    tone,
    rawContent: block.trim(),
    voiceGuide,
    tempo,
    emphasis,
    pause,
    emotion,
  };
}

// Parse Production format
function parseProductionBlock(block: string, promptNumber: number): ParsedPrompt {
  // Camera setup
  const cameraMatch = block.match(/(?:Camera|Góc máy|Shot)[\s:]*([^\n]+)/i);
  const camera = cameraMatch ? cameraMatch[1].trim() : undefined;
  
  // Lighting
  const lightingMatch = block.match(/(?:Lighting|Ánh sáng)[\s:]*([^\n]+)/i);
  const lighting = lightingMatch ? lightingMatch[1].trim() : undefined;
  
  // Audio
  const audioMatch = block.match(/(?:Audio|Âm thanh)[\s:]*([^\n]+)/i);
  const audio = audioMatch ? audioMatch[1].trim() : undefined;
  
  // Action/Movement
  const motionMatch = block.match(/(?:Action|Hành động|Movement)[\s:]*([^\n]+(?:\n(?![A-Z]+:)[^\n]+)*)/i);
  const motion = motionMatch ? motionMatch[1].trim() : '';
  
  // Dialogue
  const dialogueMatch = block.match(/(?:Dialogue|Lời thoại)[\s:]*([^\n]+(?:\n(?![A-Z]+:)[^\n]+)*)/i)
    || block.match(/"([^"]+)"/);
  const dialogue = dialogueMatch ? dialogueMatch[1].trim().replace(/^[""]|[""]$/g, '') : '';
  
  // Editor notes
  const editorNotesMatch = block.match(/(?:Editor notes|Notes|Ghi chú|Ghi chú biên tập)[\s:]*([^\n]+(?:\n(?![A-Z]+:)[^\n]+)*)/i);
  const editorNotes = editorNotesMatch ? editorNotesMatch[1].trim() : undefined;
  
  // Duration
  const durationMatch = block.match(/(?:Duration|Thời lượng)[\s:]*([^\n]+)/i);
  const duration = durationMatch ? durationMatch[1].trim() : '';

  return {
    promptNumber,
    duration,
    motion,
    dialogue,
    tone: '',
    rawContent: block.trim(),
    camera,
    lighting,
    audio,
    editorNotes,
  };
}

export function parseScriptContent(content: string, purpose?: ScriptPurpose): ParsedPrompt[] {
  const prompts: ParsedPrompt[] = [];
  
  const blockPattern = getBlockPattern(purpose);
  const numberPattern = getBlockNumberPattern(purpose);
  
  // Split by block pattern
  const promptBlocks = content.split(blockPattern).filter(block => block.trim());
  
  for (const block of promptBlocks) {
    const promptMatch = block.match(numberPattern);
    if (!promptMatch) continue;
    
    const promptNumber = parseInt(promptMatch[1], 10);
    
    // Parse based on purpose
    let parsed: ParsedPrompt;
    switch(purpose) {
      case 'teleprompter':
        parsed = parseTeleprompterBlock(block, promptNumber);
        break;
      case 'production':
        parsed = parseProductionBlock(block, promptNumber);
        break;
      default: { // ai_video — detect CLIP vs PROMPT format
        const isClipFormat = /^CLIP\s*\d+/i.test(block.trim());
        parsed = isClipFormat 
          ? parseMinimaxBlock(block, promptNumber)
          : parseVeo3Block(block, promptNumber);
        break;
      }
    }
    
    prompts.push(parsed);
  }
  
  return prompts;
}

export function getPromptCount(content: string, purpose?: ScriptPurpose): number {
  const numberPattern = getBlockNumberPattern(purpose);
  const globalPattern = new RegExp(numberPattern.source, 'gi');
  const matches = content.match(globalPattern);
  return matches ? matches.length : 0;
}

// Get block label based on purpose
export function getBlockLabel(purpose?: ScriptPurpose): string {
  switch(purpose) {
    case 'teleprompter':
    case 'voiceover':
      return 'Đoạn';
    case 'production':
      return 'Scene';
    default:
      return 'Prompt';
  }
}
