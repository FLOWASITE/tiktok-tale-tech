import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Script } from '@/types/script';
import { ScriptAnalysis } from '@/hooks/useScriptAnalysis';

export function useScriptImprovement() {
  const [isImproving, setIsImproving] = useState(false);
  const [improvedContent, setImprovedContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const improveScript = useCallback(async (script: Script, analysis: ScriptAnalysis) => {
    setIsImproving(true);
    setError(null);
    setImprovedContent(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('improve-script', {
        body: {
          scriptContent: script.content,
          suggestions: analysis.suggestions,
          weaknesses: analysis.weaknesses,
          topic: script.topic,
          duration: script.duration,
          videoType: script.video_type,
          scriptPurpose: script.script_purpose,
        },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      const content = data?.improvedContent;
      if (!content) throw new Error('Không nhận được kịch bản cải thiện');

      setImprovedContent(content);
      return content;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi cải thiện kịch bản';
      setError(message);
      return null;
    } finally {
      setIsImproving(false);
    }
  }, []);

  const applyImprovement = useCallback(async (script: Script): Promise<Script | null> => {
    if (!improvedContent) return null;

    try {
      const { error: updateError } = await supabase
        .from('scripts')
        .update({
          content: improvedContent,
          updated_at: new Date().toISOString(),
          analysis_cache: null,
          analyzed_at: null,
        })
        .eq('id', script.id);

      if (updateError) throw updateError;

      const updatedScript: Script = {
        ...script,
        content: improvedContent,
        updated_at: new Date().toISOString(),
        analysis_cache: undefined,
        analyzed_at: null,
      };

      setImprovedContent(null);
      return updatedScript;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi lưu kịch bản';
      setError(message);
      return null;
    }
  }, [improvedContent]);

  const clearImprovement = useCallback(() => {
    setImprovedContent(null);
    setError(null);
  }, []);

  return {
    isImproving,
    improvedContent,
    error,
    improveScript,
    applyImprovement,
    clearImprovement,
  };
}
