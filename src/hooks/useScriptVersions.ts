import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Script } from '@/types/script';
import { ScriptVersion } from '@/types/scriptCollaboration';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export function useScriptVersions(scriptId?: string) {
  const { user } = useAuth();
  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchVersions = useCallback(async () => {
    if (!scriptId || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('script_versions')
        .select('*')
        .eq('script_id', scriptId)
        .order('version', { ascending: false });

      if (error) throw error;
      setVersions(data as ScriptVersion[]);
    } catch (error) {
      console.error('Error fetching script versions:', error);
      toast.error('Không thể tải lịch sử phiên bản');
    } finally {
      setLoading(false);
    }
  }, [scriptId, user]);

  const saveVersion = useCallback(async (
    script: Script,
    changeSummary?: string
  ): Promise<ScriptVersion | null> => {
    if (!user || !script.id) {
      toast.error('Vui lòng đăng nhập');
      return null;
    }

    setSaving(true);
    try {
      // Get current max version
      const { data: currentVersions, error: versionError } = await supabase
        .from('script_versions')
        .select('version')
        .eq('script_id', script.id)
        .order('version', { ascending: false })
        .limit(1);

      if (versionError) throw versionError;

      const nextVersion = currentVersions && currentVersions.length > 0 
        ? currentVersions[0].version + 1 
        : 1;

      const insertData: {
        script_id: string;
        version: number;
        content: string;
        topic: string;
        duration: number;
        video_type: string;
        character_type: string;
        analysis_cache: Json;
        change_summary: string;
        created_by: string;
      } = {
        script_id: script.id,
        version: nextVersion,
        content: script.content,
        topic: script.topic,
        duration: script.duration,
        video_type: script.video_type,
        character_type: script.character_type,
        analysis_cache: (script.analysis_cache ?? null) as Json,
        change_summary: changeSummary || `Phiên bản ${nextVersion}`,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('script_versions')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Update script version number
      await supabase
        .from('scripts')
        .update({ version: nextVersion })
        .eq('id', script.id);

      setVersions(prev => [data as ScriptVersion, ...prev]);
      toast.success(`Đã lưu phiên bản ${nextVersion}`);
      return data as ScriptVersion;
    } catch (error) {
      console.error('Error saving script version:', error);
      toast.error('Không thể lưu phiên bản');
      return null;
    } finally {
      setSaving(false);
    }
  }, [user]);

  const compareVersions = useCallback((v1: ScriptVersion, v2: ScriptVersion) => {
    // Simple diff - returns changed fields
    const changes: string[] = [];
    
    if (v1.content !== v2.content) changes.push('Nội dung');
    if (v1.topic !== v2.topic) changes.push('Chủ đề');
    if (v1.duration !== v2.duration) changes.push('Thời lượng');
    if (v1.video_type !== v2.video_type) changes.push('Loại video');
    if (v1.character_type !== v2.character_type) changes.push('Nhân vật');
    
    return changes;
  }, []);

  const restoreVersion = useCallback(async (
    version: ScriptVersion,
    currentScript: Script
  ): Promise<boolean> => {
    if (!user) {
      toast.error('Vui lòng đăng nhập');
      return false;
    }

    try {
      // Save current as a new version first
      await saveVersion(currentScript, `Backup trước khi khôi phục v${version.version}`);

      // Restore the old version content to current script
      const { error } = await supabase
        .from('scripts')
        .update({
          content: version.content,
          topic: version.topic,
          duration: version.duration,
          video_type: version.video_type,
          character_type: version.character_type,
          analysis_cache: (version.analysis_cache ?? null) as Json,
        })
        .eq('id', version.script_id);

      if (error) throw error;

      toast.success(`Đã khôi phục phiên bản ${version.version}`);
      return true;
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Không thể khôi phục phiên bản');
      return false;
    }
  }, [user, saveVersion]);

  return {
    versions,
    loading,
    saving,
    fetchVersions,
    saveVersion,
    compareVersions,
    restoreVersion,
  };
}
