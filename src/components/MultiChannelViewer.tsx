import { useState, useEffect } from 'react';
import { Copy, Check, Download, Globe, Facebook, Instagram, Twitter, MapPin, RefreshCw, Loader2, Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
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
  regeneratingChannel?: string | null;
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
  regeneratingChannel 
}: MultiChannelViewerProps) {
  const [copiedChannel, setCopiedChannel] = useState<Channel | null>(null);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset edit state when dialog closes or content changes
  useEffect(() => {
    if (!open) {
      setEditingChannel(null);
      setEditContent('');
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
    await onRegenerate(content.id, channel);
  };

  const handleStartEdit = (channel: Channel) => {
    const currentContent = getContentForChannel(content, channel) || '';
    setEditContent(currentContent);
    setEditingChannel(channel);
  };

  const handleCancelEdit = () => {
    setEditingChannel(null);
    setEditContent('');
  };

  const handleSaveEdit = async (channel: Channel) => {
    if (!onUpdateContent || isSaving) return;
    
    setIsSaving(true);
    try {
      const updated = await onUpdateContent(content.id, channel, editContent);
      if (updated) {
        setEditingChannel(null);
        setEditContent('');
      }
    } finally {
      setIsSaving(false);
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
            const displayContent = isEditing ? editContent : (channelContent || '');
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
                        Đang chỉnh sửa
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
                          disabled={isSaving}
                          className="gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          Hủy
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSaveEdit(channel)}
                          disabled={isSaving}
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
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="h-[400px] resize-none font-mono text-sm"
                    placeholder="Nhập nội dung..."
                  />
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
