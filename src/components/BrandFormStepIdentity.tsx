import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { BrandScope } from '@/hooks/useBrandTemplates';
import { useIndustryTemplates, IndustryTemplate } from '@/hooks/useIndustryTemplates';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Building2, Search, ShieldCheck } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

// Industry icons mapping
import { 
  Briefcase, Coffee, Code, GraduationCap, Heart, Plane, ShoppingCart,
  Megaphone, Scale, Hammer, Sparkles, Store, Factory, Leaf, Truck, Shield,
  Landmark, Smartphone, Gamepad2, Palette, Dumbbell, Sofa, Ship, Rocket,
  Bitcoin, UsersRound, PartyPopper, Home, Baby, PawPrint, Car
} from 'lucide-react';

const INDUSTRY_ICONS: Record<string, React.ReactNode> = {
  accounting: <Briefcase className="w-4 h-4" />,
  banking: <Landmark className="w-4 h-4" />,
  insurance: <Shield className="w-4 h-4" />,
  crypto_fintech: <Bitcoin className="w-4 h-4" />,
  it: <Code className="w-4 h-4" />,
  telecom: <Smartphone className="w-4 h-4" />,
  gaming: <Gamepad2 className="w-4 h-4" />,
  startup: <Rocket className="w-4 h-4" />,
  ecommerce: <ShoppingCart className="w-4 h-4" />,
  retail: <Store className="w-4 h-4" />,
  import_export: <Ship className="w-4 h-4" />,
  healthcare: <Heart className="w-4 h-4" />,
  education: <GraduationCap className="w-4 h-4" />,
  legal: <Scale className="w-4 h-4" />,
  consulting: <UsersRound className="w-4 h-4" />,
  hr: <UsersRound className="w-4 h-4" />,
  fnb: <Coffee className="w-4 h-4" />,
  travel: <Plane className="w-4 h-4" />,
  fashion: <Sparkles className="w-4 h-4" />,
  beauty: <Palette className="w-4 h-4" />,
  fitness: <Dumbbell className="w-4 h-4" />,
  pet: <PawPrint className="w-4 h-4" />,
  realestate: <Building2 className="w-4 h-4" />,
  construction: <Hammer className="w-4 h-4" />,
  interior: <Sofa className="w-4 h-4" />,
  manufacturing: <Factory className="w-4 h-4" />,
  agriculture: <Leaf className="w-4 h-4" />,
  logistics: <Truck className="w-4 h-4" />,
  automotive: <Car className="w-4 h-4" />,
  marketing: <Megaphone className="w-4 h-4" />,
  events: <PartyPopper className="w-4 h-4" />,
  home_services: <Home className="w-4 h-4" />,
  mother_baby: <Baby className="w-4 h-4" />,
};

interface BrandFormStepIdentityProps {
  brandName: string;
  setBrandName: (value: string) => void;
  scope: BrandScope;
  setScope: (value: BrandScope) => void;
  industryTemplateId: string | null;
  setIndustryTemplateId: (id: string | null) => void;
  setIndustries: (industries: string[]) => void;
  setBrandPositioning: (value: string) => void;
  setToneOfVoice: (value: string[]) => void;
  setFormalityLevel: (value: string) => void;
  setLanguageStyle: (value: string[]) => void;
  setAllowEmoji: (value: boolean) => void;
  setPreferredWords: (value: string[]) => void;
  setForbiddenWords: (value: string[]) => void;
  setName: (value: string) => void;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  isEditing?: boolean;
}

