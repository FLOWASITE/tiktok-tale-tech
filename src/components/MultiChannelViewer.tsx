import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Copy, Check, Download, Globe, Facebook, Instagram, MapPin, RefreshCw, Loader2, Pencil, Save, X, Sparkles, Minus, Smile, Target, Briefcase, Undo2, Redo2, Eye, Code, Linkedin, Mail, Youtube, Send, ImagePlus, Images, ChevronDown, CalendarClock, Users, Music2, AtSign, GitCompare, TrendingUp, PanelLeftClose, ChevronRight, Wand2, Plus, Type, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ZaloIcon, XIcon } from '@/components/icons/SocialIcons';
import { TopicPerformanceUpdater } from '@/components/topic/TopicPerformanceUpdater';
import { DirectPublishButton } from '@/components/social/DirectPublishButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChannelImageHistory } from '@/components/multichannel/ChannelImageHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogPortal,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MultiChannelContent, Channel, CONTENT_GOALS, CONTENT_STATUSES, ChannelImage, ContentStatus } from '@/types/multichannel';
import { DEFAULT_CHANNEL_SETTINGS, ChannelSettings, getChannelLengthDisplay } from '@/types/channelSettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useDraft } from '@/hooks/useDraft';
import { useContentAnalysis } from '@/hooks/useContentAnalysis';
import { useContentLearning } from '@/hooks/useContentLearning';
import { useContentValidation, ValidationResult } from '@/hooks/useContentValidation';
import { MarkdownToolbar } from '@/components/MarkdownToolbar';
import { ContentLengthIndicator } from '@/components/ContentLengthIndicator';
import { ChannelRulesPanel } from '@/components/ChannelRulesPanel';
import { SmartQuickActions } from '@/components/SmartQuickActions';
import { useSocialImageGeneration } from '@/hooks/useSocialImageGeneration';
import { ChannelImagesGallery } from '@/components/ChannelImagesGallery';
import { SchedulePanel } from '@/components/SchedulePanel';
import { TeamWorkPanel } from '@/components/TeamWorkPanel';
import { AssignmentDialog } from '@/components/AssignmentDialog';
import { ApprovalHistory } from '@/components/ApprovalHistory';
import { useCreatorProfiles } from '@/hooks/useCreatorProfiles';
import { CreatorCell } from '@/components/CreatorCell';
import { AssignedApproverInfo } from '@/components/AssignedApproverInfo';
import { IndustryGuardrailBadge } from '@/components/IndustryGuardrailBadge';
import { ContentValidationDialog } from '@/components/ContentValidationDialog';
import { useIndustryMemoryForBrand } from '@/hooks/useIndustryMemory';
import { useContentVersionCheck } from '@/hooks/useIndustryUpgradeCheck';
import { VersionOutdatedBadge } from '@/components/VersionUpgradeAlert';
// New viewer components
import { ContentMockupToggle } from '@/components/viewer/ContentMockupToggle';
import { QuickChannelNav } from '@/components/viewer/QuickChannelNav';
import { EnhancedExportMenu } from '@/components/viewer/EnhancedExportMenu';
import { ChannelComparison } from '@/components/viewer/ChannelComparison';
import { ContentAnalyticsPanel } from '@/components/viewer/ContentAnalyticsPanel';
import { ActivityTimeline } from '@/components/viewer/ActivityTimeline';
import { AIContentSummary } from '@/components/viewer/AIContentSummary';
import { ContentQualityScore } from '@/components/ContentQualityScore';
import { WebsiteSEOPreview } from '@/components/viewer/WebsiteSEOPreview';
import { SimpleImageGenerator, ImageGenProgressInfo } from '@/components/multichannel/SimpleImageGenerator';
import { FloatingImageProgress } from '@/components/multichannel/FloatingImageProgress';
import { ExpandChannelsStreamingDialog } from '@/components/multichannel/ExpandChannelsStreamingDialog';
import { RegenerateStreamingOverlay } from '@/components/multichannel/streaming/RegenerateStreamingOverlay';
import { useStreamingRegenerate } from '@/hooks/useStreamingRegenerate';
import { ImageLightbox, LightboxImage } from '@/components/ui/ImageLightbox';
import { useBackgroundEditor } from '@/hooks/useBackgroundEditor';
import { CoreContentSourceBadge } from '@/components/viewer/CoreContentSourceBadge';
import { CoreContentViewer } from '@/components/core-content/CoreContentViewer';
import type { CoreContent } from '@/types/coreContent';
import { GEOScorePanel } from '@/components/geo/GEOScorePanel';
import { useGEOContentScore } from '@/hooks/useGEOContentScore';
import { calculateSEOScore } from '@/utils/seoScoreCalculator';

import { useQueryClient } from '@tanstack/react-query';

import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface MultiChannelViewerProps {
  content: MultiChannelContent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegenerate?: (contentId: string, channel: Channel) => Promise<MultiChannelContent | null>;
  onUpdateContent?: (contentId: string, channel: Channel, newContent: string) => Promise<MultiChannelContent | null>;
  onAIEdit?: (contentId: string, channel: Channel, instruction: string, currentContent: string) => Promise<string | null>;
  onUpdateTitleTopic?: (contentId: string, title: string, topic: string) => Promise<MultiChannelContent | null>;
  onSaveChannelImage?: (contentId: string, channel: Channel, imageData: ChannelImage) => Promise<MultiChannelContent | void>;
  onDeleteChannelImage?: (contentId: string, channel: Channel) => Promise<MultiChannelContent | void>;
  onUpdateChannelStatus?: (contentId: string, channel: Channel, status: ContentStatus) => Promise<MultiChannelContent | null>;
  onExpandChannels?: (contentId: string, newChannels: Channel[]) => Promise<MultiChannelContent | null>;
  /** Notify parent to update the viewer content object (e.g., after expanding channels). */
  onContentUpdated?: (content: MultiChannelContent) => void;
  regeneratingChannel?: string | null;
  aiEditingChannel?: string | null;
  expandingChannels?: boolean;
}

