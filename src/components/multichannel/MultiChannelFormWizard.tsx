import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Sparkles, 
  Loader2, 
  ArrowRight, 
  ArrowLeft,
  FileText,
  Target,
  Layers,
  CheckCircle2,
  Timer,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  MapPin,
  Linkedin,
  Mail,
  Youtube,
  MessageCircle,
  Clock,
  Send,
  Music2,
  AtSign,
  CheckSquare,
  Square,
  Users,
  Package,
  MessageSquare,
  Crosshair,
  Compass,
  Rocket,
  ChevronDown,
  Settings2,
  Phone,
  ExternalLink,
  RefreshCw,
  Eye,
  BookOpen,
  Pencil,
  GraduationCap,
  Award,
  FileTextIcon,
  AlignLeft,
  AlertTriangle,
  Image,
   SkipForward,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useTopicRefinement } from '@/hooks/useTopicRefinement';
import { useCompliancePrecheck } from '@/hooks/useCompliancePrecheck';
import { useCoreContents } from '@/hooks/useCoreContents';
import { useStreamingCoreContent } from '@/hooks/useStreamingCoreContent';
import { TopicRefinementSuggestions } from '@/components/script/TopicRefinementSuggestions';
import { StepIndicator, Step } from '@/components/script/StepIndicator';
import { ContentAngleSelector } from '@/components/multichannel/ContentAngleSelector';
import { MultiChannelHookGenerator } from '@/components/multichannel/MultiChannelHookGenerator';
import { SelectedHooksSummary } from '@/components/multichannel/SelectedHooksSummary';

import { ProductSelector } from '@/components/topic/ProductSelector';
import { PersonaSelector } from '@/components/multichannel/PersonaSelector';
import { JourneyStageSelector } from '@/components/multichannel/JourneyStageSelector';
import { CompactChannelGrid } from '@/components/multichannel/CompactChannelGrid';
import { InlineJourneySelector } from '@/components/multichannel/InlineJourneySelector';
import { TopicBrainstormSheet } from '@/components/multichannel/TopicBrainstormSheet';
import { TopicSuggestionPanel } from '@/components/TopicSuggestionPanel';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { GlossaryQuickLookup } from '@/components/GlossaryQuickLookup';
import { ComplianceWarningBadge } from '@/components/multichannel/ComplianceWarningBadge';
import { RoleSelectorCard } from '@/components/core-content/RoleSelectorCard';
import { CoreContentStreamingCard } from '@/components/multichannel/streaming/CoreContentStreamingCard';
import { ImageStreamingGrid } from '@/components/multichannel/streaming/ImageStreamingGrid';
import { analyzeContentComplexity } from '@/lib/contentComplexityAnalyzer';
import { ComplexityWarning } from '@/components/multichannel/ComplexityWarning';
import { CoreContentPreviewPopup } from '@/components/multichannel/CoreContentPreviewPopup';
import { ActiveTasksIndicator, PendingQueueItem } from '@/components/multichannel/ActiveTasksIndicator';
import { FloatingStatusStack } from '@/components/multichannel/FloatingStatusStack';
import { StrategyOverviewCard } from '@/components/multichannel/StrategyOverviewCard';
import { PromptPreview } from '@/components/multichannel/PromptPreview';
import { useBackgroundGeneration, GenerationTask } from '@/hooks/useBackgroundGeneration';
import type { PromptMode } from '@/hooks/useSocialImageGeneration';
import { cn } from '@/lib/utils';
import { 
  MultiChannelFormData, 
  MultiChannelSelectedHook,
  ContentGoal, 
  ContentAngle,
  ContentRole,
  Channel, 
  CHANNELS,
  CONTENT_GOALS,
  CONTENT_ANGLES,
  JOURNEY_TO_GOAL_MAP,
  JOURNEY_TO_ANGLE_MAP,
  GOAL_TO_ANGLE_MAP,
  AiSuggestionContext,
} from '@/types/multichannel';
import { GOAL_TO_ROLE_MAP, CoreContentLengthMode, CORE_CONTENT_LENGTH_MODES } from '@/types/coreContent';
import { MultiChannelHook } from '@/hooks/useMultiChannelHooks';

interface BrandTemplate {
  id: string;
  name: string;
  brand_name: string;
  tone_of_voice?: string[];
  formality_level?: string;
  channel_overrides?: Record<string, unknown>;
}

interface MultiChannelFormWizardProps {
  brandTemplateId?: string;
  brandTemplate?: BrandTemplate | null;
  voiceVariantId?: string;
  organizationId?: string;
  initialData?: Partial<MultiChannelFormData>;
  topicHistoryId?: string;
  isGenerating: boolean;
  onFormDataChange?: (data: Partial<MultiChannelFormData>) => void;
  onGenerate: (data: MultiChannelFormData) => Promise<void>;
  // Step 5: Image generation
  onStartImagePipeline?: (channels: Channel[], channelTexts: Record<string, string>, contentMeta: { contentGoal?: string; contentRole?: string; contentAngle?: string; topic?: string; promptMode?: 'full' | 'brand_only' | 'raw' }) => void;
  imagePhase?: string;
  imageProgress?: Record<string, string>;
  imageProgressTimes?: Record<string, number>;
  generatedImages?: Record<string, any>;
  imageCompletedCount?: number;
  imageTotalCount?: number;
  logoOverlayFailures?: Record<string, boolean>;
  onRetryImageChannel?: (channel: Channel) => void;
  onDownloadImage?: (channel: Channel) => void;
  generationComplete?: boolean;
  getChannelText?: (channel: Channel) => string;
}

// 6-step flow with AI control level + image generation
const STEPS: Step[] = [
  { id: 1, title: 'Chủ đề', icon: <FileText className="w-4 h-4" /> },
  { id: 2, title: 'Core Content', icon: <BookOpen className="w-4 h-4" /> },
  { id: 3, title: 'Vai trò', icon: <Compass className="w-4 h-4" /> },
  { id: 4, title: 'Đa kênh', icon: <Layers className="w-4 h-4" /> },
  { id: 5, title: 'Kiểm soát AI', icon: <Settings2 className="w-4 h-4" /> },
  { id: 6, title: 'Tạo ảnh', icon: <Image className="w-4 h-4" /> },
];

const channelIcons: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  google_maps: <MapPin className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  zalo_oa: <MessageCircle className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  tiktok: <Music2 className="w-4 h-4" />,
  threads: <AtSign className="w-4 h-4" />,
};

const MAX_TOPIC_LENGTH = 500;

// Threshold for showing refinement vs brainstorm suggestions
const TOPIC_MIN_LENGTH_FOR_REFINEMENT = 10;

// Goal icons mapping
const GOAL_ICONS: Record<ContentGoal, React.ReactNode> = {
  education: <GraduationCap className="w-4 h-4" />,
  awareness: <Eye className="w-4 h-4" />,
  engagement: <Users className="w-4 h-4" />,
  expertise: <Award className="w-4 h-4" />,
  conversion: <Target className="w-4 h-4" />,
};

// Auto-detect content goal from topic keywords
const GOAL_KEYWORD_PATTERNS: Record<ContentGoal, RegExp> = {
  conversion: /bán hàng|mua ngay|giảm giá|khuyến mãi|đặt hàng|chốt đơn|ưu đãi|flash sale|voucher|order|combo|deal|freeship|giá rẻ|giá sốc|mở bán|đặt mua|thanh toán|checkout|add to cart|mua hàng|sản phẩm mới|ra mắt sản phẩm|dùng thử/i,
  awareness: /giới thiệu|thương hiệu|brand|nhận diện|launch|ra mắt|câu chuyện|sứ mệnh|hậu trường|behind the scenes|about us|chúng tôi là ai/i,
  education: /hướng dẫn|cách làm|bí quyết|tips|kiến thức|tutorial|how to|mẹo|bước|từ a.?z|cho người mới|sai lầm|lưu ý|nên và không nên/i,
  engagement: /thảo luận|bình chọn|chia sẻ|poll|quiz|hỏi đáp|bạn nghĩ gì|team nào|challenge|thử thách|trending|hot topic|minigame|giveaway/i,
  expertise: /chuyên gia|phân tích|nghiên cứu|insight|trend|báo cáo|case study|so sánh|đánh giá chuyên sâu|deep.?dive|dự báo|thống kê/i,
};

