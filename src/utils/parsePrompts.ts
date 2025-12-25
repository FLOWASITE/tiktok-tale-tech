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
}

export function parseScriptContent(content: string): ParsedPrompt[] {
  const prompts: ParsedPrompt[] = [];
  
  // Split by PROMPT pattern
  const promptBlocks = content.split(/(?=PROMPT\s*\d+)/i).filter(block => block.trim());
  
  for (const block of promptBlocks) {
    const promptMatch = block.match(/PROMPT\s*(\d+)/i);
    if (!promptMatch) continue;
    
    const promptNumber = parseInt(promptMatch[1], 10);
    
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
    
    // Extract motion/action - support both old and new format
    const motionMatch = block.match(/(?:Chuyển động|Motion|Hành động|Action)[\s:]*([^\n]+(?:\n(?![A-Z\[\]]+:)[^\n]+)*)/i)
      || block.match(/\[Chuyển động[^\]]*\][\s:]*([^\n]+)/i)
      || block.match(/\[CHARACTER ACTION\][\s\n]*\(([^)]+)\)/i);
    const motion = motionMatch ? motionMatch[1].trim().replace(/^\(|\)$/g, '') : '';
    
    // Also try character action from VEO 3 format
    const characterActionMatch = block.match(/\[CHARACTER ACTION\][\s\n]*\(([^)]+)\)/i);
    const characterAction = characterActionMatch ? characterActionMatch[1].trim() : undefined;
    
    // Extract dialogue/script text - support both old and VEO 3 format
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
    
    prompts.push({
      promptNumber,
      duration,
      motion,
      dialogue,
      tone,
      rawContent: block.trim(),
      // VEO 3 fields
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
    });
  }
  
  return prompts;
}

export function getPromptCount(content: string): number {
  const matches = content.match(/PROMPT\s*\d+/gi);
  return matches ? matches.length : 0;
}