const channelConfig: Record<Channel, { 
  label: string; 
  shortLabel: string;
  icon: React.ReactNode; 
  color: string;
  bgColor: string;
  maxLength?: string;
}> = {
  website: { 
    label: 'Website/Blog', 
    shortLabel: 'Web',
    icon: <Globe className="w-3.5 h-3.5 xs:w-4 xs:h-4" />, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    maxLength: '800-1500 chữ'
  },
  facebook: { 
    label: 'Facebook', 
    shortLabel: 'FB',
    icon: <Facebook className="w-3.5 h-3.5 xs:w-4 xs:h-4" />, 
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    maxLength: '120-300 chữ'
  },
  instagram: { 
    label: 'Instagram', 
    shortLabel: 'IG',
    icon: <Instagram className="w-3.5 h-3.5 xs:w-4 xs:h-4" />, 
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    maxLength: '50-150 chữ'
  },
  twitter: { 
    label: 'X (Twitter)', 
    shortLabel: 'X',
    icon: <XIcon className="w-3.5 h-3.5 xs:w-4 xs:h-4" />, 
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    maxLength: 'Thread 5-7 tweets'
  },
  google_maps: { 
    label: 'Google Maps', 
    shortLabel: 'Maps',
    icon: <MapPin className="w-3.5 h-3.5 xs:w-4 xs:h-4" />, 
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    maxLength: '80-150 chữ'
  },
  linkedin: { 
    label: 'LinkedIn', 
    shortLabel: 'LI',
    icon: <Linkedin className="w-3.5 h-3.5 xs:w-4 xs:h-4" />, 
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    maxLength: '150-400 chữ'
  },
  email: { 
    label: 'Email', 
    shortLabel: 'Mail',
    icon: <Mail className="w-3.5 h-3.5 xs:w-4 xs:h-4" />, 
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    maxLength: '150-400 chữ'
  },
  youtube: { 
    label: 'YouTube', 
    shortLabel: 'YT',
    icon: <Youtube className="w-3.5 h-3.5 xs:w-4 xs:h-4" />, 
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    maxLength: 'Script 3-5 phút'
  },
  zalo_oa: { 
    label: 'Zalo OA', 
    shortLabel: 'Zalo',
    icon: <ZaloIcon className="w-3.5 h-3.5 xs:w-4 xs:h-4" />, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    maxLength: '60-150 chữ'
  },
  telegram: { 
    label: 'Telegram', 
    shortLabel: 'TG',
    icon: <Send className="w-3.5 h-3.5 xs:w-4 xs:h-4" />, 
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    maxLength: '100-500 chữ'
  },
  tiktok: { 
    label: 'TikTok', 
    shortLabel: 'TT',
    icon: <Music2 className="w-3.5 h-3.5 xs:w-4 xs:h-4" />, 
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    maxLength: '50-150 chữ'
  },
  threads: { 
    label: 'Threads', 
    shortLabel: 'Th',
    icon: <AtSign className="w-3.5 h-3.5 xs:w-4 xs:h-4" />, 
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    maxLength: 'Tối đa 500 ký tự'
  },
};

import { analyzeContent } from '@/hooks/useContentAnalysis';

// Brand Voice Apply instruction
const APPLY_BRAND_VOICE_INSTRUCTION = "Viết lại toàn bộ nội dung theo đúng Brand Voice profile đã cấu hình: giữ nguyên ý chính nhưng điều chỉnh giọng điệu, phong cách ngôn ngữ, mức độ formal, và tuân thủ các từ ưu tiên/từ cấm theo brand guidelines";

function getContentForChannel(content: MultiChannelContent, channel: Channel): string | null {
  switch (channel) {
    case 'website': return content.website_content;
    case 'facebook': return content.facebook_content;
    case 'instagram': return content.instagram_content;
    case 'twitter': return content.twitter_content;
    case 'google_maps': return content.google_maps_content;
    case 'linkedin': return content.linkedin_content;
    case 'email': return content.email_content;
    case 'youtube': return content.youtube_content;
    case 'zalo_oa': return content.zalo_oa_content;
    case 'telegram': return content.telegram_content;
    case 'tiktok': return content.tiktok_content;
    case 'threads': return content.threads_content;
    default: return null;
  }
}

