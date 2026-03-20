import { 
  CharacterType, 
  CHARACTER_TYPE_LABELS,
  CHARACTER_BY_CATEGORY,
  CHARACTER_CATEGORIES,
  CharacterCategory
} from '@/types/script';
import { cn } from '@/lib/utils';
import { 
  User, 
  UserCircle, 
  HeadphonesIcon, 
  GraduationCap, 
  Bot,
  Sparkles,
  TrendingUp,
  Mic2,
  BookOpen,
  Wrench,
  Lightbulb,
  Heart,
  Palette,
  BarChart2,
  Cpu
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface CharacterTypeSelectorProps {
  value: CharacterType;
  onChange: (value: CharacterType) => void;
  disabled?: boolean;
}

const CHARACTER_CONFIG: Record<CharacterType, { 
  icon: typeof User; 
  color: string;
  bgColor: string;
  description: string;
  traits: string[];
}> = {
  // Professional
  the_virtuoso: { 
    icon: GraduationCap, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    description: 'Chuyên gia kỹ thuật sâu, master trong lĩnh vực',
    traits: ['Tự tin', 'Chi tiết', 'Chính xác']
  },
  the_bellwether: { 
    icon: TrendingUp, 
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    description: 'Người dẫn dắt xu hướng, influencer trong ngành',
    traits: ['Tiên phong', 'Ảnh hưởng', 'Có tầm nhìn']
  },
  the_coach: { 
    icon: HeadphonesIcon, 
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'Người hướng dẫn, mentor tận tâm',
    traits: ['Kiên nhẫn', 'Động viên', 'Hỗ trợ']
  },
  // Creative
  the_performer: { 
    icon: Mic2, 
    color: 'text-pink-600',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    description: 'Người trình diễn, entertainer cuốn hút',
    traits: ['Năng lượng', 'Thu hút', 'Biểu cảm']
  },
  the_storyteller: { 
    icon: BookOpen, 
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    description: 'Người kể chuyện, narrative master',
    traits: ['Cuốn hút', 'Cảm xúc', 'Sáng tạo']
  },
  the_iconoclast: { 
    icon: Sparkles, 
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'Người phá vỡ khuôn mẫu, disruptor',
    traits: ['Thách thức', 'Độc đáo', 'Táo bạo']
  },
  // Technical
  the_technophile: { 
    icon: Cpu, 
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    description: 'Chuyên gia công nghệ, tech enthusiast',
    traits: ['Logic', 'Cập nhật', 'Chuyên sâu']
  },
  the_analyst: { 
    icon: BarChart2, 
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    description: 'Người phân tích, data-driven',
    traits: ['Khách quan', 'Chính xác', 'Có số liệu']
  },
  // Passionate
  the_enthusiast: { 
    icon: Heart, 
    color: 'text-rose-600',
    bgColor: 'bg-rose-100 dark:bg-rose-900/30',
    description: 'Người đam mê, passionate advocate',
    traits: ['Nhiệt huyết', 'Chân thành', 'Lan tỏa']
  },
  the_maker: { 
    icon: Palette, 
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    description: 'Nhà sáng tạo, DIY creator',
    traits: ['Thực hành', 'Sáng tạo', 'Hands-on']
  },
  // Neutral
  neutral_presenter: { 
    icon: Bot, 
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-900/30',
    description: 'Người dẫn trung tính, khách quan',
    traits: ['Khách quan', 'Rõ ràng', 'Không thiên vị']
  },
};

const CATEGORY_ICONS: Record<CharacterCategory, typeof User> = {
  professional: UserCircle,
  creative: Sparkles,
  technical: Wrench,
  passionate: Heart,
  neutral: Bot,
};

export function CharacterTypeSelector({ value, onChange, disabled }: CharacterTypeSelectorProps) {
  const categories = Object.keys(CHARACTER_BY_CATEGORY) as CharacterCategory[];
  
  // Find which category the current value belongs to
  const currentCategory = categories.find(cat => 
    CHARACTER_BY_CATEGORY[cat].includes(value)
  ) || 'professional';
  
  return (
    <div className="space-y-2">
      <Accordion type="single" collapsible defaultValue={currentCategory} className="w-full">
        {categories.map((category) => {
          const categoryConfig = CHARACTER_CATEGORIES[category];
          const CategoryIcon = CATEGORY_ICONS[category];
          const types = CHARACTER_BY_CATEGORY[category];
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
                <div className="flex flex-wrap gap-2">
                  {types.map((type) => {
                    const config = CHARACTER_CONFIG[type];
                    const Icon = config.icon;
                    const isSelected = value === type;
                    
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => onChange(type)}
                        disabled={disabled}
                        className={cn(
                          "group relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border-2 transition-all duration-300",
                          "hover:scale-[1.02] active:scale-[0.98]",
                          isSelected
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border/50 bg-muted/30 hover:border-primary/30 hover:bg-muted/50",
                          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                        )}
                        title={`${config.description}\n\nĐặc điểm: ${config.traits.join(', ')}`}
                      >
                        {/* Avatar */}
                        <div className={cn(
                          "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-300",
                          isSelected ? config.bgColor : "bg-muted",
                          isSelected && "ring-2 ring-primary/20"
                        )}>
                          <Icon className={cn(
                            "w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors",
                            isSelected ? config.color : "text-muted-foreground"
                          )} />
                        </div>
                        
                        {/* Label */}
                        <span className={cn(
                          "text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
                          isSelected ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {CHARACTER_TYPE_LABELS[type]}
                        </span>
                        
                        {/* Glow effect on selected */}
                        {isSelected && (
                          <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse-glow pointer-events-none" />
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Show selected character details */}
                {hasSelectedInCategory && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        CHARACTER_CONFIG[value].bgColor
                      )}>
                        {(() => {
                          const Icon = CHARACTER_CONFIG[value].icon;
                          return <Icon className={cn("w-5 h-5", CHARACTER_CONFIG[value].color)} />;
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {CHARACTER_TYPE_LABELS[value]}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {CHARACTER_CONFIG[value].description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {CHARACTER_CONFIG[value].traits.map((trait) => (
                            <span 
                              key={trait}
                              className="text-[10px] px-2 py-0.5 bg-background rounded-full border border-border/50"
                            >
                              {trait}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