function detectGoalFromTopic(topic: string): ContentGoal | null {
  const normalized = topic.toLowerCase().trim();
  if (normalized.length < 10) return null;

  let bestGoal: ContentGoal | null = null;
  let bestCount = 0;

  for (const [goal, pattern] of Object.entries(GOAL_KEYWORD_PATTERNS)) {
    const matches = normalized.match(new RegExp(pattern.source, 'gi'));
    const count = matches ? matches.length : 0;
    if (count > bestCount) {
      bestCount = count;
      bestGoal = goal as ContentGoal;
    }
  }

  return bestGoal;
}

// Core Content data structure for inline generation
interface GeneratedCoreContent {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  qualityScore: number;
  keyMessages: string[];
  contentGoal?: ContentGoal;
  generationMetadata?: {
    stepsCompleted: string[];
    generationTimeMs: number;
    modelsUsed?: string[];
  };
}

export function MultiChannelFormWizard({ 
  brandTemplateId,
  brandTemplate,
  voiceVariantId,
  organizationId,
  initialData,
  topicHistoryId,
  isGenerating,
  onFormDataChange,
  onGenerate,
  // Step 5 props
  onStartImagePipeline,
  imagePhase,
  imageProgress,
  imageProgressTimes,
  generatedImages,
  imageCompletedCount,
  imageTotalCount,
  logoOverlayFailures,
  onRetryImageChannel,
  onDownloadImage,
  generationComplete,
  getChannelText,
}: MultiChannelFormWizardProps) {
  const navigate = useNavigate();
  const topicTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showBrainstormSheet, setShowBrainstormSheet] = useState(false);
  const [brainstormInitialPrompt, setBrainstormInitialPrompt] = useState<string | undefined>();

  // Intent detection: detect AI commands vs actual topics
  const AI_COMMAND_PATTERNS = /^(tạo|gợi ý|cho tôi|nghĩ giúp|viết về|suggest|give me|create|brainstorm|hãy|giúp tôi|đề xuất|tìm|liệt kê|list)\b/i;
  
  const detectAndHandleAICommand = useCallback((text: string) => {
    if (text.trim().length >= 10 && AI_COMMAND_PATTERNS.test(text.trim())) {
      setBrainstormInitialPrompt(text.trim());
      setShowBrainstormSheet(true);
      setFormData(prev => ({ ...prev, topic: '' }));
      return true;
    }
    return false;
  }, []);

  // NEW: Core Content generation state
  const [coreContentData, setCoreContentData] = useState<GeneratedCoreContent | null>(null);
  const [showCoreContentPreview, setShowCoreContentPreview] = useState(false);
  
  // NEW: Pending generation - when user wants to generate multichannel but Core Content not ready
  const [pendingMultiChannelGeneration, setPendingMultiChannelGeneration] = useState(false);
  
  // NEW: Preview popup state
  const [showPreviewPopup, setShowPreviewPopup] = useState(false);
  
  // Unique ID for pending queue item
  const [pendingQueueId] = useState(() => `pending_${Date.now()}`);
  
  // Core Content generation settings
  const [coreContentAngle, setCoreContentAngle] = useState<ContentAngle | '__none__'>('__none__');
  const [coreContentAudience, setCoreContentAudience] = useState('');
  const [coreContentPersonaId, setCoreContentPersonaId] = useState<string | undefined>();
  const [coreContentLengthMode, setCoreContentLengthMode] = useState<CoreContentLengthMode>('medium');
  const [enableResearch, setEnableResearch] = useState(true); // Auto research toggle - default ON
  const [brandPersonasCount, setBrandPersonasCount] = useState<number | null>(null); // Track personas availability
  
  // AI Control Level state
  const [promptMode, setPromptMode] = useState<PromptMode>('full');

  // Background generation tracking - for tasks that continue when user navigates away
  const { activeTasks, completedTasks, getTaskResult, dismissTask, isChecking: isCheckingTasks } = useBackgroundGeneration({
    onTaskComplete: async (task) => {
      if (task.task_type === 'core_content') {
        // Fetch and apply result
        const result = await getTaskResult(task.id);
        if (result?.type === 'core_content' && result.data) {
          setCoreContentData({
            id: result.data.id,
            title: result.data.title,
            content: result.data.content,
            wordCount: result.data.word_count || 0,
            qualityScore: result.data.quality_score || 0,
            keyMessages: Array.isArray(result.data.key_messages) ? result.data.key_messages as string[] : [],
            contentGoal: result.data.content_goal as ContentGoal | undefined,
          });
          setFormData(prev => ({ 
            ...prev, 
            coreContentId: result.data.id,
          }));
          toast.success('Core Content đã hoàn tất!', {
            description: 'Bạn có thể tiếp tục tạo nội dung đa kênh',
          });
        }
        // Auto-dismiss after 3 seconds
        setTimeout(() => dismissTask(task.id), 3000);
      }
      
      // Handle multichannel task completion
      if (task.task_type === 'multichannel') {
        toast.success('Nội dung đa kênh đã sẵn sàng!', {
          action: {
            label: 'Xem ngay',
            onClick: () => {
              navigate('/multichannel', { 
                state: { viewContentId: task.result_id } 
              });
            },
          },
          duration: 10000,
        });
        // Auto-dismiss after 3 seconds
        setTimeout(() => dismissTask(task.id), 3000);
      }
    },
  });

  // Track if we're resuming from a background task
  const [isResumedFromBackground, setIsResumedFromBackground] = useState(false);

  // Streaming Core Content hook with retry support
  const {
    generate: generateCoreContentStreaming,
    retry: retryCoreContentGeneration,
    cancel: cancelCoreContentGeneration,
    streamingText: coreContentStreamingText,
    isGenerating: isGeneratingCoreContent,
    progress: coreContentProgress,
    canRetry: canRetryCoreContent,
    lastError: coreContentLastError,
  } = useStreamingCoreContent({
    onComplete: (result) => {
      setCoreContentData({
        id: result.id,
        title: result.title,
        content: result.content,
        wordCount: result.wordCount,
        qualityScore: result.qualityScore,
        keyMessages: result.keyMessages || [],
        contentGoal: formData.contentGoal,
        generationMetadata: result.generationMetadata,
      });
      
      setFormData(prev => ({ 
        ...prev, 
        coreContentId: result.id,
        contentRole: prev.contentRole || GOAL_TO_ROLE_MAP[formData.contentGoal || 'education'],
      }));
      
      // Show preview popup instead of just toast (only if not on Step 2)
      if (currentStep !== 2) {
        setShowPreviewPopup(true);
      } else {
        toast.success('Đã tạo Core Content thành công!');
      }
    },
    onError: (error) => {
      const isNetworkError = error.toLowerCase().includes('network') || 
                            error.toLowerCase().includes('timeout') ||
                            error.toLowerCase().includes('connection');
      
      if (isNetworkError) {
        toast.error('Kết nối bị gián đoạn. Vui lòng thử lại.', {
          action: {
            label: 'Thử lại',
            onClick: () => retryCoreContentGeneration(),
          },
          duration: 10000,
        });
      } else {
        toast.error(error || 'Không thể tạo Core Content', {
          action: canRetryCoreContent ? {
            label: 'Thử lại',
            onClick: () => retryCoreContentGeneration(),
          } : undefined,
          duration: 8000,
        });
      }
    },
  });

  const [formData, setFormData] = useState<MultiChannelFormData>({
    topic: initialData?.topic || '',
    contentGoal: initialData?.contentGoal || 'education',
    contentAngle: initialData?.contentAngle,
    channels: initialData?.channels || ['facebook', 'instagram'],
    brandTemplateId: brandTemplateId,
    brandVoiceVariantId: voiceVariantId,
    productId: initialData?.productId,
    personaId: initialData?.personaId,
    contentPurpose: initialData?.contentPurpose,
    marketingFramework: initialData?.marketingFramework,
    journeyStage: initialData?.journeyStage,
    campaignId: initialData?.campaignId,
    qualityMode: initialData?.qualityMode || 'balanced',
    includeFooterInfo: initialData?.includeFooterInfo !== false,
    selectedHooks: initialData?.selectedHooks || [],
    globalHook: initialData?.globalHook,
    coreContentId: initialData?.coreContentId,
    contentRole: initialData?.contentRole,
  });

  // Track if user manually changed the goal (to avoid overriding)
  const userManuallySetGoal = useRef(!!initialData?.contentGoal);
  const lastAutoDetectedTopic = useRef('');

  // Auto-detect contentGoal from topic keywords
  useEffect(() => {
    const topic = formData.topic;
    if (userManuallySetGoal.current) return;
    if (topic.length < 10) return;
    if (topic === lastAutoDetectedTopic.current) return;

    const detected = detectGoalFromTopic(topic);
    if (detected && detected !== formData.contentGoal) {
      lastAutoDetectedTopic.current = topic;
      const goalLabel = CONTENT_GOALS.find(g => g.value === detected)?.label || detected;
      setFormData(prev => ({ ...prev, contentGoal: detected }));
      toast.info(`Mục tiêu tự động: ${goalLabel}`, {
        description: 'Dựa trên chủ đề của bạn. Bạn có thể thay đổi thủ công.',
        duration: 3000,
      });
    }
  }, [formData.topic]);

  // Removed: useCoreContents - now using useStreamingCoreContent

  // NEW: Auto-load existing Core Content when coreContentId is provided (e.g. from Transform)
  const [isLoadingExistingCoreContent, setIsLoadingExistingCoreContent] = useState(false);
  
  useEffect(() => {
    const coreContentId = initialData?.coreContentId;
    if (!coreContentId || coreContentData) return;
    
    const loadExistingCoreContent = async () => {
      setIsLoadingExistingCoreContent(true);
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('core_contents')
          .select('*')
          .eq('id', coreContentId)
          .single();
        
        if (error || !data) {
          console.error('Failed to load core content:', error);
          toast.error('Không thể tải Core Content');
          return;
        }
        
        // Set core content data
        setCoreContentData({
          id: data.id,
          title: data.title,
          content: data.content,
          wordCount: data.word_count || 0,
          qualityScore: data.quality_score || 0,
          keyMessages: Array.isArray(data.key_messages) ? data.key_messages as string[] : [],
          contentGoal: data.content_goal as ContentGoal | undefined,
        });
        
        // Auto-fill form data
        const contentGoal = data.content_goal as ContentGoal;
        const contentRole = GOAL_TO_ROLE_MAP[contentGoal] || 'sprout';
        
        setFormData(prev => ({
          ...prev,
          topic: data.topic || data.title,
          contentGoal,
          coreContentId: data.id,
          contentRole,
        }));
        
        // Jump to step 3 (Role selection) - skip topic and core content steps
        setCurrentStep(3);
        setCompletedSteps([1, 2]);
        
        toast.success('Đã tải Core Content, chọn vai trò để tiếp tục');
      } catch (err) {
        console.error('Error loading core content:', err);
      } finally {
        setIsLoadingExistingCoreContent(false);
      }
    };
    
    loadExistingCoreContent();
  }, [initialData?.coreContentId]);

  // Sync brand template
  useEffect(() => {
    if (brandTemplateId) {
      setFormData(prev => ({ ...prev, brandTemplateId }));
    }
  }, [brandTemplateId]);

  useEffect(() => {
    if (voiceVariantId) {
      setFormData(prev => ({ ...prev, brandVoiceVariantId: voiceVariantId }));
    }
  }, [voiceVariantId]);

  // Notify parent of form data changes
  const onFormDataChangeRef = useRef(onFormDataChange);
  onFormDataChangeRef.current = onFormDataChange;
  
  useEffect(() => {
    onFormDataChangeRef.current?.(formData);
  }, [formData]);

  // Auto-derive contentGoal from journeyStage
  useEffect(() => {
    if (formData.journeyStage) {
      const derivedGoal = JOURNEY_TO_GOAL_MAP[formData.journeyStage];
      const suggestedAngle = !formData.contentAngle
        ? JOURNEY_TO_ANGLE_MAP[formData.journeyStage]
        : undefined;
      
      setFormData(prev => ({ 
        ...prev, 
        contentGoal: derivedGoal,
        contentAngle: suggestedAngle || prev.contentAngle,
      }));
    }
  }, [formData.journeyStage]);

  // Auto-suggest Content Angle based on Content Goal (Step 1 → Step 2)
  useEffect(() => {
    // Only suggest if:
    // 1. User has selected a contentGoal from Step 1
    // 2. Current angle is still default '__none__'
    if (formData.contentGoal && coreContentAngle === '__none__') {
      const suggestedAngle = GOAL_TO_ANGLE_MAP[formData.contentGoal];
      if (suggestedAngle) {
        setCoreContentAngle(suggestedAngle);
      }
    }
  }, [formData.contentGoal]);

  // Topic Refinement
  const {
    refinedTopics,
    isLoading: isLoadingRefinement,
    isTyping: isTypingTopic,
    refresh: refreshRefinement,
    elapsedMs: refinementElapsedMs,
  } = useTopicRefinement({
    rawTopic: formData.topic,
    brandTemplateId: formData.brandTemplateId,
    contentGoal: formData.contentGoal,
    enabled: currentStep === 1 && formData.topic.trim().length >= 10,
  });

  // Compliance Pre-check
  const complianceOptions = useMemo(() => ({
    industryForbiddenTerms: [],
    brandForbiddenWords: [],
  }), []);

  const {
    fullCheck,
    suggestCompliantTopic,
    isChecking: isCheckingCompliance,
  } = useCompliancePrecheck(complianceOptions);

  const [complianceCheckResult, setComplianceCheckResult] = useState<ReturnType<typeof fullCheck> | null>(null);
  
  useEffect(() => {
    if (formData.topic.trim().length >= 10) {
      const result = fullCheck(formData.topic);
      setComplianceCheckResult(result);
    } else {
      setComplianceCheckResult(null);
    }
  }, [formData.topic, fullCheck]);

  const handleSuggestCompliant = async () => {
    if (!complianceCheckResult || complianceCheckResult.issues.length === 0) return;
    const suggested = await suggestCompliantTopic(formData.topic, complianceCheckResult.issues);
    if (suggested) {
      setFormData(prev => ({ ...prev, topic: suggested }));
    }
  };

  // Estimated time
  const estimatedTime = useMemo(() => {
    const baseTime = 10;
    const perChannelTime = 5;
    return baseTime + (formData.channels.length * perChannelTime);
  }, [formData.channels.length]);

  // NEW: Generate Core Content inline with streaming
  const handleGenerateCoreContent = useCallback(async () => {
    if (!formData.topic.trim()) {
      toast.error('Vui lòng nhập chủ đề');
      return;
    }
    if (!organizationId) {
      toast.error('Không tìm thấy tổ chức. Vui lòng chọn tổ chức trước.');
      return;
    }

    try {
      await generateCoreContentStreaming({
        topic: formData.topic.trim(),
        contentGoal: formData.contentGoal || 'education',
        contentAngle: coreContentAngle === '__none__' ? undefined : coreContentAngle,
        lengthMode: coreContentLengthMode,
        brandTemplateId: brandTemplateId,
        organizationId,
        targetAudience: coreContentAudience || undefined,
        personaId: coreContentPersonaId, // NEW: Pass persona ID
        enableResearch,
      });
    } catch (error) {
      console.error('Core Content generation error:', error);
    }
  }, [formData.topic, formData.contentGoal, coreContentAngle, coreContentAudience, coreContentPersonaId, coreContentLengthMode, brandTemplateId, organizationId, generateCoreContentStreaming, enableResearch]);

  // Can proceed logic - 6-step flow
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        // Step 1: Topic + Brand required
        return formData.topic.trim().length >= 10 && !!formData.brandTemplateId;
      case 2:
        // Step 2: Allow proceeding if generating OR already has Core Content
        return isGeneratingCoreContent || !!coreContentData?.id || !!formData.coreContentId;
      case 3:
        // Step 3: Role must be selected
        return !!formData.contentRole;
      case 4:
        // Step 4: At least 1 channel
        return formData.channels.length > 0;
      case 5:
        // Step 5: AI control level - always can proceed (has default)
        return true;
      case 6:
        // Step 6: Always can proceed (skip or finish)
        return true;
      default:
        return false;
    }
  }, [currentStep, formData, coreContentData, isGeneratingCoreContent]);

  const handleNext = () => {
    // For Step 2: If not generating and no core content, block
    if (currentStep === 2 && !isGeneratingCoreContent && !coreContentData?.id && !formData.coreContentId) {
      toast.error('Vui lòng tạo Core Content trước khi tiếp tục');
      return;
    }
    
    if (currentStep < 6 && canProceed) {
      setCompletedSteps(prev => [...prev.filter(s => s !== currentStep), currentStep]);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (step: number) => {
    // Allow navigating to any previous/current step, or next step if previous is completed
    // Special case: Step 6 is always accessible from Step 5
    if (step <= currentStep || completedSteps.includes(step - 1) || (step === 6 && currentStep === 5)) {
      setCurrentStep(step);
    }
  };

  const handleChannelToggle = (channel: Channel) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const handleSelectAll = () => {
    setFormData(prev => ({ ...prev, channels: CHANNELS.map(c => c.value) }));
  };

  const handleDeselectAll = () => {
    setFormData(prev => ({ ...prev, channels: [] }));
  };

  // Hook selection handlers
  const handleSelectHook = (hook: MultiChannelHook) => {
    setFormData(prev => {
      const hookKey = `${hook.channel}-${hook.opening_line}`;
      const existingHook = (prev.selectedHooks || []).find(
        h => `${h.channel}-${h.opening_line}` === hookKey
      );
      
      let newSelectedHooks: MultiChannelSelectedHook[];
      
      if (existingHook) {
        newSelectedHooks = (prev.selectedHooks || []).filter(
          h => `${h.channel}-${h.opening_line}` !== hookKey
        );
        toast.info(`Đã bỏ chọn hook cho ${CHANNELS.find(c => c.value === hook.channel)?.label || hook.channel}`);
      } else {
        newSelectedHooks = [
          ...(prev.selectedHooks || []),
          {
            channel: hook.channel,
            opening_line: hook.opening_line,
            hook_type: hook.hook_type,
            psychology: hook.psychology,
          }
        ];
        toast.success(`Đã chọn hook cho ${CHANNELS.find(c => c.value === hook.channel)?.label || hook.channel}`);
      }
      
      return { ...prev, selectedHooks: newSelectedHooks };
    });
  };

  const handleRemoveHook = (channel: Channel) => {
    setFormData(prev => ({
      ...prev,
      selectedHooks: (prev.selectedHooks || []).filter(h => h.channel !== channel),
    }));
  };

  const handleClearAllHooks = () => {
    setFormData(prev => ({
      ...prev,
      selectedHooks: [],
      globalHook: undefined,
    }));
  };

  const handleHookRegenerated = (channel: Channel, newHook: MultiChannelHook) => {
    setFormData(prev => {
      const existingSelected = (prev.selectedHooks || []).find(h => h.channel === channel);
      if (!existingSelected) return prev;
      
      const updatedHooks = (prev.selectedHooks || []).map(h => 
        h.channel === channel
          ? {
              channel: newHook.channel,
              opening_line: newHook.opening_line,
              hook_type: newHook.hook_type,
              psychology: newHook.psychology,
            }
          : h
      );
      
      return { ...prev, selectedHooks: updatedHooks };
    });
  };

  const submittingRef = useRef(false);

  const handleSubmit = async () => {
    if (submittingRef.current || isGenerating) return;

    if (!formData.topic.trim() || formData.channels.length === 0) {
      toast.error('Vui lòng nhập chủ đề và chọn ít nhất 1 kênh');
      return;
    }

    // Check if Core Content is ready
    const hasCoreContent = !!coreContentData?.id || !!formData.coreContentId;

    if (!hasCoreContent) {
      if (isGeneratingCoreContent) {
        // Core Content is still generating - set pending flag
        setPendingMultiChannelGeneration(true);
        toast.info('Đang chờ Core Content hoàn tất...', {
          description: 'Nội dung đa kênh sẽ tự động được tạo khi Core Content sẵn sàng',
          duration: 5000,
        });
        return;
      } else {
        // No Core Content and not generating - error
        toast.error('Vui lòng tạo Core Content trước');
        setCurrentStep(2);
        return;
      }
    }

    // Has Core Content - proceed with generation
    submittingRef.current = true;
    try {
      await onGenerate({ ...formData, topicHistoryId });
    } finally {
      submittingRef.current = false;
      setPendingMultiChannelGeneration(false);
    }
  };

  // Auto-trigger multichannel generation when Core Content completes and pending
  useEffect(() => {
    const hasCoreContent = !!coreContentData?.id || !!formData.coreContentId;

    if (pendingMultiChannelGeneration && hasCoreContent && !isGenerating && !isGeneratingCoreContent && !submittingRef.current) {
      // Clear flag IMMEDIATELY to prevent useEffect firing again on next render
      setPendingMultiChannelGeneration(false);
      submittingRef.current = true;
      
      // Core Content just completed and we have pending generation
      toast.success('Core Content sẵn sàng! Đang tạo nội dung đa kênh...');
      
      // Trigger generation
      onGenerate({ ...formData, topicHistoryId })
        .finally(() => {
          submittingRef.current = false;
        });
    }
  }, [coreContentData?.id, formData.coreContentId, pendingMultiChannelGeneration, isGenerating, isGeneratingCoreContent]);

  // Auto-advance to Step 5 (AI Control) when multichannel generation completes
  useEffect(() => {
    if (generationComplete && currentStep === 4) {
      setCompletedSteps(prev => [...prev.filter(s => s !== 4), 4]);
      setCurrentStep(5);
    }
  }, [generationComplete, currentStep]);

  // Resume from background tasks on mount
  useEffect(() => {
    if (isCheckingTasks) return;
    
    const coreContentTask = activeTasks.find(
      t => t.task_type === 'core_content' && 
      (t.status === 'pending' || t.status === 'generating')
    );
    
    // NEW: Check for multichannel tasks
    const multiChannelTask = activeTasks.find(
      t => t.task_type === 'multichannel' && 
      (t.status === 'pending' || t.status === 'generating')
    );
    
    if (coreContentTask && !isResumedFromBackground) {
      setIsResumedFromBackground(true);
      // Resume UI with progress from background task
      toast.info('Đang tiếp tục tạo Core Content...', {
        description: `Tiến độ: ${coreContentTask.progress}%`,
      });
    }
    
    // NEW: Resume multichannel task
    if (multiChannelTask && !isResumedFromBackground) {
      setIsResumedFromBackground(true);
      toast.info('Đang tiếp tục tạo nội dung đa kênh...', {
        description: `Tiến độ: ${multiChannelTask.progress}%`,
      });
    }
  }, [activeTasks, isCheckingTasks, isResumedFromBackground]);

  // Handle clicking on a background task
  const handleTaskClick = useCallback(async (task: GenerationTask) => {
    if (task.status === 'completed' && task.result_id) {
      const result = await getTaskResult(task.id);
      
      // Handle Core Content result
      if (result?.type === 'core_content' && result.data) {
        setCoreContentData({
          id: result.data.id,
          title: result.data.title,
          content: result.data.content,
          wordCount: result.data.word_count || 0,
          qualityScore: result.data.quality_score || 0,
          keyMessages: Array.isArray(result.data.key_messages) ? result.data.key_messages as string[] : [],
          contentGoal: result.data.content_goal as ContentGoal | undefined,
        });
        setFormData(prev => ({ 
          ...prev, 
          coreContentId: result.data.id,
        }));
        setShowPreviewPopup(true);
        dismissTask(task.id);
      }
      
      // NEW: Handle Multi-channel result - navigate to viewer
      if (result?.type === 'multichannel' && result.data) {
        navigate('/multichannel', { 
          state: { viewContentId: result.data.id } 
        });
        dismissTask(task.id);
      }
    }
  }, [getTaskResult, dismissTask]);

  // Create pending queue items for the indicator
  const pendingQueueItems: PendingQueueItem[] = useMemo(() => {
    if (!pendingMultiChannelGeneration) return [];
    
    return [{
      id: pendingQueueId,
      type: 'multichannel_pending' as const,
      channels: formData.channels,
      waitingFor: 'core_content' as const,
      progress: coreContentProgress?.progress || 0,
    }];
  }, [pendingMultiChannelGeneration, pendingQueueId, formData.channels, coreContentProgress?.progress]);

  // Cancel pending handler
  const handleCancelPending = useCallback(() => {
    setPendingMultiChannelGeneration(false);
    toast.info('Đã hủy yêu cầu xếp hàng');
  }, []);




  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Step Indicator */}
        <StepIndicator
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
        />

        {/* Step Content */}
        <div className="min-h-[350px]">
          {/* ========== STEP 1: CHỦ ĐỀ (Progressive Smart Input) ========== */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              {/* Content Goal Selector - ALWAYS VISIBLE */}
              <div className="space-y-2">
                <Label className="text-foreground font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Mục tiêu nội dung
                </Label>
                <p className="text-xs text-muted-foreground">
                  Xác định mục tiêu giúp AI gợi ý và tạo nội dung phù hợp hơn
                </p>
                
                {/* Goal Button Group */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {CONTENT_GOALS.map((goal) => (
                    <button
                      key={goal.value}
                      type="button"
                      onClick={() => { userManuallySetGoal.current = true; setFormData(prev => ({ ...prev, contentGoal: goal.value })); }}
                      disabled={isGenerating}
                      className={cn(
                        "p-2.5 rounded-lg border text-center transition-all duration-200",
                        "flex flex-col items-center gap-1",
                        "hover:shadow-sm",
                        formData.contentGoal === goal.value 
                          ? "border-primary bg-primary/10 text-primary shadow-sm" 
                          : "border-border bg-card hover:bg-accent/50 hover:border-primary/30",
                        isGenerating && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center",
                        formData.contentGoal === goal.value 
                          ? "bg-primary/20" 
                          : "bg-muted"
                      )}>
                        {GOAL_ICONS[goal.value]}
                      </span>
                      <span className="text-xs font-medium">{goal.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic Textarea with AI Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Chủ đề / Ý tưởng
                    <span className="text-primary">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBrainstormSheet(true)}
                      disabled={isGenerating}
                      className="h-7 px-2 text-xs gap-1.5 text-primary hover:bg-primary/10"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Brainstorm AI</span>
                    </Button>
                    <span className={cn(
                      "text-xs",
                      formData.topic.length < TOPIC_MIN_LENGTH_FOR_REFINEMENT ? 'text-amber-500' : 'text-muted-foreground'
                    )}>
                      {formData.topic.length}/{MAX_TOPIC_LENGTH}
                    </span>
                  </div>
                </div>

                <Textarea
                  ref={topicTextareaRef}
                  value={formData.topic}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    topic: e.target.value.slice(0, MAX_TOPIC_LENGTH) 
                  }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      const text = (e.target as HTMLTextAreaElement).value;
                      if (detectAndHandleAICommand(text)) {
                        e.preventDefault();
                      }
                    }
                  }}
                  placeholder="Nhập chủ đề bạn muốn viết, VD: Skincare mùa hè, Mẹo tiết kiệm chi phí... hoặc mô tả ý tưởng để AI hỗ trợ"
                  className="min-h-[100px] resize-y text-sm"
                  disabled={isGenerating}
                  autoFocus
                />

                {formData.topic.length > 0 && formData.topic.length < TOPIC_MIN_LENGTH_FOR_REFINEMENT && (
                  <p className="text-xs text-amber-500">
                    Chủ đề nên có ít nhất {TOPIC_MIN_LENGTH_FOR_REFINEMENT} ký tự để AI có thể gợi ý tốt hơn
                  </p>
                )}
              </div>

              {/* ===== DYNAMIC ZONE - Changes based on topic length ===== */}
              <AnimatePresence mode="wait">
                {formData.topic.trim().length < TOPIC_MIN_LENGTH_FOR_REFINEMENT ? (
                  /* Empty/Short Input State: Show AI Brainstorm options */
                  <motion.div
                    key="ai-suggestions"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Hero Brainstorm Card */}
                    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/30 overflow-hidden">
                      <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-7 h-7 text-primary" />
                        </div>
                        
                        <div className="flex-1 text-center sm:text-left space-y-1">
                          <h3 className="font-semibold">Chưa có ý tưởng?</h3>
                          <p className="text-sm text-muted-foreground">
                            Brainstorm với AI để tìm chủ đề hoàn hảo dựa trên brand và mục tiêu của bạn.
                          </p>
                        </div>
                        
                        <Button
                          onClick={() => setShowBrainstormSheet(true)}
                          className="gap-2 shrink-0"
                          disabled={isGenerating}
                        >
                          <Sparkles className="w-4 h-4" />
                          Brainstorm
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Quick Suggestions - Compact Chips */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Separator className="flex-1" />
                        <span className="text-xs text-muted-foreground px-2">Hoặc chọn gợi ý nhanh</span>
                        <Separator className="flex-1" />
                      </div>
                      
                      <InlineTopicSuggestions
                        brandTemplateId={brandTemplateId}
                        contentGoal={formData.contentGoal || 'education'}
                        onSelectTopic={(topic) => {
                          setFormData(prev => ({ ...prev, topic }));
                        }}
                        disabled={isGenerating}
                        compact
                      />
                    </div>
                  </motion.div>
                ) : (
                  /* Has Content State: Show refinement suggestions */
                  <motion.div
                    key="refinement"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Compliance Warning */}
                    {complianceCheckResult && (
                      <ComplianceWarningBadge
                        result={complianceCheckResult}
                        onSuggestCompliant={handleSuggestCompliant}
                        isSuggesting={isCheckingCompliance}
                      />
                    )}

                    {/* Topic Refinement Suggestions */}
                    <TopicRefinementSuggestions
                      refinedTopics={refinedTopics}
                      isLoading={isLoadingRefinement}
                      isTyping={isTypingTopic}
                      elapsedMs={refinementElapsedMs}
                      onSelect={(refined, suggestion) => {
                        const aiSuggestion: AiSuggestionContext | undefined = suggestion ? {
                          targetPersona: suggestion.targetPersona,
                          targetPersonaId: suggestion.targetPersonaId,
                          productFit: suggestion.productFit,
                          productFitId: suggestion.productFitId,
                          suggestedJourneyStage: suggestion.suggestedJourneyStage,
                          suggestedContentAngle: suggestion.suggestedContentAngle,
                          hook: suggestion.hook,
                          angle: suggestion.angle,
                        } : undefined;
                        
                        setFormData(prev => ({ 
                          ...prev, 
                          topic: refined,
                          productId: suggestion?.productFitId || prev.productId,
                          personaId: suggestion?.targetPersonaId || prev.personaId,
                          journeyStage: suggestion?.suggestedJourneyStage || prev.journeyStage,
                          contentAngle: (suggestion?.suggestedContentAngle as ContentAngle) || prev.contentAngle,
                          aiSuggestion,
                        }));
                      }}
                      onRefresh={refreshRefinement}
                      disabled={isGenerating}
                    />

                    {/* Secondary Brainstorm button */}
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBrainstormSheet(true)}
                        disabled={isGenerating}
                        className="gap-2 text-muted-foreground hover:text-primary"
                      >
                        <Sparkles className="w-4 h-4" />
                        Brainstorm thêm ý tưởng
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ========== STEP 2: TẠO CORE CONTENT ========== */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              {/* Topic Preview */}
              <Card className="bg-muted/30 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Chủ đề đã chọn</p>
                      <p className="font-medium text-sm">{formData.topic}</p>
                    </div>
                    <Badge variant="outline">
                      {CONTENT_GOALS.find(g => g.value === formData.contentGoal)?.label || 'Education'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Streaming UI when generating */}
              {isGeneratingCoreContent && (
                <CoreContentStreamingCard
                  streamingText={coreContentStreamingText}
                  progress={coreContentProgress}
                  isStreaming={true}
                  qualityMode="balanced"
                  onCancel={cancelCoreContentGeneration}
                />
              )}

              {/* Core Content Generation Form - Hidden when generating */}
              {!coreContentData && !formData.coreContentId && !isGeneratingCoreContent && (
                <Card className="border-border/50 overflow-hidden">
                  {/* Gradient Header */}
                  <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 border-b border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-base">Tạo Core Content</h3>
                        <p className="text-xs text-muted-foreground">Nội dung gốc làm nguồn cho tất cả kênh xuất bản</p>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-4">
                    {/* Tabbed Options */}
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="w-full grid grid-cols-2 h-9">
                        <TabsTrigger value="basic" className="text-xs gap-1.5">
                          <Settings2 className="w-3.5 h-3.5" />
                          Cơ bản
                        </TabsTrigger>
                        <TabsTrigger value="advanced" className="text-xs gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Nâng cao
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="basic" className="space-y-4 mt-4">
                        {/* Content Angle */}
                        <ContentAngleSelector
                          value={coreContentAngle === '__none__' ? undefined : coreContentAngle}
                          onValueChange={(angle) => setCoreContentAngle(angle || '__none__')}
                          disabled={isGeneratingCoreContent}
                        />
                        {formData.contentGoal && coreContentAngle !== '__none__' && 
                         GOAL_TO_ANGLE_MAP[formData.contentGoal] === coreContentAngle && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 -mt-2">
                            <Sparkles className="w-3 h-3 text-primary" />
                            Gợi ý từ mục tiêu "{CONTENT_GOALS.find(g => g.value === formData.contentGoal)?.label}"
                          </p>
                        )}

                        {/* Length Mode - Visual Cards */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Độ dài nội dung</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {CORE_CONTENT_LENGTH_MODES.map((mode) => {
                              const lengthIcons = {
                                short: <FileTextIcon className="w-4 h-4" />,
                                medium: <AlignLeft className="w-4 h-4" />,
                                long: <BookOpen className="w-4 h-4" />,
                              };
                              const estTimes = { short: '~30s', medium: '~45s', long: '~60s' };
                              return (
                                <button
                                  key={mode.value}
                                  type="button"
                                  onClick={() => setCoreContentLengthMode(mode.value)}
                                  className={cn(
                                    "p-3 rounded-lg border text-center transition-all relative group",
                                    coreContentLengthMode === mode.value
                                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                      : "border-border/50 hover:bg-muted/30 hover:border-border"
                                  )}
                                >
                                  {mode.recommended && (
                                    <Badge 
                                      variant="default" 
                                      className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-1.5 py-0"
                                    >
                                      Phổ biến
                                    </Badge>
                                  )}
                                  <div className={cn(
                                    "w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center",
                                    coreContentLengthMode === mode.value
                                      ? "bg-primary/15 text-primary"
                                      : "bg-muted text-muted-foreground"
                                  )}>
                                    {lengthIcons[mode.value]}
                                  </div>
                                  <div className="text-sm font-medium">{mode.labelVi}</div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {mode.minWords}-{mode.maxWords} từ
                                  </p>
                                  <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    {estTimes[mode.value]}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="advanced" className="space-y-4 mt-4">
                        {/* Target Audience - PersonaSelector or Textarea fallback */}
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Đối tượng mục tiêu (tuỳ chọn)</Label>
                          {brandTemplateId ? (
                            brandPersonasCount === 0 ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={coreContentAudience}
                                  onChange={(e) => setCoreContentAudience(e.target.value)}
                                  placeholder="VD: Chủ doanh nghiệp SME, 30-45 tuổi, quan tâm đến..."
                                  className="min-h-[60px] text-sm resize-none"
                                  disabled={isGeneratingCoreContent}
                                />
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3 shrink-0 text-primary" />
                                  <span>
                                    <Link 
                                      to={`/brands/${brandTemplateId}?tab=personas`}
                                      className="underline text-primary hover:text-primary/80"
                                    >
                                      Thêm Personas cho brand
                                    </Link>
                                    {' '}để AI targeting chính xác hơn
                                  </span>
                                </p>
                              </div>
                            ) : (
                              <PersonaSelector
                                brandTemplateId={brandTemplateId}
                                value={coreContentPersonaId}
                                onValueChange={(id) => setCoreContentPersonaId(id)}
                                onPersonasLoaded={setBrandPersonasCount}
                                disabled={isGeneratingCoreContent}
                              />
                            )
                          ) : (
                            <Textarea
                              value={coreContentAudience}
                              onChange={(e) => setCoreContentAudience(e.target.value)}
                              placeholder="VD: Chủ doanh nghiệp SME, 30-45 tuổi..."
                              className="min-h-[60px] text-sm resize-none"
                            />
                          )}
                        </div>

                        {/* Auto Research Toggle */}
                        <div className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all",
                          enableResearch 
                            ? "border-primary/50 bg-primary/5" 
                            : "border-border/50 hover:bg-muted/30"
                        )}>
                          <Switch
                            id="enable-research"
                            checked={enableResearch}
                            onCheckedChange={setEnableResearch}
                            disabled={isGeneratingCoreContent}
                          />
                          <div className="flex-1">
                            <label htmlFor="enable-research" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                              <Globe className="w-4 h-4 text-primary" />
                              Tự động nghiên cứu từ internet
                              {enableResearch && (
                                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                                  Bật
                                </Badge>
                              )}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              AI tìm kiếm facts và số liệu mới nhất trước khi viết
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    {/* AI Context Summary - Enhanced chips with icons */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2.5 bg-muted/30 rounded-lg border border-border/30">
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="shrink-0">AI Context:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {brandTemplateId && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[10px] py-0 gap-1 cursor-help">
                                <Package className="w-2.5 h-2.5" /> Brand
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">Sử dụng brand voice & tone</p></TooltipContent>
                          </Tooltip>
                        )}
                        {coreContentPersonaId && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[10px] py-0 gap-1 cursor-help">
                                <Users className="w-2.5 h-2.5" /> Persona
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">Nhắm đến persona cụ thể</p></TooltipContent>
                          </Tooltip>
                        )}
                        {enableResearch && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[10px] py-0 gap-1 cursor-help">
                                <Globe className="w-2.5 h-2.5" /> Research
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">Tìm kiếm dữ liệu mới nhất</p></TooltipContent>
                          </Tooltip>
                        )}
                        {coreContentAngle !== '__none__' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[10px] py-0 gap-1 cursor-help">
                                <Target className="w-2.5 h-2.5" /> Angle
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">Góc tiếp cận nội dung</p></TooltipContent>
                          </Tooltip>
                        )}
                        {!brandTemplateId && !coreContentPersonaId && !enableResearch && coreContentAngle === '__none__' && (
                          <span className="text-muted-foreground/70 italic">Cơ bản</span>
                        )}
                      </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                      onClick={handleGenerateCoreContent}
                      disabled={!formData.topic.trim()}
                      className="w-full gap-2 gradient-primary"
                    >
                      <Sparkles className="w-4 h-4" />
                      Tạo Core Content
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Core Content Preview - After Generation (hidden while streaming) */}
              {coreContentData && !isGeneratingCoreContent && (
                <Card className="bg-gradient-to-br from-primary/5 via-card to-card border-2 border-primary/30 shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">Core Content đã tạo</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{coreContentData.wordCount} từ</span>
                            {/* Mini quality ring */}
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 -rotate-90" viewBox="0 0 20 20">
                                <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
                                <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" 
                                  className="text-primary"
                                  strokeDasharray={`${(coreContentData.qualityScore / 100) * 50.3} 50.3`}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="text-xs font-medium text-primary">{coreContentData.qualityScore}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCoreContentPreview(!showCoreContentPreview)}
                          className="gap-1 text-xs h-8"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {showCoreContentPreview ? 'Ẩn' : 'Xem'}
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (window.confirm('Bạn có chắc muốn tạo lại Core Content? Nội dung hiện tại sẽ bị thay thế.')) {
                                  setCoreContentData(null);
                                  setFormData(prev => ({ ...prev, coreContentId: undefined }));
                                }
                              }}
                              className="gap-1 text-xs h-8"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Tạo lại
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs">Tạo lại sẽ thay thế nội dung hiện tại</p></TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Tiêu đề</p>
                      <p className="font-medium text-sm">{coreContentData.title}</p>
                    </div>

                    {/* Key Messages - Numbered list */}
                    {coreContentData.keyMessages.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Thông điệp chính</p>
                        <div className="space-y-1.5">
                          {coreContentData.keyMessages.slice(0, 4).map((msg, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="text-foreground/90">{msg}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Full Content Preview */}
                    {showCoreContentPreview && (
                      <div className="border-t border-border/50 pt-4">
                        <p className="text-xs text-muted-foreground mb-2">Nội dung đầy đủ</p>
                        <div className="max-h-[300px] overflow-y-auto p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap">
                          {coreContentData.content}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ========== STEP 3: VAI TRÒ ========== */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              {/* Strategy Overview Card - Summary from Step 1-2 */}
              <StrategyOverviewCard
                contentGoal={coreContentData?.contentGoal || formData.contentGoal}
                contentAngle={coreContentAngle !== '__none__' ? coreContentAngle : undefined}
                lengthMode={coreContentLengthMode}
              />

              {/* Core Content Summary */}
              {coreContentData && (
                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <BookOpen className="w-5 h-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Core Content đã tạo</p>
                        <p className="font-medium text-sm line-clamp-1">{coreContentData.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {coreContentData.wordCount} từ • {coreContentData.keyMessages.length} thông điệp
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Role Selector */}
              <div className="space-y-3">
                <Label className="text-foreground font-semibold flex items-center gap-2">
                  <Compass className="w-4 h-4 text-primary" />
                  Chọn vai trò nội dung (Content Role)
                  <span className="text-primary">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Vai trò quyết định cách AI transform Core Content thành nội dung đa kênh
                </p>
                
                <RoleSelectorCard
                  value={formData.contentRole}
                  onValueChange={(role) => setFormData(prev => ({ ...prev, contentRole: role }))}
                  contentGoal={coreContentData?.contentGoal || formData.contentGoal}
                  contentAngle={coreContentAngle !== '__none__' ? coreContentAngle : undefined}
                  disabled={isGenerating}
                />
              </div>
            </div>
          )}

          {/* ========== STEP 4: NỘI DUNG ĐA KÊNH ========== */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fade-in">
              {/* Targeting - Compact 2-column inline */}
              {formData.brandTemplateId && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-semibold">Nhắm đối tượng</Label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        Sản phẩm
                      </Label>
                      <ProductSelector
                        brandTemplateId={formData.brandTemplateId}
                        value={formData.productId}
                        onValueChange={(productId) => setFormData(prev => ({ ...prev, productId }))}
                        disabled={isGenerating}
                        placeholder="Chọn sản phẩm..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Persona
                      </Label>
                      <PersonaSelector
                        brandTemplateId={formData.brandTemplateId}
                        value={formData.personaId}
                        onValueChange={(personaId) => setFormData(prev => ({ ...prev, personaId }))}
                        disabled={isGenerating}
                      />
                    </div>
                  </div>
                  {/* Content Angle - readonly chip if set in Step 2, or allow override */}
                  {coreContentAngle !== '__none__' ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Target className="w-3 h-3" />
                      <span>Angle:</span>
                      <Badge variant="outline" className="text-[10px]">
                        {CONTENT_ANGLES.find(a => a.value === coreContentAngle)?.label || coreContentAngle}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => {/* Allow override */}}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Đổi
                      </button>
                    </div>
                  ) : (
                    <ContentAngleSelector
                      value={formData.contentAngle}
                      onValueChange={(angle) => setFormData(prev => ({ ...prev, contentAngle: angle }))}
                      disabled={isGenerating}
                    />
                  )}
                </div>
              )}

              {/* Gradient divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Journey Stage - Inline button group */}
              <InlineJourneySelector
                value={formData.journeyStage}
                onValueChange={(stage) => setFormData(prev => ({ ...prev, journeyStage: stage }))}
                disabled={isGenerating}
              />

              {/* Gradient divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Channel Selection - Compact Grid */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Kênh xuất bản
                </Label>
                <CompactChannelGrid
                  selectedChannels={formData.channels}
                  onChannelToggle={handleChannelToggle}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                  channelIcons={channelIcons}
                  brandTemplate={brandTemplate}
                  disabled={isGenerating}
                />
              </div>

              {/* Gradient divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Hook Generator */}
              {formData.topic.trim().length >= 10 && formData.channels.length > 0 && (
                <MultiChannelHookGenerator
                  topic={formData.topic}
                  channels={formData.channels}
                  organizationId={organizationId}
                  brandTemplateId={brandTemplateId}
                  brandVoice={brandTemplate ? {
                    brand_name: brandTemplate.brand_name,
                    tone_of_voice: brandTemplate.tone_of_voice || [],
                    formality_level: brandTemplate.formality_level || undefined,
                  } : undefined}
                  selectedHooks={formData.selectedHooks}
                  onSelectHook={handleSelectHook}
                  onHookRegenerated={handleHookRegenerated}
                  disabled={isGenerating}
                />
              )}

              {/* Selected Hooks Summary */}
              <SelectedHooksSummary
                selectedHooks={formData.selectedHooks || []}
                onRemoveHook={handleRemoveHook}
                onClearAll={handleClearAllHooks}
                disabled={isGenerating}
                collapsible
                defaultCollapsed={false}
              />

              {/* Footer Info - Simple toggle row */}
              <div className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all",
                formData.includeFooterInfo !== false
                  ? "border-primary/30 bg-primary/5"
                  : "border-border/50"
              )}>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-primary" />
                  <div>
                    <span className="text-sm font-medium">Thông tin liên hệ (Footer)</span>
                    <p className="text-[11px] text-muted-foreground">Hotline, email, website</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {brandTemplateId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                      asChild
                    >
                      <Link to="/brands/new" state={{ editTemplate: { id: brandTemplateId }, focusFooterInfo: true }}>
                        <Pencil className="w-3 h-3 mr-1" />
                        Sửa
                      </Link>
                    </Button>
                  )}
                  <Switch
                    checked={formData.includeFooterInfo !== false}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, includeFooterInfo: checked }))
                    }
                    disabled={isGenerating}
                  />
                </div>
              </div>

              {/* Estimated Time */}
              {formData.channels.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Timer className="w-3.5 h-3.5" />
                  <span>
                    Ước tính: ~{estimatedTime} giây cho {formData.channels.length} kênh
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========== STEP 5: MỨC ĐỘ KIỂM SOÁT AI ========== */}
        {currentStep === 5 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Settings2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Mức độ kiểm soát AI</h2>
                  <p className="text-sm text-muted-foreground">
                    Chọn mức độ AI can thiệp vào việc tạo ảnh cho {formData.channels.length} kênh
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { 
                  value: 'full' as PromptMode, 
                  label: 'Để AI lo', 
                  icon: <Sparkles className="w-5 h-5" />,
                  desc: 'AI tự chọn phong cách, bố cục, vị trí text. Bạn chỉ cần duyệt.',
                  color: 'primary',
                },
                { 
                  value: 'brand_only' as PromptMode, 
                  label: 'Giữ brand', 
                  icon: <Eye className="w-5 h-5" />,
                  desc: 'Giữ logo & màu brand. Bạn tự chọn bố cục text & vị trí.',
                  color: 'amber',
                },
                { 
                  value: 'raw' as PromptMode, 
                  label: 'Toàn quyền', 
                  icon: <Pencil className="w-5 h-5" />,
                  desc: 'Bạn kiểm soát mọi thứ: phong cách, logo, text, bố cục.',
                  color: 'violet',
                },
              ]).map(mode => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => {
                    setPromptMode(mode.value);
                    // Auto-enable logo for brand_only mode (consistent with SimpleImageGenerator)
                    if (mode.value === 'brand_only') {
                      // Logo will be auto-enabled via pipeline
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all",
                    promptMode === mode.value
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border/50 hover:border-border hover:bg-muted/40"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    promptMode === mode.value ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {mode.icon}
                  </div>
                  <div>
                    <span className={cn(
                      "text-sm font-semibold block",
                      promptMode === mode.value ? "text-primary" : "text-foreground"
                    )}>{mode.label}</span>
                    <span className="text-xs text-muted-foreground mt-1 block leading-relaxed">{mode.desc}</span>
                  </div>
                  {promptMode === mode.value && (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>

            {/* Context hint */}
            <Card className={cn(
              "border",
              promptMode === 'full' && "bg-primary/5 border-primary/20",
              promptMode === 'brand_only' && "bg-amber-500/5 border-amber-500/20",
              promptMode === 'raw' && "bg-violet-500/5 border-violet-500/20",
            )}>
              <CardContent className="p-4">
                <p className="text-sm">
                  {promptMode === 'full' && '✨ AI sẽ tự động tối ưu phong cách, bố cục và vị trí text cho từng kênh. Bạn chỉ cần duyệt kết quả.'}
                  {promptMode === 'brand_only' && '🎨 AI giữ nguyên logo, màu sắc thương hiệu. Bạn có thể tùy chỉnh bố cục text và vị trí trong bước tạo ảnh.'}
                  {promptMode === 'raw' && '⚡ Bạn toàn quyền kiểm soát: chọn phong cách ảnh, logo, text, typography và bố cục trong bước tạo ảnh.'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========== STEP 6: TẠO ẢNH ========== */}
        {currentStep === 6 && (
          <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Image className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Tạo ảnh AI cho các kênh</h2>
                  <p className="text-sm text-muted-foreground">
                    Tạo ảnh minh họa tự động cho {formData.channels.length} kênh đã chọn
                  </p>
                </div>
              </div>
            </div>

            {/* Channel summary */}
            <Card className="bg-muted/30 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Kênh sẽ tạo ảnh</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.channels.map(ch => {
                    const channelInfo = CHANNELS.find(c => c.value === ch);
                    return (
                      <Badge key={ch} variant="secondary" className="gap-1.5">
                        {channelIcons[ch]}
                        {channelInfo?.label || ch}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Image generation status */}
            {imagePhase === 'idle' || !imagePhase ? (
              <div className="space-y-4">
                {/* Mode summary from Step 5 */}
                <Card className={cn(
                  "border",
                  promptMode === 'full' && "bg-primary/5 border-primary/20",
                  promptMode === 'brand_only' && "bg-amber-500/5 border-amber-500/20",
                  promptMode === 'raw' && "bg-violet-500/5 border-violet-500/20",
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        promptMode === 'full' && "bg-primary/15 text-primary",
                        promptMode === 'brand_only' && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                        promptMode === 'raw' && "bg-violet-500/15 text-violet-600 dark:text-violet-400",
                      )}>
                        {promptMode === 'full' && <Sparkles className="w-4 h-4" />}
                        {promptMode === 'brand_only' && <Eye className="w-4 h-4" />}
                        {promptMode === 'raw' && <Pencil className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {promptMode === 'full' && 'Chế độ: Để AI lo'}
                          {promptMode === 'brand_only' && 'Chế độ: Giữ Brand'}
                          {promptMode === 'raw' && 'Chế độ: Toàn quyền'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {promptMode === 'full' && 'AI tự tối ưu phong cách, bố cục, text'}
                          {promptMode === 'brand_only' && 'Giữ logo & màu brand, AI lo phần còn lại'}
                          {promptMode === 'raw' && 'Bạn kiểm soát 100% — tùy chỉnh qua trang chi tiết'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Hint: raw/brand_only can customize via SimpleImageGenerator */}
                {promptMode !== 'full' && (
                  <Card className="border border-dashed border-muted-foreground/30 bg-muted/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Settings2 className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {promptMode === 'raw' ? 'Tùy chỉnh nâng cao' : 'Tùy chỉnh brand'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {promptMode === 'raw' 
                              ? 'Bạn có thể tùy chỉnh phong cách, logo, text, bố cục chi tiết hơn tại trang chi tiết sau khi tạo nội dung, hoặc sử dụng trình tạo ảnh riêng.' 
                              : 'Bạn có thể tùy chỉnh logo, vị trí text và typography tại trang chi tiết sau khi tạo nội dung, hoặc sử dụng trình tạo ảnh riêng.'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Info card */}
                <Card className="border border-border/50 bg-card/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Image className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">Sẵn sàng tạo ảnh</h3>
                        <p className="text-xs text-muted-foreground">
                          AI sẽ tự động tạo ảnh phù hợp với nội dung từng kênh
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Prompt Preview */}
                <PromptPreview
                  channels={formData.channels}
                  promptMode={promptMode}
                  imageStyle="auto"
                  contentRole={formData.contentRole as any}
                  contentAngle={formData.contentAngle as any}
                  imageContentType="with_text"
                  brandPrimaryColor={brandTemplate?.tone_of_voice?.[0] ? undefined : undefined}
                  personaName={formData.personaId ? 'Đã chọn persona' : undefined}
                />

                {/* Complexity Warning for complex content descriptions */}
                {(() => {
                  const channelTexts = formData.channels.map(ch => getChannelText?.(ch) || '').join(' ');
                  const analysis = analyzeContentComplexity(channelTexts + ' ' + (formData.topic || ''));
                  return <ComplexityWarning analysis={analysis} />;
                })()}

                {/* Sticky CTA bar */}
                <div className="sticky bottom-0 z-20 pt-6 pb-2">
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none" />
                  <div className="relative flex flex-col items-center gap-3">
                    <p className="text-sm font-medium text-muted-foreground">🎨 Mọi thứ đã sẵn sàng!</p>
                    <Button
                      onClick={() => {
                        if (onStartImagePipeline && getChannelText) {
                          const channelTexts: Record<string, string> = {};
                          formData.channels.forEach(ch => {
                            channelTexts[ch] = getChannelText(ch);
                          });
                          onStartImagePipeline(formData.channels, channelTexts, {
                            contentGoal: formData.contentGoal,
                            contentRole: formData.contentRole,
                            contentAngle: formData.contentAngle,
                            topic: formData.topic,
                            promptMode,
                          });
                        }
                      }}
                      disabled={!onStartImagePipeline}
                      className={cn(
                        "w-full gap-3 text-base font-semibold shadow-lg",
                        generationComplete
                          ? "gradient-primary glow-primary shadow-primary/25 animate-pulse hover:animate-none"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                      size="lg"
                    >
                      {generationComplete ? (
                        <>
                          <Sparkles className="w-6 h-6" />
                          Tạo ảnh AI
                          <span className="inline-flex items-center justify-center rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-bold">
                            {formData.channels.length} kênh
                          </span>
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Đang chờ nội dung...
                        </>
                      )}
                    </Button>
                    <button
                      onClick={() => navigate('/multichannel')}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                    >
                      Bỏ qua bước này →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Show ImageStreamingGrid when generating/complete */}
                <ImageStreamingGrid
                  progress={(imageProgress || {}) as Record<Channel, any>}
                  progressTimes={imageProgressTimes as Record<Channel, number>}
                  logoOverlayFailures={logoOverlayFailures as Record<Channel, boolean>}
                  generatedImages={(generatedImages || {}) as Record<Channel, any>}
                  onRetryChannel={onRetryImageChannel}
                  onDownloadImage={onDownloadImage}
                  onEditBackground={undefined}
                  onRefineText={undefined}
                />

                {/* Completion actions */}
                {(imagePhase === 'complete' || imagePhase === 'error') && (
                  <div className="flex items-center justify-center gap-3 pt-4">
                    <Button
                      onClick={() => navigate('/multichannel')}
                      className="gap-2 gradient-primary glow-primary"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Hoàn tất
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Floating Progress Indicator - Show when on Step 3/4 and Core Content generating */}
        {currentStep > 2 && isGeneratingCoreContent && (
          <div className="fixed bottom-36 right-4 z-40 animate-fade-in">
            <Card className="bg-card/95 backdrop-blur-md shadow-lg border-primary/20">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="relative">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
                </div>
                <div className="text-sm min-w-[140px]">
                  <p className="font-medium text-foreground">Đang tạo Core Content</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {coreContentProgress?.progress || 0}% - {coreContentProgress?.message || 'Đang xử lý...'}
                  </p>
                </div>
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${coreContentProgress?.progress || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm pt-4 border-t border-border mt-6">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1 || isGenerating}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </Button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{currentStep}/6</span>
            </div>

            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed || isGenerating}
                className="gap-2 gradient-primary glow-primary"
              >
                {isGeneratingCoreContent && currentStep === 2 ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Tiếp tục ({coreContentProgress?.progress || 0}%)
                  </>
                ) : (
                  <>
                    Tiếp tục
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            ) : currentStep === 4 ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isGenerating || pendingMultiChannelGeneration || !formData.topic.trim() || formData.channels.length === 0}
                  className={cn(
                    "gap-2 gradient-primary min-w-[140px]",
                    !isGenerating && !pendingMultiChannelGeneration && "glow-primary"
                  )}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : pendingMultiChannelGeneration ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Chờ Core Content ({coreContentProgress?.progress || 0}%)
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Tạo ({formData.channels.length} kênh)
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCompletedSteps(prev => [...prev.filter(s => s !== 4), 4]);
                    setCurrentStep(5);
                  }}
                  disabled={formData.channels.length === 0}
                  className="gap-1.5"
                >
                  <Image className="w-4 h-4" />
                  Tạo ảnh
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : currentStep === 5 ? (
              <Button
                type="button"
                onClick={() => {
                  setCompletedSteps(prev => [...prev.filter(s => s !== 5), 5]);
                  setCurrentStep(6);
                }}
                className="gap-2 gradient-primary glow-primary"
              >
                Tiếp tục tạo ảnh
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              // Step 6: Footer hidden when image phase is active
              imagePhase && imagePhase !== 'idle' ? null : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/multichannel')}
                    className="gap-2"
                  >
                    <SkipForward className="w-4 h-4" />
                    Bỏ qua
                  </Button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Brainstorm Sheet */}
        <TopicBrainstormSheet
          open={showBrainstormSheet}
          onOpenChange={(open) => {
            setShowBrainstormSheet(open);
            if (!open) setBrainstormInitialPrompt(undefined);
          }}
          brandTemplateId={formData.brandTemplateId}
          contentGoal={formData.contentGoal}
          initialPrompt={brainstormInitialPrompt}
          onSelectTopic={(topic) => {
            setFormData(prev => ({ ...prev, topic }));
            setBrainstormInitialPrompt(undefined);
            toast.success('Đã chọn chủ đề từ AI!');
          }}
        />

        {/* Floating Status Stack - prevents overlapping on mobile */}
        <FloatingStatusStack>
          <ActiveTasksIndicator
            tasks={
              isGeneratingCoreContent
                ? activeTasks.filter(t => t.task_type !== 'core_content')
                : activeTasks
            }
            pendingQueue={pendingQueueItems}
            onDismiss={dismissTask}
            onTaskClick={handleTaskClick}
            onCancelPending={handleCancelPending}
          />

          {coreContentData && (
            <CoreContentPreviewPopup
              isOpen={showPreviewPopup}
              onClose={() => setShowPreviewPopup(false)}
              onViewFull={() => setShowCoreContentPreview(true)}
              onContinue={() => {
                if (currentStep < 4) {
                  setCompletedSteps(prev => [...prev.filter(s => s !== currentStep), currentStep]);
                  setCurrentStep(prev => prev + 1);
                }
              }}
              title={coreContentData.title}
              wordCount={coreContentData.wordCount}
              qualityScore={coreContentData.qualityScore}
              keyMessages={coreContentData.keyMessages}
              contentGoal={coreContentData.contentGoal}
            />
          )}
        </FloatingStatusStack>
      </div>
    </TooltipProvider>
  );
}