function countWords(text: string | null | undefined): number {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countCharacters(text: string | null | undefined): number {
  if (!text || typeof text !== 'string') return 0;
  return text.length;
}

export function MultiChannelViewer({ 
  content, 
  open, 
  onOpenChange, 
  onRegenerate,
  onUpdateContent,
  onAIEdit,
  onUpdateTitleTopic,
  onSaveChannelImage,
  onDeleteChannelImage,
  onUpdateChannelStatus,
  onExpandChannels,
  onContentUpdated,
  regeneratingChannel,
  aiEditingChannel,
  expandingChannels,
}: MultiChannelViewerProps) {
  const { currentOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const [copiedChannel, setCopiedChannel] = useState<Channel | null>(null);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [showDraftRestorePrompt, setShowDraftRestorePrompt] = useState(false);
  // Unified image generator state (replaces imageEditorOpen + imageEditorChannel)
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [activeImageChannel, setActiveImageChannel] = useState<Channel | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<Channel, string>>({} as Record<Channel, string>);
  const [showGallery, setShowGallery] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showGeoScore, setShowGeoScore] = useState(false);
  const { data: geoScoreData, isLoading: isGEOQueryLoading } = useGEOContentScore(content?.id ?? '');
  const [isGEOScoring, setIsGEOScoring] = useState(false);
  const geoAutoTriggeredRef = useRef(false);
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  const [deletingImageChannel, setDeletingImageChannel] = useState<Channel | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [lightboxChannel, setLightboxChannel] = useState<Channel | null>(null);
  const { editBackground, isProcessing: isRefiningText } = useBackgroundEditor();
  const [isImageGenMinimized, setIsImageGenMinimized] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState<ImageGenProgressInfo | null>(null);

  // Reset panel states when dialog opens to always start at mockup view
  useEffect(() => {
    if (open) {
      setShowGallery(false);
      setShowSchedule(false);
      setShowTeamPanel(false);
      setShowGeoScore(false);
      geoAutoTriggeredRef.current = false;
    }
  }, [open]);

  // Auto-trigger GEO score when opening viewer for content without score
  useEffect(() => {
    if (!open || !content?.id || !currentOrganization?.id || isGEOQueryLoading) return;
    if (geoScoreData != null || geoAutoTriggeredRef.current) return;
    
    // Collect all channel texts
    const channels = content.selected_channels || [];
    const allTexts = channels.map(ch => getContentForChannel(content, ch)).filter(Boolean) as string[];
    const combinedText = allTexts.join('\n\n---\n\n');
    if (combinedText.length < 50) return;
    
    geoAutoTriggeredRef.current = true;
    setIsGEOScoring(true);
    
    supabase.functions.invoke('geo-score-content', {
      body: {
        contentId: content.id,
        contentType: 'multi_channel',
        contentText: combinedText.substring(0, 6000),
        organizationId: currentOrganization.id,
      },
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['geo-content-score', content.id] });
    }).catch(err => {
      console.error('Auto GEO score failed:', err);
    }).finally(() => {
      setIsGEOScoring(false);
    });
  }, [open, content?.id, currentOrganization?.id, geoScoreData, isGEOQueryLoading]);

  // Manual GEO trigger callback
  const handleTriggerGEO = useCallback(() => {
    if (!content?.id || !currentOrganization?.id || isGEOScoring) return;
    
    const channels = content.selected_channels || [];
    const allTexts = channels.map(ch => getContentForChannel(content, ch)).filter(Boolean) as string[];
    const combinedText = allTexts.join('\n\n---\n\n');
    if (combinedText.length < 50) {
      toast({ title: 'Nội dung quá ngắn', description: 'Cần ít nhất 50 ký tự để chấm GEO', variant: 'destructive' });
      return;
    }
    
    setIsGEOScoring(true);
    supabase.functions.invoke('geo-score-content', {
      body: {
        contentId: content.id,
        contentType: 'multi_channel',
        contentText: combinedText.substring(0, 6000),
        organizationId: currentOrganization.id,
      },
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['geo-content-score', content.id] });
      toast({ title: 'Đã chấm GEO', description: 'Điểm GEO đã được cập nhật' });
    }).catch(err => {
      console.error('Manual GEO score failed:', err);
      toast({ title: 'Lỗi chấm GEO', description: 'Vui lòng thử lại sau', variant: 'destructive' });
    }).finally(() => {
      setIsGEOScoring(false);
    });
  }, [content, currentOrganization?.id, isGEOScoring, queryClient]);

  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentChannel, setAssignmentChannel] = useState<Channel | null>(null);
  const [showMockupView, setShowMockupView] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showImageHistory, setShowImageHistory] = useState(false);
  const [historyChannel, setHistoryChannel] = useState<Channel | null>(null);
  const [showExpandDialog, setShowExpandDialog] = useState(false);
  const [viewingCoreContent, setViewingCoreContent] = useState<CoreContent | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Edit Title/Topic state
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [isSavingHeader, setIsSavingHeader] = useState(false);

  // Content validation state
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [pendingSaveChannel, setPendingSaveChannel] = useState<Channel | null>(null);
  const [pendingSaveContent, setPendingSaveContent] = useState<string>('');

  // Content validation hook
  const { validateContent, hasIndustryRules } = useContentValidation(content?.brand_template_id);

  // Streaming regenerate hook
  const {
    regenerate: streamingRegenerate,
    cancel: cancelStreamingRegenerate,
    streamingText: regenerateStreamingText,
    isRegenerating: isStreamingRegenerating,
    regeneratingChannel: streamingRegeneratingChannel,
    progress: regenerateProgress,
  } = useStreamingRegenerate({
    onComplete: (channel, newContent) => {
      // Refresh content after regeneration completes
      if (onUpdateContent && content) {
        onUpdateContent(content.id, channel, newContent);
      }
    },
    onError: (error) => {
      toast({
        title: '❌ Lỗi tạo lại',
        description: error,
        variant: 'destructive',
      });
    },
  });

  // Undo/Redo hook for edit content
  const {
    value: editContent,
    set: setEditContent,
    undo,
    redo,
    reset: resetEditContent,
    clear: clearHistory,
    canUndo,
    canRedo,
    historyCount,
  } = useUndoRedo('');

  // Draft auto-save hook - use stable id
  const contentId = content?.id || null;
  const {
    hasDraft,
    lastSaved: draftLastSaved,
    isSaving: isDraftSaving,
    loadDraft,
    saveDraft,
    clearDraft,
  } = useDraft(contentId, editingChannel);

  // Auto-save draft when editing
  useEffect(() => {
    if (editingChannel && editContent) {
      saveDraft(editContent);
    }
  }, [editContent, editingChannel, saveDraft]);

  // Reset state when dialog closes or content changes
  useEffect(() => {
    if (!open) {
      setEditingChannel(null);
      resetEditContent('');
      setAiPrompt('');
      setPreviewContent(null);
      setShowMarkdownPreview(false);
      setShowDraftRestorePrompt(false);
      setIsEditingHeader(false);
      setEditTitle('');
      setEditTopic('');
    }
  }, [open, resetEditContent]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editingChannel) return;
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingChannel, undo, redo]);

  // Early return after all hooks
  // Fetch creator profile
  const { profiles, isLoading: isLoadingProfile } = useCreatorProfiles([content?.user_id]);
  const creatorProfile = content?.user_id ? profiles[content.user_id] : undefined;

  // Fetch Industry Memory for brand template
  const { data: industryMemory, isLoading: isLoadingIndustry } = useIndustryMemoryForBrand(content?.brand_template_id);

  // Fetch brand template for logo URL and channel overrides
  const { data: brandTemplateData } = useQuery({
    queryKey: ['brand-template-viewer', content?.brand_template_id],
    queryFn: async () => {
      if (!content?.brand_template_id) return null;
      const { data } = await supabase
        .from('brand_templates')
        .select('logo_url, channel_overrides')
        .eq('id', content.brand_template_id)
        .single();
      return data;
    },
    enabled: !!content?.brand_template_id,
  });
  
  const brandLogoUrl = brandTemplateData?.logo_url || null;
  const channelOverrides = brandTemplateData?.channel_overrides as Record<string, Partial<ChannelSettings>> | null;

  // Check for industry version upgrade
  const { isOutdated: hasVersionUpgrade, latestVersion, industryName: upgradeIndustryName } = useContentVersionCheck(
    content?.industry_template_version,
    industryMemory?.id
  );

  // Content learning hook - track user edits for brand learning
  const { trackEdit } = useContentLearning();

  // State for selected channel in new layout - must be before early return
  const safeChannels = Array.isArray(content?.selected_channels) ? content.selected_channels : [];
  const [selectedChannel, setSelectedChannel] = useState<Channel>(safeChannels[0] || 'facebook');
  
  // Sync selectedChannel when content changes (e.g., opening different content)
  useEffect(() => {
    if (safeChannels.length > 0 && !safeChannels.includes(selectedChannel)) {
      setSelectedChannel(safeChannels[0]);
    }
  }, [content?.id, safeChannels]);

  if (!content) return null;

  const goalLabel = CONTENT_GOALS.find(g => g.value === content.content_goal)?.label || content.content_goal;

  // Header edit handlers
  const handleStartEditHeader = () => {
    setEditTitle(content.title);
    setEditTopic(content.topic);
    setIsEditingHeader(true);
  };

  const handleCancelEditHeader = () => {
    setIsEditingHeader(false);
    setEditTitle('');
    setEditTopic('');
  };

  const handleSaveHeader = async () => {
    if (!onUpdateTitleTopic || isSavingHeader) return;
    if (!editTitle.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Tiêu đề không được để trống',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSavingHeader(true);
    try {
      await onUpdateTitleTopic(content.id, editTitle.trim(), editTopic.trim());
      setIsEditingHeader(false);
    } finally {
      setIsSavingHeader(false);
    }
  };

  const handleCopy = async (channel: Channel) => {
    const text = editingChannel === channel ? editContent : getContentForChannel(content, channel);
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedChannel(channel);
      setTimeout(() => setCopiedChannel(null), 2000);
      toast({
        title: 'Đã copy',
        description: `Nội dung ${channelConfig[channel].label} đã được copy`,
      });
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể copy nội dung',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerate = async (channel: Channel) => {
    if (isStreamingRegenerating || regeneratingChannel) return;
    setEditingChannel(null);
    setPreviewContent(null);
    // Use streaming regenerate for real-time feedback
    await streamingRegenerate(content.id, channel);
  };

  const handleStartEdit = (channel: Channel) => {
    const currentContent = getContentForChannel(content, channel) || '';
    
    // Check for existing draft
    const draft = loadDraft();
    if (draft && draft !== currentContent) {
      setShowDraftRestorePrompt(true);
      resetEditContent(currentContent);
    } else {
      resetEditContent(currentContent);
    }
    
    setEditingChannel(channel);
    setPreviewContent(null);
    setAiPrompt('');
  };

  const handleRestoreDraft = () => {
    const draft = loadDraft();
    if (draft) {
      resetEditContent(draft);
      setShowDraftRestorePrompt(false);
      toast({
        title: 'Đã khôi phục bản nháp',
        description: 'Nội dung đã được khôi phục từ bản lưu tự động',
      });
    }
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftRestorePrompt(false);
  };

  const handleCancelEdit = () => {
    if (previewContent) {
      // If previewing, go back to original content in edit mode
      setPreviewContent(null);
      resetEditContent(getContentForChannel(content, editingChannel!) || '');
    } else {
      setEditingChannel(null);
      resetEditContent('');
      setAiPrompt('');
      clearDraft();
    }
  };

  const handleSaveEdit = async (channel: Channel) => {
    if (!onUpdateContent || isSaving) return;
    
    const contentToSave = previewContent || editContent;
    
    // Validate content if industry rules exist
    if (hasIndustryRules) {
      const result = validateContent(contentToSave, channel);
      
      if (result.hasErrors || result.hasWarnings) {
        // Show validation dialog
        setValidationResult(result);
        setPendingSaveChannel(channel);
        setPendingSaveContent(contentToSave);
        setShowValidationDialog(true);
        return;
      }
    }
    
    // No validation issues or no industry rules - save directly
    await executeSave(channel, contentToSave);
  };

  const executeSave = async (channel: Channel, contentToSave: string) => {
    if (!onUpdateContent) return;
    
    // Get original content for learning tracking
    const originalContent = getContentForChannel(content, channel) || '';
    
    setIsSaving(true);
    try {
      const updated = await onUpdateContent(content.id, channel, contentToSave);
      if (updated) {
        // Track edit for content learning (fire and forget)
        if (originalContent && contentToSave !== originalContent) {
          trackEdit({
            channel,
            contentType: 'multichannel',
            originalContent,
            editedContent: contentToSave,
            contentId: content.id,
            brandTemplateId: content.brand_template_id || undefined,
          }).catch(err => console.warn('[learning] Failed to track edit:', err));
        }
        
        // GEO scoring is now handled centrally in useMultiChannelContents hook

        setEditingChannel(null);
        resetEditContent('');
        setPreviewContent(null);
        setAiPrompt('');
        clearDraft(); // Clear draft after successful save
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidationConfirm = async () => {
    setShowValidationDialog(false);
    if (pendingSaveChannel && pendingSaveContent) {
      await executeSave(pendingSaveChannel, pendingSaveContent);
    }
    setPendingSaveChannel(null);
    setPendingSaveContent('');
    setValidationResult(null);
  };

  const handleValidationCancel = () => {
    setShowValidationDialog(false);
    setPendingSaveChannel(null);
    setPendingSaveContent('');
    setValidationResult(null);
  };

  const handleAIEdit = async (channel: Channel, instruction: string) => {
    if (!onAIEdit || aiEditingChannel) return;
    
    const currentContent = previewContent || editContent;
    if (!currentContent.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Không có nội dung để chỉnh sửa',
        variant: 'destructive',
      });
      return;
    }

    const result = await onAIEdit(content.id, channel, instruction, currentContent);
    if (result) {
      setPreviewContent(result);
      setAiPrompt('');
    }
  };

  const handleApplyPreview = () => {
    if (previewContent) {
      setEditContent(previewContent);
      setPreviewContent(null);
    }
  };

  const handleExportAll = () => {
    let exportContent = `# ${content.title}\n`;
    exportContent += `Chủ đề: ${content.topic}\n`;
    exportContent += `Mục tiêu: ${goalLabel}\n`;
    exportContent += `Brand: ${content.brand_name}\n`;
    exportContent += `\n---\n\n`;

    (content.selected_channels || []).forEach((channel) => {
      const channelContent = getContentForChannel(content, channel);
      if (channelContent) {
        exportContent += `## ${channelConfig[channel].label}\n\n`;
        exportContent += channelContent;
        exportContent += `\n\n---\n\n`;
      }
    });

    const blob = new Blob([exportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Đã xuất file',
      description: 'File markdown đã được tải xuống',
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[98vw] h-[95vh] max-h-[95vh] p-0 overflow-hidden flex flex-col [&>button.absolute]:hidden">
        {/* Premium 2-Row Header */}
        <DialogHeader className="shrink-0">
          {/* Row 1: Primary Info Bar */}
          <div className="px-4 py-3 border-b border-border/30 bg-gradient-to-r from-card via-card to-muted/20 backdrop-blur-sm relative">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Close Button */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>

                {/* Brand Identity Card */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/30 shrink-0">
                  {brandLogoUrl ? (
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-md rounded-md" />
                      <img src={brandLogoUrl} alt="" className="w-6 h-6 rounded-md object-cover relative z-10" />
                    </div>
                  ) : (
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-sm hidden sm:inline">{content.brand_name}</span>
                </div>

                {/* Separator */}
                <div className="h-6 w-px bg-border/50 hidden sm:block" />

                {/* Title with edit */}
                {isEditingHeader ? (
                  <div className="flex items-center gap-3 flex-1">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Tiêu đề..."
                      className="max-w-xs h-8 text-sm font-semibold"
                      autoFocus
                    />
                    <Input
                      value={editTopic}
                      onChange={(e) => setEditTopic(e.target.value)}
                      placeholder="Chủ đề..."
                      className="max-w-md h-8 text-sm"
                    />
                    <Button size="sm" onClick={handleSaveHeader} disabled={isSavingHeader || !editTitle.trim()} className="h-8">
                      {isSavingHeader ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEditHeader} disabled={isSavingHeader} className="h-8">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group min-w-0">
                    <DialogTitle className="text-base font-bold truncate max-w-[300px] lg:max-w-[400px]">
                      {content.title}
                    </DialogTitle>
                    {onUpdateTitleTopic && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={handleStartEditHeader}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Right: Badges */}
              {!isEditingHeader && (
                <div className="flex items-center gap-2 shrink-0">
                  {/* Goal Badge - Prominent */}
                  <Badge className="bg-primary/10 text-primary border-primary/20 gap-1.5 shrink-0">
                    <Target className="w-3 h-3" />
                    {goalLabel}
                  </Badge>

                  {/* Core Content Source Badge - Hidden on mobile, shown in sidebar instead */}
                  {content.core_content_id && (
                    <CoreContentSourceBadge
                      coreContentId={content.core_content_id}
                      className="hidden md:flex"
                      onViewSource={(coreContent) => setViewingCoreContent(coreContent)}
                    />
                  )}

                  {/* Quality Score */}
                  {content.critique_score && (
                    <ContentQualityScore
                      score={content.critique_score}
                      critiqueDetails={content.critique_details}
                      wasRefined={content.was_refined ?? false}
                      refinementCount={content.refinement_count ?? 0}
                      variant="badge"
                    />
                  )}

                  {/* Industry Badge - Compact */}
                  <IndustryGuardrailBadge 
                    industryMemory={industryMemory} 
                    isLoading={isLoadingIndustry}
                    className="hidden md:flex"
                  />

                  {/* Version Upgrade Badge */}
                  {hasVersionUpgrade && latestVersion && (
                    <VersionOutdatedBadge
                      currentVersion={content.industry_template_version || '1.0'}
                      latestVersion={latestVersion}
                      className="hidden md:flex"
                    />
                  )}
                </div>
              )}
            </div>
            {/* Gradient bottom border */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          </div>

          {/* Row 2: Actions & Navigation Bar */}
          {!isEditingHeader && (
            <div className="px-4 py-2 border-b border-border/50 bg-muted/10 flex items-center justify-between gap-3">
              {/* Left: Quick Channel Navigation */}
              <div className="flex items-center gap-3">
                <QuickChannelNav
                  channels={content.selected_channels || []}
                  activeChannel={selectedChannel}
                  onChannelChange={setSelectedChannel}
                />
                
                {/* Channel count indicator */}
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                  {(content.selected_channels || []).indexOf(selectedChannel) + 1} / {(content.selected_channels || []).length} kênh
                </Badge>
              </div>

              {/* Right: Grouped Actions */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {/* Secondary Actions Group */}
                <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-background/50 border border-border/30 flex-shrink-0">
                  {/* Channel Comparison */}
                  <ChannelComparison content={content} channelConfig={channelConfig} />
                  
                  {/* Team Panel Toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant={showTeamPanel ? "secondary" : "ghost"} 
                        size="icon"
                        onClick={() => { setShowTeamPanel(!showTeamPanel); setShowGallery(false); setShowSchedule(false); setShowGeoScore(false); }}
                        className="h-8 w-8"
                      >
                        <Users className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Team</TooltipContent>
                  </Tooltip>
                  
                  {/* Gallery Toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant={showGallery ? "secondary" : "ghost"} 
                        size="icon"
                        onClick={() => { setShowGallery(!showGallery); setShowSchedule(false); setShowTeamPanel(false); setShowGeoScore(false); }}
                        className="h-8 w-8 relative"
                      >
                        <Images className="w-4 h-4" />
                        {Object.keys(content.channel_images || {}).length > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                            {Object.keys(content.channel_images || {}).length}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Gallery</TooltipContent>
                  </Tooltip>
                  
                  {/* Schedule Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant={showSchedule ? "secondary" : "ghost"} 
                        size="icon"
                        onClick={() => { setShowSchedule(!showSchedule); setShowGallery(false); setShowTeamPanel(false); setShowGeoScore(false); }}
                        className="h-8 w-8"
                      >
                        <CalendarClock className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Lịch đăng</TooltipContent>
                  </Tooltip>

                  {/* GEO Score Toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant={showGeoScore ? "secondary" : "ghost"} 
                        size="icon"
                        onClick={() => { setShowGeoScore(!showGeoScore); setShowGallery(false); setShowSchedule(false); setShowTeamPanel(false); }}
                        className="h-8 w-8"
                      >
                        <Zap className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>GEO Score</TooltipContent>
                  </Tooltip>

                  {content.status === 'published' && (
                    <TopicPerformanceUpdater
                      contentId={content.id}
                      onUpdate={() => {}}
                      trigger={
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <TrendingUp className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Hiệu suất</TooltipContent>
                        </Tooltip>
                      }
                    />
                  )}
                </div>

                {/* Separator */}
                <div className="h-6 w-px bg-border/30 mx-1 flex-shrink-0" />

                {/* AI Actions */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setActiveImageChannel(null); setShowImageGenerator(true); }}
                  className="h-8 gap-1.5 border-primary/30 hover:border-primary hover:bg-primary/5 flex-shrink-0"
                >
                  <Wand2 className="w-4 h-4" />
                  <span className="hidden lg:inline">Tạo ảnh AI</span>
                </Button>

                {/* Expand Channels */}
                {onExpandChannels && (() => {
                  const ALL_CHANNELS: Channel[] = ['website', 'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'email', 'google_maps', 'zalo_oa', 'telegram', 'tiktok', 'threads'];
                  const safeSelectedChannels = content?.selected_channels ?? [];
                  const availableChannelsCount = ALL_CHANNELS.filter(ch => !safeSelectedChannels.includes(ch)).length;
                  
                  return availableChannelsCount > 0 ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowExpandDialog(true)}
                      disabled={expandingChannels}
                      className="h-8 gap-1.5 border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                    >
                      {expandingChannels ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span className="hidden lg:inline">Thêm kênh</span>
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {availableChannelsCount}
                      </Badge>
                    </Button>
                  ) : null;
                })()}

                {/* Export Menu - Primary */}
                <EnhancedExportMenu content={content} channelConfig={channelConfig} currentChannel={selectedChannel} />
              </div>
            </div>
          )}
        </DialogHeader>

        {showTeamPanel ? (
          <div className="p-6 space-y-6">
            <TeamWorkPanel 
              contentId={content.id} 
              onClose={() => setShowTeamPanel(false)} 
            />
            
            {/* Approval History */}
            <ApprovalHistory 
              contentId={content.id} 
              maxHeight="250px"
            />
          </div>
        ) : showSchedule ? (
          <div className="p-6">
            <SchedulePanel content={content} onBack={() => setShowSchedule(false)} />
          </div>
        ) : showGeoScore ? (
          <div className="p-6">
            <GEOScorePanel
              contentId={content.id}
              contentType="multi_channel"
              contentText={getContentForChannel(content, selectedChannel) || content.website_content || ''}
              organizationId={currentOrganization?.id || ''}
            />
          </div>
        ) : showGallery ? (
          <div className="p-6">
            <ChannelImagesGallery
              channelImages={content.channel_images || {}}
              selectedChannels={content.selected_channels || []}
              onDeleteImage={onDeleteChannelImage ? async (channel) => {
                setDeletingImageChannel(channel);
                try {
                  await onDeleteChannelImage(content.id, channel);
                } finally {
                  setDeletingImageChannel(null);
                }
              } : undefined}
              isDeleting={deletingImageChannel}
            />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden relative">
            {/* Nút mở lại sidebar khi đã đóng */}
            {sidebarCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(false)}
                className="absolute left-2 top-4 z-10 bg-background/80 backdrop-blur-sm border shadow-sm h-8 w-8 p-0"
                title="Mở sidebar kênh"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}

            {/* Channel Sidebar */}
            <div className={cn(
              "border-r border-border/50 bg-muted/20 flex flex-col shrink-0 transition-all duration-300 overflow-hidden",
              sidebarCollapsed 
                ? "w-0 opacity-0" 
                : "w-44"
            )}>
              {/* Sidebar Header với nút đóng */}
              <div className="p-2 border-b border-border/30 flex items-center justify-between shrink-0">
                <span className="text-xs font-medium text-muted-foreground">Kênh</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setSidebarCollapsed(true)}
                  title="Thu gọn sidebar"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </Button>
              </div>
              
              {/* Core Content Access - Mobile friendly */}
              {content.core_content_id && (
                <div className="p-2 border-b border-border/30">
                  <CoreContentSourceBadge
                    coreContentId={content.core_content_id}
                    className="w-full justify-center"
                    onViewSource={(coreContent) => setViewingCoreContent(coreContent)}
                  />
                </div>
              )}
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {(content?.selected_channels ?? []).map((channel) => {
                    const config = channelConfig[channel];
                    if (!config) return null;
                    const isRegenerating = regeneratingChannel === channel;
                    const hasImage = !!(content.channel_images?.[channel]?.url);
                    const channelText = getContentForChannel(content, channel);
                    const wordCount = channelText ? countWords(channelText) : 0;
                    const isActive = selectedChannel === channel;
                    const status = content.channel_statuses?.[channel] || 'draft';
                    
                    return (
                      <button
                        key={channel}
                        onClick={() => setSelectedChannel(channel)}
                        disabled={isRegenerating}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-accent/50 ${
                          isActive 
                            ? 'bg-primary/10 text-primary border border-primary/20' 
                            : 'text-foreground/80'
                        }`}
                      >
                        <div 
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.bgColor}`}
                        >
                          {isRegenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span className={config.color}>{config.icon}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-medium truncate ${isActive ? 'text-primary' : ''}`}>
                              {config.shortLabel}
                            </span>
                            {hasImage && (
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="Có ảnh" />
                            )}
                            <span 
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                status === 'published' ? 'bg-green-400' :
                                status === 'approved' ? 'bg-blue-400' :
                                status === 'review' ? 'bg-yellow-400' :
                                'bg-muted-foreground/50'
                              }`}
                              title={CONTENT_STATUSES.find(s => s.value === status)?.label}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {wordCount} từ
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
              
              {/* Sidebar Footer - Creator Info, Analytics & Activity */}
              <div className="border-t border-border/30 bg-background/50">
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />
                  </div>
                  <div>
                    <AssignedApproverInfo creatorId={content.user_id} compact />
                  </div>
                </div>
                
                {/* Content Analytics */}
                <ContentAnalyticsPanel
                  content={getContentForChannel(content, selectedChannel) || ''}
                  channel={selectedChannel}
                  className="border-t border-border/30"
                />
                
                {/* Activity Timeline */}
                <ActivityTimeline
                  contentId={content.id}
                  createdAt={content.created_at}
                  updatedAt={content.updated_at}
                  className="border-t border-border/30"
                />
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {(() => {
                const channel = selectedChannel;
                const channelContent = getContentForChannel(content, channel);
                const config = channelConfig[channel];
                if (!config) return <div className="flex-1 flex items-center justify-center text-muted-foreground">Kênh không hợp lệ</div>;
                const isEditing = editingChannel === channel;
                const isAIEditing = aiEditingChannel === channel;
                const displayContent = previewContent || (isEditing ? editContent : (channelContent || ''));
                const wordCount = countWords(displayContent);
                const charCount = countCharacters(displayContent);
                const isRegenerating = regeneratingChannel === channel;
                const contentAnalysis = analyzeContent(displayContent, channel);
                const hasImage = !!(content.channel_images?.[channel]?.url);

                return (
                  <>
                    {/* Channel Header Bar */}
                    <div className="px-4 py-3 border-b border-border/30 bg-background/50 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                          <span className={config.color}>{config.icon}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{config.label}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                            {getChannelLengthDisplay(channel, channelOverrides)}
                              {channelOverrides?.[channel] && Object.keys(channelOverrides[channel] || {}).length > 0 && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 border-primary/20">
                                  Brand
                                </Badge>
                              )}
                            </span>
                            <span>•</span>
                            <span>{wordCount} từ / {charCount} ký tự</span>
                          </div>
                        </div>
                        
                        {/* Channel Status Dropdown */}
                        {onUpdateChannelStatus && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1 ml-2">
                                <span 
                                  className={`w-2 h-2 rounded-full ${
                                    (content.channel_statuses?.[channel] || 'draft') === 'published' ? 'bg-green-400' :
                                    (content.channel_statuses?.[channel] || 'draft') === 'approved' ? 'bg-blue-400' :
                                    (content.channel_statuses?.[channel] || 'draft') === 'review' ? 'bg-yellow-400' :
                                    'bg-muted-foreground'
                                  }`}
                                />
                                {CONTENT_STATUSES.find(s => s.value === (content.channel_statuses?.[channel] || 'draft'))?.label || 'Bản nháp'}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-36">
                              {CONTENT_STATUSES.map((status) => (
                                <DropdownMenuItem
                                  key={status.value}
                                  onClick={() => onUpdateChannelStatus(content.id, channel, status.value)}
                                  className={content.channel_statuses?.[channel] === status.value ? 'bg-muted' : ''}
                                >
                                  <span 
                                    className={`w-2 h-2 rounded-full mr-2 ${
                                      status.value === 'published' ? 'bg-green-400' :
                                      status.value === 'approved' ? 'bg-blue-400' :
                                      status.value === 'review' ? 'bg-yellow-400' :
                                      'bg-muted-foreground'
                                    }`}
                                  />
                                  {status.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        
                        {isEditing && (
                          <Badge variant="secondary" className="text-xs ml-2">
                            {previewContent ? 'Xem trước AI' : 'Đang sửa'}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            {/* Undo/Redo */}
                            <TooltipProvider>
                              <div className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo || isSaving || isAIEditing} className="h-8 w-8">
                                      <Undo2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Hoàn tác (Ctrl+Z)</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo || isSaving || isAIEditing} className="h-8 w-8">
                                      <Redo2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Làm lại (Ctrl+Shift+Z)</TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>

                            <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isSaving || isAIEditing} className="h-8">
                              <X className="w-4 h-4 mr-1" />
                              {previewContent ? 'Quay lại' : 'Hủy'}
                            </Button>
                            
                            {previewContent && (
                              <Button variant="outline" size="sm" onClick={handleApplyPreview} disabled={isSaving} className="h-8">
                                <Check className="w-4 h-4 mr-1" />
                                Áp dụng
                              </Button>
                            )}
                            
                            <Button size="sm" onClick={() => handleSaveEdit(channel)} disabled={isSaving || isAIEditing} className="h-8">
                              {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                              Lưu
                            </Button>
                          </>
                        ) : (
                          <>
                            {/* Mockup view is always default */}
                            
                            {onRegenerate && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" onClick={() => handleRegenerate(channel)} disabled={isRegenerating || !!regeneratingChannel} className="h-8 w-8">
                                    <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Tạo lại nội dung</TooltipContent>
                              </Tooltip>
                            )}
                            
                            {onUpdateContent && (
                              <Button variant="outline" size="sm" onClick={() => handleStartEdit(channel)} disabled={isRegenerating || !!regeneratingChannel} className="h-8">
                                <Pencil className="w-4 h-4 mr-1" />
                                Sửa
                              </Button>
                            )}
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => handleCopy(channel)} disabled={isRegenerating} className="h-8 w-8">
                                  {copiedChannel === channel ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Sao chép nội dung</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Bar: Schedule + Post Now */}
                    {!isEditing && (
                      <div className="flex justify-end gap-2 px-3 py-1.5 border-b border-border/30">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setShowSchedule(true); setShowGallery(false); setShowTeamPanel(false); }}
                          className="gap-2"
                        >
                          <CalendarClock className="w-4 h-4" />
                          Lên lịch đăng bài
                        </Button>
                        <DirectPublishButton
                          content={channelContent || ''}
                          contentId={content.id}
                          channel={channel}
                          brandTemplateId={content.brand_template_id || undefined}
                          mediaUrls={(() => {
                            const imgUrl = generatedImages[channel] || content.channel_images?.[channel]?.url;
                            return imgUrl ? [imgUrl] : undefined;
                          })()}
                          variant="default"
                          size="sm"
                        />
                      </div>
                    )}

                    {/* Content Area */}
                      <ScrollArea className="flex-1">
                        <div className="p-2">

                        {isEditing ? (
                          <div className="space-y-3">
                            {/* AI Edit Panel */}
                            {onAIEdit && (
                              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-3">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-primary" />
                                  <span className="text-sm font-medium">Chỉnh sửa với AI</span>
                                </div>
                                
                                <SmartQuickActions
                                  analysis={contentAnalysis}
                                  onAction={(instruction) => handleAIEdit(channel, instruction)}
                                  onApplyBrandVoice={() => handleAIEdit(channel, APPLY_BRAND_VOICE_INSTRUCTION)}
                                  isLoading={isAIEditing}
                                  hasBrandVoice={!!content.brand_template_id}
                                />

                                <div className="flex gap-2 pt-2 border-t border-border/50">
                                  <Input
                                    placeholder="Nhập yêu cầu chỉnh sửa..."
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    disabled={isAIEditing}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && aiPrompt.trim()) {
                                        handleAIEdit(channel, aiPrompt);
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleAIEdit(channel, aiPrompt)}
                                    disabled={isAIEditing || !aiPrompt.trim()}
                                    className="shrink-0"
                                  >
                                    {isAIEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Draft restore prompt */}
                            {showDraftRestorePrompt && (
                              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 flex items-center justify-between">
                                <span className="text-sm">Bạn có bản nháp chưa lưu. Khôi phục?</span>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" onClick={handleDiscardDraft}>Bỏ qua</Button>
                                  <Button variant="default" size="sm" onClick={handleRestoreDraft}>Khôi phục</Button>
                                </div>
                              </div>
                            )}

                            {/* Editor */}
                            {channel === 'website' ? (
                              <div className="space-y-2">
                                <div className="flex justify-end">
                                  <ToggleGroup 
                                    type="single" 
                                    value={showMarkdownPreview ? 'preview' : 'edit'}
                                    onValueChange={(value) => setShowMarkdownPreview(value === 'preview')}
                                    className="bg-muted/50 p-0.5 rounded-md"
                                  >
                                    <ToggleGroupItem value="edit" className="h-7 px-2.5 text-xs">
                                      <Code className="w-3.5 h-3.5 mr-1" />
                                      Sửa
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="preview" className="h-7 px-2.5 text-xs">
                                      <Eye className="w-3.5 h-3.5 mr-1" />
                                      Xem
                                    </ToggleGroupItem>
                                  </ToggleGroup>
                                </div>
                                
                                {showMarkdownPreview ? (
                                  <div className="rounded-lg border border-border/50 bg-background p-4 min-h-[300px] prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown>{previewContent || editContent || 'Nhập nội dung...'}</ReactMarkdown>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <MarkdownToolbar
                                      textareaRef={textareaRef}
                                      value={previewContent || editContent}
                                      onChange={(val) => previewContent ? setPreviewContent(val) : setEditContent(val)}
                                      disabled={isSaving || !!aiEditingChannel}
                                    />
                                    <Textarea
                                      ref={textareaRef}
                                      value={previewContent || editContent}
                                      onChange={(e) => previewContent ? setPreviewContent(e.target.value) : setEditContent(e.target.value)}
                                      className="min-h-[300px] resize-none font-mono text-sm"
                                      placeholder="Nhập nội dung Markdown..."
                                    />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Textarea
                                value={previewContent || editContent}
                                onChange={(e) => previewContent ? setPreviewContent(e.target.value) : setEditContent(e.target.value)}
                                className="min-h-[350px] resize-none text-sm"
                                placeholder="Nhập nội dung..."
                              />
                            )}
                          </div>
                        ) : (
                          /* View Mode - Always Mockup */
                          (
                            <div className="space-y-4">
                              <div className="relative">
                              <ContentMockupToggle
                                  channel={channel}
                                  content={channelContent || ''}
                                  brandName={content.brand_name}
                                  logoUrl={brandLogoUrl || undefined}
                                  primaryColor={content.primary_color || undefined}
                                  isLoading={isRegenerating}
                                  seoData={channel === 'website' ? (content as any).website_seo_data : undefined}
                                  channelImage={generatedImages[channel] || content.channel_images?.[channel]?.url}
                                  critiqueScore={content.critique_score}
                                  geoScore={geoScoreData?.overall_score}
                                  engagementScore={channelContent ? Math.min(100, Math.round(
                                    (channelContent.length > 50 ? 20 : 10) +
                                    ((channelContent.match(/[?!]/g) || []).length > 0 ? 15 : 0) +
                                    ((channelContent.match(/(#\w+)/g) || []).length * 5) +
                                    ((channelContent.match(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu) || []).length * 3) +
                                    (channelContent.split('\n').filter(l => l.trim()).length > 3 ? 15 : 5) +
                                    ((channelContent.match(/(click|nhấn|liên hệ|mua|đăng ký|theo dõi|inbox|dm|share|comment|xem thêm)/gi) || []).length > 0 ? 15 : 0)
                                  )) : undefined}
                                  seoScore={channel === 'website' ? calculateSEOScore(channelContent || '') : undefined}
                                  onTriggerGEO={handleTriggerGEO}
                                  isGEOLoading={isGEOScoring}
                                  geoFactorScores={geoScoreData?.factor_scores as Record<string, number> | null | undefined}
                                />
                              </div>
                                
                              {/* Image Actions Bar - visible below mockup */}
                              {(content.channel_images?.[channel]?.url || generatedImages[channel]) && (
                                <div className="flex items-center justify-center gap-1 py-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="h-8 gap-1.5 text-xs"
                                          onClick={() => {
                                            const imageUrl = generatedImages[channel] || content.channel_images?.[channel]?.url;
                                            if (imageUrl) {
                                              setLightboxImageUrl(imageUrl);
                                              setLightboxChannel(channel);
                                            }
                                          }}
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          Xem ảnh
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Xem ảnh full-screen</TooltipContent>
                                    </Tooltip>

                                    {/* Refine Text */}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          className="h-8 gap-1.5 text-xs"
                                          disabled={isRefiningText}
                                          onClick={async () => {
                                            const imageUrl = generatedImages[channel] || content.channel_images?.[channel]?.url;
                                            if (!imageUrl) return;
                                            const result = await editBackground({
                                              imageUrl,
                                              editType: 'refine_text',
                                              channel,
                                              contentId: content.id,
                                            });
                                            if (result.success && result.imageUrl) {
                                              setGeneratedImages(prev => ({ ...prev, [channel]: result.imageUrl! }));
                                            }
                                          }}
                                        >
                                          {isRefiningText ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Type className="w-3.5 h-3.5" />
                                          )}
                                          Sửa chữ
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>AI sửa lại text trên ảnh cho đẹp hơn</TooltipContent>
                                    </Tooltip>
                                    
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          className="h-8 gap-1.5 text-xs"
                                          onClick={() => {
                                            setActiveImageChannel(channel);
                                            setShowImageGenerator(true);
                                          }}
                                        >
                                          <RefreshCw className="w-3.5 h-3.5" />
                                          Tạo lại
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Tạo lại ảnh</TooltipContent>
                                    </Tooltip>
                                    
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          className="h-8 gap-1.5 text-xs"
                                          onClick={() => {
                                            setHistoryChannel(channel);
                                            setShowImageHistory(true);
                                          }}
                                        >
                                          <Images className="w-3.5 h-3.5" />
                                          Lịch sử
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Lịch sử ảnh</TooltipContent>
                                    </Tooltip>
                                    
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          className="h-8 gap-1.5 text-xs"
                                          onClick={() => {
                                            const imageUrl = generatedImages[channel] || content.channel_images?.[channel]?.url;
                                            if (imageUrl) {
                                              const link = document.createElement('a');
                                              link.href = imageUrl;
                                              link.download = `${channel}-image.png`;
                                              link.target = '_blank';
                                              link.click();
                                            }
                                          }}
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                          Tải xuống
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Tải xuống ảnh</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )}
                              
                              {/* SEO Preview for website channel */}
                              {channel === 'website' && (content as any).website_seo_data && (
                                <WebsiteSEOPreview
                                  seoData={(content as any).website_seo_data}
                                  content={channelContent}
                                  brandName={content.brand_name}
                                />
                              )}
                              
                            </div>
                          )
                        )}
                      </div>
                    </ScrollArea>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </DialogContent>
      
      {/* Unified Image Generator */}
      <SimpleImageGenerator
        open={showImageGenerator}
        onOpenChange={(open) => {
          setShowImageGenerator(open);
          if (!open && !isImageGenMinimized) setActiveImageChannel(null);
        }}
        content={content}
        brandLogoUrl={brandLogoUrl}
        brandPrimaryColor={content.primary_color}
        brandIndustry={industryMemory?.code ? [industryMemory.code] : undefined}
        initialChannel={activeImageChannel || undefined}
        initialMode={activeImageChannel ? 'single' : 'batch'}
        onImageGenerated={onSaveChannelImage ? async (channel, image) => {
          // Update local state for immediate feedback
          setGeneratedImages(prev => ({ ...prev, [channel]: image.url }));
          // Save to database
          await onSaveChannelImage(content.id, channel, image);
        } : undefined}
        onMinimize={() => setIsImageGenMinimized(true)}
        onProgressChange={setImageGenProgress}
      />

      {/* Floating Image Generation Progress */}
      <FloatingImageProgress
        visible={isImageGenMinimized && !!imageGenProgress && (imageGenProgress.isGenerating || imageGenProgress.completedCount > 0)}
        completedCount={imageGenProgress?.completedCount ?? 0}
        totalCount={imageGenProgress?.totalCount ?? 0}
        progress={imageGenProgress?.progress ?? {}}
        isComplete={!!imageGenProgress && !imageGenProgress.isGenerating && imageGenProgress.completedCount > 0}
        hasErrors={!!imageGenProgress && Object.values(imageGenProgress.progress).some(s => s === 'error')}
        onRestore={() => {
          setIsImageGenMinimized(false);
          setShowImageGenerator(true);
        }}
        onDismiss={() => {
          setIsImageGenMinimized(false);
          setImageGenProgress(null);
        }}
      />

      {/* Assignment Dialog */}
      <AssignmentDialog
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
        contentId={content.id}
        contentTitle={content.title}
        selectedChannels={content.selected_channels || []}
        preselectedChannel={assignmentChannel}
      />

      {/* Content Validation Dialog */}
      {validationResult && (
        <ContentValidationDialog
          open={showValidationDialog}
          onOpenChange={setShowValidationDialog}
          validationResult={validationResult}
          onConfirm={handleValidationConfirm}
          onCancel={handleValidationCancel}
        />
      )}

      {/* Channel Image History Dialog */}
      {historyChannel && (
        <ChannelImageHistory
          open={showImageHistory}
          onOpenChange={setShowImageHistory}
          contentId={content.id}
          channel={historyChannel}
          onSelectImage={onSaveChannelImage ? async (imageUrl) => {
            await onSaveChannelImage(content.id, historyChannel, {
              url: imageUrl,
              provider: 'history',
              generatedAt: new Date().toISOString(),
              prompt: 'Selected from history',
            });
            setShowImageHistory(false);
            toast({
              title: 'Đã chọn ảnh',
              description: `Đã áp dụng ảnh từ lịch sử cho ${channelConfig[historyChannel].label}`,
            });
          } : undefined}
        />
      )}

      {/* Expand Channels Streaming Dialog */}
      <ExpandChannelsStreamingDialog
        open={showExpandDialog}
        onOpenChange={setShowExpandDialog}
        content={content}
        onComplete={(updatedContent) => {
          // Ensure newly added channels immediately appear in the channel sidebar
          onContentUpdated?.(updatedContent);

          // Find the newly added channels by comparing old and new selected_channels
          const oldChannels = content.selected_channels || [];
          const newChannels = updatedContent.selected_channels || [];
          const addedChannels = newChannels.filter(ch => !oldChannels.includes(ch));

          // Switch to the first newly added channel
          if (addedChannels.length > 0) {
            setSelectedChannel(addedChannels[0]);
          }

          setShowExpandDialog(false);
        }}
      />

      {/* Regenerate Streaming Overlay - Portal to ensure visibility above dialog */}
      {isStreamingRegenerating && streamingRegeneratingChannel && (
        <DialogPortal>
          <div className="fixed inset-0 z-[60]">
            <RegenerateStreamingOverlay
              channel={streamingRegeneratingChannel}
              streamingText={regenerateStreamingText}
              progress={regenerateProgress.progress}
              message={regenerateProgress.message}
              isComplete={regenerateProgress.isComplete}
              onCancel={cancelStreamingRegenerate}
              onComplete={() => {
                // Content already updated via onComplete callback
              }}
            />
          </div>
        </DialogPortal>
      )}

    </Dialog>

    {/* Core Content Viewer Sheet - OUTSIDE Dialog to avoid portal conflicts */}
    {viewingCoreContent && (
      <CoreContentViewer
        coreContent={viewingCoreContent}
        open={!!viewingCoreContent}
        onOpenChange={(open) => !open && setViewingCoreContent(null)}
      />
    )}

    {/* Image Lightbox - OUTSIDE Dialog */}
    {lightboxImageUrl && (
      <ImageLightbox
        images={[{
          imageUrl: lightboxImageUrl,
          channel: lightboxChannel || '',
          channelLabel: '',
        }]}
        currentIndex={0}
        open={true}
        onClose={() => { setLightboxImageUrl(null); setLightboxChannel(null); }}
        onNavigate={() => {}}
        onDownload={() => {
          const link = document.createElement('a');
          link.href = lightboxImageUrl;
          link.download = 'image.png';
          link.target = '_blank';
          link.click();
        }}
        onRefineText={async () => {
          if (!lightboxImageUrl) return;
          const result = await editBackground({
            imageUrl: lightboxImageUrl,
            editType: 'refine_text',
            channel: lightboxChannel || undefined,
            contentId: content.id,
          });
          if (result.success && result.imageUrl) {
            setLightboxImageUrl(result.imageUrl);
            if (lightboxChannel) {
              setGeneratedImages(prev => ({ ...prev, [lightboxChannel]: result.imageUrl! }));
            }
          }
        }}
      />
    )}
  </>
  );
}
