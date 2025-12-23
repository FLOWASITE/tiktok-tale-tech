import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { BrandScope } from '@/hooks/useBrandTemplates';
import { useIndustryTemplates, IndustryTemplate } from '@/hooks/useIndustryTemplates';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Building2, Search, ShieldCheck, X, ChevronDown } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  const [showIndustrySelector, setShowIndustrySelector] = useState(!industryTemplateId);
  
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
    setShowIndustrySelector(false);
  };

  const handleClearIndustry = () => {
    setIndustryTemplateId(null);
    setIndustries([]);
    setShowIndustrySelector(true);
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Brand Name - Primary focus */}
      <div className="space-y-2">
        <Label htmlFor="brandName" className="text-sm font-medium">
          Tên Thương hiệu <span className="text-destructive">*</span>
        </Label>
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
          className={cn(
            "h-11 text-base",
            errors.brandName && 'border-destructive focus-visible:ring-destructive'
          )}
          autoFocus
        />
        {errors.brandName && (
          <p className="text-xs text-destructive">{errors.brandName}</p>
        )}
      </div>

      {/* Inline Scope Selection */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
        <span className="text-sm text-muted-foreground shrink-0">Phạm vi:</span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={scope === 'personal' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setScope('personal')}
            disabled={isEditing}
            className="h-8 gap-1.5"
          >
            <User className="w-3.5 h-3.5" />
            Cá nhân
          </Button>
          {currentOrganization && (
            <Button
              type="button"
              variant={scope === 'organization' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setScope('organization')}
              disabled={isEditing}
              className="h-8 gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5" />
              {currentOrganization.name}
            </Button>
          )}
        </div>
      </div>

      {/* Industry Selection - Compact when selected */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Ngành nghề (Industry Memory)</Label>
        
        {selectedTemplate ? (
          /* Selected Industry Badge */
          <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
            <div className="p-1.5 rounded-md bg-primary/10">
              {INDUSTRY_ICONS[selectedTemplate.code] || <Briefcase className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{selectedTemplate.name}</span>
                <Badge variant="secondary" className="text-[10px] h-4 shrink-0">
                  <ShieldCheck className="w-3 h-3 mr-0.5" />
                  Protected
                </Badge>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleClearIndustry}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          /* Industry Selector */
          <Collapsible open={showIndustrySelector} onOpenChange={setShowIndustrySelector}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between h-10"
              >
                <span className="text-muted-foreground">Chọn ngành để áp dụng bộ quy tắc tuân thủ</span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  showIndustrySelector && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm ngành..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>

                {/* Industry Grid */}
                {isLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-1">
                    {filteredTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleSelectIndustry(template)}
                        className={cn(
                          "p-2 rounded-lg border bg-background transition-all",
                          "hover:border-primary/50 hover:bg-primary/5",
                          "flex items-center gap-2"
                        )}
                      >
                        <div className="p-1.5 rounded-md bg-muted shrink-0">
                          {INDUSTRY_ICONS[template.code] || <Briefcase className="w-4 h-4" />}
                        </div>
                        <span className="text-xs font-medium truncate">
                          {template.short_name || template.name}
                        </span>
                      </button>
                    ))}
                    {filteredTemplates.length === 0 && (
                      <div className="col-span-full py-4 text-center text-muted-foreground text-sm">
                        Không tìm thấy ngành phù hợp
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        <p className="text-xs text-muted-foreground">
          💡 Ngành được chọn sẽ tự động áp dụng bộ quy tắc tuân thủ & Brand Voice nền
        </p>
      </div>
    </div>
  );
}
