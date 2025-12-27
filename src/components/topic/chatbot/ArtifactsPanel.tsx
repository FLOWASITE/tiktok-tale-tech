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
          "group p-1.5 sm:p-2 rounded-md sm:rounded-lg border transition-all duration-200",
          "hover:shadow-sm",
          isEditing 
            ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
            : "border-border/50 hover:border-primary/30 bg-background",
          topic.isSaved && !isEditing && "border-green-500/30 bg-green-500/5",
          topic.isStarred && !isEditing && !topic.isSaved && "border-yellow-500/30 bg-yellow-500/5",
          isDragging && "shadow-md scale-[1.01] z-50"
        )}
      >
        {isEditing ? (
          <div className="space-y-1.5 sm:space-y-2">
            <Input
              value={editingTopic.topic}
              onChange={(e) => setEditingTopic({ ...editingTopic, topic: e.target.value })}
              className="h-7 text-xs"
              placeholder="Topic..."
              autoFocus
            />
            <Textarea
              value={editingTopic.reason || ''}
              onChange={(e) => setEditingTopic({ ...editingTopic, reason: e.target.value })}
              className="min-h-[36px] sm:min-h-[40px] text-xs resize-none"
              placeholder="Lý do..."
            />
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <Input
                value={editingTopic.format || ''}
                onChange={(e) => setEditingTopic({ ...editingTopic, format: e.target.value })}
                className="h-6 sm:h-7 text-[10px] sm:text-xs flex-1 min-w-[60px]"
                placeholder="Format..."
              />
              <Select
                value={editingTopic.tag || 'none'}
                onValueChange={(value) => setEditingTopic({ ...editingTopic, tag: (value === 'none' ? '' : value) as TopicTagValue })}
              >
                <SelectTrigger className="h-6 sm:h-7 text-[10px] sm:text-xs w-16 sm:w-24">
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {TOPIC_TAGS.map(tag => (
                    <SelectItem key={tag.value} value={tag.value}>{tag.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-6 sm:h-7 px-2 text-xs" onClick={onSaveEdit}>
                <Save className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 sm:h-7 px-2 text-xs" onClick={onCancelEdit}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-1 sm:gap-1.5">
            {/* Hide drag handle on mobile */}
            <div 
              className="hidden sm:flex items-center gap-0.5 text-muted-foreground/40 cursor-grab hover:text-muted-foreground active:cursor-grabbing shrink-0 mt-0.5"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-3 h-3" />
              <span className="text-[9px] font-mono tabular-nums">{index + 1}</span>
            </div>
            
            <button
              onClick={() => onToggleStar(topic.id)}
              className={cn(
                "p-0.5 rounded shrink-0 mt-0.5",
                topic.isStarred ? "text-yellow-500" : "text-muted-foreground/30 hover:text-yellow-500"
              )}
            >
              <Star className={cn("w-3 h-3", topic.isStarred && "fill-current")} />
            </button>
            
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-medium leading-tight line-clamp-2">
                <HighlightText text={topic.topic} query={searchQuery} />
              </p>
              {topic.reason && (
                <p className="text-[9px] sm:text-[10px] text-muted-foreground/70 line-clamp-1 mt-0.5">
                  <HighlightText text={topic.reason} query={searchQuery} />
                </p>
              )}
              <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1 flex-wrap">
                {topic.format && (
                  <Badge variant="outline" className="text-[8px] sm:text-[9px] h-3.5 sm:h-4 px-1 border-primary/20 text-primary/70">
                    {topic.format}
                  </Badge>
                )}
                {tagConfig && (
                  <Badge variant="outline" className={cn("text-[8px] sm:text-[9px] h-3.5 sm:h-4 px-1", tagConfig.color)}>
                    {tagConfig.label}
                  </Badge>
                )}
                {topic.isSaved && (
                  <Badge variant="secondary" className="text-[8px] sm:text-[9px] h-3.5 sm:h-4 px-1 bg-green-500/10 text-green-600">
                    <Check className="w-2 h-2 sm:mr-0.5" /><span className="hidden sm:inline">Saved</span>
                  </Badge>
                )}
              </div>
            </div>

            {/* Mobile: Single dropdown for all actions */}
            <div className="flex sm:hidden shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Pencil className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => onCreateContent(topic, 'multichannel')} className="text-xs gap-2">
                    <MessageSquare className="w-3 h-3" /> Multi-channel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateContent(topic, 'script')} className="text-xs gap-2">
                    <Video className="w-3 h-3" /> Script
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateContent(topic, 'carousel')} className="text-xs gap-2">
                    <Images className="w-3 h-3" /> Carousel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(topic)} className="text-xs gap-2">
                    <Pencil className="w-3 h-3" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCopy(topic)} className="text-xs gap-2">
                    <Copy className="w-3 h-3" /> Copy
                  </DropdownMenuItem>
                  {!topic.isSaved && onSaveToBank && (
                    <DropdownMenuItem onClick={() => onSaveToBank(topic)} className="text-xs gap-2">
                      <BookmarkPlus className="w-3 h-3" /> Save
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDeleteClick} className="text-xs gap-2 text-destructive">
                    <Trash2 className="w-3 h-3" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          
            {/* Desktop: Full action row */}
            <div className="hidden sm:flex items-center gap-0.5 shrink-0 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0">
                    <Pencil className="w-2.5 h-2.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onClick={() => onEdit(topic)} className="text-xs gap-2">
                    <Pencil className="w-3 h-3" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCopy(topic)} className="text-xs gap-2">
                    <Copy className="w-3 h-3" /> Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(topic)} className="text-xs gap-2">
                    <CopyPlus className="w-3 h-3" /> Duplicate
                  </DropdownMenuItem>
                  {!topic.isSaved && onSaveToBank && (
                    <DropdownMenuItem onClick={() => onSaveToBank(topic)} className="text-xs gap-2">
                      <BookmarkPlus className="w-3 h-3" /> Save
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDeleteClick} className="text-xs gap-2 text-destructive">
                    <Trash2 className="w-3 h-3" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center gap-0.5 bg-muted/50 rounded p-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[9px]" onClick={() => onCreateContent(topic, 'multichannel')}>
                      <MessageSquare className="w-2.5 h-2.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Multi-channel</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[9px]" onClick={() => onCreateContent(topic, 'script')}>
                      <Video className="w-2.5 h-2.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Script</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[9px]" onClick={() => onCreateContent(topic, 'carousel')}>
                      <Images className="w-2.5 h-2.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Carousel</TooltipContent>
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
      "w-full sm:w-auto",
      className
    )}>
      {/* Compact Header - More compact on mobile */}
      <div className="flex items-center justify-between px-1.5 sm:px-2 py-1 sm:py-1.5 border-b bg-muted/30">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-primary" />
          <span className="font-medium text-[10px] sm:text-xs">Topics</span>
          <Badge variant="secondary" className="text-[8px] sm:text-[9px] h-3.5 sm:h-4 px-1 tabular-nums">
            {filteredTopics.length}/{topics.length}
          </Badge>
          {starredCount > 0 && (
            <Badge variant="outline" className="text-[8px] sm:text-[9px] h-3.5 sm:h-4 px-1 gap-0.5 border-yellow-500/30 text-yellow-600">
              <Star className="w-2 h-2 fill-current" />{starredCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center">
          {/* Hide export on mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden sm:flex h-6 w-6">
                <Download className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={handleExportJSON} className="text-xs gap-2">
                <FileJson className="w-3 h-3" /> JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="text-xs gap-2">
                <FileSpreadsheet className="w-3 h-3" /> CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6" onClick={handleAddNew}>
            <Plus className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex h-6 w-6" onClick={() => setIsCollapsed(true)}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6" onClick={onClose}>
            <X className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          </Button>
        </div>
      </div>

      {/* Compact Search & Filter - Stacked on mobile */}
      <div className="px-1.5 sm:px-2 py-1 sm:py-1.5 border-b space-y-1">
        <div className="relative">
          <Search className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="h-6 sm:h-7 pl-6 sm:pl-7 pr-6 sm:pr-7 text-[10px] sm:text-xs"
          />
          {searchQuery && (
            <Button variant="ghost" size="icon" className="absolute right-0.5 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5" onClick={() => setSearchQuery('')}>
              <X className="w-2 sm:w-2.5 h-2 sm:h-2.5" />
            </Button>
          )}
        </div>
        
        {/* Filter buttons - scrollable on mobile */}
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {(['all', 'starred', 'saved', 'unsaved'] as const).map(f => (
            <Button
              key={f}
              variant={filterType === f ? 'secondary' : 'ghost'}
              size="sm"
              className={cn("h-5 px-1.5 text-[8px] sm:text-[9px] shrink-0", filterType === f && "bg-primary/10 text-primary")}
              onClick={() => setFilterType(f)}
            >
              {f === 'starred' && <Star className="w-2 h-2 mr-0.5" />}
              {f === 'all' ? 'All' : f === 'starred' ? '' : f === 'saved' ? 'Saved' : 'New'}
            </Button>
          ))}
          <div className="w-px h-3 bg-border mx-0.5 shrink-0" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={filterTag ? 'secondary' : 'ghost'} size="sm" className="h-5 px-1.5 text-[8px] sm:text-[9px] gap-0.5 shrink-0">
                <Tag className="w-2 h-2" />
                <span className="hidden sm:inline">{filterTag ? TOPIC_TAGS.find(t => t.value === filterTag)?.label : 'Tags'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-28">
              <DropdownMenuItem onClick={() => setFilterTag('')} className="text-xs">All Tags</DropdownMenuItem>
              <DropdownMenuSeparator />
              {TOPIC_TAGS.map(tag => (
                <DropdownMenuItem key={tag.value} onClick={() => setFilterTag(tag.value)} className="text-xs gap-2">
                  <div className={cn("w-2 h-2 rounded-full", tag.color.split(' ')[0])} />
                  {tag.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Topics List */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        {filteredTopics.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <Search className="w-4 h-4 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">No topics found</p>
            <Button variant="ghost" size="sm" className="mt-2 text-xs h-6" onClick={() => { setSearchQuery(''); setFilterType('all'); setFilterTag(''); }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredTopics.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="p-1.5 space-y-1">
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

      {/* Compact Footer - Even more compact on mobile */}
      {topics.length > 0 && (
        <div className="px-1.5 sm:px-2 py-1 sm:py-1.5 border-t flex items-center justify-between">
          <span className="text-[8px] sm:text-[9px] text-muted-foreground tabular-nums">
            {savedCount}/{topics.length}
          </span>
          <div className="flex items-center gap-0.5 sm:gap-1">
            {onSaveToBank && (
              <Button size="sm" variant="ghost" className="h-5 sm:h-6 text-[8px] sm:text-[9px] px-1.5 sm:px-2" onClick={handleSaveAll} disabled={topics.every(t => t.isSaved)}>
                <BookmarkPlus className="w-2.5 h-2.5" /><span className="hidden sm:inline ml-1">Save all</span>
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-5 sm:h-6 text-[8px] sm:text-[9px] px-1.5 sm:px-2 text-destructive" onClick={handleDeleteAll}>
              <Trash className="w-2.5 h-2.5" /><span className="hidden sm:inline ml-1">Clear</span>
            </Button>
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
