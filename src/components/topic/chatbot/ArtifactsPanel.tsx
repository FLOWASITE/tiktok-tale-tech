import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  X, Pencil, Save, Trash2, Plus, MessageSquare, Video, Images, 
  Sparkles, Copy, Check, BookmarkPlus, ExternalLink,
  GripVertical, Download, FileJson, FileSpreadsheet, Trash,
  Search, Filter, ChevronLeft, ChevronRight, Star, CopyPlus, Tag
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useConfetti } from '@/hooks/useConfetti';

// Predefined tags/pillars
const TOPIC_TAGS = [
  { value: 'awareness', label: 'Awareness', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'engagement', label: 'Engagement', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { value: 'conversion', label: 'Conversion', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { value: 'education', label: 'Education', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  { value: 'entertainment', label: 'Entertainment', color: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
  { value: 'trust', label: 'Trust Building', color: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
] as const;

type TopicTagValue = typeof TOPIC_TAGS[number]['value'] | '';

export interface ArtifactTopic {
  id: string;
  topic: string;
  reason?: string;
  format?: string;
  isEditing?: boolean;
  isSaved?: boolean;
  isStarred?: boolean;
  tag?: TopicTagValue;
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

type FilterType = 'all' | 'saved' | 'unsaved' | 'starred';

// Sortable Topic Item Component
interface SortableTopicItemProps {
  topic: ArtifactTopic;
  index: number;
  editingTopic: ArtifactTopic | null;
  copiedId: string | null;
  searchQuery: string;
  onEdit: (topic: ArtifactTopic) => void;
  onCopy: (topic: ArtifactTopic) => void;
  onDelete: (topicId: string) => void;
  onSaveToBank?: (topic: ArtifactTopic) => void;
  onRefine?: (topic: string) => void;
  onCreateContent: (topic: ArtifactTopic, type: 'multichannel' | 'script' | 'carousel') => void;
  setEditingTopic: (topic: ArtifactTopic | null) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onToggleStar: (topicId: string) => void;
  onDuplicate: (topic: ArtifactTopic) => void;
  onTagChange: (topicId: string, tag: TopicTagValue) => void;
}

// Highlight matching text with animation
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-300/60 dark:bg-yellow-500/40 rounded px-0.5 py-0.5 animate-pulse">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function getTagConfig(tagValue: string | undefined) {
  return TOPIC_TAGS.find(t => t.value === tagValue);
}

function SortableTopicItem({
  topic,
  index,
  editingTopic,
  copiedId,
  searchQuery,
  onEdit,
  onCopy,
  onDelete,
  onSaveToBank,
  onRefine,
  onCreateContent,
  setEditingTopic,
  onSaveEdit,
  onCancelEdit,
  onToggleStar,
  onDuplicate,
  onTagChange
}: SortableTopicItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
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
  const tagConfig = getTagConfig(topic.tag);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(topic.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group p-3 rounded-xl border transition-all duration-300 ease-out",
          "hover:shadow-md hover:-translate-y-0.5",
          isEditing 
            ? "border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-transparent ring-2 ring-primary/30 shadow-lg shadow-primary/10" 
            : "border-border/60 hover:border-primary/40 bg-gradient-to-br from-background to-muted/30",
          topic.isSaved && !isEditing && "border-green-500/40 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent",
          topic.isStarred && !isEditing && !topic.isSaved && "border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent",
          isDragging && "shadow-xl shadow-primary/20 scale-[1.02] rotate-1 z-50"
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Format đề xuất
                </label>
                <Input
                  value={editingTopic.format || ''}
                  onChange={(e) => setEditingTopic({ ...editingTopic, format: e.target.value })}
                  className="mt-1 h-8 text-xs"
                  placeholder="Carousel, Video..."
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Pillar/Tag
                </label>
                <Select
                  value={editingTopic.tag || ''}
                  onValueChange={(value) => setEditingTopic({ ...editingTopic, tag: value as TopicTagValue })}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue placeholder="Chọn tag..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Không có</SelectItem>
                    {TOPIC_TAGS.map(tag => (
                      <SelectItem key={tag.value} value={tag.value}>
                        {tag.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                className="flex items-center gap-1 text-muted-foreground/40 cursor-grab hover:text-muted-foreground transition-colors duration-200 active:cursor-grabbing"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono font-medium tabular-nums bg-muted/50 px-1 rounded">{index + 1}</span>
              </div>
              
              {/* Star button with animation */}
              <button
                onClick={() => onToggleStar(topic.id)}
                className={cn(
                  "p-1 rounded-full transition-all duration-300 ease-out transform",
                  topic.isStarred 
                    ? "text-yellow-500 hover:text-yellow-600 hover:scale-110 bg-yellow-500/10" 
                    : "text-muted-foreground/30 hover:text-yellow-500 hover:scale-110 hover:bg-yellow-500/10"
                )}
              >
                <Star className={cn(
                  "w-3.5 h-3.5 transition-transform duration-300", 
                  topic.isStarred && "fill-current animate-[pulse_1s_ease-in-out]"
                )} />
              </button>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary/90 transition-colors duration-200">
                  <HighlightText text={topic.topic} query={searchQuery} />
                </p>
                {topic.reason && (
                  <p className="mt-1.5 text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                    <HighlightText text={topic.reason} query={searchQuery} />
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {topic.format && (
                    <Badge variant="outline" className="text-[10px] h-5 bg-background/50 backdrop-blur-sm border-primary/20 text-primary/80 font-medium">
                      {topic.format}
                    </Badge>
                  )}
                  {tagConfig && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] h-5 border font-medium transition-all duration-200 hover:scale-105",
                        tagConfig.color
                      )}
                    >
                      {tagConfig.label}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1.5">
                {topic.isSaved && (
                  <Badge 
                    variant="secondary" 
                    className="text-[9px] h-5 px-2 bg-gradient-to-r from-green-500/15 to-emerald-500/15 text-green-600 border border-green-500/20 font-medium shadow-sm"
                  >
                    <Check className="w-2.5 h-2.5 mr-0.5" />
                    Đã lưu
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-200"
                    onClick={() => onEdit(topic)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Chỉnh sửa</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0 rounded-full hover:bg-blue-500/10 hover:text-blue-500 transition-all duration-200"
                    onClick={() => onCopy(topic)}
                  >
                    {copiedId === topic.id ? (
                      <Check className="w-3.5 h-3.5 text-green-500 animate-scale-in" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sao chép text</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0 rounded-full hover:bg-violet-500/10 hover:text-violet-500 transition-all duration-200"
                    onClick={() => onDuplicate(topic)}
                  >
                    <CopyPlus className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Nhân bản topic</TooltipContent>
              </Tooltip>

              {!topic.isSaved && onSaveToBank && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 w-7 p-0 rounded-full hover:bg-green-500/10 hover:text-green-500 transition-all duration-200"
                      onClick={() => onSaveToBank(topic)}
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Lưu vào Bank</TooltipContent>
                </Tooltip>
              )}

              {/* Tag dropdown */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 w-7 p-0 rounded-full hover:bg-orange-500/10 hover:text-orange-500 transition-all duration-200"
                      >
                        <Tag className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Gắn tag</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="w-40 animate-scale-in">
                  <DropdownMenuItem 
                    onClick={() => onTagChange(topic.id, '')}
                    className="text-xs gap-2"
                  >
                    <X className="w-3 h-3" />
                    Không có tag
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {TOPIC_TAGS.map(tag => (
                    <DropdownMenuItem 
                      key={tag.value}
                      onClick={() => onTagChange(topic.id, tag.value)}
                      className={cn(
                        "text-xs gap-2 transition-colors duration-150", 
                        topic.tag === tag.value && "bg-muted font-medium"
                      )}
                    >
                      <div className={cn("w-2.5 h-2.5 rounded-full ring-1 ring-inset ring-black/10", tag.color.split(' ')[0])} />
                      {tag.label}
                      {topic.tag === tag.value && <Check className="w-3 h-3 ml-auto text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {onRefine && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 w-7 p-0 rounded-full hover:bg-cyan-500/10 hover:text-cyan-500 transition-all duration-200"
                      onClick={() => onRefine(topic.topic)}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
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
                    className="h-7 w-7 p-0 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all duration-200"
                    onClick={handleDeleteClick}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Xóa</TooltipContent>
              </Tooltip>

              <div className="flex-1" />

              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="h-6 px-2 text-[10px] gap-1 rounded-md hover:bg-primary hover:text-primary-foreground transition-all duration-200"
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
                      variant="ghost"
                      className="h-6 px-2 text-[10px] gap-1 rounded-md hover:bg-violet-600 hover:text-white transition-all duration-200"
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
                      variant="ghost"
                      className="h-6 px-2 text-[10px] gap-1 rounded-md hover:bg-orange-500 hover:text-white transition-all duration-200"
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
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa topic này?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa topic "<span className="font-medium text-foreground">{topic.topic.slice(0, 50)}{topic.topic.length > 50 ? '...' : ''}</span>"? 
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterTag, setFilterTag] = useState<TopicTagValue>('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [newTopicId, setNewTopicId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Sort topics: starred first, then by original order
  const sortedTopics = useMemo(() => {
    const starred = topics.filter(t => t.isStarred);
    const unstarred = topics.filter(t => !t.isStarred);
    return [...starred, ...unstarred];
  }, [topics]);

  // Filtered topics
  const filteredTopics = useMemo(() => {
    let result = sortedTopics;
    
    // Apply filter
    if (filterType === 'saved') {
      result = result.filter(t => t.isSaved);
    } else if (filterType === 'unsaved') {
      result = result.filter(t => !t.isSaved);
    } else if (filterType === 'starred') {
      result = result.filter(t => t.isStarred);
    }

    // Apply tag filter
    if (filterTag) {
      result = result.filter(t => t.tag === filterTag);
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.topic.toLowerCase().includes(query) ||
        t.reason?.toLowerCase().includes(query) ||
        t.format?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [sortedTopics, filterType, filterTag, searchQuery]);

  // Scroll to new topic when created
  useEffect(() => {
    if (newTopicId && scrollAreaRef.current) {
      const element = scrollAreaRef.current.querySelector(`[data-topic-id="${newTopicId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setNewTopicId(null);
    }
  }, [newTopicId]);

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
    const newId = `topic-${Date.now()}`;
    const newTopic: ArtifactTopic = {
      id: newId,
      topic: 'Topic mới',
      reason: '',
      format: '',
      isEditing: true
    };
    onTopicsChange([...topics, newTopic]);
    setEditingTopic(newTopic);
    setNewTopicId(newId);
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

  const handleToggleStar = useCallback((topicId: string) => {
    onTopicsChange(topics.map(t => 
      t.id === topicId ? { ...t, isStarred: !t.isStarred } : t
    ));
  }, [topics, onTopicsChange]);

  const handleDuplicate = useCallback((topic: ArtifactTopic) => {
    const newId = `topic-${Date.now()}`;
    const duplicatedTopic: ArtifactTopic = {
      ...topic,
      id: newId,
      topic: `${topic.topic} (copy)`,
      isSaved: false,
      isEditing: true
    };
    
    // Insert after the original topic
    const originalIndex = topics.findIndex(t => t.id === topic.id);
    const newTopics = [...topics];
    newTopics.splice(originalIndex + 1, 0, duplicatedTopic);
    
    onTopicsChange(newTopics);
    setEditingTopic(duplicatedTopic);
    setNewTopicId(newId);
    toast({ title: 'Đã nhân bản topic!' });
  }, [topics, onTopicsChange]);

  const handleTagChange = useCallback((topicId: string, tag: TopicTagValue) => {
    onTopicsChange(topics.map(t => 
      t.id === topicId ? { ...t, tag } : t
    ));
    const tagLabel = tag ? TOPIC_TAGS.find(t => t.value === tag)?.label : 'Đã xóa tag';
    toast({ title: tagLabel ? `Đã gắn tag: ${tagLabel}` : 'Đã xóa tag!' });
  }, [topics, onTopicsChange]);

  // Export functions
  const handleExportJSON = useCallback(() => {
    const exportData = topics.map(({ id, isEditing, ...rest }) => rest);
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
    const headers = ['Topic', 'Lý do', 'Format', 'Tag', 'Starred', 'Saved'];
    const rows = topics.map(t => [
      `"${(t.topic || '').replace(/"/g, '""')}"`,
      `"${(t.reason || '').replace(/"/g, '""')}"`,
      `"${(t.format || '').replace(/"/g, '""')}"`,
      `"${t.tag || ''}"`,
      t.isStarred ? 'Yes' : 'No',
      t.isSaved ? 'Yes' : 'No'
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
    setShowDeleteAllConfirm(true);
  }, []);

  const handleConfirmDeleteAll = useCallback(() => {
    onTopicsChange([]);
    setShowDeleteAllConfirm(false);
    setSearchQuery('');
    setFilterType('all');
    setFilterTag('');
    toast({ title: 'Đã xóa tất cả topics!' });
  }, [onTopicsChange]);

  // Stats
  const starredCount = topics.filter(t => t.isStarred).length;
  const savedCount = topics.filter(t => t.isSaved).length;

  // Collapsed mini mode
  if (isCollapsed) {
    return (
      <div className={cn(
        "flex flex-col h-full bg-gradient-to-b from-background to-muted/30 border-l w-14 transition-all duration-300 ease-out",
        className
      )}>
        <div className="flex flex-col items-center py-4 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-200"
                onClick={() => setIsCollapsed(false)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Mở rộng</TooltipContent>
          </Tooltip>
          
          <div className="flex flex-col items-center gap-2 p-2 rounded-xl bg-gradient-to-b from-primary/10 to-primary/5 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-primary/10 text-primary border-0 font-semibold tabular-nums">
              {topics.length}
            </Badge>
          </div>

          {starredCount > 0 && (
            <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="text-[10px] font-medium text-yellow-600 tabular-nums">{starredCount}</span>
            </div>
          )}
          
          {savedCount > 0 && (
            <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[10px] font-medium text-green-600 tabular-nums">{savedCount}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className={cn(
        "flex flex-col h-full bg-gradient-to-b from-background via-background to-muted/20 border-l transition-all duration-300",
        className
      )}>
        <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-primary/5 via-transparent to-violet-500/5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-sm bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Topics</h3>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 rounded-full hover:bg-muted transition-all duration-200"
                  onClick={() => setIsCollapsed(true)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Thu gọn</TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted transition-all duration-200" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-violet-500/10 flex items-center justify-center mx-auto shadow-lg shadow-primary/5 border border-primary/10">
              <Sparkles className="w-7 h-7 text-primary/60" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground/80">
                Chưa có topic nào
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[180px]">
                Chat với AI để nhận gợi ý topics cho content của bạn!
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1.5 text-xs h-8 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
              onClick={handleAddNew}
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm topic mới
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-gradient-to-b from-background via-background to-muted/20 border-l transition-all duration-300",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-primary/8 via-violet-500/5 to-primary/8 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 shadow-sm shadow-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">Topics</h3>
          <Badge variant="secondary" className="text-[10px] h-5 tabular-nums font-medium bg-muted/80">
            {filteredTopics.length}/{topics.length}
          </Badge>
          {starredCount > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 gap-0.5 border-yellow-500/30 bg-yellow-500/10 text-yellow-600 font-medium tabular-nums">
              <Star className="w-2.5 h-2.5 fill-current" />
              {starredCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {/* Export dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted transition-all duration-200">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Xuất topics</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-40 animate-scale-in">
              <DropdownMenuItem onClick={handleExportJSON} className="gap-2 text-xs cursor-pointer">
                <FileJson className="w-3.5 h-3.5 text-blue-500" />
                Xuất JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2 text-xs cursor-pointer">
                <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />
                Xuất CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-green-500/10 hover:text-green-600 transition-all duration-200" onClick={handleAddNew}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Thêm topic mới</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-full hover:bg-muted transition-all duration-200"
                onClick={() => setIsCollapsed(true)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Thu gọn</TooltipContent>
          </Tooltip>
          
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted transition-all duration-200" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="p-2.5 border-b bg-muted/20 space-y-2.5">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm topic..."
            className="h-9 pl-9 text-xs rounded-lg border-border/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all duration-200"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="w-3 h-3 text-muted-foreground mr-0.5" />
          {[
            { value: 'all', label: 'Tất cả', icon: null },
            { value: 'starred', label: 'Starred', icon: <Star className="w-2.5 h-2.5" /> },
            { value: 'saved', label: 'Đã lưu', icon: null },
            { value: 'unsaved', label: 'Chưa lưu', icon: null },
          ].map(filter => (
            <Button
              key={filter.value}
              variant={filterType === filter.value ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                "h-6 px-2 text-[10px] rounded-full transition-all duration-200",
                filterType === filter.value && "bg-primary/10 text-primary hover:bg-primary/15",
                filter.icon && "gap-0.5"
              )}
              onClick={() => setFilterType(filter.value as FilterType)}
            >
              {filter.icon}
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Tag filter */}
        <div className="flex items-center gap-1 flex-wrap">
          <Tag className="w-3 h-3 text-muted-foreground mr-0.5" />
          <Button
            variant={filterTag === '' ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              "h-5 px-2 text-[9px] rounded-full transition-all duration-200",
              filterTag === '' && "bg-muted"
            )}
            onClick={() => setFilterTag('')}
          >
            All Tags
          </Button>
          {TOPIC_TAGS.map(tag => (
            <Button
              key={tag.value}
              variant={filterTag === tag.value ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                "h-5 px-2 text-[9px] rounded-full transition-all duration-200 border border-transparent",
                filterTag === tag.value && cn("border", tag.color)
              )}
              onClick={() => setFilterTag(tag.value)}
            >
              {tag.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Topics List with Drag & Drop */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        {filteredTopics.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Không tìm thấy topic nào
            </p>
            <p className="text-xs text-muted-foreground/70">
              Thử thay đổi từ khóa hoặc bộ lọc
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-3 text-xs h-7 gap-1"
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setFilterTag('');
              }}
            >
              <X className="w-3 h-3" />
              Xóa bộ lọc
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filteredTopics.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="p-2 space-y-2">
                {filteredTopics.map((topic, index) => (
                  <div key={topic.id} data-topic-id={topic.id}>
                    <SortableTopicItem
                      topic={topic}
                      index={index}
                      editingTopic={editingTopic}
                      copiedId={copiedId}
                      searchQuery={searchQuery}
                      onEdit={handleEdit}
                      onCopy={handleCopy}
                      onDelete={handleDelete}
                      onSaveToBank={onSaveToBank ? handleSaveToBank : undefined}
                      onRefine={onRefine}
                      onCreateContent={onCreateContent}
                      setEditingTopic={setEditingTopic}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={handleCancelEdit}
                      onToggleStar={handleToggleStar}
                      onDuplicate={handleDuplicate}
                      onTagChange={handleTagChange}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </ScrollArea>

      {/* Footer with bulk actions */}
      {topics.length > 0 && (
        <div className="p-3 border-t bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 border border-border/50">
                <Check className="w-2.5 h-2.5 text-green-500" />
                <span className="tabular-nums font-medium">{savedCount}/{topics.length}</span>
              </div>
              {starredCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 border border-border/50">
                  <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                  <span className="tabular-nums font-medium">{starredCount}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {onSaveToBank && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-xs gap-1.5 rounded-full hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30 transition-all duration-200"
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
                className="h-7 text-xs gap-1.5 rounded-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-200"
                onClick={handleDeleteAll}
              >
                <Trash className="w-3 h-3" />
                Xóa tất cả
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <AlertDialogContent className="animate-scale-in">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
              <Trash className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Xóa tất cả topics?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Bạn có chắc muốn xóa <span className="font-semibold text-foreground">{topics.length} topics</span>? 
              <br />Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="rounded-full">Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full gap-1.5"
            >
              <Trash className="w-3.5 h-3.5" />
              Xóa tất cả
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
