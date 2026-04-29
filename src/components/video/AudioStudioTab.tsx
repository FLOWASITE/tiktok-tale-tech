import { Music4, Mic, Type, Sparkles } from 'lucide-react';

export function AudioStudioTab() {
  const features = [
    { icon: Mic, title: 'Voiceover AI', desc: 'TTS đa ngôn ngữ với ElevenLabs. Tiếng Việt tự nhiên.' },
    { icon: Music4, title: 'Background Music', desc: 'Nhạc nền tự sinh theo mood (corporate, upbeat, cinematic).' },
    { icon: Type, title: 'Subtitle tự động', desc: 'Whisper transcribe + burn-in caption phong cách TikTok karaoke.' },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center">
          <Music4 className="w-5 h-5 text-foreground/70" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Audio Studio</h3>
          <p className="text-xs text-muted-foreground">Voiceover · Music · Subtitle — sắp ra mắt ở Phase 6</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <h4 className="text-sm font-medium text-foreground">{f.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Tính năng đang phát triển — sẽ tự động kích hoạt khi Phase 6 hoàn tất.
        </p>
      </div>
    </div>
  );
}
