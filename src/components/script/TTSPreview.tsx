import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { AlertCircle, Loader2, RefreshCw, Volume2 } from 'lucide-react';
import { ScriptAnalysis } from '@/hooks/useScriptAnalysis';
import { supabase } from '@/integrations/supabase/client';

interface TTSPreviewProps {
  script: any;
  analysis?: ScriptAnalysis;
}

const voiceOptions = [
  { id: 'google-us-en-1', label: 'Nữ Mỹ (US)' },
  { id: 'google-us-en-2', label: 'Nam Mỹ (US)' },
  { id: 'google-vi-vn', label: 'Nữ Việt Nam' },
];

export function TTSPreview({ script, analysis }: TTSPreviewProps) {
  const [selectedVoice, setSelectedVoice] = useState('google-us-en-1');
  const [speed, setSpeed] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleGenerateTTS = () => {
    // Use Web Speech API (browser-native, free)
    const utterance = new SpeechSynthesisUtterance(script.content);
    utterance.rate = speed;
    
    // Find voice by language
    const voices = window.speechSynthesis.getVoices();
    const selectedVoiceObj = voices.find(v => v.voiceURI.includes('Google'));
    if (selectedVoiceObj) {
      utterance.voice = selectedVoiceObj;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setError(null);
    };

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = (event) => {
      setError(`TTS Error: ${event.error}`);
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleStopTTS = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  return (
    <Card className="p-4 bg-muted/50 border-0 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">TTS Preview</span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded border border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Voice Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Giọng:</label>
        <div className="grid grid-cols-3 gap-2">
          {voiceOptions.map((voice) => (
            <Button
              key={voice.id}
              variant={selectedVoice === voice.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedVoice(voice.id)}
              className="h-8 text-xs"
              disabled={isPlaying}
            >
              {voice.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Speed Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Tốc độ:</label>
          <span className="text-xs text-muted-foreground">{(speed * 100).toFixed(0)}%</span>
        </div>
        <Slider
          value={[speed]}
          onValueChange={(val) => setSpeed(val[0])}
          min={0.5}
          max={2}
          step={0.1}
          disabled={isPlaying}
          className="w-full"
        />
      </div>

      {/* Playback Controls */}
      <div className="flex gap-2">
        <Button
          onClick={isPlaying ? handleStopTTS : handleGenerateTTS}
          disabled={isGenerating}
          className="flex-1 h-8 text-xs"
          variant={isPlaying ? 'destructive' : 'default'}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Đang tạo...
            </>
          ) : isPlaying ? (
            <>Dừng</>
          ) : (
            <>▶️ Nghe thử</>
          )}
        </Button>
        <Button
          onClick={() => window.speechSynthesis.cancel()}
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={!isPlaying}
        >
          Reset
        </Button>
      </div>

      <div className="text-[10px] text-muted-foreground pt-1 border-t">
        💡 Web Speech API - miễn phí, không cần API key
      </div>
    </Card>
  );
}
