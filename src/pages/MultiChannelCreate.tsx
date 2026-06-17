import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Wand2, X, MessageSquare, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { MultiChannelFormWizard } from '@/components/multichannel/MultiChannelFormWizard';
import { CreatePreviewPanel } from '@/components/multichannel/CreatePreviewPanel';

import { MobileGenerationSheet } from '@/components/multichannel/MobileGenerationSheet';
import { TopicAIChatbot } from '@/components/topic/TopicAIChatbot';
import { cn } from '@/lib/utils';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { useStreamingGeneration, ProgressEvent } from '@/hooks/useStreamingGeneration';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { useTopicContentLinks } from '@/hooks/useTopicContentLinks';
import { useTopicHistory } from '@/hooks/useTopicHistory';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAutoImagePipeline } from '@/hooks/useAutoImagePipeline';
import { MultiChannelFormData, ContentGoal, Channel } from '@/types/multichannel';
import { ContentPurpose, MarketingFramework } from '@/types/topicDiscovery';
import { toast } from 'sonner';

const CHANNEL_CONTENT_FIELD: Partial<Record<Channel, string>> = {
  website: 'website_content',
  blogger: 'blogger_content',
  wordpress: 'wordpress_content',
  facebook: 'facebook_content',
  instagram: 'instagram_content',
  pinterest: 'instagram_content',
  twitter: 'twitter_content',
  google_maps: 'google_maps_content',
  linkedin: 'linkedin_content',
  email: 'email_content',
  youtube: 'youtube_content',
  zalo_oa: 'zalo_oa_content',
  telegram: 'telegram_content',
  tiktok: 'tiktok_content',
  threads: 'threads_content',
};

// Channels that benefit from a generated image. Pure-text channels (email, telegram)
// are excluded from auto image generation to avoid wasted provider spend.
const VISUAL_IMAGE_CHANNELS: ReadonlySet<Channel> = new Set<Channel>([
  'website',
  'blogger',
  'wordpress',
  'facebook',
  'instagram',
  'twitter',
  'google_maps',
  'linkedin',
  'youtube',
  'zalo_oa',
  'tiktok',
  'threads',
]);

interface LocationState {
  prefillTopic?: string;
  prefillGoal?: ContentGoal;
  topicHistoryId?: string;
  contentPurpose?: ContentPurpose;
  marketingFramework?: MarketingFramework;
  productId?: string;
  personaId?: string;
}

type GenerationState = 'idle' | 'generating' | 'recovering' | 'complete' | 'error';

