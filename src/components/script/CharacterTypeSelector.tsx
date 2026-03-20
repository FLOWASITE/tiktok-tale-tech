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
  Heart,
  Palette,
  BarChart2,
  Cpu,
  Check
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface CharacterTypeSelectorProps {
  value: CharacterType;
  onChange: (value: CharacterType) => void;
  disabled?: boolean;
}

const CHARACTER_CONFIG: Record<CharacterType, { 
  icon: typeof User; 
  description: string;
  traits: string[];
}> = {
  the_virtuoso: { icon: GraduationCap, description: 'Chuyên gia kỹ thuật sâu', traits: ['Tự tin', 'Chi tiết', 'Chính xác'] },
  the_bellwether: { icon: TrendingUp, description: 'Người dẫn dắt xu hướng', traits: ['Tiên phong', 'Ảnh hưởng', 'Có tầm nhìn'] },
  the_coach: { icon: HeadphonesIcon, description: 'Người hướng dẫn, mentor', traits: ['Kiên nhẫn', 'Động viên', 'Hỗ trợ'] },
  the_performer: { icon: Mic2, description: 'Entertainer cuốn hút', traits: ['Năng lượng', 'Thu hút', 'Biểu cảm'] },
  the_storyteller: { icon: BookOpen, description: 'Người kể chuyện', traits: ['Cuốn hút', 'Cảm xúc', 'Sáng tạo'] },
  the_iconoclast: { icon: Sparkles, description: 'Người phá vỡ khuôn mẫu', traits: ['Thách thức', 'Độc đáo', 'Táo bạo'] },
  the_technophile: { icon: Cpu, description: 'Tech enthusiast', traits: ['Logic', 'Cập nhật', 'Chuyên sâu'] },
  the_analyst: { icon: BarChart2, description: 'Người phân tích, data-driven', traits: ['Khách quan', 'Chính xác', 'Có số liệu'] },
  the_enthusiast: { icon: Heart, description: 'Passionate advocate', traits: ['Nhiệt huyết', 'Chân thành', 'Lan tỏa'] },
  the_maker: { icon: Palette, description: 'DIY creator', traits: ['Thực hành', 'Sáng tạo', 'Hands-on'] },
  neutral_presenter: { icon: Bot, description: 'Người dẫn trung tính', traits: ['Khách quan', 'Rõ ràng', 'Không thiên vị'] },
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
  
  const currentCategory = categories.find(cat => 
    CHARACTER_BY_CATEGORY[cat].includes(value)
  ) || 'professional';
  
  return (
    <div className="space-y-1 pt-2">
      <Accordion type="single" collapsible defaultValue={currentCategory} className="w-full">
        {categories.map((category) => {
          const categoryConfig = CHARACTER_CATEGORIES[category];
          const CategoryIcon = CATEGORY_ICONS[category];
          const types = CHARACTER_BY_CATEGORY[category];
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
                <div className="flex flex-wrap gap-1.5">
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
                          "relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300",
                          "hover:-translate-y-px active:translate-y-0",
                          isSelected
                            ? "bg-primary/[0.06] border border-primary/20 shadow-sm shadow-primary/5"
                            : "bg-transparent border border-transparent hover:bg-muted/40 hover:border-border/30",
                          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"
                        )}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <span className={cn(
                          "text-xs font-medium tracking-tight whitespace-nowrap",
                          isSelected ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {CHARACTER_TYPE_LABELS[type]}
                        </span>
                        {isSelected && (
                          <Check className="w-3 h-3 text-primary/60 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Selected character detail */}
                {hasSelectedInCategory && (
                  <div className="mt-2.5 p-3 bg-muted/20 rounded-xl border border-border/20">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      {(() => {
                        const Icon = CHARACTER_CONFIG[value].icon;
                        return (
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="w-3.5 h-3.5 text-primary" />
                          </div>
                        );
                      })()}
                      <div>
                        <p className="text-xs font-semibold text-foreground tracking-tight">{CHARACTER_TYPE_LABELS[value]}</p>
                        <p className="text-[10px] text-muted-foreground">{CHARACTER_CONFIG[value].description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {CHARACTER_CONFIG[value].traits.map((trait) => (
                        <span 
                          key={trait}
                          className="text-[10px] px-2 py-0.5 bg-background rounded-lg border border-border/20 text-muted-foreground"
                        >
                          {trait}
                        </span>
                      ))}
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
