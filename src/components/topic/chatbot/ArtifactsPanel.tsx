import { useState, useCallback } from 'react';
import { 
  X, Pencil, Save, Trash2, Plus, MessageSquare, Video, Images, 
  ChevronRight, Sparkles, Copy, Check, BookmarkPlus, ExternalLink,
  GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export interface ArtifactTopic {
  id: string;
  topic: string;
  reason?: string;
  format?: string;
  isEditing?: boolean;
  isSaved?: boolean;
}

interface ArtifactsPanelProps {
  topics: ArtifactTopic[];
  onTopicsChange: (topics: ArtifactTopic[]) => void;
  onClose: () => void;
  onCreateContent: (topic: ArtifactTopic, type: 'multichannel' | 'script' | 'carousel') => void;
  onSaveToBank?: (topic: ArtifactTopic) => void;
  onRefine?: (topic: string) => void;
  className?: string;
}

export function ArtifactsPanel({
  topics,
  onTopicsChange,
  onClose,
  onCreateContent,
  onSaveToBank,
  onRefine,
  className
}: ArtifactsPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<ArtifactTopic | null>(null);

  const handleCopy = useCallback(async (topic: ArtifactTopic) => {
    const text = `${topic.topic}${topic.reason ? `\n\nLý do: ${topic.reason}` : ''}${topic.format ? `\nFormat: ${topic.format}` : ''}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(topic.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Đã sao chép topic!' });
  }, []);

  const handleEdit = useCallback((topic: ArtifactTopic) => {
    setEditingTopic({ ...topic });
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingTopic) return;
    
    onTopicsChange(topics.map(t => 
      t.id === editingTopic.id ? { ...editingTopic, isEditing: false } : t
    ));
    setEditingTopic(null);
    toast({ title: 'Đã lưu thay đổi!' });
  }, [editingTopic, topics, onTopicsChange]);

  const handleCancelEdit = useCallback(() => {
    setEditingTopic(null);
  }, []);

  const handleDelete = useCallback((topicId: string) => {
    onTopicsChange(topics.filter(t => t.id !== topicId));
    toast({ title: 'Đã xóa topic!' });
  }, [topics, onTopicsChange]);

  const handleAddNew = useCallback(() => {
    const newTopic: ArtifactTopic = {
      id: `topic-${Date.now()}`,
      topic: 'Topic mới',
      reason: '',
      format: '',
      isEditing: true
    };
    onTopicsChange([...topics, newTopic]);
    setEditingTopic(newTopic);
  }, [topics, onTopicsChange]);

  const handleSaveToBank = useCallback((topic: ArtifactTopic) => {
    onSaveToBank?.(topic);
    onTopicsChange(topics.map(t => 
      t.id === topic.id ? { ...t, isSaved: true } : t
    ));
    toast({ 
      title: 'Đã lưu vào Topic Bank!',
      description: 'Topic đã được thêm vào danh sách của bạn.'
    });
  }, [topics, onTopicsChange, onSaveToBank]);

  if (topics.length === 0) {
    return (
      <div className={cn(
        "flex flex-col h-full bg-background border-l",
        className
      )}>
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Topics</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Chưa có topic nào được trích xuất.
            </p>
            <p className="text-xs text-muted-foreground">
              Chat với AI để nhận gợi ý topics!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-background border-l",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-primary/5 via-violet-500/5 to-primary/5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Topics</h3>
          <Badge variant="secondary" className="text-[10px] h-5">
            {topics.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddNew}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Thêm topic mới</TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Topics List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {topics.map((topic, index) => (
            <div
              key={topic.id}
              className={cn(
                "group p-3 rounded-xl border transition-all",
                editingTopic?.id === topic.id 
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                  : "border-border hover:border-primary/30 hover:bg-muted/50",
                topic.isSaved && "border-green-500/30 bg-green-500/5"
              )}
            >
              {editingTopic?.id === topic.id ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Topic
                    </label>
                    <Input
                      value={editingTopic.topic}
                      onChange={(e) => setEditingTopic({ ...editingTopic, topic: e.target.value })}
                      className="mt-1 h-8 text-sm"
                      placeholder="Nhập topic..."
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Lý do / Insight
                    </label>
                    <Textarea
                      value={editingTopic.reason || ''}
                      onChange={(e) => setEditingTopic({ ...editingTopic, reason: e.target.value })}
                      className="mt-1 min-h-[60px] text-xs resize-none"
                      placeholder="Tại sao topic này hiệu quả..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Format đề xuất
                    </label>
                    <Input
                      value={editingTopic.format || ''}
                      onChange={(e) => setEditingTopic({ ...editingTopic, format: e.target.value })}
                      className="mt-1 h-8 text-xs"
                      placeholder="Carousel, Video, Post..."
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSaveEdit}>
                      <Save className="w-3 h-3" />
                      Lưu
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancelEdit}>
                      Hủy
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex items-center gap-1 text-muted-foreground/50 cursor-grab">
                      <span className="text-[10px] font-mono">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug line-clamp-2">
                        {topic.topic}
                      </p>
                      {topic.reason && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {topic.reason}
                        </p>
                      )}
                      {topic.format && (
                        <Badge variant="outline" className="mt-1.5 text-[10px] h-5">
                          {topic.format}
                        </Badge>
                      )}
                    </div>
                    {topic.isSaved && (
                      <Badge variant="secondary" className="text-[9px] h-4 bg-green-500/10 text-green-600">
                        Đã lưu
                      </Badge>
                    )}
                  </div>

                  {/* Action buttons - visible on hover */}
                  <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0"
                          onClick={() => handleEdit(topic)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Chỉnh sửa</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0"
                          onClick={() => handleCopy(topic)}
                        >
                          {copiedId === topic.id ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Sao chép</TooltipContent>
                    </Tooltip>

                    {!topic.isSaved && onSaveToBank && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={() => handleSaveToBank(topic)}
                          >
                            <BookmarkPlus className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Lưu vào Bank</TooltipContent>
                      </Tooltip>
                    )}

                    {onRefine && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={() => onRefine(topic.topic)}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Xem chi tiết</TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(topic.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Xóa</TooltipContent>
                    </Tooltip>

                    <div className="flex-1" />

                    {/* Create content buttons */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="h-6 px-2 text-[10px] gap-1 hover:bg-primary hover:text-primary-foreground"
                          onClick={() => onCreateContent(topic, 'multichannel')}
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                          Multi
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Tạo Multi-channel</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="h-6 px-2 text-[10px] gap-1 hover:bg-violet-600 hover:text-white"
                          onClick={() => onCreateContent(topic, 'script')}
                        >
                          <Video className="w-2.5 h-2.5" />
                          Script
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Tạo Script</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="h-6 px-2 text-[10px] gap-1 hover:bg-orange-500 hover:text-white"
                          onClick={() => onCreateContent(topic, 'carousel')}
                        >
                          <Images className="w-2.5 h-2.5" />
                          Carousel
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Tạo Carousel</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer with bulk actions */}
      {topics.length > 1 && (
        <div className="p-2 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {topics.filter(t => t.isSaved).length}/{topics.length} đã lưu
            </span>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-xs gap-1"
              onClick={() => {
                topics.forEach(t => {
                  if (!t.isSaved && onSaveToBank) {
                    handleSaveToBank(t);
                  }
                });
              }}
              disabled={topics.every(t => t.isSaved)}
            >
              <BookmarkPlus className="w-3 h-3" />
              Lưu tất cả
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
