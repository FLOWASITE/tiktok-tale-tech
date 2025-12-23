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
import { Card } from '@/components/ui/card';
import { BrandColorPicker } from '@/components/BrandColorPicker';
import { BrandVoiceSection } from '@/components/BrandVoiceSection';
import { BrandVoicePreview } from '@/components/BrandVoicePreview';
import { AIBrandVoiceGenerator } from '@/components/AIBrandVoiceGenerator';
import { ChannelSettingsEditor, ChannelOverrides } from '@/components/ChannelSettingsEditor';
import { BrandTemplateSelector, LegacyIndustryTemplate } from '@/components/BrandTemplateSelector';
import { BrandFormStepper, BRAND_FORM_STEPS } from '@/components/BrandFormStepper';
import { IndustryPackSummary } from '@/components/IndustryPackSummary';
import { IndustryLockedBadge } from '@/components/IndustryLockedBadge';
import { UnlinkIndustryDialog } from '@/components/UnlinkIndustryDialog';
import { useIndustryMemoryById } from '@/hooks/useIndustryMemory';
import { DEFAULT_BRAND_GUIDELINE } from '@/types/carousel';
import { Upload, X, Image as ImageIcon, ChevronsUpDown, Check, User, Building2, ChevronLeft, ChevronRight, Wand2, Sparkles, Loader2, ShieldCheck, Lock, AlertTriangle, Eye, RefreshCw, Unlink, Target } from 'lucide-react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

  // Industry Memory Pack Link
  const [industryTemplateId, setIndustryTemplateId] = useState<string | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // AI Quick Start
  const [aiDescription, setAiDescription] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Guideline AI results
  const [guidelineExampleGood, setGuidelineExampleGood] = useState('');
  const [guidelineExampleBad, setGuidelineExampleBad] = useState('');
  const [guidelineKeyPrinciples, setGuidelineKeyPrinciples] = useState<string[]>([]);
  const [isGeneratingGuideline, setIsGeneratingGuideline] = useState(false);

  // Industry Memory UI state
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [showIndustryDetails, setShowIndustryDetails] = useState(false);

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
      setIndustryTemplateId(template.industry_template_id || null);
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
      setIndustryTemplateId(null);
    }
  }, [template]);

  // Fetch Industry Memory for linked pack (for indicator)
  const { data: linkedIndustryMemory, isLoading: isLoadingIndustryMemory } = useIndustryMemoryById(industryTemplateId);

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

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const handleIndustryTemplateSelect = (templateData: LegacyIndustryTemplate & { industry: string }) => {
    // Save the FK to link Brand with Industry Memory Pack
    setIndustryTemplateId(templateData.id);
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
    toast.success('Đã liên kết Industry Memory và áp dụng cài đặt ngành!');
  };

  // Handler to clear Industry Memory link with confirmation
  const handleClearIndustryLink = () => {
    setShowUnlinkDialog(true);
  };

  const confirmUnlinkIndustry = () => {
    setIndustryTemplateId(null);
    toast.info('Đã bỏ liên kết Industry Memory');
  };

  const handleAIQuickStart = async () => {
    const trimmedDesc = aiDescription.trim();
    if (!trimmedDesc) {
      toast.error('Vui lòng nhập mô tả sản phẩm/dịch vụ');
      return;
    }
    if (trimmedDesc.length < 2) {
      toast.error('Vui lòng nhập mô tả sản phẩm/dịch vụ của bạn');
      return;
    }

    setIsGeneratingAI(true);
    try {
      // 1) Generate Brand Guideline first (source of truth)
      const inferredBrandName = brandName.trim() || name.trim() || 'Thương hiệu';

      const { data: guidelineData, error: guidelineError } = await supabase.functions.invoke(
        'generate-brand-guideline',
        {
          body: {
            brand_name: inferredBrandName,
            industry: industries,
            primary_color: primaryColor,
            has_logo: !!logoFile || !!logoPreview || !!template?.logo_url,
            tone_of_voice: toneOfVoice,
            formality_level: formalityLevel,
            brand_positioning: brandPositioning,
            language_style: languageStyle,
            preferred_words: preferredWords,
            forbidden_words: forbiddenWords,
            // Note: description is not required for guideline generation in current implementation
          },
        }
      );

      if (guidelineError) throw guidelineError;
      if (guidelineData?.error) {
        toast.error(guidelineData.error);
        return;
      }
      if (!guidelineData?.guideline) {
        toast.error('Không nhận được Brand Guideline từ AI.');
        return;
      }

      setBrandGuideline(guidelineData.guideline);
      setGuidelineExampleGood(guidelineData.example_good || '');
      setGuidelineExampleBad(guidelineData.example_bad || '');
      setGuidelineKeyPrinciples(guidelineData.key_principles || []);

      // 2) Generate Brand Voice based on the guideline
      const { data: voiceData, error: voiceError } = await supabase.functions.invoke('generate-brand-voice', {
        body: {
          brand_name: inferredBrandName,
          brand_guideline: guidelineData.guideline,
          industry: industries,
          primary_color: primaryColor,
          brand_positioning: brandPositioning,
          tone_of_voice: toneOfVoice,
          formality_level: formalityLevel,
          language_style: languageStyle,
          preferred_words: preferredWords,
          forbidden_words: forbiddenWords,
        },
      });

      if (voiceError) throw voiceError;
      if (voiceData?.error) {
        toast.error(voiceData.error);
        return;
      }

      if (voiceData?.suggestions) {
        const s = voiceData.suggestions;

        // Auto-fill brand name if user hasn't entered yet
        if (!brandName.trim() && inferredBrandName !== 'Thương hiệu') {
          setBrandName(inferredBrandName);
          setName(inferredBrandName);
        }

        if (s.brand_positioning) setBrandPositioning(s.brand_positioning);
        if (s.tone_of_voice) setToneOfVoice(s.tone_of_voice);
        if (s.formality_level) setFormalityLevel(s.formality_level);
        if (s.language_style) setLanguageStyle(s.language_style);
        if (s.preferred_words) setPreferredWords(s.preferred_words);
        if (s.forbidden_words) setForbiddenWords(s.forbidden_words);
        if (s.allow_emoji !== undefined) setAllowEmoji(s.allow_emoji);

        setShowQuickStart(false);
        setCurrentStep(1);
        toast.success('Đã tạo Guideline & Brand Voice với AI!');
      } else {
        toast.error('Không nhận được Brand Voice từ AI.');
      }
    } catch (error) {
      console.error('Error generating guideline/brand voice:', error);
      const msg = error instanceof Error ? error.message : 'Không thể tạo đề xuất. Vui lòng thử lại.';
      toast.error(msg);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleGenerateGuideline = async () => {
    if (!brandName.trim()) {
      toast.error('Cần có tên brand để tạo guideline');
      return;
    }

    setIsGeneratingGuideline(true);
    // Clear previous examples
    setGuidelineExampleGood('');
    setGuidelineExampleBad('');
    setGuidelineKeyPrinciples([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-brand-guideline', {
        body: {
          brand_name: brandName.trim(),
          industry: industries,
          primary_color: primaryColor,
          has_logo: !!logoFile || !!logoPreview || !!template?.logo_url,
          tone_of_voice: toneOfVoice,
          formality_level: formalityLevel,
          brand_positioning: brandPositioning,
          language_style: languageStyle,
          preferred_words: preferredWords,
          forbidden_words: forbiddenWords,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.guideline) {
        setBrandGuideline(data.guideline);
        setGuidelineExampleGood(data.example_good || '');
        setGuidelineExampleBad(data.example_bad || '');
        setGuidelineKeyPrinciples(data.key_principles || []);
        toast.success('Đã tạo Brand Guideline chi tiết!');
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

    // Prevent accidental submits (Enter key / implicit buttons) before the final step.
    if (currentStep !== 3) {
      return;
    }

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
        industry_template_id: industryTemplateId,
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
        {/* Legal Statement */}
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
            <Lock className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              <span className="font-medium">Industry Memory</span> là bộ quy tắc bắt buộc nhằm đảm bảo tuân thủ ngành & quốc gia. 
              Một số quy tắc không thể thay đổi.
            </span>
          </p>
        </div>

        {/* Option 1: Industry Memory (Recommended) */}
        <Card className="p-4 border-2 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-full bg-emerald-500/10">
              <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Bắt đầu với Industry Memory
                </h3>
                <IndustryLockedBadge variant="protected" showLabel={false} />
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium">
                  Recommended
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Chọn ngành để áp dụng bộ quy tắc tuân thủ sẵn có
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* What you get */}
            <div className="p-3 rounded-lg bg-background/50 border">
              <p className="text-xs font-medium text-muted-foreground mb-2">⚡ Pack đã chọn sẽ tự động:</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-destructive" />
                  <span>Áp dụng từ cấm ngành <span className="text-destructive font-medium">(LOCKED)</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Áp dụng compliance rules <span className="text-emerald-600 dark:text-emerald-400 font-medium">(LOCKED)</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>Thiết lập Brand Voice nền <span className="text-muted-foreground">(có thể tinh chỉnh trong giới hạn cho phép)</span></span>
                </div>
              </div>
            </div>

            {/* Industry Selector */}
            <BrandTemplateSelector
              onSelect={handleIndustryTemplateSelect}
              selectedIndustry={industries[0]}
            />
          </div>
        </Card>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Hoặc</span>
          </div>
        </div>

        {/* Option 2: AI Quick Start */}
        <Card className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-full bg-primary/10">
              <Wand2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">AI Quick Start</h3>
                <IndustryLockedBadge variant="warning" showLabel={false} />
              </div>
              <p className="text-sm text-muted-foreground">
                Mô tả sản phẩm/dịch vụ → AI tự gợi ý brand voice
              </p>
            </div>
          </div>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full gap-2">
                <Sparkles className="w-4 h-4" />
                Bắt đầu với AI
                <span className="text-xs text-amber-600 dark:text-amber-400">(không có Industry Protection)</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Brand sẽ không được bảo vệ bởi Industry Rules
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-desc">Mô tả sản phẩm/dịch vụ *</Label>
                <Textarea
                  id="quick-desc"
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="VD: Dịch vụ kế toán trọn gói cho doanh nghiệp nhỏ và vừa..."
                  rows={3}
                  className="resize-none"
                  disabled={isGeneratingAI}
                />
              </div>
              <Button
                type="button"
                onClick={handleAIQuickStart}
                disabled={isGeneratingAI || !aiDescription.trim()}
                className="w-full gap-2"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI đang phân tích...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Tạo Brand Voice với AI
                  </>
                )}
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Hoặc</span>
          </div>
        </div>

        {/* Option 3: Manual */}
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-muted">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">Tạo thủ công</h3>
                <IndustryLockedBadge variant="warning" showLabel={false} />
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Nhập tất cả thông tin từ đầu
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowQuickStart(false);
                  setCurrentStep(1);
                }}
                className="gap-2"
              >
                Bắt đầu từ đầu
                <span className="text-xs text-amber-600 dark:text-amber-400">(không có Industry Protection)</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        // Block implicit submit via Enter before final step (except in multi-line textareas)
        if (e.key === 'Enter' && currentStep !== 3 && e.target instanceof HTMLElement) {
          const tag = e.target.tagName?.toLowerCase();
          if (tag !== 'textarea') {
            e.preventDefault();
          }
        }
      }}
      className="space-y-5"
    >
      {/* Hidden submit prevents some browsers from auto-submitting unexpected controls */}
      <button type="submit" disabled hidden aria-hidden="true" />

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
                      type="button"
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="brandGuideline">Brand Guideline</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateGuideline}
                    disabled={isGeneratingGuideline || !brandName.trim()}
                    className="gap-1 h-7 text-xs"
                  >
                    {isGeneratingGuideline ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    AI Tạo Guideline
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
                
                {/* AI Guideline Preview với ví dụ tốt/xấu */}
                {(guidelineExampleGood || guidelineExampleBad || guidelineKeyPrinciples.length > 0) && (
                  <div className="mt-3 space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Sparkles className="w-4 h-4" />
                      AI Preview
                    </div>
                    
                    {guidelineKeyPrinciples.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Nguyên tắc chính:</p>
                        <ul className="text-xs space-y-1 list-disc list-inside text-foreground/80">
                          {guidelineKeyPrinciples.map((principle, idx) => (
                            <li key={idx}>{principle}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {guidelineExampleGood && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Ví dụ đúng:
                        </p>
                        <p className="text-xs p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-green-800 dark:text-green-300">
                          "{guidelineExampleGood}"
                        </p>
                      </div>
                    )}
                    
                    {guidelineExampleBad && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                          <X className="w-3 h-3" /> Ví dụ sai (tránh):
                        </p>
                        <p className="text-xs p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 line-through">
                          "{guidelineExampleBad}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
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

          {/* Industry Memory Link Section - LOCKED */}
          {industryTemplateId ? (
            <div className="space-y-3 p-4 rounded-lg border-2 border-emerald-500/30 bg-emerald-500/5">
              {/* Header with Legal Statement */}
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  INDUSTRY MEMORY (LOCKED)
                </span>
                <IndustryLockedBadge variant="protected" showLabel={false} />
              </div>
              
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Industry Memory là bộ quy tắc bắt buộc nhằm đảm bảo tuân thủ ngành & quốc gia. Một số quy tắc không thể thay đổi.
              </p>

              {/* Pack Info Card */}
              {isLoadingIndustryMemory ? (
                <div className="p-3 rounded-lg bg-background border animate-pulse">
                  <div className="h-4 w-32 bg-muted rounded mb-2" />
                  <div className="h-3 w-48 bg-muted rounded" />
                </div>
              ) : linkedIndustryMemory ? (
                <div className="p-3 rounded-lg bg-background border space-y-3">
                  {/* Pack Summary */}
                  <IndustryPackSummary
                    name={linkedIndustryMemory.name}
                    version={linkedIndustryMemory.version}
                    countryName="Việt Nam"
                    flagEmoji="🇻🇳"
                    forbiddenTermsCount={linkedIndustryMemory.forbidden_terms?.length || 0}
                    complianceRulesCount={linkedIndustryMemory.compliance_rules?.length || 0}
                    claimRestrictionsCount={linkedIndustryMemory.claim_restrictions?.length || 0}
                    status="stable"
                  />

                  {/* Expandable Details */}
                  <Collapsible open={showIndustryDetails} onOpenChange={setShowIndustryDetails}>
                    <CollapsibleTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="w-full justify-between h-8 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5" />
                          {showIndustryDetails ? 'Ẩn chi tiết' : 'Xem chi tiết rules'}
                        </span>
                        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showIndustryDetails && "rotate-90")} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-3">
                      {/* Forbidden Terms */}
                      {linkedIndustryMemory.forbidden_terms?.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-destructive flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Từ cấm ngành ({linkedIndustryMemory.forbidden_terms.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {linkedIndustryMemory.forbidden_terms.slice(0, 7).map((term, idx) => (
                              <span key={idx} className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                                {term}
                              </span>
                            ))}
                            {linkedIndustryMemory.forbidden_terms.length > 7 && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                …và {linkedIndustryMemory.forbidden_terms.length - 7} từ khác
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Compliance Rules */}
                      {linkedIndustryMemory.compliance_rules?.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Compliance rules ({linkedIndustryMemory.compliance_rules.length})
                          </p>
                          <ul className="text-xs text-muted-foreground space-y-0.5 pl-4 list-disc">
                            {linkedIndustryMemory.compliance_rules.slice(0, 3).map((rule, idx) => (
                              <li key={idx}>{rule}</li>
                            ))}
                            {linkedIndustryMemory.compliance_rules.length > 3 && (
                              <li className="text-muted-foreground/70">…và {linkedIndustryMemory.compliance_rules.length - 3} quy tắc khác</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Claim Restrictions */}
                      {linkedIndustryMemory.claim_restrictions?.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Claim restrictions ({linkedIndustryMemory.claim_restrictions.length})
                          </p>
                          <ul className="text-xs text-muted-foreground space-y-0.5 pl-4 list-disc">
                            {linkedIndustryMemory.claim_restrictions.slice(0, 2).map((claim, idx) => (
                              <li key={idx}>{claim}</li>
                            ))}
                            {linkedIndustryMemory.claim_restrictions.length > 2 && (
                              <li className="text-muted-foreground/70">…và {linkedIndustryMemory.claim_restrictions.length - 2} hạn chế khác</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        setIndustryTemplateId(null);
                        // Show selector to change
                      }}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Đổi Pack
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                      onClick={handleClearIndustryLink}
                    >
                      <Unlink className="h-3 w-3" />
                      Bỏ liên kết
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-background border text-sm text-muted-foreground">
                  Đang tải thông tin Industry Memory...
                </div>
              )}
            </div>
          ) : (
            /* No Industry Pack Linked - Warning State */
            <div className="space-y-3 p-4 rounded-lg border-2 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  NO INDUSTRY PROTECTION
                </span>
                <IndustryLockedBadge variant="warning" showLabel={false} />
              </div>
              
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Brand này không được liên kết với Industry Memory. Nội dung tạo ra có thể không tuân thủ quy định ngành.
              </p>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    + Liên kết Industry Memory
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <BrandTemplateSelector
                    onSelect={handleIndustryTemplateSelect}
                    selectedIndustry={industries[0]}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Unlink Industry Dialog */}
          <UnlinkIndustryDialog
            open={showUnlinkDialog}
            onOpenChange={setShowUnlinkDialog}
            onConfirm={confirmUnlinkIndustry}
            industryMemory={linkedIndustryMemory || null}
          />
        </div>
      )}

      {/* Step 2: Brand Voice */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Brand Voice Profile</Label>
            <AIBrandVoiceGenerator
              brandName={brandName}
              brandGuideline={brandGuideline}
              currentIndustry={industries}
              primaryColor={primaryColor}
              brandPositioning={brandPositioning}
              toneOfVoice={toneOfVoice}
              formalityLevel={formalityLevel}
              languageStyle={languageStyle}
              preferredWords={preferredWords}
              forbiddenWords={forbiddenWords}
              hasLogo={!!logoFile || !!logoPreview || !!template?.logo_url}
              onGuidelineGenerated={(result) => {
                setBrandGuideline(result.guideline);
                if (result.example_good) setGuidelineExampleGood(result.example_good);
                if (result.example_bad) setGuidelineExampleBad(result.example_bad);
                if (result.key_principles) setGuidelineKeyPrinciples(result.key_principles);
                if (result.suggested_brand_positioning) setBrandPositioning(result.suggested_brand_positioning);
                if (result.suggested_formality_level) setFormalityLevel(result.suggested_formality_level);
              }}
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
          <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
            <h3 className="font-semibold text-base">Cài đặt kênh</h3>
            <p className="text-sm text-muted-foreground">
              Chạm vào từng kênh để mở và chỉnh thông số.
            </p>
          </div>

          <ChannelSettingsEditor
            value={channelOverrides}
            onChange={setChannelOverrides}
            defaultExpanded={true}
            showWrapper={true}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="sticky bottom-0 z-10 -mx-1 px-1 pt-4 pb-3 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
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
      </div>
    </form>
  );
}
