import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Wand2, X, MessageSquare, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { MultiChannelFormWizard } from '@/components/multichannel/MultiChannelFormWizard';
import { CreatePreviewPanel } from '@/components/multichannel/CreatePreviewPanel';
import { CompactBrandSelector } from '@/components/multichannel/CompactBrandSelector';
import { MobileGenerationSheet } from '@/components/multichannel/MobileGenerationSheet';
import { TopicAIChatbot } from '@/components/topic/TopicAIChatbot';
import { cn } from '@/lib/utils';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useStreamingGeneration, ProgressEvent } from '@/hooks/useStreamingGeneration';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { useTopicContentLinks } from '@/hooks/useTopicContentLinks';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAutoImagePipeline } from '@/hooks/useAutoImagePipeline';
import { MultiChannelFormData, ContentGoal, Channel } from '@/types/multichannel';
import { ContentPurpose, MarketingFramework } from '@/types/topicDiscovery';
import { toast } from 'sonner';
interface LocationState {
  prefillTopic?: string;
  prefillGoal?: ContentGoal;
  topicHistoryId?: string;
  contentPurpose?: ContentPurpose;
  marketingFramework?: MarketingFramework;
  productId?: string;
  personaId?: string;
}

type GenerationState = 'idle' | 'generating' | 'complete' | 'error';

export default function MultiChannelCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const prefillData = location.state as LocationState | null;
  const coreContentIdFromUrl = searchParams.get('coreContentId');
  
  const { templates, loading: templatesLoading } = useBrandTemplates();
  const { refetch } = useMultiChannelContents();
  const { createLink } = useTopicContentLinks({ enabled: false });
  const { currentOrganization } = useOrganizationContext();
  
  // Form state
  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>();
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
  const [generatedContentId, setGeneratedContentId] = useState<string | null>(null);
  const generationStartRef = useRef<number | null>(null);

  // Reset generation state when navigating back to this page
  useEffect(() => {
    setGenerationState('idle');
    setSseProgress(null);
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
    brandIndustry: selectedTemplate?.industry_template_id ? [selectedTemplate.industry_template_id] : undefined,
    autoSave: true,
  });

  // Streaming generation hook
  const { 
    generate: streamGenerate, 
    isGenerating,
    streamingTexts,
    getChannelText,
  } = useStreamingGeneration({
    onProgress: (event) => {
      setSseProgress(event);
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
    
    setGenerationState('generating');
    setGenerationElapsedMs(0);
    generationStartRef.current = Date.now();
    
    const fullData = {
      ...data,
      brandTemplateId: selectedBrandId,
      brandVoiceVariantId: selectedVoiceVariantId,
    };
    
    const result = await streamGenerate(fullData);
    
    if (result) {
      setGeneratedContentId(result.id);
      setGenerationState('complete');
      
      // Refetch contents
      await refetch();
      
      // Link to topic history if applicable
      if (topicHistoryId) {
        try {
          await createLink(topicHistoryId, result.id, 'multichannel', result.title, result.status);
        } catch (error) {
          console.error('Failed to create topic-content link:', error);
        }
      }

      // Mark generation complete - Step 5 will handle image generation manually
    }
  };

  // Create another
  const handleCreateAnother = () => {
    setGenerationState('idle');
    setSseProgress(null);
    setGeneratedContentId(null);
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
        </div>

        {/* Right: Chat toggle + Brand Selector + Close */}
        <div className="flex items-center gap-2">
          <Button
            variant={showChatPanel ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowChatPanel(!showChatPanel)}
            className="hidden lg:flex gap-2 h-8"
          >
            {showChatPanel ? (
              <>
                <PanelRightClose className="w-4 h-4" />
                Ẩn chat
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                Brainstorm AI
              </>
            )}
          </Button>
          <div className="hidden md:block max-w-[200px]">
            <CompactBrandSelector
              templates={templates}
              isLoading={templatesLoading}
              disabled={isGenerating}
              selectedTemplateId={selectedBrandId}
              selectedVoiceVariantId={selectedVoiceVariantId}
              onTemplateChange={setSelectedBrandId}
              onVoiceVariantChange={setSelectedVoiceVariantId}
            />
          </div>
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
            {/* Mobile Brand Selector */}
            <div className="md:hidden mb-4">
              <CompactBrandSelector
                templates={templates}
                isLoading={templatesLoading}
                disabled={isGenerating}
                selectedTemplateId={selectedBrandId}
                selectedVoiceVariantId={selectedVoiceVariantId}
                onTemplateChange={setSelectedBrandId}
                onVoiceVariantChange={setSelectedVoiceVariantId}
              />
            </div>

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
              onGenerate={handleGenerate}
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
        onViewContent={handleViewContent}
        onCreateAnother={handleCreateAnother}
        onClose={() => setGenerationState('idle')}
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
