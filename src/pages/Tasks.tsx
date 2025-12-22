import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search, Filter, RefreshCw, ListTodo, ClipboardList, LayoutGrid, Columns3 } from 'lucide-react';
import { ContentTaskCard } from '@/components/ContentTaskCard';
import { TasksKanbanBoard, ContentTask } from '@/components/TasksKanbanBoard';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { useContentAssignments } from '@/hooks/useContentAssignments';
import { useContentSchedules } from '@/hooks/useContentSchedules';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { CHANNELS, Channel, CONTENT_STATUSES, ContentStatus } from '@/types/multichannel';
import { ASSIGNMENT_STATUSES, AssignmentStatus, AssignmentPriority, ASSIGNMENT_PRIORITIES } from '@/types/assignment';

export default function Tasks() {
  const { user } = useAuth();
  const { contents, loading: loadingContents, refetch: refetchContents, updateStatus } = useMultiChannelContents();
  const { assignments, myAssignments, isLoading: loadingAssignments, refreshAssignments, updateAssignmentStatus } = useContentAssignments();
  const { allSchedules, fetchAllSchedules, isLoading: loadingSchedules } = useContentSchedules();

  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    fetchAllSchedules();
  }, []);

  const handleRefresh = () => {
    refetchContents();
    refreshAssignments();
    fetchAllSchedules();
  };

  // Aggregate data: content + assignments + schedules
  const contentTasks = useMemo(() => {
    return contents.map(content => {
      const contentAssignments = assignments.filter(a => a.content_id === content.id);
      const contentSchedules = allSchedules.filter(s => s.content_id === content.id);
      return {
        content,
        assignments: contentAssignments,
        schedules: contentSchedules,
      };
    });
  }, [contents, assignments, allSchedules]);

  // Filter by tab
  const filteredByTab = useMemo(() => {
    switch (activeTab) {
      case 'my':
        // Content assigned to me
        const myContentIds = myAssignments.map(a => a.content_id);
        return contentTasks.filter(ct => myContentIds.includes(ct.content.id));
      case 'review':
        // Content with status = review
        return contentTasks.filter(ct => ct.content.status === 'review');
      case 'scheduled':
        // Content with active schedules
        return contentTasks.filter(ct => 
          ct.schedules.some(s => s.publish_status === 'scheduled')
        );
      default:
        return contentTasks;
    }
  }, [contentTasks, activeTab, myAssignments]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    return filteredByTab.filter(ct => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = ct.content.title.toLowerCase().includes(query);
        const matchTopic = ct.content.topic.toLowerCase().includes(query);
        if (!matchTitle && !matchTopic) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && ct.content.status !== statusFilter) {
        return false;
      }

      // Channel filter
      if (channelFilter !== 'all') {
        const hasChannel = ct.content.selected_channels.includes(channelFilter as Channel);
        if (!hasChannel) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all') {
        const hasPriority = ct.assignments.some(a => a.priority === priorityFilter);
        if (!hasPriority) return false;
      }

      return true;
    });
  }, [filteredByTab, searchQuery, statusFilter, channelFilter, priorityFilter]);

  const isLoading = loadingContents || loadingAssignments || loadingSchedules;

  const tabCounts = useMemo(() => {
    const myContentIds = myAssignments.map(a => a.content_id);
    return {
      all: contentTasks.length,
      my: contentTasks.filter(ct => myContentIds.includes(ct.content.id)).length,
      review: contentTasks.filter(ct => ct.content.status === 'review').length,
      scheduled: contentTasks.filter(ct => 
        ct.schedules.some(s => s.publish_status === 'scheduled')
      ).length,
    };
  }, [contentTasks, myAssignments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Quản lý công việc
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Theo dõi và quản lý tất cả nội dung đã tạo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'grid' | 'kanban')}>
            <ToggleGroupItem value="grid" aria-label="Grid view" className="data-[state=on]:bg-primary/10">
              <LayoutGrid className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Kanban view" className="data-[state=on]:bg-primary/10">
              <Columns3 className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tiêu đề, chủ đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {CONTENT_STATUSES.map(status => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Kênh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả kênh</SelectItem>
            {CHANNELS.map(channel => (
              <SelectItem key={channel.value} value={channel.value}>
                {channel.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Ưu tiên" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả độ ưu tiên</SelectItem>
            {ASSIGNMENT_PRIORITIES.map(priority => (
              <SelectItem key={priority.value} value={priority.value}>
                {priority.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            Tất cả
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {tabCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="my" className="text-xs sm:text-sm">
            Của tôi
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {tabCounts.my}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="review" className="text-xs sm:text-sm">
            Chờ duyệt
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {tabCounts.review}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="text-xs sm:text-sm">
            Đã lên lịch
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {tabCounts.scheduled}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ListTodo className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                Không có nội dung nào
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {activeTab === 'my'
                  ? 'Bạn chưa được phân công nội dung nào'
                  : activeTab === 'review'
                  ? 'Không có nội dung nào đang chờ duyệt'
                  : activeTab === 'scheduled'
                  ? 'Không có nội dung nào đã lên lịch'
                  : 'Hãy tạo nội dung mới từ các phân hệ'}
              </p>
            </div>
          ) : viewMode === 'kanban' ? (
            <TasksKanbanBoard
              tasks={filteredTasks}
              currentUserId={user?.id}
              onContentStatusChange={updateStatus}
              onAssignmentStatusChange={updateAssignmentStatus}
              onRefresh={handleRefresh}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map(({ content, assignments, schedules }) => (
                <ContentTaskCard
                  key={content.id}
                  content={content}
                  assignments={assignments}
                  schedules={schedules}
                  currentUserId={user?.id}
                  onAssignmentStatusChange={updateAssignmentStatus}
                  onRefresh={handleRefresh}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
