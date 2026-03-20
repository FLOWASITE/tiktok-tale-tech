import { ParsedPrompt, getBlockLabel } from '@/utils/parsePrompts';
import { ScriptPurpose, normalizePurpose } from '@/types/script';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Copy, 
  Check, 
  Clock, 
  Activity, 
  MessageSquare, 
  Smile, 
  Camera, 
  Sun, 
  Volume2, 
  Film, 
  Mic, 
  FileText,
  Type,
  Pause,
  Gauge,
  Heart,
  Lightbulb
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PromptSuggestionPopover } from './PromptSuggestionPopover';

interface PurposeAwarePromptCardProps {
  prompt: ParsedPrompt;
  purpose?: ScriptPurpose;
  totalPrompts?: number;
  videoType?: string;
  characterType?: string;
  fullScriptContext?: string;
  onApplySuggestion?: (promptNumber: number, newContent: string) => void;
}

// Section component for consistent styling
function Section({ 
  icon: Icon, 
  label, 
  content, 
  iconColor = 'text-muted-foreground',
  contentClass = ''
}: { 
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  content: string | undefined;
  iconColor?: string;
  contentClass?: string;
}) {
  if (!content) return null;
  
  return (
    <div className="flex gap-1.5 xs:gap-2">
      <Icon className={cn("w-3.5 xs:w-4 h-3.5 xs:h-4 mt-0.5 flex-shrink-0", iconColor)} />
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground text-[10px] xs:text-xs">{label}:</span>
        <p className={cn("text-foreground text-xs xs:text-sm", contentClass)}>{content}</p>
      </div>
    </div>
  );
}

// VEO 3 card layout
function Veo3Card({ prompt }: { prompt: ParsedPrompt }) {
  return (
    <div className="space-y-1.5 xs:space-y-2">
      <Section icon={Camera} label="Visual Direction" content={prompt.shotType || prompt.cameraMovement} iconColor="text-blue-500" />
      <Section icon={Activity} label="Character Action" content={prompt.characterAction || prompt.motion} iconColor="text-secondary" />
      <Section icon={MessageSquare} label="Dialogue" content={prompt.dialogue} iconColor="text-primary" contentClass="italic" />
      <Section icon={Smile} label="Tone & Delivery" content={prompt.tone} iconColor="text-yellow-500" />
      {(prompt.ambience || prompt.sfx || prompt.musicMood) && (
        <Section 
          icon={Volume2} 
          label="Audio Notes" 
          content={[prompt.ambience, prompt.sfx, prompt.musicMood].filter(Boolean).join(' • ')} 
          iconColor="text-purple-500" 
        />
      )}
      <Section icon={Type} label="Text Overlay" content={prompt.textOverlay} iconColor="text-orange-500" />
    </div>
  );
}

// Minimax card layout
function MinimaxCard({ prompt }: { prompt: ParsedPrompt }) {
  return (
    <div className="space-y-1.5 xs:space-y-2">
      <Section icon={Film} label="Scene" content={prompt.scene} iconColor="text-blue-500" />
      <Section icon={Camera} label="Camera Motion" content={prompt.cameraMotion} iconColor="text-secondary" />
      <Section icon={MessageSquare} label="Voice" content={prompt.voice || prompt.dialogue} iconColor="text-primary" contentClass="italic" />
    </div>
  );
}

// Teleprompter card layout
function TeleprompterCard({ prompt }: { prompt: ParsedPrompt }) {
  return (
    <div className="space-y-1.5 xs:space-y-2">
      <Section icon={Lightbulb} label="Cue" content={prompt.cue} iconColor="text-yellow-500" />
      <Section icon={MessageSquare} label="Lời thoại" content={prompt.dialogue} iconColor="text-primary" contentClass="text-base font-medium" />
      <Section icon={Type} label="Nhấn mạnh" content={prompt.emphasis} iconColor="text-orange-500" />
      <Section icon={Pause} label="Nghỉ" content={prompt.pause} iconColor="text-muted-foreground" />
    </div>
  );
}

// Voice-over card layout
function VoiceoverCard({ prompt }: { prompt: ParsedPrompt }) {
  return (
    <div className="space-y-1.5 xs:space-y-2">
      <Section icon={MessageSquare} label="Lời thoại" content={prompt.dialogue} iconColor="text-primary" contentClass="text-base" />
      {prompt.voiceGuide && (
        <div className="mt-2 p-2 rounded-md bg-muted/50 border border-border/50">
          <span className="text-muted-foreground text-[10px] xs:text-xs flex items-center gap-1 mb-1">
            <Mic className="w-3 h-3" /> Hướng dẫn giọng
          </span>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <Section icon={Smile} label="Tone" content={prompt.tone} iconColor="text-yellow-500" />
            <Section icon={Gauge} label="Tempo" content={prompt.tempo} iconColor="text-blue-500" />
            <Section icon={Type} label="Nhấn mạnh" content={prompt.emphasis} iconColor="text-orange-500" />
            <Section icon={Pause} label="Pause" content={prompt.pause} iconColor="text-muted-foreground" />
            <Section icon={Heart} label="Cảm xúc" content={prompt.emotion} iconColor="text-red-500" />
          </div>
        </div>
      )}
      {!prompt.voiceGuide && (
        <>
          <Section icon={Smile} label="Tone" content={prompt.tone} iconColor="text-yellow-500" />
          <Section icon={Gauge} label="Tempo" content={prompt.tempo} iconColor="text-blue-500" />
          <Section icon={Type} label="Nhấn mạnh" content={prompt.emphasis} iconColor="text-orange-500" />
        </>
      )}
    </div>
  );
}

