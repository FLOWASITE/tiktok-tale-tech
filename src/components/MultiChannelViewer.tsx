import { useState, useEffect } from 'react';
import { Copy, Check, Download, Globe, Facebook, Instagram, Twitter, MapPin, RefreshCw, Loader2, Pencil, Save, X, Sparkles, Minus, Smile, Target, Briefcase } from 'lucide-react';
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
import { MultiChannelContent, Channel, CONTENT_GOALS } from '@/types/multichannel';
import { toast } from '@/hooks/use-toast';

interface MultiChannelViewerProps {
  content: MultiChannelContent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegenerate?: (contentId: string, channel: Channel) => Promise<MultiChannelContent | null>;
  onUpdateContent?: (contentId: string, channel: Channel, newContent: string) => Promise<MultiChannelContent | null>;
  onAIEdit?: (contentId: string, channel: Channel, instruction: string, currentContent: string) => Promise<string | null>;
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
};

const quickActions = [
  { label: 'Ngắn gọn hơn', icon: Minus, instruction: 'Viết ngắn gọn, súc tích hơn' },
  { label: 'Thêm emoji', icon: Smile, instruction: 'Thêm emoji phù hợp để sinh động hơn' },
  { label: 'CTA mạnh', icon: Target, instruction: 'Thêm hoặc cải thiện call-to-action cho thuyết phục hơn' },
  { label: 'Chuyên nghiệp', icon: Briefcase, instruction: 'Viết lại với tone chuyên nghiệp, formal hơn' },
];

function getContentForChannel(content: MultiChannelContent, channel: Channel): string | null {
  switch (channel) {
    case 'website': return content.website_content;
    case 'facebook': return content.facebook_content;
    case 'instagram': return content.instagram_content;
    case 'twitter': return content.twitter_content;
    case 'google_maps': return content.google_maps_content;
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
  regeneratingChannel,
  aiEditingChannel,
}: MultiChannelViewerProps) {
  const [copiedChannel, setCopiedChannel] = useState<Channel | null>(null);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  // Reset state when dialog closes or content changes
  useEffect(() => {
    if (!open) {
      setEditingChannel(null);
      setEditContent('');
      setAiPrompt('');
      setPreviewContent(null);
    }
  }, [open]);

  if (!content) return null;

  const goalLabel = CONTENT_GOALS.find(g => g.value === content.content_goal)?.label || content.content_goal;

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
    setEditContent(currentContent);
    setEditingChannel(channel);
    setPreviewContent(null);
    setAiPrompt('');
  };

  const handleCancelEdit = () => {
    if (previewContent) {
      // If previewing, go back to original content in edit mode
      setPreviewContent(null);
      setEditContent(getContentForChannel(content, editingChannel!) || '');
    } else {
      setEditingChannel(null);
      setEditContent('');
      setAiPrompt('');
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
        setEditContent('');
        setPreviewContent(null);
        setAiPrompt('');
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
              <DialogTitle className="text-xl font-bold mb-2">
                {content.title}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mb-3">
                {content.topic}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{goalLabel}</Badge>
                {content.industry && (
                  <Badge variant="outline" className="bg-muted/50">
                    {content.industry}
                  </Badge>
                )}
                <Badge variant="outline" className="bg-muted/50">
                  {content.brand_name}
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportAll}>
              <Download className="w-4 h-4 mr-1.5" />
              Export
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue={firstChannel} className="flex-1 flex flex-col">
          <div className="px-6 pt-4">
            <TabsList className="w-full justify-start gap-1 h-auto flex-wrap bg-transparent p-0">
              {content.selected_channels.map((channel) => {
                const config = channelConfig[channel];
                const isRegenerating = regeneratingChannel === channel;
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

            return (
              <TabsContent
                key={channel}
                value={channel}
                className="flex-1 mt-0 p-6 pt-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
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
                      <Badge variant="secondary" className="text-xs">
                        {previewContent ? 'Đang xem trước AI' : 'Đang chỉnh sửa'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
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
                      <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Chỉnh sửa với AI</span>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="flex flex-wrap gap-2">
                          {quickActions.map((action) => (
                            <Button
                              key={action.label}
                              variant="outline"
                              size="sm"
                              onClick={() => handleAIEdit(channel, action.instruction)}
                              disabled={isAIEditing}
                              className="gap-1.5 text-xs"
                            >
                              <action.icon className="w-3 h-3" />
                              {action.label}
                            </Button>
                          ))}
                        </div>
                        
                        {/* Custom Prompt */}
                        <div className="flex gap-2">
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

                    {/* Editor */}
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
      </DialogContent>
    </Dialog>
  );
}
