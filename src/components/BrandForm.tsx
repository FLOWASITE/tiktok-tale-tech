import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BrandTemplate, BrandScope } from '@/hooks/useBrandTemplates';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { BrandColorPicker } from '@/components/BrandColorPicker';
import { BrandVoiceSection } from '@/components/BrandVoiceSection';
import { BrandVoicePreview } from '@/components/BrandVoicePreview';
import { AIBrandVoiceGenerator } from '@/components/AIBrandVoiceGenerator';
import { ChannelSettingsEditor, ChannelOverrides } from '@/components/ChannelSettingsEditor';
import { BrandTemplateSelector, INDUSTRY_TEMPLATES } from '@/components/BrandTemplateSelector';
import { BrandFormStepper, BRAND_FORM_STEPS } from '@/components/BrandFormStepper';
import { DEFAULT_BRAND_GUIDELINE } from '@/types/carousel';
import { Upload, X, Image as ImageIcon, ChevronsUpDown, Check, User, Building2, ChevronLeft, ChevronRight, Wand2, Sparkles, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SUGGESTED_INDUSTRIES = [
  'Tài chính & Kế toán',
  'Bất động sản',
  'F&B (Nhà hàng, Quán cà phê)',
  'Công nghệ thông tin',
  'Giáo dục & Đào tạo',
  'Y tế & Sức khỏe',
  'Du lịch & Khách sạn',
  'Thương mại điện tử',
  'Marketing & Truyền thông',
  'Luật & Pháp lý',
  'Xây dựng & Nội thất',
  'Thời trang & Làm đẹp',
  'Bán lẻ',
  'Sản xuất & Công nghiệp',
  'Nông nghiệp',
  'Logistics & Vận tải',
  'Bảo hiểm',
  'Tư vấn & Dịch vụ chuyên nghiệp',
];

// Type for form data without ownership fields
type BrandFormData = Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'organization_id'>;

interface BrandFormProps {
  template?: BrandTemplate | null;
  onSubmit: (data: BrandFormData, scope: BrandScope, logoFile?: File | null, deleteLogo?: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
  quickStartMode?: boolean;
}

export function BrandForm({ template, onSubmit, onCancel, isLoading, quickStartMode = false }: BrandFormProps) {
  const { currentOrganization } = useOrganizationContext();
  
  // Stepper state
  const [currentStep, setCurrentStep] = useState(quickStartMode ? 0 : 1);
  const [showQuickStart, setShowQuickStart] = useState(!template && !quickStartMode);
  
  // Scope selection
  const [scope, setScope] = useState<BrandScope>('personal');
  
  // Basic info
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [brandGuideline, setBrandGuideline] = useState('');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [deleteLogo, setDeleteLogo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Brand Voice Profile
  const [brandPositioning, setBrandPositioning] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState<string[]>([]);
  const [formalityLevel, setFormalityLevel] = useState('');
  const [languageStyle, setLanguageStyle] = useState<string[]>([]);
  const [preferredWords, setPreferredWords] = useState<string[]>([]);
  const [forbiddenWords, setForbiddenWords] = useState<string[]>([]);
  const [allowEmoji, setAllowEmoji] = useState(true);
  const [complianceRules, setComplianceRules] = useState<string[]>([]);

  // Channel Settings Overrides
  const [channelOverrides, setChannelOverrides] = useState<ChannelOverrides>({});

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // AI Quick Start
  const [aiDescription, setAiDescription] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isGeneratingGuideline, setIsGeneratingGuideline] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setBrandName(template.brand_name);
      setIndustries(template.industry || []);
      setBrandGuideline(template.brand_guideline);
      setIncludeLogo(template.include_logo);
      setIsDefault(template.is_default);
      setPrimaryColor(template.primary_color || '#000000');
      setLogoPreview(template.logo_url);
      setLogoFile(null);
      setDeleteLogo(false);
      setScope(template.organization_id ? 'organization' : 'personal');
      setBrandPositioning(template.brand_positioning || '');
      setToneOfVoice(template.tone_of_voice || []);
      setFormalityLevel(template.formality_level || '');
      setLanguageStyle(template.language_style || []);
      setPreferredWords(template.preferred_words || []);
      setForbiddenWords(template.forbidden_words || []);
      setAllowEmoji(template.allow_emoji ?? true);
      setComplianceRules(template.compliance_rules || []);
      setChannelOverrides(template.channel_overrides || {});
      setShowQuickStart(false);
      setCurrentStep(1);
    } else {
      setName('');
      setBrandName('');
      setIndustries([]);
      setBrandGuideline(DEFAULT_BRAND_GUIDELINE);
      setIncludeLogo(true);
      setIsDefault(false);
      setPrimaryColor('#000000');
      setLogoPreview(null);
      setLogoFile(null);
      setDeleteLogo(false);
      setScope('personal');
      setBrandPositioning('');
      setToneOfVoice([]);
      setFormalityLevel('');
      setLanguageStyle([]);
      setPreferredWords([]);
      setForbiddenWords([]);
      setAllowEmoji(true);
      setComplianceRules([]);
      setChannelOverrides({});
    }
  }, [template]);

  // Calculate form completion percentage
  const completionPercentage = useMemo(() => {
    let score = 0;
    const weights = {
      name: 15,
      brandName: 15,
      brandGuideline: 10,
      industries: 5,
      brandPositioning: 10,
      toneOfVoice: 10,
      formalityLevel: 10,
      languageStyle: 10,
      primaryColor: 5,
      logoPreview: 5,
      preferredWords: 5,
    };
    
    if (name.trim()) score += weights.name;
    if (brandName.trim()) score += weights.brandName;
    if (brandGuideline.trim() && brandGuideline !== DEFAULT_BRAND_GUIDELINE) score += weights.brandGuideline;
    if (industries.length > 0) score += weights.industries;
    if (brandPositioning) score += weights.brandPositioning;
    if (toneOfVoice.length > 0) score += weights.toneOfVoice;
    if (formalityLevel) score += weights.formalityLevel;
    if (languageStyle.length > 0) score += weights.languageStyle;
    if (primaryColor !== '#000000') score += weights.primaryColor;
    if (logoPreview) score += weights.logoPreview;
    if (preferredWords.length > 0) score += weights.preferredWords;
    
    return Math.min(score, 100);
  }, [name, brandName, brandGuideline, industries, brandPositioning, toneOfVoice, formalityLevel, languageStyle, primaryColor, logoPreview, preferredWords]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!brandName.trim()) newErrors.brandName = 'Tên thương hiệu là bắt buộc';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleStepClick = (step: number) => {
    if (step < currentStep || validateStep(currentStep)) {
      setCurrentStep(step);
    }
  };

  const toggleIndustry = (item: string) => {
    setIndustries(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item) 
        : [...prev, item]
    );
  };

  const addCustomIndustry = () => {
    const trimmed = searchValue.trim();
    if (trimmed && !industries.includes(trimmed)) {
      setIndustries(prev => [...prev, trimmed]);
      setSearchValue('');
    }
  };

  const removeIndustry = (item: string) => {
    setIndustries(prev => prev.filter(i => i !== item));
  };

  const handleFileSelect = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      setLogoFile(file);
      setDeleteLogo(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setDeleteLogo(!!template?.logo_url);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleIndustryTemplateSelect = (templateData: typeof INDUSTRY_TEMPLATES[string] & { industry: string }) => {
    setIndustries([templateData.industry]);
    setBrandPositioning(templateData.brand_positioning);
    setToneOfVoice(templateData.tone_of_voice);
    setFormalityLevel(templateData.formality_level);
    setLanguageStyle(templateData.language_style);
    setAllowEmoji(templateData.allow_emoji);
    setPreferredWords(templateData.preferred_words);
    setForbiddenWords(templateData.forbidden_words);
    setShowQuickStart(false);
    setCurrentStep(1);
    toast.success('Đã áp dụng cài đặt ngành!');
  };

  const handleAIQuickStart = async () => {
    if (!brandName.trim()) {
      toast.error('Vui lòng nhập Tên Thương hiệu trước');
      return;
    }

    if (!aiDescription.trim()) {
      toast.error('Vui lòng nhập mô tả sản phẩm/dịch vụ');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-brand-voice', {
        body: {
          description: aiDescription.trim(),
          industry: industries.join(', '),
        },
      });

      if (error) throw error;

      if (data?.suggestions) {
        const s = data.suggestions;
        if (s.brand_positioning) setBrandPositioning(s.brand_positioning);
        if (s.tone_of_voice) setToneOfVoice(s.tone_of_voice);
        if (s.formality_level) setFormalityLevel(s.formality_level);
        if (s.language_style) setLanguageStyle(s.language_style);
        if (s.preferred_words) setPreferredWords(s.preferred_words);
        if (s.forbidden_words) setForbiddenWords(s.forbidden_words);
        if (s.allow_emoji !== undefined) setAllowEmoji(s.allow_emoji);

        // Use AI reasoning as guideline when user hasn't customized it yet
        if (s.reasoning && brandGuideline.trim() === DEFAULT_BRAND_GUIDELINE.trim()) {
          setBrandGuideline(s.reasoning);
        }

        setShowQuickStart(false);
        setCurrentStep(1);
        toast.success('Đã áp dụng đề xuất AI!');
      } else {
        toast.error('Không nhận được đề xuất từ AI.');
      }
    } catch (error) {
      console.error('Error generating brand voice:', error);
      toast.error('Không thể tạo đề xuất. Vui lòng thử lại.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleGenerateGuideline = async () => {
    if (!brandName.trim() || toneOfVoice.length === 0) {
      toast.error('Cần có tên brand và tone of voice để tạo guideline');
      return;
    }

    setIsGeneratingGuideline(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-brand-voice', {
        body: {
          description: `Tạo brand guideline ngắn gọn cho thương hiệu "${brandName}" với định vị "${brandPositioning || 'chưa xác định'}", tone of voice: ${toneOfVoice.join(', ')}, phong cách ${formalityLevel || 'semi_formal'}.`,
          generateGuideline: true,
        },
      });

      if (error) throw error;

      if (data?.guideline) {
        setBrandGuideline(data.guideline);
        toast.success('Đã tạo Brand Guideline!');
      } else if (data?.suggestions?.reasoning) {
        setBrandGuideline(data.suggestions.reasoning);
        toast.success('Đã tạo Brand Guideline!');
      }
    } catch (error) {
      console.error('Error generating guideline:', error);
      toast.error('Không thể tạo guideline. Vui lòng thử lại.');
    } finally {
      setIsGeneratingGuideline(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }
    
    onSubmit(
      {
        name: name.trim(),
        brand_name: brandName.trim(),
        industry: industries.length > 0 ? industries : null,
        brand_guideline: brandGuideline.trim(),
        include_logo: includeLogo,
        is_default: isDefault,
        primary_color: primaryColor,
        logo_url: deleteLogo ? null : template?.logo_url || null,
        brand_positioning: brandPositioning || null,
        tone_of_voice: toneOfVoice.length > 0 ? toneOfVoice : null,
        formality_level: formalityLevel || null,
        language_style: languageStyle.length > 0 ? languageStyle : null,
        preferred_words: preferredWords.length > 0 ? preferredWords : null,
        forbidden_words: forbiddenWords.length > 0 ? forbiddenWords : null,
        allow_emoji: allowEmoji,
        compliance_rules: complianceRules.length > 0 ? complianceRules : null,
        channel_overrides: Object.keys(channelOverrides).length > 0 ? channelOverrides : null,
      },
      scope,
      logoFile,
      deleteLogo
    );
  };

  // Quick Start / Industry Template Selection View
  if (showQuickStart && !template) {
    return (
      <div className="space-y-6">
        {/* AI Quick Start */}
        <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-full bg-primary/10">
              <Wand2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Bắt đầu nhanh với AI</h3>
              <p className="text-sm text-muted-foreground">
                Nhập Tên thương hiệu + mô tả sản phẩm/dịch vụ để AI tạo Brand Voice cho bạn
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="quick-brandName">Tên Thương hiệu *</Label>
              <Input
                id="quick-brandName"
                value={brandName}
                onChange={(e) => {
                  const value = e.target.value;
                  setBrandName(value);
                  if (!template) setName(value);
                }}
                placeholder="VD: Thuế Hộ by TAF.vn"
                disabled={isGeneratingAI}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-desc">Mô tả sản phẩm/dịch vụ *</Label>
              <Textarea
                id="quick-desc"
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
                placeholder="VD: Dịch vụ kế toán trọn gói cho doanh nghiệp nhỏ và vừa, chuyên về hỗ trợ thuế và tư vấn tài chính..."
                rows={3}
                className="resize-none"
                disabled={isGeneratingAI}
              />
            </div>

            <Button
              onClick={handleAIQuickStart}
              disabled={isGeneratingAI || !aiDescription.trim() || !brandName.trim()}
              className="w-full gap-2"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang phân tích...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Tạo đề xuất với AI
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Hoặc</span>
          </div>
        </div>

        {/* Industry Templates */}
        <BrandTemplateSelector
          onSelect={handleIndustryTemplateSelect}
          selectedIndustry={industries[0]}
        />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Hoặc</span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setShowQuickStart(false);
            setCurrentStep(1);
          }}
          className="w-full"
        >
          Tạo từ đầu
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Stepper */}
      <BrandFormStepper
        currentStep={currentStep}
        onStepClick={handleStepClick}
        completedSteps={[]}
      />

      {/* Completion Progress */}
      <div className="flex items-center gap-3 px-1">
        <Progress value={completionPercentage} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground font-medium w-12 text-right">
          {completionPercentage}%
        </span>
      </div>

      {/* Step 1: Basic Info */}
      {currentStep === 1 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
          {/* Scope Selection */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <Label className="text-sm font-medium">Phạm vi sử dụng</Label>
            <RadioGroup 
              value={scope} 
              onValueChange={(v) => setScope(v as BrandScope)}
              className="flex flex-col gap-2"
              disabled={!!template}
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

          <div className="grid gap-5 md:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brandName">Tên Thương hiệu *</Label>
                <Input
                  id="brandName"
                  value={brandName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setBrandName(value);
                    // Auto-sync to name field
                    if (!template) {
                      setName(value);
                    }
                    if (errors.brandName) setErrors(prev => ({ ...prev, brandName: '' }));
                  }}
                  placeholder="VD: Thuế Hộ by TAF.vn"
                  className={errors.brandName ? 'border-destructive' : ''}
                />
                {errors.brandName && (
                  <p className="text-xs text-destructive">{errors.brandName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Ngành nghề</Label>
                {industries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {industries.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-primary/10 text-primary border border-primary/20"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => removeIndustry(item)}
                          className="hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        'w-full justify-between font-normal',
                        industries.length === 0 && 'text-muted-foreground'
                      )}
                    >
                      {industries.length === 0 
                        ? 'Chọn ngành nghề...' 
                        : `${industries.length} ngành đã chọn`}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 z-50 bg-popover" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Tìm hoặc nhập ngành..." 
                        value={searchValue}
                        onValueChange={setSearchValue}
                      />
                      <CommandList>
                        {searchValue.trim() && !SUGGESTED_INDUSTRIES.some(i => 
                          i.toLowerCase() === searchValue.trim().toLowerCase()
                        ) && (
                          <CommandItem
                            onSelect={addCustomIndustry}
                            className="text-primary"
                          >
                            <Check className="mr-2 h-4 w-4 opacity-0" />
                            Thêm "{searchValue.trim()}"
                          </CommandItem>
                        )}
                        <CommandGroup heading="Gợi ý">
                          {SUGGESTED_INDUSTRIES.filter(item => 
                            item.toLowerCase().includes(searchValue.toLowerCase())
                          ).map((item) => (
                            <CommandItem
                              key={item}
                              value={item}
                              onSelect={() => toggleIndustry(item)}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  industries.includes(item) ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {item}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <BrandColorPicker value={primaryColor} onChange={setPrimaryColor} />
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Logo upload */}
              <div className="space-y-2">
                <Label>Logo</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative w-16 h-16 rounded-lg border border-border overflow-hidden bg-muted shrink-0">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute -top-1 -right-1 p-1 rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/50 shrink-0">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {logoPreview ? 'Thay đổi' : 'Upload'}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        Kéo thả hoặc click để upload
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="brandGuideline">Brand Guideline</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateGuideline}
                    disabled={isGeneratingGuideline || !brandName.trim() || toneOfVoice.length === 0}
                    className="gap-1 h-7 text-xs"
                  >
                    {isGeneratingGuideline ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    AI Gợi ý
                  </Button>
                </div>
                <Textarea
                  id="brandGuideline"
                  value={brandGuideline}
                  onChange={(e) => setBrandGuideline(e.target.value)}
                  placeholder="Mô tả phong cách, màu sắc, tone of voice..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeLogo"
                    checked={includeLogo}
                    onCheckedChange={(checked) => setIncludeLogo(checked === true)}
                  />
                  <Label htmlFor="includeLogo" className="text-sm cursor-pointer">
                    Bao gồm Logo trong carousel
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isDefault"
                    checked={isDefault}
                    onCheckedChange={(checked) => setIsDefault(checked === true)}
                  />
                  <Label htmlFor="isDefault" className="text-sm cursor-pointer">
                    Đặt làm mặc định
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Brand Voice */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Brand Voice Profile</Label>
            <AIBrandVoiceGenerator
              currentIndustry={industries}
              onApply={(suggestions) => {
                if (suggestions.brand_positioning) setBrandPositioning(suggestions.brand_positioning);
                if (suggestions.tone_of_voice) setToneOfVoice(suggestions.tone_of_voice);
                if (suggestions.formality_level) setFormalityLevel(suggestions.formality_level);
                if (suggestions.language_style) setLanguageStyle(suggestions.language_style);
                if (suggestions.preferred_words) setPreferredWords(suggestions.preferred_words);
                if (suggestions.forbidden_words) setForbiddenWords(suggestions.forbidden_words);
                if (suggestions.allow_emoji !== undefined) setAllowEmoji(suggestions.allow_emoji);
              }}
            />
          </div>
          <BrandVoiceSection
            brandPositioning={brandPositioning}
            onBrandPositioningChange={setBrandPositioning}
            toneOfVoice={toneOfVoice}
            onToneOfVoiceChange={setToneOfVoice}
            formalityLevel={formalityLevel}
            onFormalityLevelChange={setFormalityLevel}
            languageStyle={languageStyle}
            onLanguageStyleChange={setLanguageStyle}
            preferredWords={preferredWords}
            onPreferredWordsChange={setPreferredWords}
            forbiddenWords={forbiddenWords}
            onForbiddenWordsChange={setForbiddenWords}
            allowEmoji={allowEmoji}
            onAllowEmojiChange={setAllowEmoji}
            complianceRules={complianceRules}
            onComplianceRulesChange={setComplianceRules}
          />
          
          {/* Preview */}
          <BrandVoicePreview
            brandName={brandName}
            positioning={brandPositioning}
            toneOfVoice={toneOfVoice}
            formalityLevel={formalityLevel}
            languageStyle={languageStyle}
            allowEmoji={allowEmoji}
            preferredWords={preferredWords}
            forbiddenWords={forbiddenWords}
          />
        </div>
      )}

      {/* Step 3: Channel Settings */}
      {currentStep === 3 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
          <ChannelSettingsEditor
            value={channelOverrides}
            onChange={setChannelOverrides}
            defaultExpanded={true}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {currentStep > 1 && (
            <Button type="button" variant="outline" onClick={handleBack} disabled={isLoading}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Quay lại
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
            Hủy
          </Button>
          {currentStep < 3 ? (
            <Button type="button" onClick={handleNext} disabled={isLoading}>
              Tiếp theo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading || !brandName.trim()}>
              {isLoading ? 'Đang lưu...' : template ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
