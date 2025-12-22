import { useMemo } from 'react';
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
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MultiChannelContent, ContentStatus, CONTENT_STATUSES } from '@/types/multichannel';
import { ContentAssignment, AssignmentStatus, ASSIGNMENT_STATUSES } from '@/types/assignment';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

export interface ContentTask {
  content: MultiChannelContent;
  assignments: ContentAssignment[];
  schedules: any[];
}

interface TasksKanbanBoardProps {
  tasks: ContentTask[];
  currentUserId?: string;
  onContentStatusChange: (contentId: string, status: ContentStatus) => Promise<any>;
  onAssignmentStatusChange: (assignmentId: string, status: AssignmentStatus) => Promise<void>;
  onRefresh: () => void;
}

// Define columns based on content status
const KANBAN_COLUMNS: { id: ContentStatus; label: string; color: string }[] = [
  { id: 'draft', label: 'Nháp', color: 'bg-muted' },
  { id: 'review', label: 'Chờ duyệt', color: 'bg-yellow-500/20' },
  { id: 'approved', label: 'Đã duyệt', color: 'bg-blue-500/20' },
  { id: 'published', label: 'Đã đăng', color: 'bg-green-500/20' },
];

export function TasksKanbanBoard({
  tasks,
  currentUserId,
  onContentStatusChange,
  onAssignmentStatusChange,
  onRefresh,
}: TasksKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<ContentTask | null>(null);

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
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Optional: handle drag over for visual feedback
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map(column => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            label={column.label}
            color={column.color}
            count={columnTasks[column.id].length}
          >
            {columnTasks[column.id].map(task => (
              <KanbanCard
                key={task.content.id}
                task={task}
                currentUserId={currentUserId}
                onAssignmentStatusChange={onAssignmentStatusChange}
                onRefresh={onRefresh}
              />
            ))}
          </KanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <KanbanCard
            task={activeTask}
            currentUserId={currentUserId}
            onAssignmentStatusChange={onAssignmentStatusChange}
            onRefresh={onRefresh}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