export default function MultiChannelCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const prefillData = location.state as LocationState | null;
  const coreContentIdFromUrl = searchParams.get('coreContentId');
  
  const { templates, loading: templatesLoading } = useBrandTemplates();
  const { currentBrand } = useCurrentBrand();
  const { refetch } = useMultiChannelContents();
  const { createLink } = useTopicContentLinks({ enabled: false });
  const { ensureSelectedTopic, markAsUsed } = useTopicHistory({ brandTemplateId: currentBrand?.id, enabled: false });
  const { currentOrganization } = useOrganizationContext();
  const { user } = useAuth();
  
  // Notification refs to prevent duplicates
  const contentNotifiedRef = useRef(false);
  const imagesNotifiedRef = useRef(false);

  // Form state — default to global brand from header
  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>(currentBrand?.id);
  const [selectedVoiceVariantId, setSelectedVoiceVariantId] = useState<string | undefined>();
  const [formData, setFormData] = useState<Partial<MultiChannelFormData>>({
    topic: prefillData?.prefillTopic || '',
    contentGoal: prefillData?.prefillGoal,
    channels: ['facebook', 'instagram'],
    productId: prefillData?.productId,
    personaId: prefillData?.personaId,
    contentPurpose: prefillData?.contentPurpose,
    marketingFramework: prefillData?.marketingFramework,
    coreContentId: coreContentIdFromUrl || undefined,
  });
  const [topicHistoryId, setTopicHistoryId] = useState<string | undefined>(prefillData?.topicHistoryId);

  // Chat panel state
  const [showChatPanel, setShowChatPanel] = useState(false);


  // Generation state
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [generationElapsedMs, setGenerationElapsedMs] = useState(0);
  const [sseProgress, setSseProgress] = useState<ProgressEvent | null>(null);
  const [currentBatch, setCurrentBatch] = useState<ProgressEvent['batchInfo'] | null>(null);
  const [generatedContentId, setGeneratedContentId] = useState<string | null>(null);
  const generationStartRef = useRef<number | null>(null);

  // Reset generation state when navigating back to this page
  useEffect(() => {
    setGenerationState('idle');
    setSseProgress(null);
    setCurrentBatch(null);
    setGeneratedContentId(null);
    setGenerationElapsedMs(0);
    generationStartRef.current = null;
  }, [location.key]);

  // Selected brand template
  const selectedTemplate = templates.find((t) => t.id === selectedBrandId);

  // Auto Image Pipeline
  const imagePipeline = useAutoImagePipeline({
    brandTemplateId: selectedBrandId,
    brandLogoUrl: selectedTemplate?.logo_url,
    brandPrimaryColor: selectedTemplate?.primary_color,
    brandFooterInfo: (selectedTemplate?.footer_info as Record<string, string> | null) || null,
    brandIndustry: selectedTemplate?.industry_template_id ? [selectedTemplate.industry_template_id] : undefined,
    brandCountryCode: selectedTemplate?.country_code || null,
    organizationId: currentOrganization?.id,
    autoSave: true,
  });

  // Streaming generation hook
  const { 
    generate: streamGenerate, 
    isGenerating,
    streamingTexts,
    getChannelText,
    cancel: cancelGeneration,
  } = useStreamingGeneration({
    onProgress: (event) => {
      setSseProgress(event);
      if (event.batchInfo && event.step === 'batch_start') {
        setCurrentBatch(event.batchInfo);
      }
      if (event.step === 'recovering_background') {
        setGenerationState('recovering');
      } else if (event.step === 'recovered_complete') {
        setGenerationState('complete');
      }
    },
    onComplete: () => {
      // Don't set to complete here - wait for result
    },
    onError: (error) => {
      toast.error(error);
      setGenerationState('error');
      setSseProgress(null);
    },
  });

  // Sync with global brand context whenever it changes (header switcher → form)
  useEffect(() => {
    if (currentBrand?.id && currentBrand.id !== selectedBrandId) {
      setSelectedBrandId(currentBrand.id);
      // Reset voice variant — variants belong to the previous brand
      setSelectedVoiceVariantId(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBrand?.id]);

  // Auto-select default brand
  useEffect(() => {
    if (templatesLoading || templates.length === 0 || selectedBrandId) return;
    const defaultTemplate = templates.find((t) => t.is_default) ?? templates[0];
    if (defaultTemplate) {
      setSelectedBrandId(defaultTemplate.id);
    }
  }, [templatesLoading, templates, selectedBrandId]);

  // Track elapsed time while generating
  useEffect(() => {
    if (!isGenerating) {
      if (generationState === 'generating') {
        // Keep timer visible briefly after generation completes
      }
      return;
    }

    generationStartRef.current = Date.now();
    const interval = setInterval(() => {
      if (generationStartRef.current) {
        setGenerationElapsedMs(Date.now() - generationStartRef.current);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isGenerating, generationState]);

  // Handle form data changes
  const handleFormDataChange = (data: Partial<MultiChannelFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  // Handle generate
  const handleGenerate = async (data: MultiChannelFormData) => {
    if (isGenerating) return;

    if (!currentOrganization?.id) {
      toast({
        title: 'Chưa chọn Workspace',
        description: 'Vui lòng chọn Workspace ở góc trên trước khi tạo nội dung đa kênh.',
        variant: 'destructive',
      });
      return;
    }

    setGenerationState('generating');
    setGenerationElapsedMs(0);
    generationStartRef.current = Date.now();

    const fullData = {
      ...data,
      organization_id: currentOrganization.id,
      organizationId: currentOrganization.id,
      brandTemplateId: selectedBrandId,
      brandVoiceVariantId: selectedVoiceVariantId,
    };

    const result = await streamGenerate(fullData);
    
    if (result) {
      console.log('[MultiChannelCreate] ✓ content result received', {
        contentId: result.id,
        channels: data.channels,
      });
      setGeneratedContentId(result.id);
      setGenerationState('complete');

      // Persist SEO Pillar Cluster + target keywords to the content row (best-effort)
      if (data.clusterId || (data.targetKeywordIds && data.targetKeywordIds.length > 0)) {
        try {
          await supabase
            .from('multi_channel_contents')
            .update({
              cluster_id: data.clusterId ?? null,
              target_keyword_ids: data.targetKeywordIds ?? [],
            })
            .eq('id', result.id);
          if (data.clusterId) {
            // Recompute pillar lifecycle status (planning → active → completed)
            await (supabase as any).rpc('refresh_cluster_status', { _cluster_id: data.clusterId });
          }
        } catch (err) {
          console.warn('[MultiChannelCreate] Failed to attach pillar/keywords:', err);
        }
      }

      if (selectedBrandId && data.channels?.length) {
        // Only auto-generate images for visual channels (skip pure-text channels like email/telegram)
        const visualChannels = data.channels.filter((ch) => VISUAL_IMAGE_CHANNELS.has(ch));

        if (visualChannels.length === 0) {
          console.log('[MultiChannelCreate] ⏭ No visual channels selected — skipping auto image pipeline', {
            channels: data.channels,
          });
        } else {
          const channelTexts = visualChannels.reduce((acc, channel) => {
            const field = CHANNEL_CONTENT_FIELD[channel];
            acc[channel] = (field && result[field]) || getChannelText(channel) || result.topic || data.topic || '';
            return acc;
          }, {} as Record<string, string>);

          console.log('[MultiChannelCreate] 🚀 auto-starting image pipeline after content result', {
            contentId: result.id,
            visualChannels,
            skippedChannels: data.channels.filter((ch) => !VISUAL_IMAGE_CHANNELS.has(ch)),
          });

          imagePipeline.startPipeline(result.id, visualChannels, channelTexts, {
            contentGoal: data.contentGoal,
            contentRole: data.contentRole,
            contentAngle: data.contentAngle,
            topic: data.topic,
            promptMode: 'full',
            brandCountryCode: selectedTemplate?.country_code || undefined,
            structuredTemplate: 'auto',
            hooks: {
              selectedHooks: result.selected_hooks || data.selectedHooks,
              globalHook: result.global_hook || data.globalHook,
            },
          });
        }
      }
      
      // Refetch contents
      await refetch();
      
      // Ensure topic exists in Kho chủ đề (auto-save or reuse) and link content
      let topicHistoryIdToLink = topicHistoryId;
      if (!topicHistoryIdToLink && formData.topic) {
        try {
          const ensuredId = await ensureSelectedTopic(formData.topic, 'multichannel');
          if (ensuredId) topicHistoryIdToLink = ensuredId;
        } catch (error) {
          console.error('Failed to ensure topic in history:', error);
        }
      }
      if (topicHistoryIdToLink) {
        try {
          await createLink(topicHistoryIdToLink, result.id, 'multichannel', result.title, result.status);
          await markAsUsed(topicHistoryIdToLink, result.id, 'multichannel');
        } catch (error) {
          console.error('Failed to create topic-content link:', error);
        }
      }

      // Mark generation complete - Step 5 will handle image generation manually
    }
  };

  // Auto-trigger removed — user now chooses between auto and manual in Step 5 UI

  // Notify when content generation completes
  useEffect(() => {
    if (generationState === 'complete' && user && generatedContentId && !contentNotifiedRef.current) {
      contentNotifiedRef.current = true;
      const channelCount = formData.channels?.length || 0;
      supabase.from('notifications').insert({
        user_id: user.id,
        type: 'multichannel_content_done',
        title: 'Nội dung đa kênh đã sẵn sàng!',
        message: `Đã tạo ${channelCount} kênh cho "${formData.topic}"`,
        data: { content_id: generatedContentId },
      });
    }
  }, [generationState, user, generatedContentId]);

  // Notify when image pipeline completes
  useEffect(() => {
    if (imagePipeline.phase === 'complete' && user && generatedContentId && !imagesNotifiedRef.current) {
      imagesNotifiedRef.current = true;
      const successCount = imagePipeline.imageResults?.successful?.length || 0;
      const totalCount = (imagePipeline.imageResults?.successful?.length || 0) + (imagePipeline.imageResults?.failed?.length || 0);
      supabase.from('notifications').insert({
        user_id: user.id,
        type: 'multichannel_images_done',
        title: 'Ảnh đa kênh đã hoàn tất!',
        message: `${successCount}/${totalCount} ảnh đã tạo thành công cho "${formData.topic}"`,
        data: { content_id: generatedContentId },
      });
    }
  }, [imagePipeline.phase, user, generatedContentId]);

  // Create another
  const handleCreateAnother = () => {
    setGenerationState('idle');
    setSseProgress(null);
    setGeneratedContentId(null);
    // autoImageTriggeredRef removed — user chooses mode in Step 5
    contentNotifiedRef.current = false;
    imagesNotifiedRef.current = false;
    imagePipeline.resetPipeline();
    setFormData(prev => ({
      ...prev,
      topic: '',
    }));
  };

  // View content
  const handleViewContent = () => {
    if (generatedContentId) {
      navigate('/multichannel', { state: { viewContentId: generatedContentId } });
    } else {
      navigate('/multichannel');
    }
  };

  const estimatedTime = useMemo(() => {
    const baseTime = 10;
    const perChannelTime = 5;
    return baseTime + ((formData.channels?.length || 2) * perChannelTime);
  }, [formData.channels?.length]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/10">
      {/* Fixed Header */}
      <header className="h-14 sm:h-16 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-10">
        {/* Left: Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/multichannel')}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Quay lại</span>
        </Button>

        {/* Center: Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-sm sm:text-base font-semibold text-foreground">
            Tạo nội dung đa kênh
          </h1>
          {currentBrand ? (
            <div className="hidden sm:flex items-center gap-1.5 text-sm border-l border-border pl-3 ml-1">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentBrand.primary_color || 'hsl(var(--primary))' }}
              />
              <span className="font-medium text-foreground truncate max-w-[180px]">{currentBrand.brand_name}</span>
            </div>
          ) : (
            <span className="hidden sm:inline text-xs text-muted-foreground border-l border-border pl-3 ml-1">Chưa chọn brand</span>
          )}
        </div>

        {/* Right: Close */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/multichannel')}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Split Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel: Form Wizard */}
        <div className="flex-1 lg:max-w-2xl xl:max-w-3xl border-r border-border/30 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">

            <MultiChannelFormWizard
              key={location.key}
              brandTemplateId={selectedBrandId}
              brandTemplate={selectedTemplate}
              voiceVariantId={selectedVoiceVariantId}
              organizationId={currentOrganization?.id}
              initialData={formData}
              topicHistoryId={topicHistoryId}
              isGenerating={isGenerating}
              onFormDataChange={handleFormDataChange}
              onTopicHistoryIdChange={(id) => setTopicHistoryId(id)}
              onGenerate={handleGenerate}
              // Step 5: Image pipeline props
              onStartImagePipeline={(channels, channelTexts, contentMeta) => {
                if (!generatedContentId || !selectedBrandId) {
                  toast.warning('Vui lòng chờ nội dung đa kênh tạo xong trước khi tạo ảnh');
                  return;
                }
                imagePipeline.startPipeline(generatedContentId, channels, channelTexts, contentMeta);
              }}
              imagePhase={imagePipeline.phase}
              imageProgress={imagePipeline.imageProgress as any}
              imageProgressTimes={imagePipeline.imageProgressTimes as any}
              generatedImages={imagePipeline.generatedImages as any}
              imageCompletedCount={imagePipeline.imageCompletedCount}
              imageTotalCount={imagePipeline.imageTotalCount}
              logoOverlayFailures={imagePipeline.logoOverlayFailures as any}
              onRetryImageChannel={(channel) => imagePipeline.regenerateForChannel(channel, {} as any)}
              generationComplete={generationState === 'complete'}
              getChannelText={getChannelText}
              generatedContentId={generatedContentId}
            />
          </div>
        </div>

        {/* Right Panel: Preview or Chat */}
        <div className="hidden lg:flex flex-1 bg-muted/5 overflow-hidden">
          {showChatPanel && selectedBrandId ? (
            <div className="w-full flex flex-col min-h-0">
              <TopicAIChatbot
                brandTemplateId={selectedBrandId}
                contentGoal={formData.contentGoal || 'education'}
                mode="embedded"
                onNavigate={(path, state) => navigate(path, { state })}
                isExpanded={true}
                className="flex-1 min-h-0 h-full rounded-none border-0"
                onTopicSelect={(topic) => {
                  setFormData(prev => ({ ...prev, topic }));
                  setShowChatPanel(false);
                }}
              />
            </div>
          ) : (
            <div className="w-full p-6 lg:p-8 overflow-y-auto">
              <CreatePreviewPanel
                state={generationState}
                formData={formData}
                brandName={selectedTemplate?.brand_name}
                estimatedTime={estimatedTime}
                elapsedMs={generationElapsedMs}
                sseProgress={sseProgress}
                streamingTexts={streamingTexts}
                completedChannels={sseProgress?.completedChannels}
                totalChannels={sseProgress?.totalChannels}
                currentChannel={sseProgress?.currentChannel}
                currentBatch={currentBatch}
                onCancel={isGenerating ? cancelGeneration : undefined}
                onViewContent={handleViewContent}
                onCreateAnother={handleCreateAnother}
                // Auto Image Pipeline props
                imagePhase={imagePipeline.phase}
                imageProgress={imagePipeline.imageProgress}
                imageProgressTimes={imagePipeline.imageProgressTimes}
                generatedImages={imagePipeline.generatedImages}
                imageCompletedCount={imagePipeline.imageCompletedCount}
                imageTotalCount={imagePipeline.imageTotalCount}
                logoOverlayFailures={imagePipeline.logoOverlayFailures}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Generation Sheet - only visible on mobile/tablet */}
      <MobileGenerationSheet
        open={generationState !== 'idle'}
        generationState={generationState}
        streamingTexts={streamingTexts}
        sseProgress={sseProgress}
        elapsedMs={generationElapsedMs}
        channels={formData.channels || []}
        completedChannels={sseProgress?.completedChannels || []}
        currentChannel={sseProgress?.currentChannel}
        currentBatch={currentBatch}
        onViewContent={handleViewContent}
        onCreateAnother={handleCreateAnother}
        onClose={() => setGenerationState('idle')}
        onCancel={isGenerating ? cancelGeneration : undefined}
        // Auto Image Pipeline props
        imagePhase={imagePipeline.phase}
        imageProgress={imagePipeline.imageProgress}
        imageProgressTimes={imagePipeline.imageProgressTimes}
        generatedImages={imagePipeline.generatedImages}
        imageCompletedCount={imagePipeline.imageCompletedCount}
        imageTotalCount={imagePipeline.imageTotalCount}
        logoOverlayFailures={imagePipeline.logoOverlayFailures}
      />

    </div>
  );
}
