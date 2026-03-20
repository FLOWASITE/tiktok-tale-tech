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
  Sparkles
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
  gradient: string;
}> = {
  // Educational
  expert_share: { 
    icon: GraduationCap, 
    description: 'Chia sẻ kiến thức chuyên môn từ góc nhìn chuyên gia',
    gradient: 'from-blue-500 to-indigo-600'
  },
  tutorial_howto: { 
    icon: BookOpen, 
    description: 'Hướng dẫn step-by-step cách làm một điều gì đó',
    gradient: 'from-cyan-500 to-blue-500'
  },
  analyze_explain: { 
    icon: Search, 
    description: 'Phân tích sâu, giải thích chi tiết một vấn đề',
    gradient: 'from-violet-500 to-purple-600'
  },
  listicle: { 
    icon: ListChecks, 
    description: 'Danh sách tips, tricks, hoặc facts dễ tiêu hóa',
    gradient: 'from-teal-500 to-emerald-500'
  },
  // Engagement
  warning_mistake: { 
    icon: AlertTriangle, 
    description: 'Cảnh báo sai lầm phổ biến và cách tránh',
    gradient: 'from-red-500 to-rose-500'
  },
  quick_qa: { 
    icon: MessageCircle, 
    description: 'Hỏi đáp nhanh, giải đáp thắc mắc thường gặp',
    gradient: 'from-green-500 to-emerald-500'
  },
  myth_busting: { 
    icon: Zap, 
    description: 'Bóc phốt quan niệm sai, debunk myths phổ biến',
    gradient: 'from-orange-500 to-amber-500'
  },
  before_after: { 
    icon: ArrowLeftRight, 
    description: 'So sánh trước/sau, cho thấy sự thay đổi rõ rệt',
    gradient: 'from-pink-500 to-rose-500'
  },
  // Entertainment
  story_pov: { 
    icon: Drama, 
    description: 'Kể chuyện từ góc nhìn nhân vật, storytelling',
    gradient: 'from-purple-500 to-pink-500'
  },
  day_in_life: { 
    icon: Clock, 
    description: 'Một ngày trong cuộc sống của... vlog style',
    gradient: 'from-amber-500 to-yellow-500'
  },
  behind_scenes: { 
    icon: Film, 
    description: 'Hậu trường, behind-the-scenes, making of',
    gradient: 'from-slate-500 to-gray-600'
  },
  reaction: { 
    icon: MessageSquare, 
    description: 'Reaction, commentary, ý kiến về trend/sự kiện',
    gradient: 'from-lime-500 to-green-500'
  },
  // Commercial
  product_review: { 
    icon: Star, 
    description: 'Review sản phẩm/dịch vụ một cách khách quan',
    gradient: 'from-yellow-500 to-orange-500'
  },
  case_study: { 
    icon: BarChart3, 
    description: 'Case study thực tế, phân tích kết quả',
    gradient: 'from-indigo-500 to-blue-600'
  },
  transformation: { 
    icon: Sparkles, 
    description: 'Biến đổi, kết quả đạt được, success story',
    gradient: 'from-fuchsia-500 to-purple-600'
  },
};

const CATEGORY_ICONS: Record<VideoTypeCategory, typeof GraduationCap> = {
  educational: GraduationCap,
  engagement: Zap,
  entertainment: Film,
  commercial: Star,
};

export function VideoTypeSelector({ value, onChange, disabled }: VideoTypeSelectorProps) {
  const categories = Object.keys(VIDEO_TYPE_BY_CATEGORY) as VideoTypeCategory[];
  
  // Find which category the current value belongs to
  const currentCategory = categories.find(cat => 
    VIDEO_TYPE_BY_CATEGORY[cat].includes(value)
  ) || 'educational';
  
  return (
    <div className="space-y-2">
      <Accordion type="single" collapsible defaultValue={currentCategory} className="w-full">
        {categories.map((category) => {
          const categoryConfig = VIDEO_TYPE_CATEGORIES[category];
          const CategoryIcon = CATEGORY_ICONS[category];
          const types = VIDEO_TYPE_BY_CATEGORY[category];
          const hasSelectedInCategory = types.includes(value);
          
          return (
            <AccordionItem key={category} value={category} className="border-border/50">
              <AccordionTrigger className={cn(
                "hover:no-underline py-2 px-3 rounded-lg transition-colors",
                hasSelectedInCategory && "bg-primary/5"
              )}>
                <div className="flex items-center gap-2">
                  <CategoryIcon className={cn(
                    "w-4 h-4",
                    hasSelectedInCategory ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    hasSelectedInCategory && "text-primary"
                  )}>
                    {categoryConfig.label}
                  </span>
                  {hasSelectedInCategory && (
                    <span className="ml-auto mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Đã chọn
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-3">
                <div className="grid grid-cols-2 gap-2">
                  {types.map((type, index) => {
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
                          "stagger-item group relative flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-all duration-300",
                          "hover:scale-[1.02] active:scale-[0.98]",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                            : "border-border/50 bg-muted/30 hover:border-primary/30 hover:bg-muted/50",
                          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Gradient overlay on hover/selected */}
                        <div className={cn(
                          "absolute inset-0 rounded-xl transition-opacity duration-300 bg-gradient-to-br",
                          config.gradient,
                          isSelected ? "opacity-[0.08]" : "opacity-0 group-hover:opacity-[0.04]"
                        )} />
                        
                        {/* Header with icon */}
                        <div className="relative flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                            isSelected 
                              ? `bg-gradient-to-br ${config.gradient} text-white shadow-lg` 
                              : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className={cn(
                            "text-xs sm:text-sm font-semibold transition-colors line-clamp-1",
                            isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                          )}>
                            {VIDEO_TYPE_LABELS[type]}
                          </span>
                        </div>
                        
                        {/* Description */}
                        <p className="relative text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                          {config.description}
                        </p>
                        
                        {/* Selected indicator */}
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                            <svg className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
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
