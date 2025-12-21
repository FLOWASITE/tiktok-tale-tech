import { Film } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 gradient-primary rounded-xl blur-lg opacity-50 animate-pulse-glow" />
            <div className="relative gradient-primary p-2.5 rounded-xl">
              <Film className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gradient">TikTok Script AI</h1>
            <p className="text-xs text-muted-foreground">Tạo kịch bản video chuyên nghiệp</p>
          </div>
        </div>
      </div>
    </header>
  );
}