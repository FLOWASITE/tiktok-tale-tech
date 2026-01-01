import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
        <Label className="text-xs xs:text-sm">Góc tiếp cận nội dung</Label>
        <span className="text-[10px] xs:text-xs text-muted-foreground">(tùy chọn)</span>
      </div>
      <div className="flex flex-wrap gap-1.5 xs:gap-2">
        {CONTENT_ANGLES.map((angle) => {
          const Icon = angleIcons[angle.value];
          const isSelected = value === angle.value;
          
          return (
            <Badge
              key={angle.value}
              variant={isSelected ? 'default' : 'outline'}
              className={`
                cursor-pointer transition-all py-1.5 px-2.5 gap-1.5
                ${isSelected 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'hover:bg-primary/10 hover:border-primary/50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => !disabled && handleToggle(angle.value)}
            >
              <Icon className="w-3 h-3 xs:w-3.5 xs:h-3.5" />
              <span className="text-[10px] xs:text-xs">{angle.label}</span>
            </Badge>
          );
        })}
      </div>
      {value && (
        <p className="text-[10px] xs:text-xs text-muted-foreground animate-fade-in">
          {CONTENT_ANGLES.find(a => a.value === value)?.description}
        </p>
      )}
    </div>
  );
}
