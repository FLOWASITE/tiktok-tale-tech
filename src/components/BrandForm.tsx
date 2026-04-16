import { useState, useEffect, useMemo, useCallback } from 'react';
import { BrandTemplate, BrandScope } from '@/hooks/useBrandTemplates';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrandFormStepper, BRAND_FORM_STEPS } from '@/components/BrandFormStepper';
import { BrandFormQuickStart } from '@/components/BrandFormQuickStart';
import { BrandFormStepIdentity } from '@/components/BrandFormStepIdentity';
import { BrandFormStepPersonas } from '@/components/BrandFormStepPersonas';
import { BrandFormStepProducts } from '@/components/BrandFormStepProducts';
import { BrandFormStepDNA } from '@/components/BrandFormStepDNA';
import { BrandFormStepGuideline } from '@/components/BrandFormStepGuideline';
import { useCustomerPersonas } from '@/hooks/useCustomerPersonas';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { ChannelSettingsEditor, ChannelOverrides } from '@/components/ChannelSettingsEditor';
import { BrandFormMiniPreview } from '@/components/BrandFormMiniPreview';
import { GlobalPackForSelection } from '@/hooks/useGlobalPacksForBrandSelection';
import { CustomerPersona } from '@/types/customerPersona';
import { DEFAULT_BRAND_GUIDELINE } from '@/types/carousel';
import { ChevronLeft, ChevronRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LocalProductPersonaMapping } from '@/components/brand/LocalProductPersonaLinker';

// Footer info type (moved from BrandFormStepBusiness)
export interface BrandFooterInfo {
  company_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  social_links?: Record<string, string>;
}

export const DEFAULT_FOOTER_INFO: BrandFooterInfo = {
  company_name: '',
  phone: '',
  email: '',
  website: '',
  address: '',
};

type BrandFormData = Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'organization_id'>;

interface BrandFormProps {
  template?: BrandTemplate | null;
  onSubmit: (data: BrandFormData, scope: BrandScope, logoFile?: File | null, deleteLogo?: boolean) => Promise<BrandTemplate | null | void> | void;
  onCancel: () => void;
  isLoading?: boolean;
  quickStartMode?: boolean;
}

