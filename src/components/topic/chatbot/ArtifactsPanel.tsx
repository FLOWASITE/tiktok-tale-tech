import { useState, useCallback } from 'react';
import { 
  X, Pencil, Save, Trash2, Plus, MessageSquare, Video, Images, 
  Sparkles, Copy, Check, BookmarkPlus, ExternalLink,
  GripVertical, Download, FileJson, FileSpreadsheet, Trash
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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

// Sortable Topic Item Component
interface SortableTopicItemProps {
  topic: ArtifactTopic;
  index: number;
  editingTopic: ArtifactTopic | null;
  copiedId: string | null;
  onEdit: (topic: ArtifactTopic) => void;
  onCopy: (topic: ArtifactTopic) => void;
  onDelete: (topicId: string) => void;
  onSaveToBank?: (topic: ArtifactTopic) => void;
  onRefine?: (topic: string) => void;
  onCreateContent: (topic: ArtifactTopic, type: 'multichannel' | 'script' | 'carousel') => void;
  setEditingTopic: (topic: ArtifactTopic | null) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

function SortableTopicItem({
  topic,
  index,
  editingTopic,
  copiedId,
  onEdit,
  onCopy,
  onDelete,
  onSaveToBank,
  onRefine,
  onCreateContent,
  setEditingTopic,
  onSaveEdit,
  onCancelEdit
}: SortableTopicItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: topic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto'
  };

  const isEditing = editingTopic?.id === topic.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group p-3 rounded-xl border transition-all",
        isEditing 
          ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
          : "border-border hover:border-primary/30 hover:bg-muted/50",
        topic.isSaved && "border-green-500/30 bg-green-500/5",
        isDragging && "shadow-lg"
      )}
    >
      {isEditing ? (
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
            <Button size="sm" className="h-7 text-xs gap-1" onClick={onSaveEdit}>
              <Save className="w-3 h-3" />
              Lưu
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancelEdit}>
              Hủy
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div 
              className="flex items-center gap-1 text-muted-foreground/50 cursor-grab hover:text-muted-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-3 h-3" />
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

          <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0"
                  onClick={() => onEdit(topic)}
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
                  onClick={() => onCopy(topic)}
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
                    onClick={() => onSaveToBank(topic)}
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
                  onClick={() => onDelete(topic.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Xóa</TooltipContent>
            </Tooltip>

            <div className="flex-1" />

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
  );
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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = topics.findIndex(t => t.id === active.id);
      const newIndex = topics.findIndex(t => t.id === over.id);
      onTopicsChange(arrayMove(topics, oldIndex, newIndex));
    }
  }, [topics, onTopicsChange]);

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

  // Export functions
  const handleExportJSON = useCallback(() => {
    const exportData = topics.map(({ id, isEditing, isSaved, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `topics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Đã xuất file JSON!' });
  }, [topics]);

  const handleExportCSV = useCallback(() => {
    const headers = ['Topic', 'Lý do', 'Format'];
    const rows = topics.map(t => [
      `"${(t.topic || '').replace(/"/g, '""')}"`,
      `"${(t.reason || '').replace(/"/g, '""')}"`,
      `"${(t.format || '').replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `topics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Đã xuất file CSV!' });
  }, [topics]);

  const handleSaveAll = useCallback(() => {
    const unsavedTopics = topics.filter(t => !t.isSaved);
    unsavedTopics.forEach(t => onSaveToBank?.(t));
    onTopicsChange(topics.map(t => ({ ...t, isSaved: true })));
    toast({ 
      title: `Đã lưu ${unsavedTopics.length} topics!`,
      description: 'Tất cả topics đã được thêm vào danh sách của bạn.'
    });
  }, [topics, onTopicsChange, onSaveToBank]);

  const handleDeleteAll = useCallback(() => {
    onTopicsChange([]);
    toast({ title: 'Đã xóa tất cả topics!' });
  }, [onTopicsChange]);

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
          {/* Export dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Xuất topics</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleExportJSON} className="gap-2 text-xs">
                <FileJson className="w-3.5 h-3.5" />
                Xuất JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2 text-xs">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Xuất CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

      {/* Topics List with Drag & Drop */}
      <ScrollArea className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={topics.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="p-2 space-y-2">
              {topics.map((topic, index) => (
                <SortableTopicItem
                  key={topic.id}
                  topic={topic}
                  index={index}
                  editingTopic={editingTopic}
                  copiedId={copiedId}
                  onEdit={handleEdit}
                  onCopy={handleCopy}
                  onDelete={handleDelete}
                  onSaveToBank={onSaveToBank ? handleSaveToBank : undefined}
                  onRefine={onRefine}
                  onCreateContent={onCreateContent}
                  setEditingTopic={setEditingTopic}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </ScrollArea>

      {/* Footer with bulk actions */}
      {topics.length > 0 && (
        <div className="p-2 border-t bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {topics.filter(t => t.isSaved).length}/{topics.length} đã lưu
            </span>
            <div className="flex items-center gap-1">
              {onSaveToBank && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-xs gap-1"
                  onClick={handleSaveAll}
                  disabled={topics.every(t => t.isSaved)}
                >
                  <BookmarkPlus className="w-3 h-3" />
                  Lưu tất cả
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDeleteAll}
              >
                <Trash className="w-3 h-3" />
                Xóa tất cả
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
