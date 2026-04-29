import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

/**
 * VideoScene = một cảnh duy nhất bóc ra từ kịch bản (PROMPT/SCENE block).
 * Đủ thông tin để Quick Clip auto-fill.
 */
export interface VideoScene {
  sceneNumber: number;
  prompt: string;
  duration?: number;          // giây — gợi ý
  aspect?: '9:16' | '16:9' | '1:1';
}

export interface ActiveScript {
  id: string;
  title: string;
  topic?: string;
  scenes: VideoScene[];
}

interface ScriptToVideoState {
  activeScript: ActiveScript | null;
  activeSceneIndex: number;
  /** map sceneNumber → video_generations.id (clip đã/đang quay từ scene này) */
  completedSceneIds: Record<number, string>;
}

interface ScriptToVideoContextValue extends ScriptToVideoState {
  setActiveScript: (script: ActiveScript | null, startSceneIndex?: number) => void;
  setActiveSceneIndex: (idx: number) => void;
  goToNextScene: () => void;
  goToPrevScene: () => void;
  markSceneCompleted: (sceneNumber: number, generationId: string) => void;
  clearScript: () => void;
  /** Tiện ích: scene đang active */
  currentScene: VideoScene | null;
}

const STORAGE_KEY = 'flowa_script_to_video_v1';

const ScriptToVideoContext = createContext<ScriptToVideoContextValue | null>(null);

function loadFromStorage(): ScriptToVideoState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScriptToVideoState;
    if (!parsed?.activeScript) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(state: ScriptToVideoState) {
  try {
    if (!state.activeScript) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    /* ignore quota/storage errors */
  }
}

export function ScriptToVideoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScriptToVideoState>(() => {
    return loadFromStorage() ?? { activeScript: null, activeSceneIndex: 0, completedSceneIds: {} };
  });

  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const setActiveScript = useCallback((script: ActiveScript | null, startSceneIndex = 0) => {
    setState({
      activeScript: script,
      activeSceneIndex: script ? Math.min(startSceneIndex, script.scenes.length - 1) : 0,
      completedSceneIds: {},
    });
  }, []);

  const setActiveSceneIndex = useCallback((idx: number) => {
    setState((prev) => {
      if (!prev.activeScript) return prev;
      const max = prev.activeScript.scenes.length - 1;
      const clamped = Math.max(0, Math.min(idx, max));
      return { ...prev, activeSceneIndex: clamped };
    });
  }, []);

  const goToNextScene = useCallback(() => {
    setState((prev) => {
      if (!prev.activeScript) return prev;
      const next = prev.activeSceneIndex + 1;
      if (next >= prev.activeScript.scenes.length) return prev;
      return { ...prev, activeSceneIndex: next };
    });
  }, []);

  const goToPrevScene = useCallback(() => {
    setState((prev) => {
      if (!prev.activeScript) return prev;
      const next = Math.max(0, prev.activeSceneIndex - 1);
      return { ...prev, activeSceneIndex: next };
    });
  }, []);

  const markSceneCompleted = useCallback((sceneNumber: number, generationId: string) => {
    setState((prev) => ({
      ...prev,
      completedSceneIds: { ...prev.completedSceneIds, [sceneNumber]: generationId },
    }));
  }, []);

  const clearScript = useCallback(() => {
    setState({ activeScript: null, activeSceneIndex: 0, completedSceneIds: {} });
  }, []);

  const currentScene = useMemo<VideoScene | null>(() => {
    if (!state.activeScript) return null;
    return state.activeScript.scenes[state.activeSceneIndex] ?? null;
  }, [state.activeScript, state.activeSceneIndex]);

  const value: ScriptToVideoContextValue = {
    ...state,
    setActiveScript,
    setActiveSceneIndex,
    goToNextScene,
    goToPrevScene,
    markSceneCompleted,
    clearScript,
    currentScene,
  };

  return <ScriptToVideoContext.Provider value={value}>{children}</ScriptToVideoContext.Provider>;
}

export function useScriptToVideo() {
  const ctx = useContext(ScriptToVideoContext);
  if (!ctx) {
    throw new Error('useScriptToVideo must be used inside <ScriptToVideoProvider>');
  }
  return ctx;
}
