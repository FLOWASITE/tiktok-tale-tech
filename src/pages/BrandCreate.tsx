import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Palette, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrandTemplates, BrandTemplate, BrandScope } from '@/hooks/useBrandTemplates';
import { BrandCreatePreviewPanel } from '@/components/brand/BrandCreatePreviewPanel';
import { BrandFormStepper, BRAND_FORM_STEPS } from '@/components/BrandFormStepper';
import { BrandFormQuickStart } from '@/components/BrandFormQuickStart';
import { BrandCreateStartChooser } from '@/components/brand/BrandCreateStartChooser';
import { BrandImportDialog } from '@/components/brand/BrandImportDialog';
import { IndustrySelectionDialog } from '@/components/brand/IndustrySelectionDialog';
import { BrandFormStepIdentity } from '@/components/BrandFormStepIdentity';
import { BrandFormStepPersonas } from '@/components/BrandFormStepPersonas';
import { BrandFormStepProducts } from '@/components/BrandFormStepProducts';
import { BrandFormStepDNA } from '@/components/BrandFormStepDNA';
import { BrandFormStepGuideline } from '@/components/BrandFormStepGuideline';
import { ChannelSettingsEditor, ChannelOverrides } from '@/components/ChannelSettingsEditor';
import { useCustomerPersonas } from '@/hooks/useCustomerPersonas';
import { GlobalPackForSelection } from '@/hooks/useGlobalPacksForBrandSelection';
import { CustomerPersona } from '@/types/customerPersona';
import { DEFAULT_BRAND_GUIDELINE } from '@/types/carousel';
import { LocalProductPersonaMapping } from '@/components/brand/LocalProductPersonaLinker';
import { BrandFooterInfo, DEFAULT_FOOTER_INFO } from '@/components/BrandForm';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useQuery } from '@tanstack/react-query';
import { normalizeBrandPositioning, normalizeBrandVoiceSuggestion, normalizeFormalityLevel, normalizeToneOfVoice } from '@/lib/brandVoiceNormalization';

interface LocationState {
  editTemplate?: BrandTemplate;
  focusFooterInfo?: boolean;
  importedSuggestion?: {
    suggestion: any;
    raw_meta?: any;
    source?: 'website' | 'fanpage';
  };
}

type BrandFormData = Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'organization_id'>;

