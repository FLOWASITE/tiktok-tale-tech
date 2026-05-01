import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Play, Square, Volume2, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { type CharacterProfile, type CharacterAppearance } from '@/hooks/useCharacterProfiles';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CharacterVoicePreviewProps {
  characters: CharacterProfile[];
  /** Optional scene prompts to auto-suggest sample dialogue */
  scenePrompts?: string[];
  className?: string;
}

interface PreviewState {
  loading: boolean;
  audioUrl: string | null;
  error: string | null;
}

const DEFAULT_SAMPLES: Record<string, string> = {
  'Nam': 'Xin chào, tôi là nhân vật chính trong video này. Hãy cùng bắt đầu câu chuyện nhé.',
  'Nữ': 'Xin chào mọi người, tôi rất vui được chia sẻ câu chuyện hôm nay với các bạn.',
};

const GENERIC_SAMPLE = 'Xin chào, đây là đoạn thử giọng để kiểm tra tính đồng nhất của nhân vật xuyên suốt video.';

function getSampleText(character: CharacterProfile, scenePrompts?: string[]): string {
  const app = character.appearance as CharacterAppearance;
  // Try to extract a relevant line from scenes
  if (scenePrompts && scenePrompts.length > 0) {
    // Use first scene as sample context
    const firstScene = scenePrompts[0];
    if (firstScene.length > 20 && firstScene.length < 300) {
      return `Cảnh 1: ${firstScene.slice(0, 200)}`;
    }
  }
  return DEFAULT_SAMPLES[app?.gender ?? ''] ?? GENERIC_SAMPLE;
}

export function CharacterVoicePreview({ characters, scenePrompts, className }: CharacterVoicePreviewProps) {
  const [sampleTexts, setSampleTexts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    characters.forEach(c => {
      init[c.id] = getSampleText(c, scenePrompts);
    });
    return init;
  });

  const [previews, setPreviews] = useState<Record<string, PreviewState>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const playPreview = useCallback(async (character: CharacterProfile) => {
    const text = sampleTexts[character.id]?.trim();
    if (!text || text.length < 2) {
      toast.error('Nhập ít nhất 2 ký tự để thử giọng.');
      return;
    }

    // Stop any currently playing audio
    Object.values(audioRefs.current).forEach(a => {
      if (a) { a.pause(); a.currentTime = 0; }
    });

    const voiceId = character.default_voice_id;
    if (!voiceId) {
      toast.error(`Nhân vật "${character.name}" chưa gán Voice ID. Vào Quản lý nhân vật để cấu hình.`);
      return;
    }

    setPreviews(prev => ({
      ...prev,
      [character.id]: { loading: true, audioUrl: null, error: null },
    }));

    try {
      const { data, error } = await supabase.functions.invoke('generate-voiceover', {
        body: {
          text,
          voice_id: voiceId,
          language: 'vi',
          preview: true,
        },
      });

      if (error) throw error;
      if (!data?.audio_base64) throw new Error('Không nhận được audio');

      const audioUrl = `data:audio/mpeg;base64,${data.audio_base64}`;
      setPreviews(prev => ({
        ...prev,
        [character.id]: { loading: false, audioUrl, error: null },
      }));

      // Auto-play
      const audio = new Audio(audioUrl);
      audioRefs.current[character.id] = audio;
      audio.onended = () => {
        audioRefs.current[character.id] = null;
      };
      await audio.play();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
      setPreviews(prev => ({
        ...prev,
        [character.id]: { loading: false, audioUrl: null, error: msg },
      }));
      toast.error(`Thử giọng thất bại: ${msg}`);
    }
  }, [sampleTexts]);

  const stopAudio = useCallback((charId: string) => {
    const audio = audioRefs.current[charId];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audioRefs.current[charId] = null;
    }
  }, []);

  if (characters.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Preview giọng nhân vật</span>
      </div>

      <div className="grid gap-3">
        {characters.map((character, idx) => {
          const app = character.appearance as CharacterAppearance;
          const preview = previews[character.id];
          const hasVoice = !!character.default_voice_id;

          return (
            <Card key={character.id} className="border-border/50">
              <CardContent className="p-3 space-y-2">
                {/* Character header */}
                <div className="flex items-center gap-2">
                  {character.reference_image_url ? (
                    <img src={character.reference_image_url} alt="" className="w-7 h-7 rounded-md object-cover ring-1 ring-border/40" />
                  ) : (
                    <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{character.name}</span>
                      <Badge variant={idx === 0 ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0">
                        {idx === 0 ? 'Chính' : `Phụ ${idx}`}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {app?.gender && <span>{app.gender}</span>}
                      {character.default_voice_id && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{character.default_voice_id.slice(0, 12)}…</span>
                        </>
                      )}
                      {character.default_voice_provider && (
                        <>
                          <span>·</span>
                          <span>{character.default_voice_provider}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sample text input */}
                <Textarea
                  value={sampleTexts[character.id] ?? ''}
                  onChange={(e) => setSampleTexts(prev => ({ ...prev, [character.id]: e.target.value }))}
                  placeholder="Nhập đoạn thoại mẫu để thử giọng..."
                  className="min-h-[48px] text-xs resize-none"
                  maxLength={500}
                />

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!hasVoice ? (
                    <div className="flex items-center gap-1 text-[10px] text-amber-500">
                      <AlertCircle className="w-3 h-3" />
                      <span>Chưa gán Voice ID</span>
                    </div>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => playPreview(character)}
                        disabled={preview?.loading || !sampleTexts[character.id]?.trim()}
                        className="h-7 text-[11px] gap-1.5"
                      >
                        {preview?.loading ? (
                          <><Loader2 className="w-3 h-3 animate-spin" />Đang tạo…</>
                        ) : (
                          <><Play className="w-3 h-3" />Thử giọng</>
                        )}
                      </Button>

                      {preview?.audioUrl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const audio = audioRefs.current[character.id];
                            if (audio && !audio.paused) {
                              stopAudio(character.id);
                            } else {
                              // Replay
                              const a = new Audio(preview.audioUrl!);
                              audioRefs.current[character.id] = a;
                              a.play();
                            }
                          }}
                          className="h-7 text-[11px] gap-1"
                        >
                          <Square className="w-2.5 h-2.5" />
                          Phát lại
                        </Button>
                      )}
                    </>
                  )}

                  {preview?.error && (
                    <span className="text-[10px] text-destructive">{preview.error}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {characters.length > 1 && (
        <p className="text-[10px] text-muted-foreground/70 italic">
          Nghe cả {characters.length} giọng để đảm bảo không lẫn giọng giữa các nhân vật.
        </p>
      )}
    </div>
  );
}
