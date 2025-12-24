import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  ChevronUp, 
  ChevronDown,
  Maximize2,
  Minimize2,
  Settings,
  Eye
} from 'lucide-react';
import { Script, DURATION_LABELS } from '@/types/script';
import { parseScriptContent, ParsedPrompt } from '@/utils/parsePrompts';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TeleprompterModeProps {
  script: Script;
  open: boolean;
  onClose: () => void;
}

export function TeleprompterMode({ script, open, onClose }: TeleprompterModeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(100); // words per minute
  const [fontSize, setFontSize] = useState(32);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mirrorMode, setMirrorMode] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const parsedPrompts = parseScriptContent(script.content);

  // Calculate scroll speed based on WPM
  const getScrollSpeed = useCallback(() => {
    // Average word length ~5 chars, line ~50 chars = ~10 words/line
    // At fontSize 32, line height ~48px
    // speed (WPM) / 60 = words per second
    // words per second / 10 = lines per second
    // lines per second * 48 = pixels per second
    const wordsPerSecond = speed / 60;
    const linesPerSecond = wordsPerSecond / 10;
    const pixelsPerSecond = linesPerSecond * (fontSize * 1.5);
    return pixelsPerSecond;
  }, [speed, fontSize]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !contentRef.current) return;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const scrollSpeed = getScrollSpeed();
      const newPosition = scrollPosition + scrollSpeed * deltaTime;
      
      const maxScroll = contentRef.current?.scrollHeight || 0;
      if (newPosition >= maxScroll) {
        setIsPlaying(false);
        return;
      }

      setScrollPosition(newPosition);
      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, scrollPosition, getScrollSpeed]);

  // Update current prompt based on scroll position
  useEffect(() => {
    if (!contentRef.current) return;
    
    const promptElements = contentRef.current.querySelectorAll('[data-prompt-index]');
    const containerCenter = scrollPosition + 200; // Focus area
    
    promptElements.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      const top = htmlEl.offsetTop;
      const bottom = top + htmlEl.offsetHeight;
      
      if (containerCenter >= top && containerCenter < bottom) {
        setCurrentPromptIndex(index);
      }
    });
  }, [scrollPosition]);

  // Keyboard controls
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setScrollPosition(prev => Math.max(0, prev - 50));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setScrollPosition(prev => prev + 50);
          break;
        case 'Escape':
          onClose();
          break;
        case 'r':
          handleReset();
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleReset = () => {
    setIsPlaying(false);
    setScrollPosition(0);
    setCurrentPromptIndex(0);
    lastTimeRef.current = 0;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const goToPreviousPrompt = () => {
    if (currentPromptIndex > 0) {
      const newIndex = currentPromptIndex - 1;
      setCurrentPromptIndex(newIndex);
      const el = contentRef.current?.querySelector(`[data-prompt-index="${newIndex}"]`) as HTMLElement;
      if (el) {
        setScrollPosition(el.offsetTop);
      }
    }
  };

  const goToNextPrompt = () => {
    if (currentPromptIndex < parsedPrompts.length - 1) {
      const newIndex = currentPromptIndex + 1;
      setCurrentPromptIndex(newIndex);
      const el = contentRef.current?.querySelector(`[data-prompt-index="${newIndex}"]`) as HTMLElement;
      if (el) {
        setScrollPosition(el.offsetTop);
      }
    }
  };

  if (!open) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-white/30 text-white">
              {script.title}
            </Badge>
            <Badge variant="secondary" className="bg-white/10 text-white">
              {DURATION_LABELS[script.duration as keyof typeof DURATION_LABELS]}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Settings className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium mb-2 block">
                      Tốc độ: {speed} WPM
                    </label>
                    <Slider
                      value={[speed]}
                      onValueChange={([v]) => setSpeed(v)}
                      min={50}
                      max={250}
                      step={10}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-2 block">
                      Cỡ chữ: {fontSize}px
                    </label>
                    <Slider
                      value={[fontSize]}
                      onValueChange={([v]) => setFontSize(v)}
                      min={18}
                      max={64}
                      step={2}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Chế độ gương</span>
                    <Button
                      variant={mirrorMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMirrorMode(!mirrorMode)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/10"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div 
        className="flex-1 overflow-hidden relative"
        style={{ transform: mirrorMode ? 'scaleX(-1)' : undefined }}
      >
        {/* Focus Line */}
        <div className="absolute left-0 right-0 top-[200px] h-0.5 bg-primary/50 z-10 pointer-events-none" />
        <div className="absolute left-0 right-0 top-0 h-[200px] bg-gradient-to-b from-black/50 to-transparent z-10 pointer-events-none" />
        <div className="absolute left-0 right-0 bottom-0 h-[200px] bg-gradient-to-t from-black/50 to-transparent z-10 pointer-events-none" />

        {/* Scrolling Content */}
        <div 
          ref={contentRef}
          className="h-full"
          style={{
            transform: `translateY(-${scrollPosition}px)`,
            paddingTop: '200px',
            paddingBottom: '60vh',
          }}
        >
          <div className="max-w-3xl mx-auto px-8">
            {parsedPrompts.length > 0 ? (
              parsedPrompts.map((prompt, index) => (
                <PromptBlock
                  key={index}
                  prompt={prompt}
                  index={index}
                  isActive={index === currentPromptIndex}
                  fontSize={fontSize}
                  mirrorMode={mirrorMode}
                />
              ))
            ) : (
              <div 
                className="text-white leading-relaxed"
                style={{ 
                  fontSize: `${fontSize}px`,
                  transform: mirrorMode ? 'scaleX(-1)' : undefined 
                }}
              >
                {script.content}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-6">
        <div className="flex items-center justify-center gap-4 max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousPrompt}
            disabled={currentPromptIndex === 0}
            className="text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronUp className="w-6 h-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="text-white hover:bg-white/10"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>

          <Button
            size="lg"
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              "w-16 h-16 rounded-full",
              isPlaying 
                ? "bg-white text-black hover:bg-white/90" 
                : "bg-primary hover:bg-primary/90"
            )}
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </Button>

          <div className="text-white text-sm min-w-[60px] text-center">
            {currentPromptIndex + 1} / {parsedPrompts.length || 1}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextPrompt}
            disabled={currentPromptIndex >= parsedPrompts.length - 1}
            className="text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronDown className="w-6 h-6" />
          </Button>
        </div>

        {/* Keyboard hints */}
        <div className="flex items-center justify-center gap-4 mt-3 text-white/50 text-xs">
          <span>Space: Play/Pause</span>
          <span>↑↓: Cuộn</span>
          <span>R: Reset</span>
          <span>F: Fullscreen</span>
          <span>Esc: Thoát</span>
        </div>
      </div>
    </div>
  );
}

