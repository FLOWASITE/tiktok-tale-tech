import type { ScriptPurpose } from '@/types/script';

export interface EditableScene {
  /** Stable id để dnd-kit tracking (uuid hoặc tạm "scene-N") */
  id: string;
  /** Toàn bộ raw content giữa "**PROMPT N:**" và "**PROMPT N+1:**" */
  rawContent: string;
  /** Số scene gốc (trước khi reorder) — để map clip đã render */
  originalNumber?: number;
}

/**
 * Serialize lại danh sách scene thành markdown content theo format
 * "**PROMPT 1:**\n<rawContent>\n\n**PROMPT 2:**\n<rawContent>...".
 *
 * Header tag tự đổi theo purpose: PROMPT (ai_video) / SCENE (production) / BLOCK (teleprompter).
 */
export function serializeScenes(
  scenes: EditableScene[],
  purpose: ScriptPurpose | undefined,
): string {
  const tag = getHeaderTag(purpose);
  return scenes
    .map((s, idx) => `**${tag} ${idx + 1}:**\n${s.rawContent.trim()}`)
    .join('\n\n');
}

function getHeaderTag(purpose: ScriptPurpose | undefined): string {
  switch (purpose) {
    case 'teleprompter':
      return 'BLOCK';
    case 'production':
      return 'SCENE';
    default:
      return 'PROMPT';
  }
}

/**
 * Template content cho scene mới — user có thể edit ngay.
 */
export function emptySceneTemplate(purpose: ScriptPurpose | undefined): string {
  switch (purpose) {
    case 'teleprompter':
      return 'Lời thoại mới...';
    case 'production':
      return 'INT/EXT. — LOCATION — DAY/NIGHT\n\nMô tả cảnh quay...';
    default:
      return [
        'Duration: 5s',
        'Aspect: 9:16',
        '',
        'Visual: Mô tả khung hình, ánh sáng, chuyển động camera...',
        'Motion: Hành động chính trong cảnh',
        'Dialogue: Lời thoại (nếu có)',
      ].join('\n');
    }
}
