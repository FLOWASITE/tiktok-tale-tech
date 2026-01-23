import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { QualityModeQuickSelector } from '@/components/multichannel/QualityModeQuickSelector';
import { ProductSelector } from '@/components/topic/ProductSelector';
import { PersonaSelector } from '@/components/multichannel/PersonaSelector';
import { JourneyStageSelector } from '@/components/multichannel/JourneyStageSelector';
import { TopicBrainstormSheet } from '@/components/multichannel/TopicBrainstormSheet';
import { InlineTopicSuggestions } from '@/components/multichannel/InlineTopicSuggestions';
import { ComplianceWarningBadge } from '@/components/multichannel/ComplianceWarningBadge';
import { RoleSelectorCard } from '@/components/core-content/RoleSelectorCard';
import { CoreContentStreamingCard } from '@/components/multichannel/streaming/CoreContentStreamingCard';
import { CoreContentPreviewPopup } from '@/components/multichannel/CoreContentPreviewPopup';
import { ActiveTasksIndicator, PendingQueueItem } from '@/components/multichannel/ActiveTasksIndicator';
import { useBackgroundGeneration, GenerationTask } from '@/hooks/useBackgroundGeneration';
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
}

// NEW: 4-step flow as per user request
const STEPS: Step[] = [
  { id: 1, title: 'Chủ đề', icon: <FileText className="w-4 h-4" /> },
  { id: 2, title: 'Core Content', icon: <BookOpen className="w-4 h-4" /> },
  { id: 3, title: 'Vai trò', icon: <Compass className="w-4 h-4" /> },
  { id: 4, title: 'Đa kênh', icon: <Layers className="w-4 h-4" /> },
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

// Topic Input Mode for Step 1 tabs
type TopicInputMode = 'quick' | 'brainstorm';

// Goal icons mapping
const GOAL_ICONS: Record<ContentGoal, React.ReactNode> = {
  education: <GraduationCap className="w-4 h-4" />,
  awareness: <Eye className="w-4 h-4" />,
  engagement: <Users className="w-4 h-4" />,
  expertise: <Award className="w-4 h-4" />,
  conversion: <Target className="w-4 h-4" />,
};

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
}: MultiChannelFormWizardProps) {
  const navigate = useNavigate();
  const topicTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showBrainstormSheet, setShowBrainstormSheet] = useState(false);
  
  // NEW: Topic input mode for Step 1 tabs
  const [topicInputMode, setTopicInputMode] = useState<TopicInputMode>('quick');

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
  const [coreContentLengthMode, setCoreContentLengthMode] = useState<CoreContentLengthMode>('medium');
  const [enableResearch, setEnableResearch] = useState(false); // Auto research toggle

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

  // Removed: useCoreContents - now using useStreamingCoreContent

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
    if (!formData.topic.trim() || !organizationId) {
      toast.error('Vui lòng nhập chủ đề');
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
        enableResearch, // NEW: Pass research flag
      });
    } catch (error) {
      console.error('Core Content generation error:', error);
    }
  }, [formData.topic, formData.contentGoal, coreContentAngle, coreContentAudience, coreContentLengthMode, brandTemplateId, organizationId, generateCoreContentStreaming, enableResearch]);

  // Can proceed logic - NEW for 4-step flow with parallel workflow
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
    
    if (currentStep < 4 && canProceed) {
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
    if (step <= currentStep || completedSteps.includes(step - 1)) {
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

    if (pendingMultiChannelGeneration && hasCoreContent && !isGenerating && !isGeneratingCoreContent) {
      // Core Content just completed and we have pending generation
      toast.success('Core Content sẵn sàng! Đang tạo nội dung đa kênh...');
      
      // Trigger generation
      submittingRef.current = true;
      onGenerate({ ...formData, topicHistoryId })
        .finally(() => {
          submittingRef.current = false;
          setPendingMultiChannelGeneration(false);
        });
    }
  }, [coreContentData?.id, formData.coreContentId, pendingMultiChannelGeneration, isGenerating, isGeneratingCoreContent]);

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

  // Channel categories
  const channelCategories = [
    { name: 'Nền tảng nội dung', key: 'content', channels: CHANNELS.filter(c => c.category === 'content') },
    { name: 'Mạng xã hội', key: 'social', channels: CHANNELS.filter(c => c.category === 'social') },
    { name: 'Kênh trực tiếp', key: 'direct', channels: CHANNELS.filter(c => c.category === 'direct') },
    { name: 'Địa phương', key: 'local', channels: CHANNELS.filter(c => c.category === 'local') },
  ];

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
          {/* ========== STEP 1: CHỦ ĐỀ ========== */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <Tabs 
                value={topicInputMode} 
                onValueChange={(v) => setTopicInputMode(v as TopicInputMode)}
                className="w-full"
              >
                {/* Tab Toggle */}
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="quick" className="gap-2">
                    <Pencil className="w-4 h-4" />
                    Nhập nhanh
                  </TabsTrigger>
                  <TabsTrigger value="brainstorm" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Brainstorm
                  </TabsTrigger>
                </TabsList>

                {/* ===== TAB 1: NHẬP NHANH (Quick Input) ===== */}
                <TabsContent value="quick" className="space-y-4 mt-0">
                  {/* Hint */}
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                    💡 Chế độ này dành cho bạn khi đã có ý tưởng rõ ràng. Nhập chủ đề và tiếp tục.
                  </p>

                  {/* Topic Textarea */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-foreground font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Chủ đề / Ý tưởng
                        <span className="text-primary">*</span>
                      </Label>
                      <span className={cn(
                        "text-xs",
                        formData.topic.length < 10 ? 'text-amber-500' : 'text-muted-foreground'
                      )}>
                        {formData.topic.length}/{MAX_TOPIC_LENGTH}
                      </span>
                    </div>

                    <Textarea
                      ref={topicTextareaRef}
                      value={formData.topic}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        topic: e.target.value.slice(0, MAX_TOPIC_LENGTH) 
                      }))}
                      placeholder="VD: Cách tối ưu thuế cho doanh nghiệp nhỏ trong năm 2024"
                      className="min-h-[140px] resize-y text-sm"
                      disabled={isGenerating}
                      autoFocus
                    />

                    {formData.topic.length > 0 && formData.topic.length < 10 && (
                      <p className="text-xs text-amber-500">
                        Chủ đề nên có ít nhất 10 ký tự
                      </p>
                    )}
                  </div>

                  {/* Compliance Warning */}
                  {formData.topic.trim().length >= 10 && complianceCheckResult && (
                    <ComplianceWarningBadge
                      result={complianceCheckResult}
                      onSuggestCompliant={handleSuggestCompliant}
                      isSuggesting={isCheckingCompliance}
                    />
                  )}

                  {/* Topic Refinement - only show in Quick mode when topic is entered */}
                  {formData.topic.trim().length >= 10 && (
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
                  )}

                  {/* Switch to Brainstorm hint */}
                  {!formData.topic.trim() && (
                    <div className="text-center pt-2">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setTopicInputMode('brainstorm')}
                        className="text-muted-foreground hover:text-primary gap-1"
                      >
                        Chưa có ý tưởng? 
                        <Sparkles className="w-3.5 h-3.5" />
                        Để AI gợi ý
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* ===== TAB 2: AI BRAINSTORM ===== */}
                <TabsContent value="brainstorm" className="space-y-4 mt-0">
                  {/* Hint */}
                  <p className="text-xs text-muted-foreground bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-lg px-3 py-2 border border-violet-500/20">
                    ✨ Để AI gợi ý chủ đề phù hợp với mục tiêu nội dung của bạn.
                  </p>

                  {/* Content Goal Selector - FIRST in Brainstorm mode */}
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Mục tiêu nội dung
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Xác định mục tiêu giúp AI gợi ý chủ đề phù hợp hơn
                    </p>
                    
                    {/* Goal Button Group */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {CONTENT_GOALS.map((goal) => (
                        <button
                          key={goal.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, contentGoal: goal.value }))}
                          disabled={isGenerating}
                          className={cn(
                            "p-3 rounded-lg border text-center transition-all duration-200",
                            "flex flex-col items-center gap-1.5",
                            "hover:shadow-sm",
                            formData.contentGoal === goal.value 
                              ? "border-primary bg-primary/10 text-primary shadow-sm" 
                              : "border-border bg-card hover:bg-accent/50 hover:border-primary/30",
                            isGenerating && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <span className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
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

                  {/* Hero Brainstorm Card - TRỌNG TÂM */}
                  <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/30 overflow-hidden">
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                        <MessageSquare className="w-8 h-8 text-primary" />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Brainstorm với AI</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                          Trò chuyện với AI để tìm chủ đề hoàn hảo. 
                          AI sẽ gợi ý dựa trên brand và mục tiêu của bạn.
                        </p>
                      </div>
                      
                      <ul className="text-xs text-muted-foreground space-y-1.5">
                        <li className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          AI hiểu brand của bạn
                        </li>
                        <li className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          Gợi ý phù hợp với mục tiêu: {CONTENT_GOALS.find(g => g.value === formData.contentGoal)?.label || 'Giáo dục'}
                        </li>
                        <li className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          Hỗ trợ refine và điều chỉnh ý tưởng
                        </li>
                      </ul>
                      
                      <Button
                        onClick={() => setShowBrainstormSheet(true)}
                        size="lg"
                        className="w-full max-w-xs gap-2"
                        disabled={isGenerating}
                      >
                        <Sparkles className="w-4 h-4" />
                        Bắt đầu Brainstorm
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Quick Suggestions - Secondary */}
                  <div className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Separator className="flex-1" />
                      <span className="text-xs text-muted-foreground px-2">Gợi ý nhanh</span>
                      <Separator className="flex-1" />
                    </div>
                    
                    <InlineTopicSuggestions
                      brandTemplateId={brandTemplateId}
                      contentGoal={formData.contentGoal || 'education'}
                      onSelectTopic={(topic) => {
                        setFormData(prev => ({ ...prev, topic }));
                        setTopicInputMode('quick');
                      }}
                      disabled={isGenerating}
                      compact
                    />
                  </div>

                  {/* Show selected topic if any */}
                  {formData.topic.trim() && (
                    <Card className="bg-primary/5 border-primary/20 mt-4">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">Chủ đề đã chọn:</p>
                            <p className="text-sm font-medium line-clamp-2">{formData.topic}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTopicInputMode('quick')}
                            className="shrink-0 h-7 px-2 text-xs"
                          >
                            Chỉnh sửa
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
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
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Tạo Core Content</h3>
                        <p className="text-xs text-muted-foreground">Nội dung gốc 800-2000 từ làm nguồn cho đa kênh</p>
                      </div>
                    </div>

                    {/* Optional Settings - Collapsible */}
                    <Collapsible>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
                          <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <Settings2 className="w-4 h-4" />
                            Tuỳ chọn nâng cao
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3 space-y-3">
                        {/* Content Angle */}
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Góc tiếp cận</Label>
                          <Select
                            value={coreContentAngle}
                            onValueChange={(v) => setCoreContentAngle(v as ContentAngle | '__none__')}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Tự động" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Tự động</SelectItem>
                              {CONTENT_ANGLES.map((angle) => (
                                <SelectItem key={angle.value} value={angle.value}>
                                  {angle.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Target Audience */}
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Đối tượng mục tiêu (tuỳ chọn)</Label>
                          <Textarea
                            value={coreContentAudience}
                            onChange={(e) => setCoreContentAudience(e.target.value)}
                            placeholder="VD: Chủ doanh nghiệp SME, 30-45 tuổi..."
                            className="min-h-[60px] text-sm resize-none"
                          />
                        </div>

                        {/* Length Mode Selector - NEW */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Độ dài nội dung</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {CORE_CONTENT_LENGTH_MODES.map((mode) => (
                              <button
                                key={mode.value}
                                type="button"
                                onClick={() => setCoreContentLengthMode(mode.value)}
                                className={cn(
                                  "p-2.5 rounded-lg border text-left transition-all relative",
                                  coreContentLengthMode === mode.value
                                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                    : "border-border/50 hover:bg-muted/30"
                                )}
                              >
                                {mode.recommended && (
                                  <Badge 
                                    variant="outline" 
                                    className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30"
                                  >
                                    Khuyến khích
                                  </Badge>
                                )}
                                <div className="text-sm font-medium">{mode.labelVi}</div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {mode.minWords}-{mode.maxWords} từ
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Auto Research Toggle - NEW */}
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                          <Checkbox
                            id="enable-research"
                            checked={enableResearch}
                            onCheckedChange={(checked) => setEnableResearch(checked === true)}
                          />
                          <div className="flex-1">
                            <label htmlFor="enable-research" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                              <Globe className="w-4 h-4 text-primary" />
                              Tự động nghiên cứu từ internet
                            </label>
                            <p className="text-xs text-muted-foreground">
                              AI tìm kiếm facts và số liệu mới nhất trước khi viết
                            </p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

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
                <Card className="bg-card/50 backdrop-blur-sm border-primary/30">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">Core Content đã tạo</h3>
                          <p className="text-xs text-muted-foreground">{coreContentData.wordCount} từ • Điểm: {coreContentData.qualityScore}/100</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCoreContentPreview(!showCoreContentPreview)}
                          className="gap-1.5 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {showCoreContentPreview ? 'Ẩn' : 'Xem'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCoreContentData(null);
                            setFormData(prev => ({ ...prev, coreContentId: undefined }));
                          }}
                          className="gap-1.5 text-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Tạo lại
                        </Button>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Tiêu đề</p>
                      <p className="font-medium text-sm">{coreContentData.title}</p>
                    </div>

                    {/* Key Messages */}
                    {coreContentData.keyMessages.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Thông điệp chính</p>
                        <div className="flex flex-wrap gap-1.5">
                          {coreContentData.keyMessages.slice(0, 4).map((msg, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {msg}
                            </Badge>
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
              {/* Core Content Summary */}
              {coreContentData && (
                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <BookOpen className="w-5 h-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Core Content</p>
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
                  disabled={isGenerating}
                />
              </div>
            </div>
          )}

          {/* ========== STEP 4: NỘI DUNG ĐA KÊNH ========== */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fade-in">
              {/* Targeting Card */}
              {formData.brandTemplateId && (
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Crosshair className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Nhắm đối tượng</h3>
                        <p className="text-xs text-muted-foreground">Sản phẩm & Persona mục tiêu</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" />
                          Sản phẩm/Dịch vụ
                        </Label>
                        <ProductSelector
                          brandTemplateId={formData.brandTemplateId}
                          value={formData.productId}
                          onValueChange={(productId) => setFormData(prev => ({ ...prev, productId }))}
                          disabled={isGenerating}
                          placeholder="Chọn sản phẩm..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Persona mục tiêu
                        </Label>
                        <PersonaSelector
                          brandTemplateId={formData.brandTemplateId}
                          value={formData.personaId}
                          onValueChange={(personaId) => setFormData(prev => ({ ...prev, personaId }))}
                          disabled={isGenerating}
                        />
                      </div>
                    </div>

                    {/* Content Angle */}
                    <div className="pt-2 border-t border-border/30">
                      <ContentAngleSelector
                        value={formData.contentAngle}
                        onValueChange={(angle) => setFormData(prev => ({ ...prev, contentAngle: angle }))}
                        disabled={isGenerating}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Journey Stage - Collapsible */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <Collapsible>
                  <CollapsibleTrigger className="w-full">
                    <CardContent className="p-5 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Rocket className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">Giai đoạn hành trình</h3>
                            <Badge variant="outline" className="text-[10px]">Nâng cao</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Điều chỉnh messaging theo phễu</p>
                        </div>
                      </div>
                      <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-5 pb-5">
                      <Separator className="mb-4" />
                      <JourneyStageSelector
                        value={formData.journeyStage}
                        onValueChange={(stage) => setFormData(prev => ({ ...prev, journeyStage: stage }))}
                        disabled={isGenerating}
                        showEmotionalTone={true}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Channel Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground font-semibold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Kênh xuất bản
                  </Label>
                  <Badge variant="secondary">
                    {formData.channels.length}/{CHANNELS.length} kênh
                  </Badge>
                </div>

                {/* Quick Select */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={isGenerating}
                    className="text-xs h-8"
                  >
                    <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                    Tất cả
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAll}
                    disabled={isGenerating}
                    className="text-xs h-8"
                  >
                    <Square className="w-3.5 h-3.5 mr-1.5" />
                    Bỏ chọn
                  </Button>
                </div>

                {/* Channel Grid */}
                {channelCategories.map((category) => (
                  <div key={category.key} className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">{category.name}</p>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                      {category.channels.map((channel) => {
                        const hasOverride = brandTemplate?.channel_overrides && 
                          Object.keys(brandTemplate.channel_overrides).includes(channel.value);
                        return (
                          <Tooltip key={channel.value}>
                            <TooltipTrigger asChild>
                              <label
                                className={cn(
                                  "flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all",
                                  formData.channels.includes(channel.value)
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border/50 hover:border-border',
                                  isGenerating && 'opacity-50 cursor-not-allowed'
                                )}
                              >
                                <Checkbox
                                  checked={formData.channels.includes(channel.value)}
                                  onCheckedChange={() => handleChannelToggle(channel.value)}
                                  disabled={isGenerating}
                                  className="w-4 h-4"
                                />
                                <span className="text-primary">
                                  {channelIcons[channel.value]}
                                </span>
                                <span className="text-sm truncate flex-1">{channel.label}</span>
                                {hasOverride && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-purple-300 text-purple-600 dark:border-purple-700 dark:text-purple-400">
                                    <Settings2 className="w-2.5 h-2.5 mr-0.5" />
                                  </Badge>
                                )}
                              </label>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px]">
                              <p className="text-xs">{channel.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quality Mode Selector */}
              <QualityModeQuickSelector
                value={formData.qualityMode || 'balanced'}
                onChange={(mode) => setFormData(prev => ({ ...prev, qualityMode: mode }))}
                disabled={isGenerating}
                brandTemplateId={brandTemplateId}
                selectedChannels={formData.channels}
                showBrandHints={true}
              />

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

              {/* Footer Info Option */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Thông tin liên hệ (Footer)</h3>
                        <p className="text-xs text-muted-foreground">Tự động thêm hotline, email, website vào cuối bài</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {brandTemplateId && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-muted-foreground hover:text-primary"
                              asChild
                            >
                              <Link to="/brands/new" state={{ editTemplate: { id: brandTemplateId }, focusFooterInfo: true }}>
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Sửa
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Chỉnh sửa thông tin liên hệ của thương hiệu</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Checkbox
                        id="includeFooterInfo"
                        checked={formData.includeFooterInfo !== false}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, includeFooterInfo: checked as boolean }))
                        }
                        disabled={isGenerating}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estimated Time */}
              {formData.channels.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="w-4 h-4" />
                  <span>
                    Ước tính: ~{formData.qualityMode === 'fast' 
                      ? Math.round(estimatedTime * 0.6) 
                      : formData.qualityMode === 'quality' 
                        ? Math.round(estimatedTime * 1.3) 
                        : estimatedTime} giây
                    {formData.qualityMode === 'fast' && <Badge variant="outline" className="ml-2 text-[10px]">Nhanh hơn 40%</Badge>}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Progress Indicator - Show when on Step 3/4 and Core Content generating */}
        {currentStep > 2 && isGeneratingCoreContent && (
          <div className="fixed bottom-24 right-4 z-50 animate-fade-in">
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
              <span>{currentStep}/4</span>
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
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isGenerating || pendingMultiChannelGeneration || !formData.topic.trim() || formData.channels.length === 0}
                className={cn(
                  "gap-2 gradient-primary min-w-[180px]",
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
            )}
          </div>
        </div>

        {/* Brainstorm Sheet */}
        <TopicBrainstormSheet
          open={showBrainstormSheet}
          onOpenChange={setShowBrainstormSheet}
          brandTemplateId={formData.brandTemplateId}
          contentGoal={formData.contentGoal}
          onSelectTopic={(topic) => {
            setFormData(prev => ({ ...prev, topic }));
            toast.success('Đã chọn chủ đề từ AI!');
          }}
        />

        {/* Background Tasks Indicator - shows tasks that continue when user navigates away */}
        <ActiveTasksIndicator
          tasks={activeTasks}
          pendingQueue={pendingQueueItems}
          onDismiss={dismissTask}
          onTaskClick={handleTaskClick}
          onCancelPending={handleCancelPending}
        />

        {/* Core Content Preview Popup */}
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
      </div>
    </TooltipProvider>
  );
}
