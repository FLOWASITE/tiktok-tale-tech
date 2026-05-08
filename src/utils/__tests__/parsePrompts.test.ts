import { describe, it, expect } from 'vitest';
import { parseScriptContent, getPromptCount } from '../parsePrompts';

describe('parsePrompts — header-only splitting', () => {
  it('does not split when "PROMPT 1" is referenced inside another scene body', () => {
    const content = `PROMPT 1 [00:00-00:10]:
[VISUAL DIRECTION]
• Shot: Vertical
[DIALOGUE]
"Xin chào"

PROMPT 2 [00:10-00:20]: Same as PROMPT 1
• Camera: Static
[DIALOGUE]
"Tiếp theo"`;
    const result = parseScriptContent(content, 'ai_video');
    expect(result).toHaveLength(2);
    expect(result[0].promptNumber).toBe(1);
    expect(result[1].promptNumber).toBe(2);
  });

  it('ignores inline "• PROMPT 1" mentions', () => {
    const content = `PROMPT 1 [00:00-00:08]:
• Shot: Medium
• Note: như PROMPT 1 trước đó
[DIALOGUE] "A"

PROMPT 2 [00:08-00:16]:
• Shot: Close
[DIALOGUE] "B"`;
    expect(getPromptCount(content, 'ai_video')).toBe(2);
    expect(parseScriptContent(content, 'ai_video')).toHaveLength(2);
  });

  it('still parses standard 3-scene script', () => {
    const content = `PROMPT 1 [00:00-00:10]:\nA\n\nPROMPT 2 [00:10-00:20]:\nB\n\nPROMPT 3 [00:20-00:30]:\nC`;
    expect(parseScriptContent(content, 'ai_video')).toHaveLength(3);
  });
});
