import { useState } from 'react';
import { useCustomerPersonas } from '@/hooks/useCustomerPersonas';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { 
  CustomerPersona, 
  FUNNEL_STAGES, 
  INCOME_LEVELS, 
  GENDER_OPTIONS, 
  COMMUNICATION_STYLES, 
  RESPONSE_TONE_HINTS,
  CONTENT_PREFERENCE_OPTIONS,
  CONTENT_FORMAT_OPTIONS,
} from '@/types/customerPersona';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Users,
  Star,
  MapPin,
  Briefcase,
  DollarSign,
  Target,
  Heart,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  TrendingUp,
  MessageCircle,
  UserPlus,
  Building2,
  Brain,
  Pencil,
  ChevronDown,
  ChevronUp,
  Image,
  BookOpen,
  BarChart3,
  CheckSquare,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandViewPersonasTabProps {
  template: BrandTemplate;
}

const PersonaCard = ({ persona }: { persona: CustomerPersona }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const funnelStage = FUNNEL_STAGES.find((f) => f.value === persona.typical_funnel_stage);
  const incomeLevel = INCOME_LEVELS.find((i) => i.value === persona.income_level);
  const gender = GENDER_OPTIONS.find((g) => g.value === persona.gender);
  
  // Get content preferences icons
  const getContentPrefIcon = (key: string) => {
    const icons: Record<string, React.ElementType> = {
      visual: Image,
      storytelling: BookOpen,
      data_driven: BarChart3,
      emotional: Heart,
      practical: CheckSquare,
    };
    return icons[key] || FileText;
  };

  // Check if there are content preferences enabled
  const enabledPrefs = persona.content_preferences 
    ? CONTENT_PREFERENCE_OPTIONS.filter(p => persona.content_preferences?.[p.key as keyof typeof persona.content_preferences] === true)
    : [];
  
  const formatPref = CONTENT_FORMAT_OPTIONS.find(f => f.value === persona.content_preferences?.format);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg group",
        persona.is_primary && "ring-2 ring-primary bg-gradient-to-br from-primary/5 to-transparent"
      )}>
        {/* Primary Badge */}
        {persona.is_primary && (
          <div className="absolute top-0 right-0">
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-bl-md flex items-center gap-1">
              <Star className="w-3 h-3" />
              Chính
            </div>
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center text-3xl shrink-0 ring-2 transition-all",
              persona.is_primary 
                ? "bg-primary/10 ring-primary/30" 
                : "bg-muted ring-border"
            )}>
              {persona.avatar_emoji}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <CardTitle className="text-base font-semibold truncate">
                  {persona.name}
                </CardTitle>
                {/* Origin Badges */}
                {persona.source_industry_persona_id && (
                  <Badge 
                    variant="outline" 
                    className="text-[9px] h-4 px-1 border-primary/30 text-primary shrink-0"
                  >
                    <Building2 className="w-2.5 h-2.5 mr-0.5" />
                    Industry
                  </Badge>
                )}
                {persona.is_customized && (
                  <Badge 
                    variant="outline" 
                    className="text-[9px] h-4 px-1 border-amber-400/50 text-amber-600 shrink-0"
                  >
                    <Pencil className="w-2.5 h-2.5 mr-0.5" />
                    Tùy chỉnh
                  </Badge>
                )}
              </div>
              
              {/* Demographics Row */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-sm text-muted-foreground">
                {persona.occupation && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {persona.occupation}
                  </span>
                )}
                {persona.age_range && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {persona.age_range} tuổi
                  </span>
                )}
                {gender && (
                  <span className="text-xs">{gender.label}</span>
                )}
              </div>

              {/* Location & Income */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-muted-foreground">
                {persona.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {persona.location}
                  </span>
                )}
                {incomeLevel && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {incomeLevel.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {/* Funnel Stage */}
          {funnelStage && (
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <Badge 
                variant="secondary"
                className={cn(
                  funnelStage.color === 'blue' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                  funnelStage.color === 'amber' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                  funnelStage.color === 'emerald' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                )}
              >
                {funnelStage.label} - {funnelStage.description}
              </Badge>
            </div>
          )}

          {/* Pain Points */}
          {persona.pain_points.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertTriangle className="w-3.5 h-3.5" />
                Nỗi đau
              </div>
              <div className="flex flex-wrap gap-1">
                {persona.pain_points.slice(0, isExpanded ? undefined : 3).map((point, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs border-destructive/30 text-destructive bg-destructive/5">
                    {point}
                  </Badge>
                ))}
                {!isExpanded && persona.pain_points.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{persona.pain_points.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Desires */}
          {persona.desires.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Heart className="w-3.5 h-3.5" />
                Mong muốn
              </div>
              <div className="flex flex-wrap gap-1">
                {persona.desires.slice(0, isExpanded ? undefined : 3).map((desire, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:bg-emerald-900/20">
                    {desire}
                  </Badge>
                ))}
                {!isExpanded && persona.desires.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{persona.desires.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Collapsible Extended Content */}
          <CollapsibleContent className="space-y-4">
            {/* Objections */}
            {persona.objections.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Phản đối
                </div>
                <div className="flex flex-wrap gap-1">
                  {persona.objections.map((obj, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:bg-amber-900/20">
                      {obj}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Values & Interests */}
            {(persona.values.length > 0 || persona.interests.length > 0) && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="w-3.5 h-3.5" />
                  Giá trị & Sở thích
                </div>
                <div className="flex flex-wrap gap-1">
                  {[...persona.values, ...persona.interests].map((item, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Buying Triggers */}
            {persona.buying_triggers.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Trigger mua hàng
                </div>
                <div className="flex flex-wrap gap-1">
                  {persona.buying_triggers.map((trigger, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
                      {trigger}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Preferred Channels */}
            {persona.preferred_channels.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Kênh ưa thích
                </div>
                <div className="flex flex-wrap gap-1">
                  {persona.preferred_channels.map((channel, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs capitalize">
                      {channel}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* AI Enhancement Section */}
            {(persona.communication_style || (persona.response_tone_hints && persona.response_tone_hints.length > 0) || persona.persona_prompt_hints) && (
              <div className="border-t pt-3 mt-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400">
                  <Brain className="w-3.5 h-3.5" />
                  AI Enhancement
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {persona.communication_style && (
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      {COMMUNICATION_STYLES.find(s => s.value === persona.communication_style)?.label || persona.communication_style}
                    </Badge>
                  )}
                  {persona.response_tone_hints?.map((tone, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs border-purple-300 text-purple-600 dark:border-purple-700 dark:text-purple-400">
                      {RESPONSE_TONE_HINTS.find(t => t.value === tone)?.label || tone}
                    </Badge>
                  ))}
                </div>

                {persona.persona_prompt_hints && (
                  <p className="text-xs text-muted-foreground italic">
                    "{persona.persona_prompt_hints}"
                  </p>
                )}
              </div>
            )}

            {/* Content Preferences Section */}
            {(formatPref || enabledPrefs.length > 0) && (
              <div className="border-t pt-3 mt-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400">
                  <FileText className="w-3.5 h-3.5" />
                  Sở thích nội dung
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {formatPref && (
                    <Badge variant="secondary" className="text-xs bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 gap-1">
                      <FileText className="w-3 h-3" />
                      {formatPref.label}
                    </Badge>
                  )}
                  {enabledPrefs.map((pref) => {
                    const Icon = getContentPrefIcon(pref.key);
                    return (
                      <Badge 
                        key={pref.key} 
                        variant="outline" 
                        className="text-xs border-sky-300 text-sky-600 bg-sky-50 dark:border-sky-700 dark:text-sky-400 dark:bg-sky-900/20 gap-1"
                      >
                        <Icon className="w-3 h-3" />
                        {pref.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CollapsibleContent>

          {/* Expand/Collapse Toggle */}
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 mr-1" />
                  Thu gọn
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 mr-1" />
                  Xem thêm
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </CardContent>
      </Card>
    </Collapsible>
  );
};

const PersonaCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-14 h-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-3 pt-0">
      <Skeleton className="h-6 w-24" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-16" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-16" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const EmptyState = () => (
  <Card className="border-dashed">
    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">Chưa có Customer Persona</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Customer Personas giúp bạn hiểu rõ đối tượng khách hàng mục tiêu và tạo nội dung phù hợp hơn.
      </p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <UserPlus className="w-4 h-4" />
        <span>Chỉnh sửa Brand để thêm Personas</span>
      </div>
    </CardContent>
  </Card>
);

export function BrandViewPersonasTab({ template }: BrandViewPersonasTabProps) {
  const { personas, isLoading } = useCustomerPersonas({
    brandTemplateId: template.id,
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PersonaCardSkeleton />
        <PersonaCardSkeleton />
      </div>
    );
  }

  if (personas.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-medium">{personas.length} Customer Personas</span>
        </div>
        {personas.some(p => p.is_primary) && (
          <Badge variant="secondary" className="gap-1">
            <Star className="w-3 h-3" />
            Có persona chính
          </Badge>
        )}
      </div>

      {/* Personas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {personas.map((persona) => (
          <PersonaCard key={persona.id} persona={persona} />
        ))}
      </div>
    </div>
  );
}
