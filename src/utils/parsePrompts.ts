export interface ParsedPrompt {
  promptNumber: number;
  duration: string;
  motion: string;
  dialogue: string;
  tone: string;
  rawContent: string;
}

export function parseScriptContent(content: string): ParsedPrompt[] {
  const prompts: ParsedPrompt[] = [];
  
  // Split by PROMPT pattern
  const promptBlocks = content.split(/(?=PROMPT\s*\d+)/i).filter(block => block.trim());
  
  for (const block of promptBlocks) {
    const promptMatch = block.match(/PROMPT\s*(\d+)/i);
    if (!promptMatch) continue;
    
    const promptNumber = parseInt(promptMatch[1], 10);
    
    // Extract duration/time
    const durationMatch = block.match(/(?:Thời lượng|Duration|Giây|seconds?)[\s:]*([^\n]+)/i) 
      || block.match(/\((\d+[-–]\d+\s*(?:giây|s|seconds?))\)/i)
      || block.match(/(\d+[-–]\d+\s*(?:giây|s))/i);
    const duration = durationMatch ? durationMatch[1].trim() : '';
    
    // Extract motion/action
    const motionMatch = block.match(/(?:Chuyển động|Motion|Hành động|Action)[\s:]*([^\n]+(?:\n(?![A-Z]+:)[^\n]+)*)/i)
      || block.match(/\[Chuyển động[^\]]*\][\s:]*([^\n]+)/i);
    const motion = motionMatch ? motionMatch[1].trim() : '';
    
    // Extract dialogue/script text
    const dialogueMatch = block.match(/(?:Lời thoại|Dialogue|Script|Thoại)[\s:]*([^\n]+(?:\n(?![A-Z]+:)[^\n]+)*)/i)
      || block.match(/"([^"]+)"/);
    const dialogue = dialogueMatch ? dialogueMatch[1].trim().replace(/^[""]|[""]$/g, '') : '';
    
    // Extract tone
    const toneMatch = block.match(/(?:Giọng điệu|Tone|Cảm xúc|Emotion)[\s:]*([^\n]+)/i);
    const tone = toneMatch ? toneMatch[1].trim() : '';
    
    prompts.push({
      promptNumber,
      duration,
      motion,
      dialogue,
      tone,
      rawContent: block.trim()
    });
  }
  
  return prompts;
}

export function getPromptCount(content: string): number {
  const matches = content.match(/PROMPT\s*\d+/gi);
  return matches ? matches.length : 0;
}
