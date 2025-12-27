import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Sparkles, 
  BookOpen, 
  AlertTriangle, 
  HelpCircle, 
  Heart, 
  Camera, 
  Users, 
  Vote, 
  Flame, 
  Zap, 
  Microscope, 
  FileBarChart, 
  Lightbulb, 
  Package, 
  Rocket, 
  Gift, 
  Target, 
  Star, 
  TrendingUp,
  type LucideIcon
} from 'lucide-react';
import { ContentGoal } from '@/types/multichannel';
import { QuickStartTemplate, getTemplatesForGoal } from '@/types/quickStartTemplates';
import { cn } from '@/lib/utils';

// Map icon names to actual Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  AlertTriangle,
  HelpCircle,
  Heart,
  Camera,
  Users,
  Vote,
  Flame,
  Zap,
  Microscope,
  FileBarChart,
  Lightbulb,
  Package,
  Rocket,
  Gift,
  Target,
  Star,
  TrendingUp,
};

interface QuickStartSectionProps {
  contentGoal: ContentGoal;
  onSelectTemplate: (template: QuickStartTemplate) => void;
  disabled?: boolean;
  className?: string;
}

export function QuickStartSection({ 
  contentGoal, 
  onSelectTemplate, 
  disabled,
  className 
}: QuickStartSectionProps) {
  const templates = useMemo(() => getTemplatesForGoal(contentGoal), [contentGoal]);

  if (templates.length === 0) return null;

  return (
    <div className={cn('space-y-3 animate-fade-in', className)}>
      <Label className="text-sm font-medium flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        Bắt đầu nhanh
      </Label>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.slice(0, 3).map((template, index) => {
          const IconComponent = ICON_MAP[template.icon];
          
          return (
            <Card
              key={template.id}
              className={cn(
                'cursor-pointer transition-all duration-200',
                'hover:border-primary/50 hover:shadow-md hover:scale-[1.02]',
                'active:scale-[0.98]',
                'group',
                disabled && 'opacity-50 pointer-events-none'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => !disabled && onSelectTemplate(template)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {IconComponent && (
                    <div className={cn(
                      'p-1.5 rounded-md transition-colors',
                      'bg-primary/10 group-hover:bg-primary/20'
                    )}>
                      <IconComponent className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <span className="font-medium text-sm">{template.label}</span>
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {template.description}
                </p>
                
                <div className="flex flex-wrap gap-1.5">
                  {template.marketingFramework && (
                    <Badge 
                      variant="secondary" 
                      className="text-[10px] px-1.5 py-0"
                    >
                      {template.marketingFramework}
                    </Badge>
                  )}
                  <Badge 
                    variant="outline" 
                    className="text-[10px] px-1.5 py-0 text-muted-foreground"
                  >
                    {template.funnelStage.toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
