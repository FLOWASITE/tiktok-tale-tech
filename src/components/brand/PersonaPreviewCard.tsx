import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Building2, Edit3, Star, Target, Brain, Heart, 
  MessageCircle, Zap, Globe, Smartphone, Monitor, Laptop,
  GraduationCap, Users2, ShieldCheck, TrendingUp, Calendar, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PersonaProductsList } from './PersonaProductsList';
import { 
  CustomerPersona, 
  FUNNEL_STAGES, 
  COMMUNICATION_STYLES,
  INCOME_LEVELS,
  EDUCATION_LEVELS,
  FAMILY_STATUSES,
  DEVICE_USAGES,
  TECH_SAVVINESS_LEVELS,
  BUYING_MOTIVATIONS,
  CONFIDENCE_LEVELS,
  PRIORITY_LABELS,
} from '@/types/customerPersona';
import { JourneyMapPreview } from './JourneyMapEditor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PersonaPreviewCardProps {
  persona: CustomerPersona;
  brandTemplateId?: string;
  organizationId?: string;
  className?: string;
  showFullDetails?: boolean;
}

export function PersonaPreviewCard({ 
  persona, 
  brandTemplateId,
  organizationId,
  className,
  showFullDetails = true 
}: PersonaPreviewCardProps) {
  const isInherited = !!persona.source_industry_persona_id;
  const isCustomized = persona.is_customized;
  
  const funnelStage = FUNNEL_STAGES.find(f => f.value === persona.typical_funnel_stage);
  const commStyle = COMMUNICATION_STYLES.find(c => c.value === persona.communication_style);
  const incomeLabel = INCOME_LEVELS.find(i => i.value === persona.income_level)?.label;
  const educationLabel = EDUCATION_LEVELS.find(e => e.value === persona.education_level)?.label;
  const familyLabel = FAMILY_STATUSES.find(f => f.value === persona.family_status)?.label;
  const deviceInfo = DEVICE_USAGES.find(d => d.value === persona.device_usage);
  const techLabel = TECH_SAVVINESS_LEVELS.find(t => t.value === persona.tech_savviness);
  const confidenceInfo = CONFIDENCE_LEVELS.find(c => c.value === persona.confidence_level);
  const priorityInfo = PRIORITY_LABELS.find(p => p.value === persona.priority_score);
  
  // Generate gradient based on color_theme or funnel stage
  const getGradientClass = () => {
    if (persona.color_theme) {
      return ''; // Will use inline style
    }
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

  const gradientStyle = persona.color_theme ? {
    background: `linear-gradient(to bottom right, ${persona.color_theme}15, ${persona.color_theme}05, transparent)`
  } : undefined;

  const DeviceIcon = deviceInfo?.icon === 'Smartphone' ? Smartphone : 
                     deviceInfo?.icon === 'Monitor' ? Monitor : Laptop;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all",
      persona.is_primary && "ring-2 ring-primary/30",
      className
    )}>
      {/* Gradient Background */}
      <div 
        className={cn(
          "absolute inset-0 opacity-50",
          !persona.color_theme && `bg-gradient-to-br ${getGradientClass()}`
        )} 
        style={gradientStyle}
      />
      
      <CardContent className="relative p-4 space-y-4">
        {/* Header: Avatar + Basic Info */}
        <div className="flex items-start gap-3">
          {/* Avatar - support both emoji and image */}
          <div className="relative flex-shrink-0">
            {persona.avatar_url ? (
              <Avatar className="w-16 h-16 border-2 border-background shadow-lg">
                <AvatarImage src={persona.avatar_url} alt={persona.name} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-muted to-muted/50">
                  {persona.avatar_emoji}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-3xl border-2 border-background shadow-lg">
                {persona.avatar_emoji}
              </div>
            )}
            {persona.is_primary && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                <Star className="w-3 h-3 text-white fill-white" />
              </div>
            )}
          </div>
          
          {/* Name + Meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base truncate">{persona.name}</h3>
              {/* Priority indicator */}
              {persona.priority_score && persona.priority_score >= 4 && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/50 text-primary">
                  <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                  {priorityInfo?.label}
                </Badge>
              )}
            </div>
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

        {/* Extended Demographics Row */}
        {(educationLabel || familyLabel || deviceInfo || techLabel) && (
          <div className="flex flex-wrap gap-1.5">
            {educationLabel && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1">
                <GraduationCap className="w-3 h-3" />
                {educationLabel}
              </Badge>
            )}
            {familyLabel && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1">
                <Users2 className="w-3 h-3" />
                {familyLabel}
              </Badge>
            )}
            {deviceInfo && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1">
                <DeviceIcon className="w-3 h-3" />
                {deviceInfo.label}
              </Badge>
            )}
            {techLabel && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1">
                Tech: {techLabel.label}
              </Badge>
            )}
          </div>
        )}

        {/* Buying Motivations */}
        {persona.buying_motivation && persona.buying_motivation.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {persona.buying_motivation.map((mot, idx) => {
              const motInfo = BUYING_MOTIVATIONS.find(m => m.value === mot);
              return (
                <Badge 
                  key={idx} 
                  variant="secondary" 
                  className="text-[10px] bg-purple-500/10 text-purple-600 border-0"
                >
                  {motInfo?.label || mot}
                </Badge>
              );
            })}
          </div>
        )}

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

            {/* Journey Map */}
            {persona.journey_map && persona.journey_map.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  Customer Journey
                </div>
                <JourneyMapPreview steps={persona.journey_map} />
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
            {/* Related Products */}
            {brandTemplateId && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Package className="w-3.5 h-3.5" />
                  Sản phẩm liên quan
                </div>
                <PersonaProductsList 
                  brandTemplateId={brandTemplateId}
                  personaId={persona.id}
                  organizationId={organizationId}
                  compact
                />
              </div>
            )}
          </>
        )}

        {/* Status Badges */}
        <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
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

          {/* Segment size */}
          {persona.segment_size && (
            <Badge variant="secondary" className="text-[10px] h-5 gap-1">
              {persona.segment_size}% segment
            </Badge>
          )}

          {/* Confidence */}
          {confidenceInfo && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] h-5 gap-1",
                confidenceInfo.value === 'high' && "border-emerald-500/50 text-emerald-600",
                confidenceInfo.value === 'medium' && "border-amber-500/50 text-amber-600",
                confidenceInfo.value === 'low' && "border-destructive/50 text-destructive",
              )}
            >
              <ShieldCheck className="w-3 h-3" />
              {confidenceInfo.label}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