function PromptBlock({ 
  prompt, 
  index, 
  isActive, 
  fontSize,
  mirrorMode 
}: { 
  prompt: ParsedPrompt; 
  index: number; 
  isActive: boolean;
  fontSize: number;
  mirrorMode: boolean;
}) {
  return (
    <div 
      data-prompt-index={index}
      className={cn(
        "mb-12 transition-all duration-300",
        isActive ? "opacity-100" : "opacity-40"
      )}
      style={{ transform: mirrorMode ? 'scaleX(-1)' : undefined }}
    >
      <div className="flex items-center gap-3 mb-4">
        <Badge 
          variant={isActive ? "default" : "outline"} 
          className={cn(
            "transition-all",
            isActive ? "bg-primary" : "border-white/30 text-white/50"
          )}
        >
          PROMPT {prompt.promptNumber}
        </Badge>
        {prompt.duration && (
          <span className="text-white/50 text-sm">{prompt.duration}</span>
        )}
      </div>

      {prompt.dialogue && (
        <p 
          className={cn(
            "text-white leading-relaxed font-medium",
            isActive && "text-white"
          )}
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
        >
          {prompt.dialogue}
        </p>
      )}

      {prompt.motion && (
        <p className="text-primary/70 mt-3 text-base italic">
          [{prompt.motion}]
        </p>
      )}

      {prompt.tone && (
        <p className="text-yellow-500/70 mt-2 text-sm">
          Giọng: {prompt.tone}
        </p>
      )}
    </div>
  );
}