// Production card layout
function ProductionCard({ prompt }: { prompt: ParsedPrompt }) {
  return (
    <div className="space-y-1.5 xs:space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Section icon={Camera} label="Camera" content={prompt.camera} iconColor="text-blue-500" />
        <Section icon={Sun} label="Lighting" content={prompt.lighting} iconColor="text-yellow-500" />
      </div>
      <Section icon={Volume2} label="Audio" content={prompt.audio} iconColor="text-purple-500" />
      <Section icon={Activity} label="Action" content={prompt.motion} iconColor="text-secondary" />
      <Section icon={MessageSquare} label="Dialogue" content={prompt.dialogue} iconColor="text-primary" contentClass="italic" />
      {prompt.editorNotes && (
        <div className="mt-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
          <Section icon={FileText} label="Editor Notes" content={prompt.editorNotes} iconColor="text-amber-500" />
        </div>
      )}
    </div>
  );
}

// Fallback card for unparsed content
function FallbackCard({ prompt }: { prompt: ParsedPrompt }) {
  return (
    <pre className="text-[10px] xs:text-xs whitespace-pre-wrap text-muted-foreground">
      {prompt.rawContent}
    </pre>
  );
}

export function PurposeAwarePromptCard({ 
  prompt, 
  purpose: rawPurpose = 'ai_video',
  totalPrompts = 8,
  videoType,
  characterType,
  fullScriptContext,
  onApplySuggestion
}: PurposeAwarePromptCardProps) {
  const purpose = normalizePurpose(rawPurpose);
  const [copied, setCopied] = useState(false);
  const blockLabel = getBlockLabel(purpose);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.rawContent);
    setCopied(true);
    toast.success(`Đã sao chép ${blockLabel} ${prompt.promptNumber}!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplySuggestion = (suggestion: string) => {
    if (onApplySuggestion) {
      onApplySuggestion(prompt.promptNumber, suggestion);
    }
  };

  // Check if we have meaningful parsed content
  const hasParsedContent = () => {
    switch(purpose) {
      case 'ai_video_minimax':
        return prompt.scene || prompt.cameraMotion || prompt.voice || prompt.dialogue;
      case 'teleprompter':
        return prompt.cue || prompt.dialogue || prompt.emphasis;
      case 'voiceover':
        return prompt.dialogue || prompt.voiceGuide || prompt.tone;
      case 'production':
        return prompt.camera || prompt.lighting || prompt.motion || prompt.dialogue;
      default: // veo3
        return prompt.motion || prompt.dialogue || prompt.tone || prompt.shotType || prompt.characterAction;
    }
  };

  // Render card content based on purpose
  const renderContent = () => {
    if (!hasParsedContent()) {
      return <FallbackCard prompt={prompt} />;
    }

    switch(purpose) {
      case 'ai_video_minimax':
        return <MinimaxCard prompt={prompt} />;
      case 'teleprompter':
        return <TeleprompterCard prompt={prompt} />;
      case 'voiceover':
        return <VoiceoverCard prompt={prompt} />;
      case 'production':
        return <ProductionCard prompt={prompt} />;
      default:
        return <Veo3Card prompt={prompt} />;
    }
  };

  return (
    <Card className="bg-background/50 border-border/50 hover:border-primary/30 transition-all duration-300">
      <CardHeader className="py-2 xs:py-3 px-3 xs:px-4 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-xs xs:text-sm font-semibold text-primary">
          {blockLabel} {prompt.promptNumber}
        </CardTitle>
        <div className="flex items-center gap-1.5 xs:gap-2">
          {prompt.duration && (
            <span className="text-[10px] xs:text-xs text-muted-foreground flex items-center gap-0.5 xs:gap-1">
              <Clock className="w-2.5 xs:w-3 h-2.5 xs:h-3" />
              {prompt.duration}
            </span>
          )}
          {prompt.timestamp && (
            <span className="text-[10px] xs:text-xs text-muted-foreground">
              [{prompt.timestamp}]
            </span>
          )}
          <PromptSuggestionPopover
            promptContent={prompt.rawContent}
            promptNumber={prompt.promptNumber}
            totalPrompts={totalPrompts}
            videoType={videoType}
            characterType={characterType}
            scriptPurpose={purpose}
            fullScriptContext={fullScriptContext}
            onApplySuggestion={onApplySuggestion ? handleApplySuggestion : undefined}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 w-6 xs:h-7 xs:w-7 p-0 hover:bg-primary/10 hover:text-primary"
          >
            {copied ? <Check className="w-3 xs:w-3.5 h-3 xs:h-3.5" /> : <Copy className="w-3 xs:w-3.5 h-3 xs:h-3.5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="py-1.5 xs:py-2 px-3 xs:px-4 text-xs xs:text-sm">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