export function BrandFormStepIdentity({
  brandName,
  setBrandName,
  scope,
  setScope,
  industryTemplateId,
  setIndustryTemplateId,
  setIndustries,
  setBrandPositioning,
  setToneOfVoice,
  setFormalityLevel,
  setLanguageStyle,
  setAllowEmoji,
  setPreferredWords,
  setForbiddenWords,
  setName,
  errors,
  setErrors,
  isEditing = false,
}: BrandFormStepIdentityProps) {
  const { currentOrganization } = useOrganizationContext();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { templates, isLoading } = useIndustryTemplates({
    countryCode: 'VN',
    languageCode: 'vi',
  });

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(t => 
      t.name.toLowerCase().includes(query) ||
      (t.short_name?.toLowerCase() || '').includes(query)
    );
  }, [templates, searchQuery]);

  const selectedTemplate = useMemo(() => {
    if (!industryTemplateId) return null;
    return templates.find(t => t.id === industryTemplateId);
  }, [templates, industryTemplateId]);

  const handleSelectIndustry = (template: IndustryTemplate) => {
    setIndustryTemplateId(template.id);
    setIndustries([template.name]);
    setBrandPositioning(template.brand_positioning || '');
    setToneOfVoice(template.brand_voice.tone_of_voice || []);
    setFormalityLevel(template.brand_voice.formality_level || '');
    setLanguageStyle(template.brand_voice.language_style || []);
    setAllowEmoji(template.brand_voice.allow_emoji || false);
    setPreferredWords(template.preferred_words || []);
    setForbiddenWords(template.forbidden_words || []);
  };

  const handleClearIndustry = () => {
    setIndustryTemplateId(null);
    setIndustries([]);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Scope Selection */}
      <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
        <Label className="text-sm font-medium">Phạm vi sử dụng</Label>
        <RadioGroup 
          value={scope} 
          onValueChange={(v) => setScope(v as BrandScope)}
          className="flex flex-col gap-2"
          disabled={isEditing}
        >
          <div className="flex items-center space-x-3 p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="personal" id="personal" />
            <Label htmlFor="personal" className="flex-1 cursor-pointer flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Cá nhân</p>
                <p className="text-xs text-muted-foreground">Chỉ bạn có thể sử dụng brand này</p>
              </div>
            </Label>
          </div>
          {currentOrganization && (
            <div className="flex items-center space-x-3 p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="organization" id="organization" />
              <Label htmlFor="organization" className="flex-1 cursor-pointer flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{currentOrganization.name}</p>
                  <p className="text-xs text-muted-foreground">Tất cả thành viên trong tổ chức có thể sử dụng</p>
                </div>
              </Label>
            </div>
          )}
        </RadioGroup>
      </div>

      {/* Brand Name */}
      <div className="space-y-2">
        <Label htmlFor="brandName">Tên Thương hiệu *</Label>
        <Input
          id="brandName"
          value={brandName}
          onChange={(e) => {
            const value = e.target.value;
            setBrandName(value);
            if (!isEditing) {
              setName(value);
            }
            if (errors.brandName) {
              setErrors({ ...errors, brandName: '' });
            }
          }}
          placeholder="VD: Thuế Hộ by TAF.vn"
          className={errors.brandName ? 'border-destructive' : ''}
        />
        {errors.brandName && (
          <p className="text-xs text-destructive">{errors.brandName}</p>
        )}
      </div>

      {/* Industry Selection - From Database */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Ngành nghề (Industry Memory)</Label>
          {selectedTemplate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearIndustry}
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
            >
              Bỏ chọn
            </Button>
          )}
        </div>

        {selectedTemplate ? (
          <div className="p-3 rounded-lg border-2 border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/10">
                {INDUSTRY_ICONS[selectedTemplate.code] || <Briefcase className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{selectedTemplate.name}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 bg-emerald-500/10 text-emerald-600">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Protected
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Đã áp dụng Industry Memory với các quy tắc tuân thủ ngành
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm ngành..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Industry Grid */}
            {isLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[280px] overflow-y-auto pr-1">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectIndustry(template)}
                    className={cn(
                      "p-3 rounded-lg border text-center transition-all hover:border-primary/50 hover:shadow-sm",
                      "flex flex-col items-center gap-2"
                    )}
                  >
                    <div className="p-2 rounded-full bg-muted">
                      {INDUSTRY_ICONS[template.code] || <Briefcase className="w-4 h-4" />}
                    </div>
                    <span className="text-xs font-medium line-clamp-2">
                      {template.short_name || template.name}
                    </span>
                  </button>
                ))}
                {filteredTemplates.length === 0 && (
                  <div className="col-span-full py-8 text-center text-muted-foreground text-sm">
                    Không tìm thấy ngành phù hợp
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              💡 Chọn ngành để tự động áp dụng bộ quy tắc tuân thủ (Industry Memory)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