export default function BrandCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const editingTemplateFromState = locationState?.editTemplate || null;
  const focusFooterInfo = locationState?.focusFooterInfo || false;
  const importedSuggestion = locationState?.importedSuggestion || null;

  const { templates, saveTemplate, updateTemplate, uploadLogo, deleteLogo, refetch } = useBrandTemplates();
  const { currentOrganization } = useOrganizationContext();

  // Recently used industry packs (per organization)
  const { data: recentlyUsedIds = [], refetch: refetchRecent } = useQuery({
    queryKey: ['org-recent-industries', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [] as string[];
      const { data } = await supabase
        .from('organizations')
        .select('last_used_industry_pack_ids')
        .eq('id', currentOrganization.id)
        .maybeSingle();
      const ids = (data as any)?.last_used_industry_pack_ids;
      return Array.isArray(ids) ? (ids as string[]) : [];
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60 * 1000,
  });

  // Build suggested context for AI from imported brand info
  const suggestedContext = useMemo(() => {
    if (!importedSuggestion) return undefined;
    const s = (importedSuggestion as any).suggestion || {};
    const meta = (importedSuggestion as any).raw_meta || {};
    const parts = [
      s.brand_name && `Tên: ${s.brand_name}`,
      s.tagline && `Slogan: ${s.tagline}`,
      s.mission && `Sứ mệnh: ${s.mission}`,
      s.industry_suggestion && `Ngành gợi ý: ${s.industry_suggestion}`,
      Array.isArray(s.usps) && s.usps.length && `USP: ${s.usps.join('; ')}`,
      meta.description && `Mô tả: ${meta.description}`,
      meta.title && `Title: ${meta.title}`,
      meta.content_summary && `Nội dung: ${String(meta.content_summary).slice(0, 1500)}`,
      meta.footer_info?.company_name && `Công ty: ${meta.footer_info.company_name}`,
    ].filter(Boolean);
    const text = parts.join('\n');
    return text.length >= 20 ? text : undefined;
  }, [importedSuggestion]);


  // If we only have the ID, find the full template from the hook
  const editingTemplate = useMemo(() => {
    if (!editingTemplateFromState) return null;
    // If full template is provided, use it
    if (editingTemplateFromState.name) return editingTemplateFromState;
    // Otherwise, find it from templates list by ID
    return templates.find(t => t.id === editingTemplateFromState.id) || null;
  }, [editingTemplateFromState, templates]);

  // UI state
  const [currentStep, setCurrentStep] = useState(editingTemplate ? 1 : 0);
  const [showQuickStart, setShowQuickStart] = useState(!editingTemplate);
  // Initial chooser: shown only for brand-new flows (not editing, not pre-imported)
  const [showStartChooser, setShowStartChooser] = useState(
    !editingTemplate && !locationState?.importedSuggestion,
  );
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [showIndustryConfirmAfterImport, setShowIndustryConfirmAfterImport] = useState(false);
  const [colorChosenFromImport, setColorChosenFromImport] = useState(false);
  const [importedColorCandidates, setImportedColorCandidates] = useState<Array<{ hex: string; source: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form state - same as BrandForm
  const [scope, setScope] = useState<BrandScope>('organization');
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [brandGuideline, setBrandGuideline] = useState(DEFAULT_BRAND_GUIDELINE);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#dd0707');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [deletingLogo, setDeletingLogo] = useState(false);

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

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [guidelineExampleGood, setGuidelineExampleGood] = useState('');
  const [guidelineExampleBad, setGuidelineExampleBad] = useState('');
  const [guidelineKeyPrinciples, setGuidelineKeyPrinciples] = useState<string[]>([]);

  // Defensive helpers (backend data can be null/string/object)
  const asStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
    }
    if (typeof value === 'string' && value.trim().length > 0) return [value.trim()];
    return [];
  };

  const asObject = <T,>(value: unknown, fallback: T): T => {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : fallback;
  };

  // Customer personas hook
  const {
    personas: dbPersonas,
    createPersona,
    updatePersona,
    deletePersona: deleteDbPersona,
    refresh: refetchPersonas,
  } = useCustomerPersonas({ brandTemplateId: editingTemplate?.id, enabled: !!editingTemplate?.id });

  // Sync dbPersonas to local state when loaded from database
  useEffect(() => {
    if (editingTemplate?.id && dbPersonas.length > 0) {
      setPersonas(dbPersonas);
    }
  }, [editingTemplate?.id, dbPersonas]);

  // Hydration flag to prevent re-running form population on every render
  const hasHydratedRef = useRef(false);
  const importedLogoUrlRef = useRef<string | null>(null);

  // Populate form with editing template data - ONLY ONCE
  useEffect(() => {
    if (editingTemplate && !hasHydratedRef.current) {
      hasHydratedRef.current = true;
      
      setName(editingTemplate.name || '');
      setBrandName(editingTemplate.brand_name || '');
      setIndustries(asStringArray(editingTemplate.industry));
      setBrandGuideline(editingTemplate.brand_guideline || DEFAULT_BRAND_GUIDELINE);
      setIncludeLogo(editingTemplate.include_logo);
      setIsDefault(editingTemplate.is_default);
      setPrimaryColor(editingTemplate.primary_color || '#000000');
      setLogoPreview(editingTemplate.logo_url);
      setScope(
        editingTemplate.user_id && editingTemplate.organization_id
          ? 'both'
          : editingTemplate.organization_id
            ? 'organization'
            : 'personal'
      );

      setBrandPositioning(normalizeBrandPositioning(editingTemplate.brand_positioning) || '');
      setToneOfVoice(normalizeToneOfVoice(editingTemplate.tone_of_voice));
      setFormalityLevel(normalizeFormalityLevel(editingTemplate.formality_level) || '');
      setLanguageStyle(asStringArray(editingTemplate.language_style));
      setPreferredWords(asStringArray(editingTemplate.preferred_words));
      setForbiddenWords(asStringArray(editingTemplate.forbidden_words));
      setAllowEmoji(editingTemplate.allow_emoji ?? true);
      setComplianceRules(asStringArray(editingTemplate.compliance_rules));
      setChannelOverrides(asObject(editingTemplate.channel_overrides, {} as ChannelOverrides));
      setIndustryTemplateId(editingTemplate.industry_template_id || null);
      setGlobalPackId((editingTemplate as any).global_pack_id || null);
      setFooterInfo(asObject(editingTemplate.footer_info, DEFAULT_FOOTER_INFO));

      setMission(editingTemplate.mission || '');
      setVision(editingTemplate.vision || '');
      setUniqueValueProposition(editingTemplate.unique_value_proposition || '');
      setTagline(editingTemplate.tagline || '');
      setHeadline(editingTemplate.headline || '');
      setSubHeadline(editingTemplate.sub_headline || '');
      setTargetAgeRange(editingTemplate.target_age_range || '');
      setTargetGender(editingTemplate.target_gender || '');
      setMarketSegment(editingTemplate.market_segment || '');

      setTargetLocations(asStringArray(editingTemplate.target_locations));
      setBrandHashtags(asStringArray(editingTemplate.brand_hashtags));
      setSignaturePhrases(asStringArray(editingTemplate.signature_phrases));
      setCtaTemplates(asStringArray(editingTemplate.cta_templates));
      setEvergreenThemes(asStringArray(editingTemplate.evergreen_themes));
      setSecondaryColors(asStringArray(editingTemplate.secondary_colors));

      setImageStyle(editingTemplate.image_style || '');
      setMainCompetitors(asStringArray(editingTemplate.main_competitors));
      setCompetitiveAdvantages(asStringArray(editingTemplate.competitive_advantages));

      setShowQuickStart(false);
      setCurrentStep(1);
    }
  }, [editingTemplate]);

  // Hydrate from imported brand suggestion (when navigated from BrandImportDialog)
  useEffect(() => {
    if (importedSuggestion && !editingTemplate && !hasHydratedRef.current) {
      hasHydratedRef.current = true;
      const s = normalizeBrandVoiceSuggestion(importedSuggestion.suggestion || {});
      const meta = importedSuggestion.raw_meta || {};
      if (s.brand_name) {
        setName(s.brand_name);
        setBrandName(s.brand_name);
      }
      if (s.tagline) setTagline(s.tagline);
      if (s.mission) setMission(s.mission);
      // NOTE: Không auto-set industry — mở IndustrySelectionDialog để user xác nhận từ AI list.
      if (s.target_audience?.age_range) setTargetAgeRange(s.target_audience.age_range);
      if (s.target_audience?.gender) setTargetGender(s.target_audience.gender);
      if (Array.isArray(s.target_audience?.locations)) setTargetLocations(s.target_audience.locations);
      if (Array.isArray(s.tone_of_voice) && s.tone_of_voice.length) setToneOfVoice(s.tone_of_voice);
      if (s.brand_positioning) setBrandPositioning(s.brand_positioning);
      if (s.formality_level) setFormalityLevel(s.formality_level);
      if (Array.isArray(s.usps) && s.usps.length) setCompetitiveAdvantages(s.usps);
      if (Array.isArray(s.content_pillars) && s.content_pillars.length) {
        // content_pillars editor expects {name, description, color?}
        // Setting via setBrandGuideline isn't right; we don't have direct setter here for pillars in this form.
        // Most pillars are managed in DNA step. Will be available via editingTemplate after first save.
      }
      const logo = s.logo_url || meta.logo_url || meta.picture || meta.og_image;
      if (logo) {
        setLogoPreview(logo);
        importedLogoUrlRef.current = logo;
      }
      const palette = (meta as any)?.color_palette;
      const userSelectedColor = (meta as any)?.selected_primary_color as string | null | undefined;
      // Gom tất cả candidate màu để user chọn — LOẠI màu neutral (đen/trắng/xám)
      const hexRe = /^#[0-9a-fA-F]{6}$/;
      const isNeutral = (hex: string): boolean => {
        const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (!m) return true;
        const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max - min < 35) return true;
        if (max < 60) return true;
        if (min > 230) return true;
        return false;
      };
      const rawCandidates: Array<{ hex: string; source: string }> = [];
      const pushCand = (hex: unknown, source: string, allowNeutral = false) => {
        if (typeof hex === 'string' && hexRe.test(hex)) {
          const h = hex.toLowerCase();
          if (!allowNeutral && isNeutral(h)) return;
          rawCandidates.push({ hex: h, source });
        }
      };
      // User pick được phép là neutral (nếu họ chủ động chọn)
      pushCand(userSelectedColor, 'Bạn đã chọn', true);
      pushCand(palette?.primary, 'Logo dominant');
      pushCand(s.primary_color, 'AI');
      pushCand(meta.theme_color, 'Theme color');
      pushCand(s.primary_color_suggestion, 'AI gợi ý');
      if (palette && Array.isArray(palette.candidates)) {
        (palette.candidates as unknown[]).forEach((c) => pushCand(c, 'Logo palette'));
      }
      // dedupe theo hex
      const seen = new Set<string>();
      const uniq = rawCandidates.filter((c) => {
        if (seen.has(c.hex)) return false;
        seen.add(c.hex);
        return true;
      });
      setImportedColorCandidates(uniq);
      // Ưu tiên màu user đã chọn trong popup import
      if (userSelectedColor && hexRe.test(userSelectedColor)) {
        setPrimaryColor(userSelectedColor.toLowerCase());
        setColorChosenFromImport(true);
      } else if (uniq.length === 1) {
        setPrimaryColor(uniq[0].hex);
        setColorChosenFromImport(true);
      } else if (uniq.length === 0) {
        // Không có màu hợp lệ — giữ default, không auto-pick màu đen
        setColorChosenFromImport(true);
      }
      // secondary colors lấy phần còn lại từ palette.candidates (loại neutral)
      if (palette && Array.isArray(palette.candidates)) {
        const extras = (palette.candidates as string[])
          .filter((c) => hexRe.test(c) && !isNeutral(c.toLowerCase()))
          .map((c) => c.toLowerCase())
          .filter((c, i, arr) => arr.indexOf(c) === i)
          .slice(0, 4);
        if (extras.length) setSecondaryColors(extras);
      }
      const footer = meta.footer_info;
      if (footer && (footer.company_name || footer.phone || footer.email || footer.address || footer.tax_code || (footer.social_links && Object.keys(footer.social_links).length))) {
        setFooterInfo({
          company_name: footer.company_name || '',
          phone: footer.phone || '',
          email: footer.email || '',
          website: footer.website || meta.source_url || '',
          address: footer.address || '',
          social_links: footer.social_links && Object.keys(footer.social_links).length ? footer.social_links : undefined,
        });
      }
      setShowStartChooser(false);
      setImportDialogOpen(false);
      setShowQuickStart(false);
      setCurrentStep(1);
      // Nếu user đã chọn ngành ngay trong popup import — áp dụng luôn, không bắt xác nhận lại
      const pickedPack = (meta as any)?.selected_industry_pack as { id?: string; name?: string } | null;
      if (pickedPack?.id && pickedPack?.name) {
        setGlobalPackId(pickedPack.id);
        setIndustries([pickedPack.name]);
        setShowIndustryConfirmAfterImport(false);
        toast.success('Đã nạp dữ liệu từ import.');
      } else {
        // Mở dialog xác nhận ngành (AI suggestion list)
        setShowIndustryConfirmAfterImport(true);
        toast.success('Đã nạp dữ liệu từ import. Hãy chọn ngành phù hợp để tiếp tục.');
      }
    }
  }, [importedSuggestion, editingTemplate]);

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
    // Use global_pack_id for v2.1 architecture (keeping industryTemplateId for backward compatibility)
    setGlobalPackId(packData.id);
    setIndustries(asStringArray(packData.name));
    const importedVoice = importedSuggestion ? normalizeBrandVoiceSuggestion(importedSuggestion.suggestion || {}) : null;
    const importedPositioning = normalizeBrandPositioning(importedVoice?.brand_positioning);
    const importedTones = normalizeToneOfVoice(importedVoice?.tone_of_voice);
    const importedFormality = normalizeFormalityLevel(importedVoice?.formality_level);
    
    if (importedPositioning || packData.brandPositioning) {
      setBrandPositioning(importedPositioning || normalizeBrandPositioning(packData.brandPositioning) || '');
    }

    const voice = (packData as any).brandVoice || {};
    // Only set values if pack provides them - don't reset to empty
    const packTones = normalizeToneOfVoice(voice.tone_of_voice);
    const nextTones = importedTones.length > 0 ? importedTones : packTones;
    if (nextTones.length > 0) {
      setToneOfVoice(nextTones);
    }
    const nextFormality = importedFormality || normalizeFormalityLevel(voice.formality_level);
    if (nextFormality) {
      setFormalityLevel(nextFormality);
    }
    const packLangStyle = asStringArray(voice.language_style);
    if (packLangStyle.length > 0) {
      setLanguageStyle(packLangStyle);
    }
    if (typeof voice.allow_emoji === 'boolean') {
      setAllowEmoji(voice.allow_emoji);
    }

    const packPreferred = asStringArray((packData as any).preferredTerms);
    if (packPreferred.length > 0) {
      setPreferredWords(packPreferred);
    }
    const packForbidden = asStringArray((packData as any).forbiddenTerms);
    if (packForbidden.length > 0) {
      setForbiddenWords(packForbidden);
    }

    // Track recently used industry pack for this organization
    if (currentOrganization?.id) {
      supabase
        .rpc('record_industry_pack_use' as any, {
          _org_id: currentOrganization.id,
          _pack_id: packData.id,
        })
        .then(() => { refetchRecent(); })
        .then(undefined, (err) => console.warn('record_industry_pack_use failed:', err));
    }

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

    setIsLoading(true);

    try {
      let logoUrl = deletingLogo ? null : editingTemplate?.logo_url || null;

      if (deletingLogo && editingTemplate?.logo_url) {
        await deleteLogo(editingTemplate.logo_url);
        logoUrl = null;
      }

      if (logoFile) {
        if (editingTemplate?.logo_url) {
          await deleteLogo(editingTemplate.logo_url);
        }
        logoUrl = await uploadLogo(logoFile);
      } else if (!deletingLogo && !editingTemplate?.logo_url && importedLogoUrlRef.current) {
        // Persist remote logo URL imported from website/fanpage (no re-upload).
        logoUrl = importedLogoUrlRef.current;
      }

      const formData = {
        name: name.trim(),
        brand_name: brandName.trim(),
        industry: industries.length > 0 ? industries : null,
        brand_guideline: brandGuideline.trim(),
        include_logo: includeLogo,
        is_default: isDefault,
        primary_color: primaryColor,
        logo_url: logoUrl,
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

      let result: BrandTemplate | null = null;

      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, formData);
      } else {
        result = await saveTemplate(formData, scope);
      }

      const templateId = result?.id || editingTemplate?.id;

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
      if (!editingTemplate && result && localProducts.length > 0) {
        try {
          for (const product of localProducts) {
            const { id, ...productData } = product;
            await supabase.from('brand_products').insert({
              brand_template_id: result.id,
              user_id: (await supabase.auth.getUser()).data.user?.id,
              ...productData,
            });
          }
          toast.success(`Đã lưu ${localProducts.length} sản phẩm!`);
        } catch (error) {
          console.error('Failed to save products:', error);
          toast.error('Một số sản phẩm chưa được lưu');
        }
      }

      await refetch();
      toast.success(editingTemplate ? 'Đã cập nhật Brand!' : 'Đã tạo Brand mới!');
      navigate('/brands');
    } catch (error) {
      console.error('Failed to save brand:', error);
      toast.error('Có lỗi xảy ra khi lưu Brand');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial chooser: Manual vs Import
  if (showStartChooser && !editingTemplate) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/10">
        <header className="h-14 sm:h-16 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-10">
          <Button variant="ghost" size="sm" onClick={() => navigate('/brands')} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Quay lại</span>
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Palette className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-sm sm:text-base font-semibold text-foreground">Tạo Brand mới</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/brands')} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-10">
            <BrandCreateStartChooser
              onPickManual={() => setShowStartChooser(false)}
              onPickImport={() => setImportDialogOpen(true)}
            />
          </div>
        </div>

        <BrandImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onApplied={(_brand, suggestion) => {
            // No targetBrand → re-enter this page with importedSuggestion to auto-hydrate
            setImportDialogOpen(false);
            navigate('/brands/new', {
              state: { importedSuggestion: suggestion },
              replace: true,
            });
          }}
        />
      </div>
    );
  }

  // Quick Start Screen (industry pick)
  if (showQuickStart && !editingTemplate) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/10">
        <header className="h-14 sm:h-16 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-10">
          <Button variant="ghost" size="sm" onClick={() => setShowStartChooser(true)} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Quay lại</span>
          </Button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Palette className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-sm sm:text-base font-semibold text-foreground">
              Tạo Brand mới
            </h1>
          </div>

          <Button variant="ghost" size="icon" onClick={() => navigate('/brands')} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <BrandFormQuickStart
              onSelectIndustry={handleIndustryTemplateSelect}
              suggestedContext={suggestedContext}
              recentlyUsedIds={recentlyUsedIds}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/10">
        {/* Fixed Header */}
        <header className="h-14 sm:h-16 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/brands')}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Quay lại</span>
          </Button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Palette className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-sm sm:text-base font-semibold text-foreground">
              {editingTemplate ? `Chỉnh sửa: ${editingTemplate.brand_name}` : 'Tạo Brand mới'}
            </h1>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/brands')}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </header>

        {/* Stepper */}
        <div className="border-b border-border/30 bg-background/50 backdrop-blur-sm px-4 sm:px-6 py-3">
          <BrandFormStepper
            currentStep={currentStep}
            onStepClick={handleStepClick}
            completedSteps={[]}
            validationErrors={errors.brandName ? { 1: true } : {}}
          />
          <div className="flex items-center gap-2 sm:gap-3 mt-3">
            <Progress value={completionPercentage} className="h-1.5 sm:h-2 flex-1" />
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium w-10 sm:w-12 text-right">
              {completionPercentage}%
            </span>
          </div>
        </div>

        {/* Split Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Panel: Form */}
          <div className="flex-1 lg:max-w-2xl xl:max-w-3xl border-r border-border/30 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8 space-y-6">
              <button type="submit" disabled hidden aria-hidden="true" />

              {/* Step 1: Identity */}
              {currentStep === 1 && (
                <>
                {/* Banner: Xác nhận ngành (sau import) */}
                {!!importedSuggestion && industries.length === 0 && (
                  <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">
                        Bước cuối: chọn ngành để áp dụng Industry Memory
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI đã đọc website của bạn. Hãy chọn ngành phù hợp nhất từ gợi ý để hệ thống tự áp Brand Voice + quy tắc tuân thủ.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowIndustryConfirmAfterImport(true)}
                      className="gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Mở danh sách ngành AI gợi ý
                    </Button>
                  </div>
                )}

                {/* Banner: Chọn màu chủ đạo (sau import, có ≥2 candidate) */}
                {!colorChosenFromImport && importedColorCandidates.length > 1 && (
                  <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/5 p-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <p className="text-sm font-semibold text-foreground">
                        Chưa chốt màu chủ đạo — chọn 1 màu:
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {importedColorCandidates.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => {
                            setPrimaryColor(c.hex);
                            setColorChosenFromImport(true);
                          }}
                          title={`${c.hex} · ${c.source}`}
                          className="group flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-1.5 hover:border-primary hover:shadow-sm transition-all"
                        >
                          <span
                            className="w-6 h-6 rounded border border-border/40"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span className="text-[11px] text-muted-foreground group-hover:text-foreground tabular-nums">
                            {c.hex}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 group-hover:text-muted-foreground border-l border-border/40 pl-1.5">
                            {c.source}
                          </span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setColorChosenFromImport(true)}
                        className="text-[11px] text-muted-foreground hover:text-foreground underline self-center"
                      >
                        Bỏ qua
                      </button>
                    </div>
                  </div>
                )}
                <BrandFormStepIdentity
                  brandName={brandName}
                  setBrandName={setBrandName}
                  scope={scope}
                  setScope={setScope}
                  selectedIndustryName={industries[0] || null}
                  setName={setName}
                  errors={errors}
                  setErrors={setErrors}
                  isEditing={!!editingTemplate}
                  logoPreview={logoPreview}
                  logoFile={logoFile}
                  setLogoFile={setLogoFile}
                  setLogoPreview={setLogoPreview}
                  deleteLogo={deletingLogo}
                  setDeleteLogo={setDeletingLogo}
                  primaryColor={primaryColor}
                  setPrimaryColor={setPrimaryColor}
                  includeLogo={includeLogo}
                  setIncludeLogo={setIncludeLogo}
                  footerInfo={footerInfo}
                  setFooterInfo={setFooterInfo}
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
                  focusFooterInfo={focusFooterInfo}
                />
                </>
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
                  brandTemplateId={editingTemplate?.id}
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
                  brandTemplateId={editingTemplate?.id}
                  primaryColor={primaryColor}
                  hasLogo={!!logoFile || !!logoPreview || !!editingTemplate?.logo_url}
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

              {/* Navigation */}
              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t sticky bottom-0 bg-background pb-4">
                <div>
                  {currentStep > 1 ? (
                    <Button type="button" variant="ghost" onClick={handleBack} className="gap-1 text-sm sm:text-base h-9 sm:h-10 px-2 sm:px-4">
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Quay lại</span>
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" onClick={() => navigate('/brands')} className="text-sm sm:text-base h-9 sm:h-10 px-2 sm:px-4">
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
                      {editingTemplate ? 'Cập nhật' : 'Tạo Brand'}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Right Panel: Preview */}
          <div className="hidden lg:flex flex-1 bg-muted/5 overflow-y-auto">
            <div className="w-full p-6 lg:p-8">
              <BrandCreatePreviewPanel
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
                personas={personas}
                localProducts={localProducts}
                currentStep={currentStep}
                totalSteps={TOTAL_STEPS}
              />
            </div>
          </div>
        </div>
      </div>

      <IndustrySelectionDialog
        open={showIndustryConfirmAfterImport}
        onOpenChange={setShowIndustryConfirmAfterImport}
        onSelectIndustry={(pack) => {
          handleIndustryTemplateSelect(pack);
          setShowIndustryConfirmAfterImport(false);
        }}
        suggestedContext={suggestedContext}
        recentlyUsedIds={recentlyUsedIds}
      />
    </TooltipProvider>
  );
}
