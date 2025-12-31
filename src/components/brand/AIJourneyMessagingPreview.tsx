import { useState } from 'react';
import { Sparkles, Eye, Scale, CheckCircle, Heart, ChevronDown, ChevronUp, Copy, Check, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  JourneyStage,
  JourneyStageMessagingFormData,
  JOURNEY_STAGES,
  JOURNEY_STAGE_CONFIG,
  EMOTIONAL_TONE_CONFIG,
} from '@/types/journeyStageMessaging';

interface AIJourneyMessagingPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: Record<JourneyStage, JourneyStageMessagingFormData>;
  productName?: string;
  personaName?: string;
  onApplyStage: (stage: JourneyStage, data: JourneyStageMessagingFormData) => void;
  onApplyAll: () => void;
}

const STAGE_ICONS: Record<JourneyStage, React.ComponentType<{ className?: string }>> = {
  awareness: Eye,
  consideration: Scale,
  decision: CheckCircle,
  loyalty: Heart,
};

export function AIJourneyMessagingPreview({
  open,
  onOpenChange,
  suggestions,
  productName,
  personaName,
  onApplyStage,
  onApplyAll,
}: AIJourneyMessagingPreviewProps) {
  const [activeStage, setActiveStage] = useState<JourneyStage>('awareness');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success('Đã copy');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const renderFieldValue = (value: string | string[] | null | undefined, fieldName: string) => {
    if (!value) return <span className="text-muted-foreground italic">Chưa có</span>;
    
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-muted-foreground italic">Chưa có</span>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs font-normal">
              {item}
            </Badge>
          ))}
        </div>
      );
    }
    
    return (
      <div className="flex items-start gap-2 group">
        <p className="text-sm flex-1">{value}</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={() => copyToClipboard(value, fieldName)}
        >
          {copiedField === fieldName ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    );
  };

  const currentSuggestion = suggestions[activeStage];
  const config = JOURNEY_STAGE_CONFIG[activeStage];
  const toneConfig = currentSuggestion?.emotional_tone 
    ? EMOTIONAL_TONE_CONFIG[currentSuggestion.emotional_tone]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base">AI Gợi ý Journey Messaging</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {productName && personaName ? (
                  <span className="flex items-center gap-1">
                    <Badge variant="outline" className="font-medium">{productName}</Badge>
                    <ArrowRight className="w-3 h-3" />
                    <Badge variant="outline" className="font-medium">{personaName}</Badge>
                  </span>
                ) : (
                  'Xem trước và áp dụng gợi ý AI'
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs 
          value={activeStage} 
          onValueChange={(v) => setActiveStage(v as JourneyStage)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid grid-cols-4 mx-6 mt-4">
            {JOURNEY_STAGES.map(stage => {
              const stageConfig = JOURNEY_STAGE_CONFIG[stage];
              const Icon = STAGE_ICONS[stage];
              const hasData = suggestions[stage]?.headline || suggestions[stage]?.hook;
              
              return (
                <TabsTrigger 
                  key={stage} 
                  value={stage}
                  className="relative flex flex-col gap-0.5 py-2"
                >
                  <div className="flex items-center gap-1">
                    <Icon className={cn("w-3.5 h-3.5", stageConfig.color)} />
                    <span className="text-[11px] font-medium">{stageConfig.label}</span>
                  </div>
                  {hasData && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <ScrollArea className="flex-1 px-6 py-4">
            {JOURNEY_STAGES.map(stage => (
              <TabsContent key={stage} value={stage} className="m-0 space-y-4">
                {/* Stage header */}
                <div className={cn("p-3 rounded-lg", config.bgColor, config.borderColor, "border")}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={cn("font-semibold text-sm", config.color)}>
                        {config.labelEn}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {config.description}
                      </p>
                    </div>
                    {toneConfig && (
                      <Badge variant="secondary" className="gap-1">
                        {toneConfig.label}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Main content fields */}
                <div className="space-y-3">
                  {/* Headline */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Headline</label>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      {renderFieldValue(currentSuggestion?.headline, `headline-${stage}`)}
                    </div>
                  </div>

                  {/* Hook */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Hook</label>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      {renderFieldValue(currentSuggestion?.hook, `hook-${stage}`)}
                    </div>
                  </div>

                  {/* Key Message */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Key Message</label>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      {renderFieldValue(currentSuggestion?.key_message, `key_message-${stage}`)}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">CTA Template</label>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      {renderFieldValue(currentSuggestion?.cta_template, `cta-${stage}`)}
                    </div>
                  </div>
                </div>

                {/* Collapsible sections */}
                <div className="space-y-2 pt-2">
                  {/* Pain Points Focus */}
                  <Collapsible open={expandedSections[`pain-${stage}`]}>
                    <CollapsibleTrigger 
                      className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-lg transition-colors"
                      onClick={() => toggleSection(`pain-${stage}`)}
                    >
                      <span className="text-xs font-medium">Pain Points Focus</span>
                      {expandedSections[`pain-${stage}`] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-2 pb-2">
                      {renderFieldValue(currentSuggestion?.pain_points_focus, `pain-${stage}`)}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Benefits Highlight */}
                  <Collapsible open={expandedSections[`benefits-${stage}`]}>
                    <CollapsibleTrigger 
                      className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-lg transition-colors"
                      onClick={() => toggleSection(`benefits-${stage}`)}
                    >
                      <span className="text-xs font-medium">Benefits Highlight</span>
                      {expandedSections[`benefits-${stage}`] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-2 pb-2">
                      {renderFieldValue(currentSuggestion?.benefits_highlight, `benefits-${stage}`)}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Content Types */}
                  <Collapsible open={expandedSections[`content-${stage}`]}>
                    <CollapsibleTrigger 
                      className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-lg transition-colors"
                      onClick={() => toggleSection(`content-${stage}`)}
                    >
                      <span className="text-xs font-medium">Content Types</span>
                      {expandedSections[`content-${stage}`] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-2 pb-2">
                      {renderFieldValue(currentSuggestion?.content_types, `content-${stage}`)}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Objection Response */}
                  {currentSuggestion?.objection_response && (
                    <Collapsible open={expandedSections[`objection-${stage}`]}>
                      <CollapsibleTrigger 
                        className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-lg transition-colors"
                        onClick={() => toggleSection(`objection-${stage}`)}
                      >
                        <span className="text-xs font-medium">Objection Response</span>
                        {expandedSections[`objection-${stage}`] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-2 pb-2">
                        {renderFieldValue(currentSuggestion?.objection_response, `objection-${stage}`)}
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Avoid Messages */}
                  {currentSuggestion?.avoid_messages && currentSuggestion.avoid_messages.length > 0 && (
                    <Collapsible open={expandedSections[`avoid-${stage}`]}>
                      <CollapsibleTrigger 
                        className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-lg transition-colors"
                        onClick={() => toggleSection(`avoid-${stage}`)}
                      >
                        <span className="text-xs font-medium text-destructive">Avoid Messages</span>
                        {expandedSections[`avoid-${stage}`] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-2 pb-2">
                        {renderFieldValue(currentSuggestion?.avoid_messages, `avoid-${stage}`)}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t">
          <div className="flex items-center justify-between w-full gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onApplyStage(activeStage, suggestions[activeStage])}
              >
                Áp dụng {JOURNEY_STAGE_CONFIG[activeStage].label}
              </Button>
              <Button
                type="button"
                onClick={onApplyAll}
                className="gap-2"
              >
                <Check className="w-4 h-4" />
                Áp dụng tất cả
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
