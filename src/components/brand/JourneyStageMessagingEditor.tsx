import { useState, useEffect } from 'react';
import { Eye, Scale, CheckCircle, Heart, Route, Sparkles, Loader2, Save } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useJourneyStageMessaging } from '@/hooks/useJourneyStageMessaging';
import { 
  JourneyStage,
  JourneyStageMessagingFormData,
  JOURNEY_STAGES,
  JOURNEY_STAGE_CONFIG,
  DEFAULT_MESSAGING_FORM,
  getDefaultMessagingForStage,
} from '@/types/journeyStageMessaging';
import { JourneyStageTab } from './JourneyStageTab';

interface JourneyStageMessagingEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mappingId: string;
  productName?: string;
  personaName?: string;
  organizationId?: string | null;
  onSave?: () => void;
}

const STAGE_ICONS: Record<JourneyStage, React.ComponentType<{ className?: string }>> = {
  awareness: Eye,
  consideration: Scale,
  decision: CheckCircle,
  loyalty: Heart,
};

export function JourneyStageMessagingEditor({
  open,
  onOpenChange,
  mappingId,
  productName,
  personaName,
  organizationId,
  onSave,
}: JourneyStageMessagingEditorProps) {
  const [activeStage, setActiveStage] = useState<JourneyStage>('awareness');
  const [localForms, setLocalForms] = useState<Record<JourneyStage, JourneyStageMessagingFormData>>({
    awareness: { ...DEFAULT_MESSAGING_FORM },
    consideration: { ...DEFAULT_MESSAGING_FORM },
    decision: { ...DEFAULT_MESSAGING_FORM },
    loyalty: { ...DEFAULT_MESSAGING_FORM },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const {
    messaging,
    isLoading,
    getMessagingForStage,
    upsertMessaging,
    createDefaultsForAllStages,
    getCompletionStatus,
    getStagesWithContent,
  } = useJourneyStageMessaging({ 
    mappingId,
    enabled: open && !!mappingId,
  });

  // Load existing data into local forms
  useEffect(() => {
    if (messaging.length > 0) {
      const newForms = { ...localForms };
      JOURNEY_STAGES.forEach(stage => {
        const existing = getMessagingForStage(stage);
        if (existing) {
          newForms[stage] = {
            headline: existing.headline || '',
            hook: existing.hook || '',
            key_message: existing.key_message || '',
            pain_points_focus: existing.pain_points_focus || [],
            benefits_highlight: existing.benefits_highlight || [],
            cta_template: existing.cta_template || '',
            emotional_tone: existing.emotional_tone || null,
            objection_response: existing.objection_response || '',
            content_types: existing.content_types || [],
            avoid_messages: existing.avoid_messages || [],
          };
        }
      });
      setLocalForms(newForms);
    }
  }, [messaging]);

  const handleFormChange = (stage: JourneyStage, data: Partial<JourneyStageMessagingFormData>) => {
    setLocalForms(prev => ({
      ...prev,
      [stage]: { ...prev[stage], ...data },
    }));
    setHasChanges(true);
  };

  const handleSaveStage = async (stage: JourneyStage) => {
    if (!mappingId) return;
    
    setIsSaving(true);
    try {
      await upsertMessaging(mappingId, stage, localForms[stage], organizationId || undefined);
      toast.success(`Đã lưu ${JOURNEY_STAGE_CONFIG[stage].label}`);
      setHasChanges(false);
    } catch (error) {
      toast.error('Không thể lưu. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateDefaults = async () => {
    if (!mappingId) return;
    
    setIsSaving(true);
    try {
      await createDefaultsForAllStages(mappingId, organizationId || undefined);
      toast.success('Đã tạo mẫu cho tất cả giai đoạn');
    } catch (error) {
      toast.error('Không thể tạo mẫu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      // Could add confirmation dialog here
    }
    onOpenChange(false);
    onSave?.();
  };

  const completionStatus = getCompletionStatus();
  const stagesWithContent = getStagesWithContent();
  const overallProgress = Math.round(
    Object.values(completionStatus).reduce((sum, pct) => sum + pct, 0) / JOURNEY_STAGES.length
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[640px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-amber-500 to-emerald-500 flex items-center justify-center">
              <Route className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base">Journey Stage Messaging</SheetTitle>
              <SheetDescription className="text-xs">
                {productName && personaName 
                  ? `${productName} → ${personaName}`
                  : 'Cấu hình messaging cho từng giai đoạn'
                }
              </SheetDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCreateDefaults}
              disabled={isSaving || stagesWithContent.length === JOURNEY_STAGES.length}
              className="gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Tạo mẫu
            </Button>
          </div>
          
          {/* Overall Progress */}
          <div className="flex items-center gap-3 mt-3">
            <Progress value={overallProgress} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground font-medium">
              {overallProgress}%
            </span>
          </div>
        </SheetHeader>

        {/* Tabs Content */}
        <Tabs 
          value={activeStage} 
          onValueChange={(v) => setActiveStage(v as JourneyStage)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid grid-cols-4 mx-6 mt-4 shrink-0">
            {JOURNEY_STAGES.map(stage => {
              const config = JOURNEY_STAGE_CONFIG[stage];
              const Icon = STAGE_ICONS[stage];
              const completion = completionStatus[stage] || 0;
              const hasContent = stagesWithContent.includes(stage);
              
              return (
                <TabsTrigger 
                  key={stage} 
                  value={stage}
                  className="relative flex flex-col gap-0.5 py-2 px-1 data-[state=active]:bg-muted"
                >
                  <div className="flex items-center gap-1">
                    <Icon className={cn("w-3.5 h-3.5", hasContent && "text-primary")} />
                    <span className="text-[11px] font-medium hidden sm:inline">{config.label}</span>
                    <span className="text-[11px] font-medium sm:hidden">{config.icon}</span>
                  </div>
                  {hasContent && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            {JOURNEY_STAGES.map(stage => (
              <TabsContent key={stage} value={stage} className="m-0 h-full">
                <JourneyStageTab
                  stage={stage}
                  formData={localForms[stage]}
                  onChange={(data) => handleFormChange(stage, data)}
                  isLoading={isLoading}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t shrink-0">
          <div className="flex items-center justify-between w-full gap-3">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Đóng
            </Button>
            <Button
              type="button"
              onClick={() => handleSaveStage(activeStage)}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Lưu {JOURNEY_STAGE_CONFIG[activeStage].label}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
