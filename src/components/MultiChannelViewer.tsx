import { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Download, Globe, Facebook, Instagram, Twitter, MapPin, RefreshCw, Loader2, Pencil, Save, X, Sparkles, Minus, Smile, Target, Briefcase, Undo2, Redo2, Eye, Code, Linkedin, Mail, Youtube, MessageCircle, Send, ImagePlus, Images, ChevronDown, CalendarClock, Users, Music2, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { DEFAULT_CHANNEL_SETTINGS } from '@/types/channelSettings';
import { toast } from '@/hooks/use-toast';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useDraft } from '@/hooks/useDraft';
import { useContentAnalysis } from '@/hooks/useContentAnalysis';
import { MarkdownToolbar } from '@/components/MarkdownToolbar';
import { ContentLengthIndicator } from '@/components/ContentLengthIndicator';
import { ChannelRulesPanel } from '@/components/ChannelRulesPanel';
import { SmartQuickActions } from '@/components/SmartQuickActions';
import { ImagePromptEditor } from '@/components/ImagePromptEditor';
import { useSocialImageGeneration } from '@/hooks/useSocialImageGeneration';
import { ChannelImagesGallery } from '@/components/ChannelImagesGallery';
import { SchedulePanel } from '@/components/SchedulePanel';
import { TeamWorkPanel } from '@/components/TeamWorkPanel';
import { AssignmentDialog } from '@/components/AssignmentDialog';
import { useCreatorProfiles } from '@/hooks/useCreatorProfiles';
import { CreatorCell } from '@/components/CreatorCell';

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
  regeneratingChannel?: string | null;
  aiEditingChannel?: string | null;
}

