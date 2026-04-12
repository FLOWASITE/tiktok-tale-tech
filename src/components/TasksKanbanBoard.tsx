import { useMemo, useState, memo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MultiChannelContent, ContentStatus } from '@/types/multichannel';
import { ContentAssignment, AssignmentStatus } from '@/types/assignment';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { FileEdit, Clock, CheckCircle, Send } from 'lucide-react';
import { useConfetti } from '@/hooks/useConfetti';
import { OrgRole } from '@/types/organization';
import { CreatorProfile } from '@/hooks/useCreatorProfiles';

export interface ContentTask {
  content: MultiChannelContent;
  assignments: ContentAssignment[];
  schedules: any[];
}

interface TasksKanbanBoardProps {
  tasks: ContentTask[];
  currentUserId?: string;
  currentRole?: OrgRole | null;
  creatorProfiles?: Record<string, CreatorProfile>;
  onContentStatusChange: (contentId: string, status: ContentStatus) => Promise<any>;
  onAssignmentStatusChange: (assignmentId: string, status: AssignmentStatus) => Promise<void>;
  onRefresh: () => void;
  onDelete?: (contentId: string) => Promise<void>;
  onSubmitForReview?: (contentId: string, notes?: string) => Promise<any>;
  onApprove?: (contentId: string, notes?: string) => Promise<any>;
  onReject?: (contentId: string, reason: string) => Promise<any>;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

// Define columns based on content status
const KANBAN_COLUMNS: { id: ContentStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { 
    id: 'draft', 
    label: 'Bản nháp', 
    color: 'bg-gradient-to-r from-slate-500/20 to-slate-500/10',
    icon: <FileEdit className="w-4 h-4 text-slate-500" />
  },
  { 
    id: 'review', 
    label: 'Chờ duyệt', 
    color: 'bg-gradient-to-r from-amber-500/20 to-amber-500/10',
    icon: <Clock className="w-4 h-4 text-amber-500" />
  },
  { 
    id: 'approved', 
    label: 'Đã duyệt', 
    color: 'bg-gradient-to-r from-blue-500/20 to-blue-500/10',
    icon: <CheckCircle className="w-4 h-4 text-blue-500" />
  },
  { 
    id: 'partially_published', 
    label: 'Đăng 1 phần', 
    color: 'bg-gradient-to-r from-teal-500/20 to-teal-500/10',
    icon: <Send className="w-4 h-4 text-teal-500" />
  },
  { 
    id: 'published', 
    label: 'Đã đăng', 
    color: 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/10',
    icon: <Send className="w-4 h-4 text-emerald-500" />
  },
];

export function TasksKanbanBoard({
  tasks,
  currentUserId,
  currentRole,
  creatorProfiles,
  onContentStatusChange,
  onAssignmentStatusChange,
  onRefresh,
  onDelete,
  onSubmitForReview,
  onApprove,
  onReject,
  selectedIds,
  onSelectionChange,
}: TasksKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<ContentTask | null>(null);
  const { fireConfetti } = useConfetti();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group tasks by content status
  const columnTasks = useMemo(() => {
    const grouped: Record<ContentStatus, ContentTask[]> = {
      draft: [],
      review: [],
      approved: [],
      partially_published: [],
      published: [],
    };

    tasks.forEach(task => {
      const status = task.content.status || 'draft';
      if (grouped[status]) {
        grouped[status].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.content.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const isColumn = KANBAN_COLUMNS.some(col => col.id === overId);
    
    if (isColumn) {
      const newStatus = overId as ContentStatus;
      const task = tasks.find(t => t.content.id === activeId);
      
      if (task && task.content.status !== newStatus) {
        await onContentStatusChange(activeId, newStatus);
        // Fire confetti when dropping to published
        if (newStatus === 'published') {
          fireConfetti();
        }
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Optional: handle drag over for visual feedback
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    onSelectionChange(newSelected);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="w-full overflow-x-auto" style={{ contain: 'strict' }}>
          <div className="flex gap-3 sm:gap-4 pb-4 min-w-max">
            {KANBAN_COLUMNS.map(column => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                label={column.label}
                color={column.color}
                count={columnTasks[column.id].length}
                icon={column.icon}
              >
                {columnTasks[column.id].map(task => (
                  <KanbanCard
                    key={task.content.id}
                    task={task}
                    currentUserId={currentUserId}
                    currentRole={currentRole}
                    creatorProfiles={creatorProfiles}
                    onAssignmentStatusChange={onAssignmentStatusChange}
                    onRefresh={onRefresh}
                    onStatusChange={onContentStatusChange}
                    onDelete={onDelete}
                    onSubmitForReview={onSubmitForReview}
                    onApprove={onApprove}
                    onReject={onReject}
                    isSelected={selectedIds.has(task.content.id)}
                    onToggleSelect={() => handleToggleSelect(task.content.id)}
                  />
                ))}
              </KanbanColumn>
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <KanbanCard
              task={activeTask}
              currentUserId={currentUserId}
              currentRole={currentRole}
              creatorProfiles={creatorProfiles}
              onAssignmentStatusChange={onAssignmentStatusChange}
              onRefresh={onRefresh}
              isDragging
              isSelected={selectedIds.has(activeTask.content.id)}
              onToggleSelect={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
}