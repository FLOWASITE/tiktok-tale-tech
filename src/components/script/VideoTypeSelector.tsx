import { 
  VideoType, 
  VIDEO_TYPE_LABELS, 
  VIDEO_TYPE_BY_CATEGORY, 
  VIDEO_TYPE_CATEGORIES,
  VideoTypeCategory 
} from '@/types/script';
import { cn } from '@/lib/utils';
import { 
  GraduationCap, 
  Search, 
  AlertTriangle,
  MessageCircle,
  BookOpen,
  ListChecks,
  Zap,
  ArrowLeftRight,
  Drama,
  Clock,
  Film,
  MessageSquare,
  Star,
  BarChart3,
  Sparkles,
  Check
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface VideoTypeSelectorProps {
  value: VideoType;
  onChange: (value: VideoType) => void;
  disabled?: boolean;
}

const VIDEO_TYPE_CONFIG: Record<VideoType, { 
  icon: typeof GraduationCap; 
  description: string; 
}> = {
  expert_share: { icon: GraduationCap, description: 'Chia sẻ kiến thức chuyên môn' },
  tutorial_howto: { icon: BookOpen, description: 'Hướng dẫn step-by-step' },
  analyze_explain: { icon: Search, description: 'Phân tích sâu, giải thích chi tiết' },
  listicle: { icon: ListChecks, description: 'Danh sách tips, tricks' },
  warning_mistake: { icon: AlertTriangle, description: 'Cảnh báo sai lầm phổ biến' },
  quick_qa: { icon: MessageCircle, description: 'Hỏi đáp nhanh' },
  myth_busting: { icon: Zap, description: 'Bóc phốt quan niệm sai' },
  before_after: { icon: ArrowLeftRight, description: 'So sánh trước/sau' },
  story_pov: { icon: Drama, description: 'Kể chuyện, storytelling' },
  day_in_life: { icon: Clock, description: 'Một ngày trong cuộc sống' },
  behind_scenes: { icon: Film, description: 'Hậu trường, behind-the-scenes' },
  reaction: { icon: MessageSquare, description: 'Reaction, commentary' },
  product_review: { icon: Star, description: 'Review sản phẩm/dịch vụ' },
  case_study: { icon: BarChart3, description: 'Case study thực tế' },
  transformation: { icon: Sparkles, description: 'Biến đổi, success story' },
};

const CATEGORY_ICONS: Record<VideoTypeCategory, typeof GraduationCap> = {
  educational: GraduationCap,
  engagement: Zap,
  entertainment: Film,
  commercial: Star,
};

export function VideoTypeSelector({ value, onChange, disabled }: VideoTypeSelectorProps) {
  const categories = Object.keys(VIDEO_TYPE_BY_CATEGORY) as VideoTypeCategory[];
  
  const currentCategory = categories.find(cat => 
    VIDEO_TYPE_BY_CATEGORY[cat].includes(value)
  ) || 'educational';
  
  return (
    <div className="space-y-1 pt-2">
      <Accordion type="single" collapsible defaultValue={currentCategory} className="w-full">
        {categories.map((category) => {
          const categoryConfig = VIDEO_TYPE_CATEGORIES[category];
          const CategoryIcon = CATEGORY_ICONS[category];
          const types = VIDEO_TYPE_BY_CATEGORY[category];
          const hasSelectedInCategory = types.includes(value);
          
          return (
            <AccordionItem key={category} value={category} className="border-0">
              <AccordionTrigger className={cn(
                "hover:no-underline py-2.5 px-3 rounded-xl transition-all duration-200",
                hasSelectedInCategory 
                  ? "bg-primary/[0.04]" 
                  : "hover:bg-muted/40"
              )}>
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center",
                    hasSelectedInCategory ? "bg-primary/10" : "bg-muted/50"
                  )}>
                    <CategoryIcon className={cn(
                      "w-3.5 h-3.5",
                      hasSelectedInCategory ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <span className={cn(
                    "text-sm font-medium tracking-tight",
                    hasSelectedInCategory ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {categoryConfig.label}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2 px-1">
                <div className="grid grid-cols-2 gap-1.5">
                  {types.map((type) => {
                    const config = VIDEO_TYPE_CONFIG[type];
                    const Icon = config.icon;
                    const isSelected = value === type;
                    
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => onChange(type)}
                        disabled={disabled}
                        className={cn(
                          "relative flex items-start gap-2.5 p-3 rounded-xl text-left transition-all duration-300",
                          "hover:-translate-y-px active:translate-y-0",
                          isSelected
                            ? "bg-primary/[0.06] border border-primary/20 shadow-sm shadow-primary/5"
                            : "bg-transparent border border-transparent hover:bg-muted/40 hover:border-border/30",
                          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"
                        )}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            "text-xs font-semibold tracking-tight block",
                            isSelected ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {VIDEO_TYPE_LABELS[type]}
                          </span>
                          <p className="text-[10px] text-muted-foreground/70 leading-relaxed mt-0.5 line-clamp-1">
                            {config.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-primary" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
