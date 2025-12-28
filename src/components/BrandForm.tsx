import { useState, useEffect, useMemo, useCallback } from 'react';
import { BrandTemplate, BrandScope } from '@/hooks/useBrandTemplates';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrandFormStepper, BRAND_FORM_STEPS } from '@/components/BrandFormStepper';
import { BrandFormQuickStart } from '@/components/BrandFormQuickStart';
import { BrandFormStepIdentity } from '@/components/BrandFormStepIdentity';
import { BrandFormStepBusiness, BrandFooterInfo, DEFAULT_FOOTER_INFO } from '@/components/BrandFormStepBusiness';
import { BrandFormStepGuideline } from '@/components/BrandFormStepGuideline';
import { useCustomerPersonas } from '@/hooks/useCustomerPersonas';
import { BrandVoiceSection } from '@/components/BrandVoiceSection';
import { AIBrandVoiceGenerator } from '@/components/AIBrandVoiceGenerator';
import { ChannelSettingsEditor, ChannelOverrides } from '@/components/ChannelSettingsEditor';
import { QuickSampleGenerator } from '@/components/QuickSampleGenerator';
import { BrandFormMiniPreview } from '@/components/BrandFormMiniPreview';
import { SavedSamplesManager } from '@/components/SavedSamplesManager';
import { VariantSampleComparison } from '@/components/VariantSampleComparison';
import { ContentPillarsEditor } from '@/components/brand/ContentPillarsEditor';
import { useBrandVoiceVariants, ChannelSampleTexts } from '@/hooks/useBrandVoiceVariants';
import { IndustryTemplate } from '@/hooks/useIndustryTemplates';
import { ContentPillar } from '@/types/topicDiscovery';
import { CustomerPersona } from '@/types/customerPersona';
import { DEFAULT_BRAND_GUIDELINE } from '@/types/carousel';
import { ChevronLeft, ChevronRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  const [primaryColor, setPrimaryColor] = useState('#000000');
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
  const [contentPillars, setContentPillars] = useState<ContentPillar[]>([]);
  const [industryTemplateId, setIndustryTemplateId] = useState<string | null>(null);
  const [sampleTexts, setSampleTexts] = useState<Record<string, string> | null>(null);
  const [footerInfo, setFooterInfo] = useState<BrandFooterInfo>(DEFAULT_FOOTER_INFO);
  const [personas, setPersonas] = useState<CustomerPersona[]>([]);
  
  // Validation & AI
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [guidelineExampleGood, setGuidelineExampleGood] = useState('');
  const [guidelineExampleBad, setGuidelineExampleBad] = useState('');
  const [guidelineKeyPrinciples, setGuidelineKeyPrinciples] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(true);
  const [isGeneratingSamples, setIsGeneratingSamples] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareVariants, setCompareVariants] = useState<any[]>([]);

  // Brand voice variants hook (for saved samples)
  const {
    variants,
    loading: variantsLoading,
    createVariant,
    deleteVariant,
    refetch: refetchVariants,
  } = useBrandVoiceVariants(template?.id);

  // Customer personas hook - for loading/saving personas
  const {
    personas: dbPersonas,
    createPersona,
    updatePersona,
    deletePersona: deleteDbPersona,
    refresh: refetchPersonas,
  } = useCustomerPersonas({ brandTemplateId: template?.id, enabled: !!template?.id });

  // Sync dbPersonas to local state when loaded from database
  useEffect(() => {
    if (template?.id && dbPersonas.length > 0) {
      setPersonas(dbPersonas);
    }
  }, [template?.id, dbPersonas]);

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
      setContentPillars((template as any).content_pillars || []);
      setIndustryTemplateId(template.industry_template_id || null);
      setSampleTexts(template.sample_texts || null);
      setFooterInfo(template.footer_info || DEFAULT_FOOTER_INFO);
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
    if (brandGuideline.trim() && brandGuideline !== DEFAULT_BRAND_GUIDELINE) score += 10;
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

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
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

  const handleIndustryTemplateSelect = (templateData: IndustryTemplate) => {
    setIndustryTemplateId(templateData.id);
    setIndustries([templateData.name]);
    setBrandPositioning(templateData.brand_positioning || '');
    setToneOfVoice(templateData.brand_voice.tone_of_voice || []);
    setFormalityLevel(templateData.brand_voice.formality_level || '');
    setLanguageStyle(templateData.brand_voice.language_style || []);
    setAllowEmoji(templateData.brand_voice.allow_emoji || false);
    setPreferredWords(templateData.preferred_words || []);
    setForbiddenWords(templateData.forbidden_words || []);
    setShowQuickStart(false);
    setCurrentStep(1);
    toast.success('Đã liên kết Industry Memory!');
  };

  // Manual sample generation
  const handleGenerateSample = useCallback(async () => {
    if (!brandName.trim()) {
      toast.error('Vui lòng nhập tên thương hiệu trước');
      return;
    }

    setIsGeneratingSamples(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-sample-text', {
        body: {
          brandName,
          positioning: brandPositioning,
          toneOfVoice,
          formalityLevel,
          allowEmoji,
          preferredWords,
          forbiddenWords,
          channels: ['facebook', 'linkedin', 'instagram', 'tiktok', 'email'],
        },
      });

      if (error) throw error;

      if (data?.samples) {
        const normalizedSamples: Record<string, string> = {};
        for (const [key, value] of Object.entries(data.samples)) {
          if (typeof value === 'string') {
            normalizedSamples[key] = value;
          } else if (value && typeof value === 'object') {
            const obj = value as Record<string, unknown>;
            if ('subject' in obj && 'body' in obj) {
              normalizedSamples[key] = `📧 Subject: ${obj.subject}\n\n${obj.body}`;
            } else {
              normalizedSamples[key] = JSON.stringify(value, null, 2);
            }
          } else {
            normalizedSamples[key] = String(value || '');
          }
        }
        setSampleTexts(normalizedSamples);
        toast.success('Đã tạo nội dung mẫu!');
      }
    } catch (err) {
      console.error('Failed to generate samples:', err);
      toast.error('Không thể tạo nội dung mẫu');
    } finally {
      setIsGeneratingSamples(false);
    }
  }, [brandName, brandPositioning, toneOfVoice, formalityLevel, allowEmoji, preferredWords, forbiddenWords]);

  // Track pending samples to save after brand template is created
  const [pendingSamples, setPendingSamples] = useState<Array<{
    name: string;
    sample_texts: Record<string, string>;
    brand_positioning: string | null;
    tone_of_voice: string[] | null;
    formality_level: string | null;
    language_style: string[] | null;
    preferred_words: string[] | null;
    forbidden_words: string[] | null;
    allow_emoji: boolean;
  }>>([]);

  // Save current sample as a variant
  const handleSaveSample = useCallback(async (customName: string) => {
    if (!sampleTexts) {
      toast.error('Vui lòng tạo mẫu trước');
      return;
    }

    const sampleData = {
      name: customName,
      sample_texts: sampleTexts,
      brand_positioning: brandPositioning || null,
      tone_of_voice: toneOfVoice.length > 0 ? toneOfVoice : null,
      formality_level: formalityLevel || null,
      language_style: languageStyle.length > 0 ? languageStyle : null,
      preferred_words: preferredWords.length > 0 ? preferredWords : null,
      forbidden_words: forbiddenWords.length > 0 ? forbiddenWords : null,
      allow_emoji: allowEmoji,
    };

    // If template already exists, save to database immediately
    if (template?.id) {
      const result = await createVariant({
        name: customName,
        brand_template_id: template.id,
        is_control: variants.length === 0,
        brand_positioning: sampleData.brand_positioning,
        tone_of_voice: sampleData.tone_of_voice,
        formality_level: sampleData.formality_level,
        language_style: sampleData.language_style,
        preferred_words: sampleData.preferred_words,
        forbidden_words: sampleData.forbidden_words,
        allow_emoji: sampleData.allow_emoji,
        sample_texts: sampleTexts as ChannelSampleTexts,
      });

      if (result) {
        setSampleTexts(null);
        refetchVariants();
      }
    } else {
      // Template not saved yet, store in pending list
      setPendingSamples(prev => [...prev, sampleData]);
      setSampleTexts(null);
      toast.success(`Đã lưu tạm "${customName}". Mẫu sẽ được lưu khi bạn hoàn tất tạo Brand Template.`);
    }
  }, [
    sampleTexts,
    template?.id,
    variants.length,
    brandPositioning,
    toneOfVoice,
    formalityLevel,
    languageStyle,
    preferredWords,
    forbiddenWords,
    allowEmoji,
    createVariant,
    refetchVariants,
  ]);

  // Open compare dialog
  const handleCompareVariants = useCallback((variantsToCompare: any[]) => {
    setCompareVariants(variantsToCompare);
    setShowCompareDialog(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== 5) return;
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
      content_pillars: contentPillars.length > 0 ? contentPillars : [],
      sample_texts: sampleTexts,
      footer_info: footerInfo.company_name || footerInfo.phone || footerInfo.email ? footerInfo : null,
    };

    // Call onSubmit and get the result (for new templates)
    const result = await onSubmit(formData, scope, logoFile, deleteLogo);
    
    // Get the template ID (either from result for new templates, or from existing template)
    const templateId = result && typeof result === 'object' && 'id' in result ? result.id : template?.id;
    
    // Save/sync customer personas
    if (templateId && personas.length > 0) {
      try {
        // Get existing personas from DB to compare
        const existingPersonaIds = new Set(dbPersonas.map(p => p.id));
        const currentPersonaIds = new Set(personas.filter(p => p.id).map(p => p.id));
        
        // Delete personas that were removed
        for (const dbPersona of dbPersonas) {
          if (!currentPersonaIds.has(dbPersona.id)) {
            await deleteDbPersona(dbPersona.id);
          }
        }
        
        // Create or update personas
        for (const persona of personas) {
          if (persona.id && existingPersonaIds.has(persona.id)) {
            // Update existing persona
            await updatePersona(persona.id, persona);
          } else {
            // Create new persona
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
    
    // If this is a new template and we have pending samples, save them
    if (!template && result && typeof result === 'object' && 'id' in result && pendingSamples.length > 0) {
      const newTemplateId = result.id;
      
      // Save all pending samples to the database
      for (let i = 0; i < pendingSamples.length; i++) {
        const sample = pendingSamples[i];
        try {
          await createVariant({
            brand_template_id: newTemplateId,
            name: sample.name,
            is_control: i === 0, // First sample becomes control
            brand_positioning: sample.brand_positioning,
            tone_of_voice: sample.tone_of_voice,
            formality_level: sample.formality_level,
            language_style: sample.language_style,
            preferred_words: sample.preferred_words,
            forbidden_words: sample.forbidden_words,
            allow_emoji: sample.allow_emoji,
            sample_texts: sample.sample_texts as ChannelSampleTexts,
          });
        } catch (error) {
          console.error(`Failed to save pending sample "${sample.name}":`, error);
        }
      }

      toast.success(`Đã lưu ${pendingSamples.length} mẫu nội dung!`);
      setPendingSamples([]);
    }
  };

  // Quick Start Screen
  if (showQuickStart && !template) {
    return (
      <BrandFormQuickStart
        onSelectIndustry={handleIndustryTemplateSelect}
        onStartManual={() => {
          setShowQuickStart(false);
          setCurrentStep(1);
        }}
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
        <div className={showPreview ? 'flex-1 min-w-0' : 'w-full'}>
          {/* Step 1: Identity */}
          {currentStep === 1 && (
            <BrandFormStepIdentity
              brandName={brandName}
              setBrandName={setBrandName}
              scope={scope}
              setScope={setScope}
              industryTemplateId={industryTemplateId}
              setIndustryTemplateId={setIndustryTemplateId}
              setIndustries={setIndustries}
              setBrandPositioning={setBrandPositioning}
              setToneOfVoice={setToneOfVoice}
              setFormalityLevel={setFormalityLevel}
              setLanguageStyle={setLanguageStyle}
              setAllowEmoji={setAllowEmoji}
              setPreferredWords={setPreferredWords}
              setForbiddenWords={setForbiddenWords}
              setName={setName}
              errors={errors}
              setErrors={setErrors}
              isEditing={!!template}
            />
          )}

          {/* Step 2: Business & Visual */}
          {currentStep === 2 && (
            <BrandFormStepBusiness
              brandTemplateId={template?.id}
              brandName={brandName}
              brandPositioning={brandPositioning}
              footerInfo={footerInfo}
              onFooterInfoChange={setFooterInfo}
              personas={personas}
              onPersonasChange={setPersonas}
              primaryColor={primaryColor}
              setPrimaryColor={setPrimaryColor}
              logoPreview={logoPreview}
              setLogoPreview={setLogoPreview}
              logoFile={logoFile}
              setLogoFile={setLogoFile}
              deleteLogo={deleteLogo}
              setDeleteLogo={setDeleteLogo}
              existingLogoUrl={template?.logo_url}
              includeLogo={includeLogo}
              setIncludeLogo={setIncludeLogo}
              isDefault={isDefault}
              setIsDefault={setIsDefault}
            />
          )}

          {/* Step 3: Brand Voice */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium">Brand Voice Profile</span>
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

              {/* Content Pillars Editor */}
              <ContentPillarsEditor
                pillars={contentPillars}
                onChange={setContentPillars}
              />
              {/* Sample generation and management */}
              <SavedSamplesManager
                variants={variants}
                pendingSamples={pendingSamples}
                brandName={brandName}
                currentSampleTexts={sampleTexts}
                isGenerating={isGeneratingSamples}
                isNewBrand={!template?.id}
                onGenerateSample={handleGenerateSample}
                onSaveSample={handleSaveSample}
                onDeleteVariant={deleteVariant}
                onDeletePendingSample={(index) => {
                  setPendingSamples(prev => prev.filter((_, i) => i !== index));
                }}
                onCompareVariants={handleCompareVariants}
              />
            </div>
          )}

          {/* Compare Dialog */}
          {showCompareDialog && compareVariants.length >= 2 && (
            <VariantSampleComparison
              open={showCompareDialog}
              onOpenChange={setShowCompareDialog}
              brandName={brandName}
              variants={compareVariants}
            />
          )}

          {/* Step 4: Channel Settings */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
              <ChannelSettingsEditor
                value={channelOverrides}
                onChange={setChannelOverrides}
                defaultExpanded={true}
                showWrapper={true}
              />
              
              {/* Quick Sample Generator with Rules */}
              <QuickSampleGenerator
                brandName={brandName}
                brandPositioning={brandPositioning}
                toneOfVoice={toneOfVoice}
                formalityLevel={formalityLevel}
                allowEmoji={allowEmoji}
                preferredWords={preferredWords}
                forbiddenWords={forbiddenWords}
                channelOverrides={channelOverrides}
                onSampleGenerated={(samples) => {
                  setSampleTexts(samples);
                }}
              />
            </div>
          )}

          {/* Step 5: Brand Guideline */}
          {currentStep === 5 && (
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
        {showPreview && (
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
          {currentStep < 5 ? (
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
