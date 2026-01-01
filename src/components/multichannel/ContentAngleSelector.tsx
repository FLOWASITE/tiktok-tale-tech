import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  GraduationCap, 
  BookOpen, 
  Megaphone, 
  Star, 
  Video, 
  HelpCircle,
  LucideIcon
} from 'lucide-react';
import { ContentAngle, CONTENT_ANGLES } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface ContentAngleSelectorProps {
  value?: ContentAngle;
  onValueChange: (angle: ContentAngle | undefined) => void;
  disabled?: boolean;
  className?: string;
}

const angleIcons: Record<ContentAngle, LucideIcon> = {
  educational: GraduationCap,
  storytelling: BookOpen,
  promotional: Megaphone,
  social_proof: Star,
  behind_the_scenes: Video,
  qa_faq: HelpCircle,
};

export function ContentAngleSelector({
  value,
  onValueChange,
  disabled,
  className = '',
}: ContentAngleSelectorProps) {
  const handleToggle = (angle: ContentAngle) => {
    if (value === angle) {
      onValueChange(undefined);
    } else {
      onValueChange(angle);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Góc tiếp cận nội dung</Label>
        <span className="text-[10px] text-muted-foreground">(tùy chọn)</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {CONTENT_ANGLES.map((angle) => {
          const Icon = angleIcons[angle.value];
          const isSelected = value === angle.value;
          
          return (
            <Tooltip key={angle.value}>
              <TooltipTrigger asChild>
                <Badge
                  variant={isSelected ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer transition-all duration-200 py-2 px-3 gap-2",
                    "active:scale-95",
                    isSelected 
                      ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                      : 'hover:bg-primary/10 hover:border-primary/50 hover:scale-102',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => !disabled && handleToggle(angle.value)}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-xs">{angle.label}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="text-xs">{angle.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
