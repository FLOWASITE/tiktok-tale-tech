import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, X, AlertCircle } from 'lucide-react';
import { 
  Briefcase, 
  Building2, 
  Coffee, 
  Code, 
  GraduationCap, 
  Heart, 
  Plane, 
  ShoppingCart,
  Megaphone,
  Scale,
  Hammer,
  Sparkles,
  Store,
  Factory,
  Leaf,
  Truck,
  Shield,
  Users,
  Landmark,
  Smartphone,
  Gamepad2,
  Palette,
  Dumbbell,
  Sofa,
  Ship,
  Rocket,
  Bitcoin,
  UsersRound,
  PartyPopper,
  Home,
  Baby,
  PawPrint,
  Car
} from 'lucide-react';
import { useIndustryTemplates, IndustryTemplate } from '@/hooks/useIndustryTemplates';

// Icon mapping by industry code
const INDUSTRY_ICONS: Record<string, React.ReactNode> = {
  accounting: <Briefcase className="w-5 h-5" />,
  banking: <Landmark className="w-5 h-5" />,
  insurance: <Shield className="w-5 h-5" />,
  crypto_fintech: <Bitcoin className="w-5 h-5" />,
  it: <Code className="w-5 h-5" />,
  telecom: <Smartphone className="w-5 h-5" />,
  gaming: <Gamepad2 className="w-5 h-5" />,
  startup: <Rocket className="w-5 h-5" />,
  ecommerce: <ShoppingCart className="w-5 h-5" />,
  retail: <Store className="w-5 h-5" />,
  import_export: <Ship className="w-5 h-5" />,
  healthcare: <Heart className="w-5 h-5" />,
  education: <GraduationCap className="w-5 h-5" />,
  legal: <Scale className="w-5 h-5" />,
  consulting: <Users className="w-5 h-5" />,
  hr: <UsersRound className="w-5 h-5" />,
  fnb: <Coffee className="w-5 h-5" />,
  travel: <Plane className="w-5 h-5" />,
  fashion: <Sparkles className="w-5 h-5" />,
  beauty: <Palette className="w-5 h-5" />,
  fitness: <Dumbbell className="w-5 h-5" />,
  pet: <PawPrint className="w-5 h-5" />,
  realestate: <Building2 className="w-5 h-5" />,
  construction: <Hammer className="w-5 h-5" />,
  interior: <Sofa className="w-5 h-5" />,
  manufacturing: <Factory className="w-5 h-5" />,
  agriculture: <Leaf className="w-5 h-5" />,
  logistics: <Truck className="w-5 h-5" />,
  automotive: <Car className="w-5 h-5" />,
  marketing: <Megaphone className="w-5 h-5" />,
  events: <PartyPopper className="w-5 h-5" />,
  home_services: <Home className="w-5 h-5" />,
  mother_baby: <Baby className="w-5 h-5" />,
};

// Legacy interface for backward compatibility
export interface LegacyIndustryTemplate {
  name: string;
  icon: React.ReactNode;
  brand_positioning: string;
  tone_of_voice: string[];
  formality_level: string;
  language_style: string[];
  allow_emoji: boolean;
  preferred_words: string[];
  forbidden_words: string[];
}

// Backward compatible export (will be deprecated)
export const INDUSTRY_TEMPLATES: Record<string, LegacyIndustryTemplate> = {};

// Helper to convert DB template to legacy format
function toLegacyTemplate(template: IndustryTemplate): LegacyIndustryTemplate & { industry: string } {
  return {
    industry: template.name, // Use full name as industry key for backward compatibility
    name: template.short_name || template.name,
    icon: INDUSTRY_ICONS[template.code] || <Briefcase className="w-5 h-5" />,
    brand_positioning: template.brand_positioning || '',
    tone_of_voice: template.brand_voice.tone_of_voice || [],
    formality_level: template.brand_voice.formality_level || 'formal',
    language_style: template.brand_voice.language_style || [],
    allow_emoji: template.brand_voice.allow_emoji || false,
    preferred_words: template.preferred_words || [],
    forbidden_words: template.forbidden_words || [],
  };
}

interface BrandTemplateSelectorProps {
  onSelect: (template: LegacyIndustryTemplate & { industry: string }) => void;
  selectedIndustry?: string;
  countryCode?: string;
}

export function BrandTemplateSelector({ 
  onSelect, 
  selectedIndustry,
  countryCode = 'VN' 
}: BrandTemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    templates, 
    templatesByCategory, 
    categories, 
    isLoading, 
    error 
  } = useIndustryTemplates({
    countryCode,
    languageCode: 'vi',
  });

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) {
      return templates;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return templates.filter((template) => {
      return (
        template.name.toLowerCase().includes(query) ||
        (template.short_name?.toLowerCase() || '').includes(query) ||
        (template.brand_positioning?.toLowerCase() || '').includes(query) ||
        template.preferred_words.some(word => word.toLowerCase().includes(query))
      );
    });
  }, [templates, searchQuery]);

  const handleSelect = (template: IndustryTemplate) => {
    const legacyTemplate = toLegacyTemplate(template);
    onSelect(legacyTemplate);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Đang tải danh sách ngành...
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">Không thể tải danh sách ngành. Vui lòng thử lại.</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (templates.length === 0) {
    return (
      <div className="p-4 rounded-lg border bg-muted/50 text-center">
        <p className="text-sm text-muted-foreground">
          Chưa có templates ngành nào được thiết lập.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Chọn ngành để bắt đầu với cài đặt sẵn phù hợp:
      </p>
      
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm ngành... (VD: tài chính, thời trang, F&B)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-xs text-muted-foreground">
          Tìm thấy {filteredTemplates.length} ngành
        </p>
      )}

      {/* Industry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto pr-1">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map((template) => {
            const isSelected = selectedIndustry === template.name;
            const icon = INDUSTRY_ICONS[template.code] || <Briefcase className="w-5 h-5" />;
            
            return (
              <Card
                key={template.id}
                className={`p-3 cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm ${
                  isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''
                }`}
                onClick={() => handleSelect(template)}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className={`p-2 rounded-full ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                    {icon}
                  </div>
                  <span className="text-xs font-medium line-clamp-2">
                    {template.short_name || template.name}
                  </span>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-8 text-center text-muted-foreground">
            <p>Không tìm thấy ngành phù hợp</p>
            <p className="text-xs mt-1">Thử từ khóa khác hoặc xóa bộ lọc</p>
          </div>
        )}
      </div>
    </div>
  );
}