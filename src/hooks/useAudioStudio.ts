import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AudioAssetType = 'voiceover' | 'music' | 'sfx' | 'subtitle';

export interface AudioAsset {
  id: string;
  user_id: string;
  organization_id?: string | null;
  asset_type: AudioAssetType;
  source_text?: string | null;
  prompt?: string | null;
  voice_id?: string | null;
  language?: string | null;
  duration_seconds?: number | null;
  audio_url?: string | null;
  srt_content?: string | null;
  vtt_content?: string | null;
  provider: string;
  cost_estimate?: number | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export function useAudioStudio() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AudioAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<AudioAssetType | null>(null);

  const fetchAssets = useCallback(async (assetType?: AudioAssetType) => {
    if (!user) return;
    setLoading(true);
    try {
      let q = supabase.from('audio_assets').select('*').order('created_at', { ascending: false }).limit(50);
      if (assetType) q = q.eq('asset_type', assetType);
      const { data, error } = await q;
      if (error) throw error;
      setAssets((data ?? []) as AudioAsset[]);
    } catch (e) {
      console.error('[useAudioStudio] fetch err', e);
      toast.error('Không tải được audio assets');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const generateVoiceover = useCallback(async (
    text: string,
    voiceId?: string,
    language = 'vi',
    scriptId?: string,
  ) => {
    if (!user) { toast.error('Vui lòng đăng nhập'); return null; }
    setGenerating('voiceover');
    try {
      const { data, error } = await supabase.functions.invoke('generate-voiceover', {
        body: { text, voice_id: voiceId, language, script_id: scriptId },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return null; }
      const asset = data.asset as AudioAsset;
      setAssets((prev) => [asset, ...prev]);
      toast.success('Voiceover đã tạo xong 🎙️');
      return asset;
    } catch (e) {
      console.error('[voiceover] err', e);
      toast.error('Tạo voiceover thất bại');
      return null;
    } finally { setGenerating(null); }
  }, [user]);

  const generateBGM = useCallback(async (
    prompt: string,
    duration = 15,
    scriptId?: string,
  ) => {
    if (!user) { toast.error('Vui lòng đăng nhập'); return null; }
    setGenerating('music');
    try {
      const { data, error } = await supabase.functions.invoke('generate-bgm', {
        body: { prompt, duration, script_id: scriptId },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return null; }
      const asset = data.asset as AudioAsset;
      setAssets((prev) => [asset, ...prev]);
      toast.success('Nhạc nền đã tạo xong 🎵');
      return asset;
    } catch (e) {
      console.error('[bgm] err', e);
      toast.error('Tạo nhạc nền thất bại');
      return null;
    } finally { setGenerating(null); }
  }, [user]);

  const generateSubtitles = useCallback(async (
    mediaUrlOrOpts: string | { media_url?: string; script_id?: string },
    language = 'vie',
  ) => {
    if (!user) { toast.error('Vui lòng đăng nhập'); return null; }
    setGenerating('subtitle');
    try {
      const body = typeof mediaUrlOrOpts === 'string'
        ? { media_url: mediaUrlOrOpts, language }
        : { ...mediaUrlOrOpts, language };
      const { data, error } = await supabase.functions.invoke('generate-subtitles', { body });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return null; }
      const asset = data.asset as AudioAsset;
      setAssets((prev) => [asset, ...prev]);
      toast.success('Subtitle đã tạo xong 📝');
      return asset;
    } catch (e) {
      console.error('[subs] err', e);
      toast.error('Tạo subtitle thất bại');
      return null;
    } finally { setGenerating(null); }
  }, [user]);

  const deleteAsset = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('audio_assets').delete().eq('id', id);
      if (error) throw error;
      setAssets((prev) => prev.filter((a) => a.id !== id));
      toast.success('Đã xóa');
    } catch (e) {
      toast.error('Xóa thất bại');
    }
  }, []);

  useEffect(() => { if (user) fetchAssets(); }, [user, fetchAssets]);

  return { assets, loading, generating, fetchAssets, generateVoiceover, generateBGM, generateSubtitles, deleteAsset };
}

// Top voice IDs from ElevenLabs (multilingual_v2 friendly for Vietnamese)
export const VOICE_OPTIONS = [
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah (Nữ - tự nhiên)', gender: 'female' },
  { id: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda (Nữ - ấm áp)', gender: 'female' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily (Nữ - trẻ trung)', gender: 'female' },
  { id: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica (Nữ - chuyên nghiệp)', gender: 'female' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'George (Nam - trầm)', gender: 'male' },
  { id: 'cjVigY5qzO86Huf0OWal', label: 'Eric (Nam - thân thiện)', gender: 'male' },
  { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel (Nam - kể chuyện)', gender: 'male' },
  { id: 'iP95p4xoKVk53GoZ742B', label: 'Chris (Nam - năng động)', gender: 'male' },
] as const;
