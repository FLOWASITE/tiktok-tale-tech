import { parseScriptContent } from '@/lib/scriptContentParser';
import { Script, ScriptPurpose } from '@/types/script';

export interface ScriptToVideoNavState {
  fromScript: {
    script: {
      id: string;
      title: string;
      topic?: string;
      scenes: Array<{
        sceneNumber: number;
        prompt: string;
        duration?: number;
        aspect: '9:16' | '16:9' | '1:1';
      }>;
      aspectRatio: '9:16' | '16:9' | '1:1' | '2:3' | '4:5';
      totalDuration?: number;
      socialFormatId?: string;
      presetLabel: string;
    };
    activeSceneIndex: number;
  };
}

/**
 * Build navigation state to /videos for handing a generated script over to
 * the Video Studio. Mirrors the logic in ScriptViewer.handleSendToVideoStudio
 * so the Stepper "Tạo Video" step stays in sync.
 */
export function buildScriptToVideoNavState(
  script: Script,
  sceneIdx?: number,
): ScriptToVideoNavState | null {
  const purpose = script.script_purpose as ScriptPurpose;
  const prompts = parseScriptContent(script.content, purpose);
  if (prompts.length === 0) return null;

  const parseDur = (s?: string): number | undefined => {
    if (!s) return undefined;
    const m = s.match(/(\d+)/);
    return m ? Math.max(3, Math.min(10, parseInt(m[1], 10))) : undefined;
  };

  const scriptAspect =
    ((script as any).aspect_ratio as
      | '9:16' | '16:9' | '1:1' | '2:3' | '4:5'
      | undefined) ?? '9:16';
  const sceneAspect: '9:16' | '16:9' | '1:1' =
    scriptAspect === '2:3' || scriptAspect === '4:5' || scriptAspect === '9:16'
      ? '9:16'
      : scriptAspect;

  const scenes = prompts.map((p) => ({
    sceneNumber: p.promptNumber,
    prompt: (p.rawContent || `${p.motion ?? ''}\n${p.dialogue ?? ''}`).trim().slice(0, 1500),
    duration: parseDur(p.duration),
    aspect: sceneAspect,
  }));
  const totalDuration = typeof script.duration === 'number' ? script.duration : undefined;
  const presetLabel = totalDuration ? `${totalDuration}s · ${scriptAspect}` : `${scriptAspect}`;

  return {
    fromScript: {
      script: {
        id: script.id,
        title: script.title,
        topic: script.topic,
        scenes,
        aspectRatio: scriptAspect,
        totalDuration,
        socialFormatId: (script as any).social_format_id ?? undefined,
        presetLabel,
      },
      activeSceneIndex: sceneIdx ?? 0,
    },
  };
}