export function BrandForm({ template, onSubmit, onCancel, isLoading, quickStartMode = false }: BrandFormProps) {
  const [currentStep, setCurrentStep] = useState(quickStartMode ? 0 : 1);
  const [showQuickStart, setShowQuickStart] = useState(!template && !quickStartMode);
  
  // Form state
  const [scope, setScope] = useState<BrandScope>('personal');
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [brandGuideline, setBrandGuideline] = useState('');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#dd0707');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [deleteLogo, setDeleteLogo] = useState(false);

  // Brand Voice
  const [brandPositioning, setBrandPositioning] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState<string[]>([]);
  const [formalityLevel, setFormalityLevel] = useState('');
  const [languageStyle, setLanguageStyle] = useState<string[]>([]);
  const [preferredWords, setPreferredWords] = useState<string[]>([]);
  const [forbiddenWords, setForbiddenWords] = useState<string[]>([]);
  const [allowEmoji, setAllowEmoji] = useState(true);
  const [complianceRules, setComplianceRules] = useState<string[]>([]);
  const [channelOverrides, setChannelOverrides] = useState<ChannelOverrides>({});
  const [industryTemplateId, setIndustryTemplateId] = useState<string | null>(null); // Legacy v1
  const [globalPackId, setGlobalPackId] = useState<string | null>(null); // v2.1 architecture
  const [footerInfo, setFooterInfo] = useState<BrandFooterInfo>(DEFAULT_FOOTER_INFO);
  const [personas, setPersonas] = useState<CustomerPersona[]>([]);
  const [localProducts, setLocalProducts] = useState<Array<{ id: string; name: string; sku: string; category: string; description: string; price_display: string; image_url: string; unique_selling_points: string[]; target_audience: string; pain_points_solved: string[]; benefits: string[]; keywords: string[]; suggested_content_angles: string[]; best_channels: string[]; is_featured: boolean; is_active: boolean; }>>([]);
  const [localMappings, setLocalMappings] = useState<LocalProductPersonaMapping[]>([]);
  
  // Strategy fields
  const [mission, setMission] = useState('');
  const [vision, setVision] = useState('');
  const [uniqueValueProposition, setUniqueValueProposition] = useState('');
  const [tagline, setTagline] = useState('');
  const [headline, setHeadline] = useState('');
  const [subHeadline, setSubHeadline] = useState('');
  const [targetAgeRange, setTargetAgeRange] = useState('');
  const [targetGender, setTargetGender] = useState('');
  const [marketSegment, setMarketSegment] = useState('');
  const [targetLocations, setTargetLocations] = useState<string[]>([]);
  const [brandHashtags, setBrandHashtags] = useState<string[]>([]);
  const [signaturePhrases, setSignaturePhrases] = useState<string[]>([]);
  const [ctaTemplates, setCtaTemplates] = useState<string[]>([]);
  const [evergreenThemes, setEvergreenThemes] = useState<string[]>([]);
  const [secondaryColors, setSecondaryColors] = useState<string[]>([]);
  const [imageStyle, setImageStyle] = useState('');
  const [mainCompetitors, setMainCompetitors] = useState<string[]>([]);
  const [competitiveAdvantages, setCompetitiveAdvantages] = useState<string[]>([]);
  
  // Validation & AI
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [guidelineExampleGood, setGuidelineExampleGood] = useState('');
  const [guidelineExampleBad, setGuidelineExampleBad] = useState('');
  const [guidelineKeyPrinciples, setGuidelineKeyPrinciples] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(true);

  // Customer personas hook
  const {
    personas: dbPersonas,
    createPersona,
    updatePersona,
    deletePersona: deleteDbPersona,
    refresh: refetchPersonas,
  } = useCustomerPersonas({ brandTemplateId: template?.id, enabled: !!template?.id });

  const { products: dbProducts } = useProductCatalog(template?.id);

  // Sync dbPersonas to local state when loaded from database
  useEffect(() => {
    if (template?.id && dbPersonas.length > 0) {
      setPersonas(dbPersonas);
    }
  }, [template?.id, dbPersonas]);

  // Sync dbProducts to local state when loaded from database
  useEffect(() => {
    if (template?.id && dbProducts.length > 0) {
      setLocalProducts(dbProducts.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku || '',
        category: p.category || '',
        description: p.description || '',
        price_display: p.price_display || '',
        image_url: p.image_url || '',
        unique_selling_points: p.unique_selling_points || [],
        target_audience: p.target_audience || '',
        pain_points_solved: p.pain_points_solved || [],
        benefits: p.benefits || [],
        keywords: p.keywords || [],
        suggested_content_angles: p.suggested_content_angles || [],
        best_channels: p.best_channels || [],
        is_featured: p.is_featured || false,
        is_active: p.is_active !== false,
      })));
    }
  }, [template?.id, dbProducts]);
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
      setScope(template.user_id && template.organization_id ? 'both' : template.organization_id ? 'organization' : 'personal');
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
      setFooterInfo(template.footer_info || DEFAULT_FOOTER_INFO);
      setMission(template.mission || '');
      setVision(template.vision || '');
      setUniqueValueProposition(template.unique_value_proposition || '');
      setTagline(template.tagline || '');
      setHeadline(template.headline || '');
      setSubHeadline(template.sub_headline || '');
      setTargetAgeRange(template.target_age_range || '');
      setTargetGender(template.target_gender || '');
      setMarketSegment(template.market_segment || '');
      setTargetLocations(template.target_locations || []);
      setBrandHashtags(template.brand_hashtags || []);
      setSignaturePhrases(template.signature_phrases || []);
      setCtaTemplates(template.cta_templates || []);
      setEvergreenThemes(template.evergreen_themes || []);
      setSecondaryColors(template.secondary_colors || []);
      setImageStyle(template.image_style || '');
      setMainCompetitors(template.main_competitors || []);
      setCompetitiveAdvantages(template.competitive_advantages || []);
      setShowQuickStart(false);
      setCurrentStep(1);
    } else {
      setBrandGuideline(DEFAULT_BRAND_GUIDELINE);
    }
  }, [template]);

  const completionPercentage = useMemo(() => {
    let score = 0;
    if (name.trim()) score += 15;
    if (brandName.trim()) score += 15;
    if (brandGuideline.trim()) score += 10;
    if (industries.length > 0) score += 10;
    if (brandPositioning) score += 10;
    if (toneOfVoice.length > 0) score += 10;
    if (formalityLevel) score += 10;
    if (languageStyle.length > 0) score += 10;
    if (primaryColor !== '#000000') score += 5;
    if (logoPreview) score += 5;
    return Math.min(score, 100);
  }, [name, brandName, brandGuideline, industries, brandPositioning, toneOfVoice, formalityLevel, languageStyle, primaryColor, logoPreview]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 1 && !brandName.trim()) {
      newErrors.brandName = 'Tên thương hiệu là bắt buộc';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Total steps is now 6
  const TOTAL_STEPS = 6;

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
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

  const handleIndustryTemplateSelect = (packData: GlobalPackForSelection) => {
    // Use global_pack_id for v2.1 architecture
    setGlobalPackId(packData.id);
    setIndustries([packData.name]);
    setBrandPositioning(packData.brandPositioning || '');
    setToneOfVoice(packData.brandVoice.tone_of_voice || []);
    setFormalityLevel(packData.brandVoice.formality_level || '');
    setLanguageStyle(packData.brandVoice.language_style || []);
    setAllowEmoji(packData.brandVoice.allow_emoji || false);
    setPreferredWords(packData.preferredTerms || []);
    setForbiddenWords(packData.forbiddenTerms || []);
    setShowQuickStart(false);
    setCurrentStep(1);
    toast.success('Đã liên kết Industry Memory v2!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== TOTAL_STEPS) return;
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }

    const formData = {
      name: name.trim(),
      brand_name: brandName.trim(),
      industry: industries.length > 0 ? industries : null,
      brand_guideline: brandGuideline.trim(),
      include_logo: includeLogo,
      is_default: isDefault,
      primary_color: primaryColor,
      logo_url: deleteLogo ? null : template?.logo_url || null,
      industry_template_id: industryTemplateId, // Legacy v1 fallback
      global_pack_id: globalPackId, // v2.1 architecture
      jurisdiction_code: 'VN', // Default jurisdiction
      brand_positioning: brandPositioning || null,
      tone_of_voice: toneOfVoice.length > 0 ? toneOfVoice : null,
      formality_level: formalityLevel || null,
      language_style: languageStyle.length > 0 ? languageStyle : null,
      preferred_words: preferredWords.length > 0 ? preferredWords : null,
      forbidden_words: forbiddenWords.length > 0 ? forbiddenWords : null,
      allow_emoji: allowEmoji,
      compliance_rules: complianceRules.length > 0 ? complianceRules : null,
      channel_overrides: Object.keys(channelOverrides).length > 0 ? channelOverrides : null,
      content_pillars: [],
      sample_texts: null,
      footer_info: footerInfo.company_name || footerInfo.phone || footerInfo.email ? footerInfo : null,
      mission: mission || null,
      vision: vision || null,
      unique_value_proposition: uniqueValueProposition || null,
      tagline: tagline || null,
      headline: headline || null,
      sub_headline: subHeadline || null,
      target_age_range: targetAgeRange || null,
      target_gender: targetGender || null,
      market_segment: marketSegment || null,
      target_locations: targetLocations.length > 0 ? targetLocations : null,
      brand_hashtags: brandHashtags.length > 0 ? brandHashtags : null,
      signature_phrases: signaturePhrases.length > 0 ? signaturePhrases : null,
      cta_templates: ctaTemplates.length > 0 ? ctaTemplates : null,
      evergreen_themes: evergreenThemes.length > 0 ? evergreenThemes : null,
      secondary_colors: secondaryColors.length > 0 ? secondaryColors : null,
      image_style: imageStyle || null,
      main_competitors: mainCompetitors.length > 0 ? mainCompetitors : null,
      competitive_advantages: competitiveAdvantages.length > 0 ? competitiveAdvantages : null,
    };

    const result = await onSubmit(formData, scope, logoFile, deleteLogo);
    const templateId = result && typeof result === 'object' && 'id' in result ? result.id : template?.id;
    
    // Save/sync customer personas
    if (templateId && personas.length > 0) {
      try {
        const existingPersonaIds = new Set(dbPersonas.map(p => p.id));
        const currentPersonaIds = new Set(personas.filter(p => p.id).map(p => p.id));
        
        for (const dbPersona of dbPersonas) {
          if (!currentPersonaIds.has(dbPersona.id)) {
            await deleteDbPersona(dbPersona.id);
          }
        }
        
        for (const persona of personas) {
          if (persona.id && existingPersonaIds.has(persona.id)) {
            await updatePersona(persona.id, persona);
          } else {
            await createPersona({
              ...persona,
              brand_template_id: templateId,
            });
          }
        }
      } catch (error) {
        console.error('Failed to sync personas:', error);
        toast.error('Một số Customer Personas chưa được lưu');
      }
    }
    
    // Save local products if this is a new template
    if (!template && result && typeof result === 'object' && 'id' in result && localProducts.length > 0) {
      const newTemplateId = result.id;
      try {
        for (const product of localProducts) {
          const { id, ...productData } = product;
          const { data: { session } } = await supabase.auth.getSession();
          await supabase.from('brand_products').insert({
            brand_template_id: newTemplateId,
            user_id: session?.user?.id,
            ...productData,
          });
        }
        toast.success(`Đã lưu ${localProducts.length} sản phẩm!`);
        setLocalProducts([]);
      } catch (error) {
        console.error('Failed to save products:', error);
        toast.error('Một số sản phẩm chưa được lưu');
      }
    }
    
    // Show toast to remind user to connect social accounts (for new brands only)
    if (!template && result && typeof result === 'object' && 'id' in result) {
      const newTemplateId = result.id;
      toast.success('Đã tạo Brand Template!', {
        description: 'Kết nối tài khoản mạng xã hội để đăng bài trực tiếp',
        action: {
          label: 'Kết nối ngay',
          onClick: () => {
            window.location.href = `/brands/${newTemplateId}?tab=connections`;
          },
        },
        duration: 8000,
      });
    }
  };

  // Quick Start Screen
  if (showQuickStart && !template) {
    return (
      <BrandFormQuickStart
        onSelectIndustry={handleIndustryTemplateSelect}
      />
    );
  }

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      <button type="submit" disabled hidden aria-hidden="true" />

      <BrandFormStepper
        currentStep={currentStep}
        onStepClick={handleStepClick}
        completedSteps={[]}
        validationErrors={errors.brandName ? { 1: true } : {}}
      />

      <div className="flex items-center gap-2 sm:gap-3 px-1">
        <Progress value={completionPercentage} className="h-1.5 sm:h-2 flex-1" />
        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium w-10 sm:w-12 text-right">{completionPercentage}%</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="gap-1 text-xs h-7 px-2 hidden lg:flex"
        >
          {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showPreview ? 'Ẩn' : 'Xem trước'}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Main form content */}
        <div className={(showPreview && currentStep !== 2 && currentStep !== 3) ? 'flex-1 min-w-0' : 'w-full'}>
          {/* Step 1: Identity */}
{currentStep === 1 && (
            <BrandFormStepIdentity
              brandName={brandName}
              setBrandName={setBrandName}
              scope={scope}
              setScope={setScope}
              selectedIndustryName={industries[0] || null}
              setName={setName}
              errors={errors}
              setErrors={setErrors}
              isEditing={!!template}
              // Logo props
              logoPreview={logoPreview}
              logoFile={logoFile}
              setLogoFile={setLogoFile}
              setLogoPreview={setLogoPreview}
              deleteLogo={deleteLogo}
              setDeleteLogo={setDeleteLogo}
              // Visual props
              primaryColor={primaryColor}
              setPrimaryColor={setPrimaryColor}
              includeLogo={includeLogo}
              setIncludeLogo={setIncludeLogo}
              // Footer props
              footerInfo={footerInfo}
              setFooterInfo={setFooterInfo}
              // Strategy props
              mission={mission}
              setMission={setMission}
              vision={vision}
              setVision={setVision}
              uniqueValueProposition={uniqueValueProposition}
              setUniqueValueProposition={setUniqueValueProposition}
              tagline={tagline}
              setTagline={setTagline}
              headline={headline}
              setHeadline={setHeadline}
              subHeadline={subHeadline}
              setSubHeadline={setSubHeadline}
            />
          )}

          {/* Step 2: Customer Personas */}
          {currentStep === 2 && (
            <BrandFormStepPersonas
              personas={personas}
              onPersonasChange={setPersonas}
              brandPositioning={brandPositioning}
              brandName={brandName}
              industryTemplateId={industryTemplateId}
              globalPackId={globalPackId}
              localProducts={localProducts}
              localMappings={localMappings}
              onLocalMappingsChange={setLocalMappings}
            />
          )}

          {/* Step 3: Products */}
          {currentStep === 3 && (
            <BrandFormStepProducts
              brandTemplateId={template?.id}
              localProducts={localProducts}
              onLocalProductsChange={setLocalProducts}
              personas={personas}
              brandName={brandName}
              localMappings={localMappings}
              onLocalMappingsChange={setLocalMappings}
            />
          )}

          {/* Step 4: Voice */}
          {currentStep === 4 && (
            <BrandFormStepDNA
              brandPositioning={brandPositioning}
              setBrandPositioning={setBrandPositioning}
              toneOfVoice={toneOfVoice}
              setToneOfVoice={setToneOfVoice}
              formalityLevel={formalityLevel}
              setFormalityLevel={setFormalityLevel}
              languageStyle={languageStyle}
              setLanguageStyle={setLanguageStyle}
              allowEmoji={allowEmoji}
              setAllowEmoji={setAllowEmoji}
              preferredWords={preferredWords}
              setPreferredWords={setPreferredWords}
              forbiddenWords={forbiddenWords}
              setForbiddenWords={setForbiddenWords}
              complianceRules={complianceRules}
              setComplianceRules={setComplianceRules}
            />
          )}

          {/* Step 5: Channel Settings */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
              <ChannelSettingsEditor
                value={channelOverrides}
                onChange={setChannelOverrides}
                defaultExpanded={true}
                showWrapper={true}
                footerInfo={footerInfo}
                brandAllowEmoji={allowEmoji}
                companyName={brandName}
                tagline={tagline}
              />
            </div>
          )}

          {/* Step 6: Brand Guideline (Final step) */}
          {currentStep === 6 && (
            <BrandFormStepGuideline
              brandName={brandName}
              industries={industries}
              brandTemplateId={template?.id}
              primaryColor={primaryColor}
              hasLogo={!!logoFile || !!logoPreview || !!template?.logo_url}
              brandPositioning={brandPositioning}
              toneOfVoice={toneOfVoice}
              formalityLevel={formalityLevel}
              languageStyle={languageStyle}
              preferredWords={preferredWords}
              forbiddenWords={forbiddenWords}
              allowEmoji={allowEmoji}
              channelOverrides={channelOverrides}
              brandGuideline={brandGuideline}
              setBrandGuideline={setBrandGuideline}
              guidelineExampleGood={guidelineExampleGood}
              setGuidelineExampleGood={setGuidelineExampleGood}
              guidelineExampleBad={guidelineExampleBad}
              setGuidelineExampleBad={setGuidelineExampleBad}
              guidelineKeyPrinciples={guidelineKeyPrinciples}
              setGuidelineKeyPrinciples={setGuidelineKeyPrinciples}
            />
          )}
        </div>

        {/* Mini Preview Panel */}
        {showPreview && currentStep !== 2 && currentStep !== 3 && (
          <div className="hidden lg:block w-96 shrink-0">
            <BrandFormMiniPreview
              brandName={brandName}
              scope={scope}
              industries={industries}
              primaryColor={primaryColor}
              logoPreview={logoPreview}
              brandPositioning={brandPositioning}
              toneOfVoice={toneOfVoice}
              formalityLevel={formalityLevel}
              languageStyle={languageStyle}
              allowEmoji={allowEmoji}
              preferredWords={preferredWords}
              forbiddenWords={forbiddenWords}
              channelOverrides={channelOverrides}
              completionPercentage={completionPercentage}
            />
          </div>
        )}
      </div>

      {/* Navigation - Fixed on mobile */}
      <div className="flex items-center justify-between pt-3 sm:pt-4 border-t sticky bottom-0 bg-background pb-safe">
        <div>
          {currentStep > 1 ? (
            <Button type="button" variant="ghost" onClick={handleBack} className="gap-1 text-sm sm:text-base h-9 sm:h-10 px-2 sm:px-4">
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Quay lại</span>
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onCancel} className="text-sm sm:text-base h-9 sm:h-10 px-2 sm:px-4">
              Hủy
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {currentStep < TOTAL_STEPS ? (
            <Button type="button" onClick={handleNext} className="gap-1 text-sm sm:text-base h-9 sm:h-10 px-3 sm:px-4">
              Tiếp tục
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading} className="gap-2 text-sm sm:text-base h-9 sm:h-10 px-3 sm:px-4">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {template ? 'Cập nhật' : 'Tạo Brand'}
            </Button>
          )}
        </div>
      </div>
      </form>
    </TooltipProvider>
  );
}
