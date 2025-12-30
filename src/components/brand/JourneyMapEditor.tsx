import React from 'react';
import { Eye, Scale, CheckCircle, Heart, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  JourneyStep, 
  JourneyStage,
  JOURNEY_STAGES, 
  JOURNEY_TOUCHPOINTS, 
  JOURNEY_CONTENT_TYPES,
  getDefaultJourneyMap 
} from '@/types/customerPersona';

interface JourneyMapEditorProps {
  value: JourneyStep[];
  onChange: (steps: JourneyStep[]) => void;
  compact?: boolean;
}

const STAGE_ICONS: Record<JourneyStage, React.ReactNode> = {
  awareness: <Eye className="h-4 w-4" />,
  consideration: <Scale className="h-4 w-4" />,
  decision: <CheckCircle className="h-4 w-4" />,
  loyalty: <Heart className="h-4 w-4" />,
};

const STAGE_COLORS: Record<JourneyStage, string> = {
  awareness: 'bg-blue-500/10 border-blue-500/30 text-blue-600',
  consideration: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
  decision: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600',
  loyalty: 'bg-rose-500/10 border-rose-500/30 text-rose-600',
};

export function JourneyMapEditor({ value, onChange, compact = false }: JourneyMapEditorProps) {
  // Ensure all 4 stages exist
  const normalizedSteps = React.useMemo(() => {
    const existingMap = new Map(value.map(s => [s.stage, s]));
    return JOURNEY_STAGES.map(stage => 
      existingMap.get(stage.value) || { 
        stage: stage.value, 
        touchpoints: [], 
        content_type: '' 
      }
    );
  }, [value]);

  const updateStep = (stage: JourneyStage, updates: Partial<JourneyStep>) => {
    const newSteps = normalizedSteps.map(step => 
      step.stage === stage ? { ...step, ...updates } : step
    );
    onChange(newSteps);
  };

  const toggleTouchpoint = (stage: JourneyStage, touchpoint: string) => {
    const step = normalizedSteps.find(s => s.stage === stage);
    if (!step) return;
    
    const current = step.touchpoints || [];
    const updated = current.includes(touchpoint)
      ? current.filter(t => t !== touchpoint)
      : [...current, touchpoint];
    
    updateStep(stage, { touchpoints: updated });
  };

  const handleUseDefault = () => {
    onChange(getDefaultJourneyMap());
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Customer Journey</span>
          <Button variant="ghost" size="sm" onClick={handleUseDefault} className="text-xs h-7">
            Dùng mẫu mặc định
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {JOURNEY_STAGES.map(stage => {
            const step = normalizedSteps.find(s => s.stage === stage.value);
            const hasData = step && (step.touchpoints.length > 0 || step.content_type);
            return (
              <TooltipProvider key={stage.value}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`p-2 rounded border text-center cursor-default ${
                      hasData ? STAGE_COLORS[stage.value] : 'bg-muted/30 border-border text-muted-foreground'
                    }`}>
                      <div className="flex justify-center mb-1">
                        {STAGE_ICONS[stage.value]}
                      </div>
                      <div className="text-[10px] font-medium truncate">{stage.label}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="text-xs">
                      <p className="font-medium">{stage.label}</p>
                      {step?.touchpoints?.length ? (
                        <p className="text-muted-foreground">
                          Kênh: {step.touchpoints.map(t => 
                            JOURNEY_TOUCHPOINTS.find(tp => tp.value === t)?.label || t
                          ).join(', ')}
                        </p>
                      ) : null}
                      {step?.content_type && (
                        <p className="text-muted-foreground">
                          Nội dung: {JOURNEY_CONTENT_TYPES.find(ct => ct.value === step.content_type)?.label || step.content_type}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Customer Journey Map</h4>
          <p className="text-xs text-muted-foreground">
            Xác định touchpoints và loại content cho từng giai đoạn
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleUseDefault} className="text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Dùng mẫu mặc định
        </Button>
      </div>

      {/* Timeline visualization */}
      <div className="relative">
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-border" />
        <div className="grid grid-cols-4 gap-2 relative">
          {JOURNEY_STAGES.map((stage, index) => {
            const step = normalizedSteps.find(s => s.stage === stage.value);
            const hasData = step && (step.touchpoints.length > 0 || step.content_type);
            
            return (
              <div key={stage.value} className="relative">
                {/* Stage indicator */}
                <div className={`relative z-10 w-12 h-12 mx-auto rounded-full border-2 flex items-center justify-center transition-colors ${
                  hasData 
                    ? STAGE_COLORS[stage.value].replace('bg-', 'bg-').replace('/10', '') + ' border-current' 
                    : 'bg-background border-border text-muted-foreground'
                }`}>
                  {STAGE_ICONS[stage.value]}
                </div>
                
                {/* Stage card */}
                <div className={`mt-4 p-3 rounded-lg border transition-colors ${
                  hasData ? STAGE_COLORS[stage.value] : 'bg-muted/20 border-border'
                }`}>
                  <div className="text-center mb-3">
                    <div className="text-xs font-semibold">{stage.label}</div>
                    <div className="text-[10px] text-muted-foreground">{stage.description}</div>
                  </div>

                  {/* Touchpoints */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Touchpoints
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {JOURNEY_TOUCHPOINTS.slice(0, 6).map(tp => {
                        const isSelected = step?.touchpoints?.includes(tp.value);
                        return (
                          <Badge
                            key={tp.value}
                            variant={isSelected ? 'default' : 'outline'}
                            className={`text-[9px] px-1.5 py-0 cursor-pointer transition-colors ${
                              isSelected ? '' : 'opacity-50 hover:opacity-100'
                            }`}
                            onClick={() => toggleTouchpoint(stage.value, tp.value)}
                          >
                            {tp.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {/* Content Type */}
                  <div className="mt-3 space-y-1">
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Loại nội dung
                    </div>
                    <Select
                      value={step?.content_type || ''}
                      onValueChange={(val) => updateStep(stage.value, { content_type: val })}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Chọn..." />
                      </SelectTrigger>
                      <SelectContent>
                        {JOURNEY_CONTENT_TYPES.map(ct => (
                          <SelectItem key={ct.value} value={ct.value} className="text-xs">
                            {ct.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Arrow to next stage */}
                {index < 3 && (
                  <div className="hidden sm:block absolute top-6 -right-1 text-muted-foreground">
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Compact read-only view for preview cards
export function JourneyMapPreview({ steps }: { steps?: JourneyStep[] | null }) {
  if (!steps || steps.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Chưa thiết lập journey map
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {JOURNEY_STAGES.map((stage, index) => {
        const step = steps.find(s => s.stage === stage.value);
        const hasData = step && (step.touchpoints?.length > 0 || step.content_type);
        
        return (
          <React.Fragment key={stage.value}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    hasData ? STAGE_COLORS[stage.value] : 'bg-muted/30 text-muted-foreground'
                  }`}>
                    {STAGE_ICONS[stage.value]}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="text-xs space-y-1">
                    <p className="font-medium">{stage.label}</p>
                    {step?.touchpoints?.length ? (
                      <p className="text-muted-foreground">
                        Kênh: {step.touchpoints.map(t => 
                          JOURNEY_TOUCHPOINTS.find(tp => tp.value === t)?.label || t
                        ).join(', ')}
                      </p>
                    ) : null}
                    {step?.content_type && (
                      <p className="text-muted-foreground">
                        Nội dung: {JOURNEY_CONTENT_TYPES.find(ct => ct.value === step.content_type)?.label}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {index < 3 && <span className="text-muted-foreground text-[10px]">→</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}
