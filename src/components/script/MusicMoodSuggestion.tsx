import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2, RefreshCw, Music } from 'lucide-react';
import { ScriptAnalysis } from '@/hooks/useScriptAnalysis';
import { supabase } from '@/integrations/supabase/client';

interface MusicMoodSuggestionProps {
  analysis?: ScriptAnalysis;
  scriptDuration?: number;
}

const moodMap: Record<string, { description: string; style: string; intensity: 'low' | 'medium' | 'high' }> = {
  'Confident': { description: 'Upbeat corporate, inspiring', style: 'cinematic', intensity: 'high' },
  'Excited': { description: 'Energetic, powerful, dynamic', style: 'modern', intensity: 'high' },
  'Serious': { description: 'Dramatic, intense, professional', style: 'orchestral', intensity: 'medium' },
  'Friendly': { description: 'Warm, cheerful, approachable', style: 'contemporary', intensity: 'medium' },
  'Curious': { description: 'Mysterious, exploratory, ambient', style: 'ambient', intensity: 'low' },
  'Neutral': { description: 'Subtle, balanced, neutral', style: 'minimal', intensity: 'low' },
  'Urgent': { description: 'Fast-paced, tense, action-driven', style: 'electronic', intensity: 'high' },
};

interface GeneratedTrack {
  mood: string;
  audioBase64: string;
  duration: number;
}

export function MusicMoodSuggestion({ analysis, scriptDuration = 30 }: MusicMoodSuggestionProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTracks, setGeneratedTracks] = useState<Map<string, GeneratedTrack>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  if (!analysis?.emotionalArc || analysis.emotionalArc.length === 0) {
    return null;
  }

  // Get unique emotions from arc
  const uniqueMoods = Array.from(new Set(analysis.emotionalArc.map(e => e.emotion)));
  const suggestionMoods = uniqueMoods.slice(0, 3); // Top 3 moods

  const generateMusic = async (mood: string) => {
    setIsGenerating(true);
    setError(null);
    setSelectedMood(mood);

    try {
      const moodConfig = moodMap[mood] || moodMap['Neutral'];
      const musicDuration = Math.min(scriptDuration || 30, 30); // Max 30 seconds

      const { data, error: invokeError } = await supabase.functions.invoke(
        'generate-music',
        {
          body: {
            moodDescription: moodConfig.description,
            duration: musicDuration,
            style: moodConfig.style,
            intensity: moodConfig.intensity,
          },
        }
      );

      if (invokeError) {
        console.error('Function error:', invokeError);
        
        if (invokeError.message?.includes('429')) {
          setError('Giới hạn API. Vui lòng thử lại sau.');
        } else if (invokeError.message?.includes('402')) {
          setError('Không đủ credits ElevenLabs. Vui lòng nạp thêm.');
        } else {
          setError(invokeError.message || 'Không thể tạo nhạc');
        }
        return;
      }

      if (data?.audioBase64) {
        const newTracks = new Map(generatedTracks);
        newTracks.set(mood, {
          mood,
          audioBase64: data.audioBase64,
          duration: data.duration,
        });
        setGeneratedTracks(newTracks);

        // Auto-play
        playTrack(mood, data.audioBase64);
      }
    } catch (err) {
      console.error('Error generating music:', err);
      setError('Lỗi tạo nhạc');
    } finally {
      setIsGenerating(false);
    }
  };

  const playTrack = (mood: string, audioBase64: string) => {
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      setIsPlaying(null);
    };

    audio.onerror = () => {
      setError('Lỗi phát nhạc');
      setIsPlaying(null);
    };

    audio.play();
    setIsPlaying(mood);
  };

  const stopTrack = () => {
    const audios = document.querySelectorAll('audio');
    audios.forEach(a => a.pause());
    setIsPlaying(null);
  };

  return (
    <Card className="p-4 bg-muted/50 border-0 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Music className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium">🎵 Music Mood Suggestions</span>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded border border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        {suggestionMoods.map((mood) => {
          const config = moodMap[mood] || moodMap['Neutral'];
          const track = generatedTracks.get(mood);
          const isCurrentlyPlaying = isPlaying === mood;

          return (
            <div key={mood} className="p-2 rounded-lg bg-background/50 border border-border space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">
                      {mood}
                    </Badge>
                    {track && (
                      <Badge variant="secondary" className="text-[10px] bg-green-500/20 text-green-700">
                        ✓ Ready
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              </div>

              {/* Music Controls */}
              {track ? (
                <Button
                  onClick={() => (isCurrentlyPlaying ? stopTrack() : playTrack(mood, track.audioBase64))}
                  disabled={isGenerating && selectedMood === mood}
                  className="w-full h-7 text-xs"
                  variant={isCurrentlyPlaying ? 'destructive' : 'default'}
                >
                  {isCurrentlyPlaying ? '⏸️ Dừng' : '▶️ Nghe'}
                </Button>
              ) : (
                <Button
                  onClick={() => generateMusic(mood)}
                  disabled={isGenerating}
                  className="w-full h-7 text-xs"
                  variant="outline"
                >
                  {isGenerating && selectedMood === mood ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Tạo...
                    </>
                  ) : (
                    <>
                      <Music className="h-3 w-3 mr-1" />
                      Tạo nhạc
                    </>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-muted-foreground pt-2 border-t space-y-1">
        <p>💡 ElevenLabs Music - Cần API key</p>
        <p>📝 Tương tự AI scripts, sử dụng music credits của workspace</p>
      </div>
    </Card>
  );
}
