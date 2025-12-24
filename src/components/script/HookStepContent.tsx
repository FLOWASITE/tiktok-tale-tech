import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Library, 
  Lightbulb, 
  Sparkles, 
  SkipForward,
  HelpCircle,
  Check,
  Zap
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { HookLibrary } from '@/components/script/HookLibrary';
import { HookDetails } from '@/types/script';
import { FRAMEWORK_LABELS, FRAMEWORK_ICONS } from '@/types/hook';
import { cn } from '@/lib/utils';

interface QuickHookSuggestion {
  framework: string;
  opening_line: string;
  visual_direction?: string;
  text_overlay?: string;
}

interface HookStepContentProps {
  topic: string;
  selectedHook?: HookDetails;
  onSelectHook: (hook: HookDetails) => void;
  onSkip: () => void;
  brandTemplateId?: string;
  brandVoice?: {
    brand_name?: string;
    tone_of_voice?: string[];
    formality_level?: string;
    preferred_words?: string[];
    forbidden_words?: string[];
    brand_positioning?: string;
  };
  quickSuggestions?: QuickHookSuggestion[];
  isLoadingSuggestions?: boolean;
}

const HOOK_EDUCATION = {
  title: 'Hook là gì?',
  description: 'Hook là câu mở đầu video giúp thu hút người xem trong 3 giây đầu tiên. Một hook tốt sẽ khiến người xem muốn xem tiếp.',
  frameworks: [
    { name: 'Question', icon: '❓', desc: 'Đặt câu hỏi kích thích tò mò' },
    { name: 'Controversy', icon: '🔥', desc: 'Đưa ra quan điểm gây tranh cãi' },
    { name: 'Shock', icon: '😱', desc: 'Tạo bất ngờ với thông tin sốc' },
    { name: 'Story', icon: '📖', desc: 'Bắt đầu bằng câu chuyện hấp dẫn' },
  ],
};

export function HookStepContent({
  topic,
  selectedHook,
  onSelectHook,
  onSkip,
  brandTemplateId,
  brandVoice,
  quickSuggestions = [],
  isLoadingSuggestions = false,
}: HookStepContentProps) {
  const [hookLibraryOpen, setHookLibraryOpen] = useState(false);
  const [showEducation, setShowEducation] = useState(false);

  const handleQuickSelect = (suggestion: QuickHookSuggestion) => {
    onSelectHook({
      opening_line: suggestion.opening_line,
      framework: suggestion.framework,
      visual_direction: suggestion.visual_direction,
      text_overlay: suggestion.text_overlay,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with education tooltip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Chọn Hook mở đầu</h3>
            <p className="text-xs text-muted-foreground">
              Thu hút người xem trong 3 giây đầu tiên
            </p>
          </div>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowEducation(!showEducation)}
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-sm">{HOOK_EDUCATION.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Education Section - Collapsible */}
      <Collapsible open={showEducation} onOpenChange={setShowEducation}>
        <CollapsibleContent>
          <Card className="border-amber-500/30 bg-amber-500/5 mb-4">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="font-medium text-sm">{HOOK_EDUCATION.title}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {HOOK_EDUCATION.description}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {HOOK_EDUCATION.frameworks.map((fw) => (
                  <div 
                    key={fw.name}
                    className="flex items-center gap-2 p-2 rounded-lg bg-background/50"
                  >
                    <span>{fw.icon}</span>
                    <div>
                      <p className="text-xs font-medium">{fw.name}</p>
                      <p className="text-[10px] text-muted-foreground">{fw.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Topic context */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground mb-1">Chủ đề của bạn:</p>
        <p className="text-sm font-medium text-foreground line-clamp-2">{topic}</p>
      </div>

      {/* Selected Hook Display */}
      {selectedHook && (
        <Card className="border-primary/30 bg-primary/5 animate-scale-in">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm text-primary">Đã chọn Hook</span>
                <Badge variant="secondary" className="text-xs">
                  {FRAMEWORK_LABELS[selectedHook.framework || ''] || selectedHook.framework}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-foreground bg-background/80 rounded-lg p-3 border border-border/50">
              🎬 "{selectedHook.opening_line}"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Suggestions */}
      {!selectedHook && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Gợi ý nhanh từ AI</span>
            {isLoadingSuggestions && (
              <Badge variant="outline" className="text-xs animate-pulse">
                Đang tạo...
              </Badge>
            )}
          </div>

          {isLoadingSuggestions ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : quickSuggestions.length > 0 ? (
            <div className="space-y-2">
              {quickSuggestions.map((suggestion, index) => (
                <Card
                  key={index}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5",
                    "border-border"
                  )}
                  onClick={() => handleQuickSelect(suggestion)}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {FRAMEWORK_ICONS[suggestion.framework] || '🎣'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {FRAMEWORK_LABELS[suggestion.framework] || suggestion.framework}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground">
                      "{suggestion.opening_line}"
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Mở Hook Library để xem thêm tùy chọn
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => setHookLibraryOpen(true)}
        >
          <Library className="w-4 h-4" />
          Mở Hook Library đầy đủ
        </Button>
        
        <Button
          variant="ghost"
          className="flex-1 gap-2 text-muted-foreground hover:text-foreground"
          onClick={onSkip}
        >
          <SkipForward className="w-4 h-4" />
          Bỏ qua bước này
        </Button>
      </div>

      {/* Hook Library Dialog */}
      <HookLibrary
        open={hookLibraryOpen}
        onOpenChange={setHookLibraryOpen}
        brandTemplateId={brandTemplateId}
        initialTopic={topic}
        brandVoice={brandVoice}
        onSelectHook={(hook) => {
          onSelectHook(hook);
          setHookLibraryOpen(false);
        }}
      />
    </div>
  );
}
