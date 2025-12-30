import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Building2, Edit3, Star, Target, Brain, Heart, 
  MessageCircle, Zap, Globe 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  CustomerPersona, 
  FUNNEL_STAGES, 
  COMMUNICATION_STYLES,
  INCOME_LEVELS 
} from '@/types/customerPersona';

interface PersonaPreviewCardProps {
  persona: CustomerPersona;
  className?: string;
  showFullDetails?: boolean;
}

export function PersonaPreviewCard({ 
  persona, 
  className,
  showFullDetails = true 
}: PersonaPreviewCardProps) {
  const isInherited = !!persona.source_industry_persona_id;
  const isCustomized = persona.is_customized;
  
  const funnelStage = FUNNEL_STAGES.find(f => f.value === persona.typical_funnel_stage);
  const commStyle = COMMUNICATION_STYLES.find(c => c.value === persona.communication_style);
  const incomeLabel = INCOME_LEVELS.find(i => i.value === persona.income_level)?.label;
  
  // Generate gradient based on persona characteristics
  const getGradientClass = () => {
    if (persona.typical_funnel_stage === 'tofu') {
      return 'from-blue-500/10 via-cyan-500/5 to-transparent';
    }
    if (persona.typical_funnel_stage === 'mofu') {
      return 'from-amber-500/10 via-orange-500/5 to-transparent';
    }
    if (persona.typical_funnel_stage === 'bofu') {
      return 'from-emerald-500/10 via-green-500/5 to-transparent';
    }
    return 'from-primary/10 via-primary/5 to-transparent';
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all",
      persona.is_primary && "ring-2 ring-primary/30",
      className
    )}>
      {/* Gradient Background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50",
        getGradientClass()
      )} />
      
      <CardContent className="relative p-4 space-y-4">
        {/* Header: Avatar + Basic Info */}
        <div className="flex items-start gap-3">
          {/* Large Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-3xl border-2 border-background shadow-lg">
              {persona.avatar_emoji}
            </div>
            {persona.is_primary && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                <Star className="w-3 h-3 text-white fill-white" />
              </div>
            )}
          </div>
          
          {/* Name + Meta */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{persona.name}</h3>
            {persona.occupation && (
              <p className="text-sm text-muted-foreground truncate">{persona.occupation}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {persona.age_range && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {persona.age_range} tuổi
                </Badge>
              )}
              {incomeLabel && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {incomeLabel}
                </Badge>
              )}
              {funnelStage && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] h-5",
                    funnelStage.value === 'tofu' && "border-blue-500/50 text-blue-600",
                    funnelStage.value === 'mofu' && "border-amber-500/50 text-amber-600",
                    funnelStage.value === 'bofu' && "border-emerald-500/50 text-emerald-600",
                  )}
                >
                  {funnelStage.label} - {funnelStage.description}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Quote / Prompt Hints */}
        {persona.persona_prompt_hints && (
          <div className="bg-muted/50 rounded-lg p-3 border-l-2 border-primary/50">
            <p className="text-sm italic text-muted-foreground line-clamp-2">
              "{persona.persona_prompt_hints}"
            </p>
          </div>
        )}

        {showFullDetails && (
          <>
            {/* Pain Points */}
            {persona.pain_points.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Target className="w-3.5 h-3.5" />
                  Pain Points
                </div>
                <div className="flex flex-wrap gap-1">
                  {persona.pain_points.slice(0, 4).map((point, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="text-[10px] bg-destructive/10 text-destructive border-0"
                    >
                      {point}
                    </Badge>
                  ))}
                  {persona.pain_points.length > 4 && (
                    <Badge variant="secondary" className="text-[10px]">
                      +{persona.pain_points.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Desires */}
            {persona.desires.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Heart className="w-3.5 h-3.5" />
                  Mong muốn
                </div>
                <div className="flex flex-wrap gap-1">
                  {persona.desires.slice(0, 4).map((desire, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="text-[10px] bg-emerald-500/10 text-emerald-600 border-0"
                    >
                      {desire}
                    </Badge>
                  ))}
                  {persona.desires.length > 4 && (
                    <Badge variant="secondary" className="text-[10px]">
                      +{persona.desires.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Communication Style */}
            {commStyle && (
              <div className="flex items-center gap-2 text-xs">
                <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Phong cách:</span>
                <Badge variant="outline" className="text-[10px] h-5">
                  {commStyle.label}
                </Badge>
              </div>
            )}

            {/* Preferred Channels */}
            {persona.preferred_channels.length > 0 && (
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground flex-shrink-0">Kênh:</span>
                <div className="flex flex-wrap gap-1">
                  {persona.preferred_channels.slice(0, 4).map((channel, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px] h-5 capitalize">
                      {channel}
                    </Badge>
                  ))}
                  {persona.preferred_channels.length > 4 && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      +{persona.preferred_channels.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Status Badges */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {isInherited && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] h-5 gap-1",
                isCustomized 
                  ? "border-amber-500/50 text-amber-600 bg-amber-500/5"
                  : "border-primary/50 text-primary bg-primary/5"
              )}
            >
              {isCustomized ? (
                <>
                  <Edit3 className="w-3 h-3" />
                  Đã tùy chỉnh
                </>
              ) : (
                <>
                  <Building2 className="w-3 h-3" />
                  Từ Industry
                </>
              )}
            </Badge>
          )}
          
          {/* Buying Triggers count */}
          {persona.buying_triggers.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 gap-1">
              <Zap className="w-3 h-3" />
              {persona.buying_triggers.length} triggers
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
