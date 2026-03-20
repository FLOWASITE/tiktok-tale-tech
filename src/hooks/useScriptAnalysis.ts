import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Script } from '@/types/script';

export interface ScriptAnalysis {
  hookScore: number;
  clarityScore: number;
  viralPotential: number;
  pacingScore: number;
  ctaEffectiveness: number;
  overallScore: number;
  emotionalArc: { prompt: number; emotion: string; intensity: number }[];
  suggestions: {
    type: 'hook' | 'clarity' | 'pacing' | 'cta' | 'engagement';
    priority: 'high' | 'medium' | 'low';
    message: string;
    promptNumber?: number;
  }[];
  strengths: string[];
  weaknesses: string[];
}

export function useScriptAnalysis() {
  const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeScript = useCallback(async (script: Script) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('analyze-script', {
        body: {
          scriptContent: script.content,
          topic: script.topic,
          duration: script.duration,
          videoType: script.video_type,
          characterType: script.character_type,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data);

      // Persist to DB
      try {
        await supabase
          .from('scripts')
          .update({
            analysis_cache: data as any,
            analyzed_at: new Date().toISOString(),
          })
          .eq('id', script.id);
      } catch (saveErr) {
        console.warn('Failed to save analysis cache:', saveErr);
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi phân tích kịch bản';
      setError(message);
      console.error('Script analysis error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const setInitialAnalysis = useCallback((cached: ScriptAnalysis) => {
    setAnalysis(cached);
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analysis,
    isAnalyzing,
    error,
    analyzeScript,
    setInitialAnalysis,
    clearAnalysis,
  };
}