const channelConfig: Record<Channel, { 
  label: string; 
  icon: React.ReactNode; 
  color: string;
  bgColor: string;
  maxLength?: string;
}> = {
  website: { 
    label: 'Website/Blog', 
    icon: <Globe className="w-4 h-4" />, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    maxLength: '800-1500 chữ'
  },
  facebook: { 
    label: 'Facebook', 
    icon: <Facebook className="w-4 h-4" />, 
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    maxLength: '120-300 chữ'
  },
  instagram: { 
    label: 'Instagram', 
    icon: <Instagram className="w-4 h-4" />, 
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    maxLength: '50-150 chữ'
  },
  twitter: { 
    label: 'X (Twitter)', 
    icon: <Twitter className="w-4 h-4" />, 
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    maxLength: 'Thread 5-7 tweets'
  },
  google_maps: { 
    label: 'Google Maps', 
    icon: <MapPin className="w-4 h-4" />, 
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    maxLength: '80-150 chữ'
  },
  linkedin: { 
    label: 'LinkedIn', 
    icon: <Linkedin className="w-4 h-4" />, 
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    maxLength: '150-400 chữ'
  },
  email: { 
    label: 'Email', 
    icon: <Mail className="w-4 h-4" />, 
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    maxLength: '150-400 chữ'
  },
  youtube: { 
    label: 'YouTube', 
    icon: <Youtube className="w-4 h-4" />, 
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    maxLength: 'Script 3-5 phút'
  },
  zalo_oa: { 
    label: 'Zalo OA', 
    icon: <MessageCircle className="w-4 h-4" />, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    maxLength: '60-150 chữ'
  },
  telegram: { 
    label: 'Telegram', 
    icon: <Send className="w-4 h-4" />, 
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    maxLength: '100-500 chữ'
  },
  tiktok: { 
    label: 'TikTok', 
    icon: <Music2 className="w-4 h-4" />, 
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    maxLength: '50-150 chữ'
  },
  threads: { 
    label: 'Threads', 
    icon: <AtSign className="w-4 h-4" />, 
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

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countCharacters(text: string): number {
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
  regeneratingChannel,
  aiEditingChannel,
}: MultiChannelViewerProps) {
  const [copiedChannel, setCopiedChannel] = useState<Channel | null>(null);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [showDraftRestorePrompt, setShowDraftRestorePrompt] = useState(false);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [imageEditorChannel, setImageEditorChannel] = useState<Channel | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<Channel, string>>({} as Record<Channel, string>);
  const [showGallery, setShowGallery] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  const [deletingImageChannel, setDeletingImageChannel] = useState<Channel | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentChannel, setAssignmentChannel] = useState<Channel | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Edit Title/Topic state
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [isSavingHeader, setIsSavingHeader] = useState(false);

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
    if (!onRegenerate || regeneratingChannel) return;
    setEditingChannel(null);
    setPreviewContent(null);
    await onRegenerate(content.id, channel);
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
    
    setIsSaving(true);
    try {
      const updated = await onUpdateContent(content.id, channel, contentToSave);
      if (updated) {
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

    content.selected_channels.forEach((channel) => {
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

  const firstChannel = content.selected_channels[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {isEditingHeader ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Tiêu đề</label>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Nhập tiêu đề..."
                      className="text-lg font-semibold"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Chủ đề</label>
                    <Textarea
                      value={editTopic}
                      onChange={(e) => setEditTopic(e.target.value)}
                      placeholder="Nhập chủ đề..."
                      className="min-h-[60px] resize-none text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveHeader}
                      disabled={isSavingHeader || !editTitle.trim()}
                    >
                      {isSavingHeader ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-1.5" />
                      )}
                      Lưu
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEditHeader}
                      disabled={isSavingHeader}
                    >
                      <X className="w-4 h-4 mr-1.5" />
                      Hủy
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 group">
                    <DialogTitle className="text-xl font-bold">
                      {content.title}
                    </DialogTitle>
                    {onUpdateTitleTopic && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleStartEditHeader}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 mt-2">
                    {content.topic}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{goalLabel}</Badge>
                    {content.industry && (
                      <Badge variant="outline" className="bg-muted/50">
                        {content.industry}
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-muted/50">
                      {content.brand_name}
                    </Badge>
                    <span className="text-muted-foreground mx-1">•</span>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span>Tạo bởi:</span>
                      <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />
                    </div>
                    <span className="text-muted-foreground mx-1">•</span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>Tạo lúc: {new Date(content.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className="text-muted-foreground mx-1">•</span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>Cập nhật: {new Date(content.updated_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            {!isEditingHeader && (
              <div className="flex items-center gap-2">
                {/* Team Panel Toggle Button */}
                <Button 
                  variant={showTeamPanel ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => { setShowTeamPanel(!showTeamPanel); setShowGallery(false); setShowSchedule(false); }}
                  className="gap-1.5"
                >
                  <Users className="w-4 h-4" />
                  Team
                </Button>
                {/* Gallery Toggle Button */}
                <Button 
                  variant={showGallery ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => { setShowGallery(!showGallery); setShowSchedule(false); setShowTeamPanel(false); }}
                  className="gap-1.5"
                >
                  <Images className="w-4 h-4" />
                  Ảnh
                  {Object.keys(content.channel_images || {}).length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {Object.keys(content.channel_images || {}).length}
                    </Badge>
                  )}
                </Button>
                {/* Schedule Button */}
                <Button 
                  variant={showSchedule ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => { setShowSchedule(!showSchedule); setShowGallery(false); setShowTeamPanel(false); }}
                  className="gap-1.5"
                >
                  <CalendarClock className="w-4 h-4" />
                  Lên lịch
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportAll}>
                  <Download className="w-4 h-4 mr-1.5" />
                  Export
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {showTeamPanel ? (
          <div className="p-6">
            <TeamWorkPanel 
              contentId={content.id} 
              onClose={() => setShowTeamPanel(false)} 
            />
          </div>
        ) : showSchedule ? (
          <div className="p-6">
            <SchedulePanel content={content} />
          </div>
        ) : showGallery ? (
          <div className="p-6">
            <ChannelImagesGallery
              channelImages={content.channel_images || {}}
              selectedChannels={content.selected_channels}
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
          <Tabs defaultValue={firstChannel} className="flex-1 flex flex-col">
            <div className="px-6 pt-4">
              <TabsList className="w-full justify-start gap-1 h-auto flex-wrap bg-transparent p-0">
                {content.selected_channels.map((channel) => {
                  const config = channelConfig[channel];
                  const isRegenerating = regeneratingChannel === channel;
                  const hasImage = !!(content.channel_images?.[channel]?.url);
                  return (
                    <TabsTrigger
                      key={channel}
                      value={channel}
                      disabled={isRegenerating}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:${config.bgColor} data-[state=active]:${config.color}`}
                    >
                      {isRegenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className={config.color}>{config.icon}</span>
                      )}
                      <span>{config.label}</span>
                      {hasImage && (
                        <span className="w-2 h-2 rounded-full bg-green-500" title="Có ảnh" />
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

          {content.selected_channels.map((channel) => {
            const channelContent = getContentForChannel(content, channel);
            const config = channelConfig[channel];
            const isEditing = editingChannel === channel;
            const isAIEditing = aiEditingChannel === channel;
            const displayContent = previewContent || (isEditing ? editContent : (channelContent || ''));
            const wordCount = countWords(displayContent);
            const charCount = countCharacters(displayContent);
            const isRegenerating = regeneratingChannel === channel;
            
            // Content analysis for smart quick actions
            const contentAnalysis = analyzeContent(displayContent, channel);

            return (
              <TabsContent
                key={channel}
                value={channel}
                className="flex-1 mt-0 p-6 pt-4"
              >
                <div className="space-y-3 mb-3">
                  {/* Content Length Indicator */}
                  <ContentLengthIndicator 
                    content={displayContent} 
                    settings={DEFAULT_CHANNEL_SETTINGS[channel]} 
                  />
                  
                  {/* Channel Rules Panel */}
                  <ChannelRulesPanel channel={channel} />
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {/* Channel Status Dropdown */}
                    {onUpdateChannelStatus && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 px-2 text-xs gap-1"
                          >
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
                    <span className="text-xs text-muted-foreground">
                      {config.maxLength}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      •
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {wordCount} chữ / {charCount} ký tự
                    </span>
                    {isEditing && (
                      <>
                        <Badge variant="secondary" className="text-xs">
                          {previewContent ? 'Đang xem trước AI' : 'Đang chỉnh sửa'}
                        </Badge>
                        {isDraftSaving && (
                          <span className="text-xs text-muted-foreground animate-pulse">
                            Đang lưu...
                          </span>
                        )}
                        {!isDraftSaving && draftLastSaved && (
                          <span className="text-xs text-muted-foreground">
                            Đã lưu tự động
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        {/* Undo/Redo buttons */}
                        <TooltipProvider>
                          <div className="flex items-center gap-1 mr-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={undo}
                                  disabled={!canUndo || isSaving || isAIEditing}
                                  className="h-8 w-8"
                                >
                                  <Undo2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Hoàn tác (Ctrl+Z)</p>
                                {historyCount > 0 && <p className="text-xs text-muted-foreground">{historyCount} bước</p>}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={redo}
                                  disabled={!canRedo || isSaving || isAIEditing}
                                  className="h-8 w-8"
                                >
                                  <Redo2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Làm lại (Ctrl+Shift+Z)</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={isSaving || isAIEditing}
                          className="gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          {previewContent ? 'Quay lại' : 'Hủy'}
                        </Button>
                        {previewContent && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleApplyPreview}
                            disabled={isSaving || isAIEditing}
                            className="gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            Chấp nhận
                          </Button>
                        )}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSaveEdit(channel)}
                          disabled={isSaving || isAIEditing}
                          className="gap-1.5"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Đang lưu...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Lưu
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        {onUpdateContent && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartEdit(channel)}
                            disabled={isRegenerating || !!regeneratingChannel}
                            className="gap-1.5"
                          >
                            <Pencil className="w-4 h-4" />
                            Sửa
                          </Button>
                        )}
                        {onRegenerate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerate(channel)}
                            disabled={isRegenerating || !!regeneratingChannel}
                            className="gap-1.5"
                          >
                            {isRegenerating ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang tạo lại...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4" />
                                Tạo lại
                              </>
                            )}
                          </Button>
                        )}
                        {/* Image Generation Button */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setImageEditorChannel(channel);
                                  setImageEditorOpen(true);
                                }}
                                disabled={isRegenerating || !!regeneratingChannel}
                                className="gap-1.5"
                              >
                                <ImagePlus className="w-4 h-4" />
                                <span className="hidden sm:inline">Tạo ảnh</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Tạo ảnh AI cho {channelConfig[channel].label}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {/* Assignment Button */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setAssignmentChannel(channel);
                                  setAssignmentDialogOpen(true);
                                }}
                                disabled={isRegenerating || !!regeneratingChannel}
                                className="gap-1.5"
                              >
                                <Users className="w-4 h-4" />
                                <span className="hidden sm:inline">Phân công</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Phân công nhiệm vụ cho {channelConfig[channel].label}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(channel)}
                          disabled={isRegenerating}
                          className="gap-1.5"
                        >
                          {copiedChannel === channel ? (
                            <>
                              <Check className="w-4 h-4 text-green-500" />
                              Đã copy
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    {/* AI Edit Panel */}
                    {onAIEdit && (
                      <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Chỉnh sửa với AI</span>
                        </div>
                        
                        {/* Smart Quick Actions with Apply Brand Voice */}
                        <SmartQuickActions
                          analysis={contentAnalysis}
                          onAction={(instruction) => handleAIEdit(channel, instruction)}
                          onApplyBrandVoice={() => handleAIEdit(channel, APPLY_BRAND_VOICE_INSTRUCTION)}
                          isLoading={isAIEditing}
                          hasBrandVoice={!!content.brand_template_id}
                        />
                        
                        {/* Custom Prompt */}
                        <div className="flex gap-2 pt-2 border-t border-border/50">
                          <Input
                            placeholder="Hoặc nhập yêu cầu chỉnh sửa (VD: thêm số liệu thống kê, đổi tone hài hước...)"
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
                            className="gap-1.5 shrink-0"
                          >
                            {isAIEditing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang xử lý...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Áp dụng
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Draft restore prompt */}
                    {showDraftRestorePrompt && (
                      <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Bạn có bản nháp chưa lưu. Khôi phục?</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDiscardDraft}
                          >
                            Bỏ qua
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleRestoreDraft}
                          >
                            Khôi phục
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Editor with Markdown Preview for Website */}
                    {channel === 'website' ? (
                      <div className="space-y-2">
                        <div className="flex justify-end">
                          <ToggleGroup 
                            type="single" 
                            value={showMarkdownPreview ? 'preview' : 'edit'}
                            onValueChange={(value) => setShowMarkdownPreview(value === 'preview')}
                            className="bg-muted/50 p-1 rounded-lg"
                          >
                            <ToggleGroupItem value="edit" className="gap-1.5 text-xs px-3">
                              <Code className="w-3.5 h-3.5" />
                              Chỉnh sửa
                            </ToggleGroupItem>
                            <ToggleGroupItem value="preview" className="gap-1.5 text-xs px-3">
                              <Eye className="w-3.5 h-3.5" />
                              Xem trước
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </div>
                        
                        {showMarkdownPreview ? (
                          <ScrollArea className="h-[280px] rounded-lg border border-border/50 bg-background">
                            <div className="p-4 prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-ul:list-disc prose-ol:list-decimal prose-li:my-1 prose-strong:font-semibold prose-a:text-primary prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic">
                              <ReactMarkdown>
                                {previewContent || editContent || 'Nhập nội dung để xem trước...'}
                              </ReactMarkdown>
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="space-y-2">
                            <MarkdownToolbar
                              textareaRef={textareaRef}
                              value={previewContent || editContent}
                              onChange={(val) => {
                                if (previewContent) {
                                  setPreviewContent(val);
                                } else {
                                  setEditContent(val);
                                }
                              }}
                              disabled={isSaving || !!aiEditingChannel}
                            />
                            <Textarea
                              ref={textareaRef}
                              value={previewContent || editContent}
                              onChange={(e) => {
                                if (previewContent) {
                                  setPreviewContent(e.target.value);
                                } else {
                                  setEditContent(e.target.value);
                                }
                              }}
                              className="h-[260px] resize-none font-mono text-sm"
                              placeholder="Nhập nội dung Markdown..."
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <Textarea
                        value={previewContent || editContent}
                        onChange={(e) => {
                          if (previewContent) {
                            setPreviewContent(e.target.value);
                          } else {
                            setEditContent(e.target.value);
                          }
                        }}
                        className="h-[320px] resize-none font-mono text-sm"
                        placeholder="Nhập nội dung..."
                      />
                    )}
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] rounded-lg border border-border/50 bg-muted/30">
                    <div className="p-4">
                      {isRegenerating ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                          <Loader2 className="w-8 h-8 animate-spin mb-3" />
                          <p>Đang tạo lại nội dung...</p>
                        </div>
                      ) : channelContent ? (
                        <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap">
                          {channelContent}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">
                          Không có nội dung cho kênh này
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            );
          })}
          </Tabs>
        )}
      </DialogContent>
      
      {/* Image Prompt Editor Modal */}
      {imageEditorChannel && (
        <ImagePromptEditor
          open={imageEditorOpen}
          onOpenChange={setImageEditorOpen}
          channel={imageEditorChannel}
          contentId={content.id}
          contentSummary={content.topic}
          brandName={content.brand_name}
          brandGuideline={content.brand_guideline || undefined}
          primaryColor={content.primary_color || undefined}
          onImageGenerated={(imageUrl) => {
            setGeneratedImages(prev => ({
              ...prev,
              [imageEditorChannel]: imageUrl,
            }));
          }}
        />
      )}

      {/* Assignment Dialog */}
      <AssignmentDialog
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
        contentId={content.id}
        contentTitle={content.title}
        selectedChannels={content.selected_channels}
        preselectedChannel={assignmentChannel}
      />
    </Dialog>
  );
}
