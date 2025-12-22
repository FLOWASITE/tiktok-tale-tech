import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  RefreshCw, 
  ListTodo, 
  ClipboardList, 
  LayoutGrid, 
  Columns3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  Users,
  FileText,
  Sparkles
} from 'lucide-react';
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
        const myContentIds = myAssignments.map(a => a.content_id);
        return contentTasks.filter(ct => myContentIds.includes(ct.content.id));
      case 'review':
        return contentTasks.filter(ct => ct.content.status === 'review');
      case 'scheduled':
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
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = ct.content.title.toLowerCase().includes(query);
        const matchTopic = ct.content.topic.toLowerCase().includes(query);
        if (!matchTitle && !matchTopic) return false;
      }
      if (statusFilter !== 'all' && ct.content.status !== statusFilter) return false;
      if (channelFilter !== 'all') {
        const hasChannel = ct.content.selected_channels.includes(channelFilter as Channel);
        if (!hasChannel) return false;
      }
      if (priorityFilter !== 'all') {
        const hasPriority = ct.assignments.some(a => a.priority === priorityFilter);
        if (!hasPriority) return false;
      }
      return true;
    });
  }, [filteredByTab, searchQuery, statusFilter, channelFilter, priorityFilter]);

  const isLoading = loadingContents || loadingAssignments || loadingSchedules;

  // Stats
  const stats = useMemo(() => {
    const total = contents.length;
    const completed = contents.filter(c => c.status === 'published').length;
    const inReview = contents.filter(c => c.status === 'review').length;
    const scheduled = allSchedules.filter(s => s.publish_status === 'scheduled').length;
    const myPending = myAssignments.filter(a => a.status !== 'completed' && a.status !== 'cancelled').length;
    const overdue = myAssignments.filter(a => 
      a.due_date && new Date(a.due_date) < new Date() && 
      a.status !== 'completed' && a.status !== 'cancelled'
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, inReview, scheduled, myPending, overdue, completionRate };
  }, [contents, allSchedules, myAssignments]);

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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Quản lý công việc
              </span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1 ml-10 sm:ml-12">
              Theo dõi tiến độ và quản lý nội dung của bạn
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(v) => v && setViewMode(v as 'grid' | 'kanban')}
              className="bg-muted/50 p-1 rounded-lg"
            >
              <ToggleGroupItem 
                value="grid" 
                aria-label="Grid view" 
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm h-8 w-8 sm:h-9 sm:w-9"
              >
                <LayoutGrid className="w-4 h-4" />
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="kanban" 
                aria-label="Kanban view" 
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm h-8 w-8 sm:h-9 sm:w-9"
              >
                <Columns3 className="w-4 h-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={isLoading}
              className="h-8 sm:h-9 px-3"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="ml-2 hidden sm:inline">Làm mới</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-bold">{stats.total}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Tổng nội dung</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-green-500/5">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-bold text-green-500">{stats.completed}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Đã đăng</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-yellow-500/5">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-yellow-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-bold text-yellow-500">{stats.inReview}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Chờ duyệt</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-blue-500/5">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-4 h-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-bold text-blue-500">{stats.scheduled}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Đã lên lịch</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-purple-500/5">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-purple-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-bold text-purple-500">{stats.myPending}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Việc của tôi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-border/50 ${stats.overdue > 0 ? 'bg-gradient-to-br from-background to-red-500/10 border-red-500/30' : 'bg-gradient-to-br from-background to-muted/20'}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stats.overdue > 0 ? 'bg-red-500/10' : 'bg-muted'}`}>
                  <AlertCircle className={`w-4 h-4 ${stats.overdue > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-lg sm:text-xl font-bold ${stats.overdue > 0 ? 'text-red-500' : ''}`}>{stats.overdue}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Quá hạn</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        {stats.total > 0 && (
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs sm:text-sm font-medium">Tiến độ hoàn thành</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-xs sm:text-sm font-bold text-primary">{stats.completionRate}%</span>
                </div>
              </div>
              <Progress value={stats.completionRate} className="h-2" />
              <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-muted-foreground">
                <span>{stats.completed} đã đăng</span>
                <span>{stats.total - stats.completed} còn lại</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tiêu đề, chủ đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 sm:h-10 text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 sm:h-10 w-full sm:w-36 text-xs sm:text-sm">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {CONTENT_STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="h-9 sm:h-10 w-full sm:w-36 text-xs sm:text-sm">
              <SelectValue placeholder="Kênh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {CHANNELS.map(channel => (
                <SelectItem key={channel.value} value={channel.value}>
                  {channel.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 sm:h-10 w-full sm:w-36 text-xs sm:text-sm">
              <SelectValue placeholder="Ưu tiên" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {ASSIGNMENT_PRIORITIES.map(priority => (
                <SelectItem key={priority.value} value={priority.value}>
                  {priority.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex sm:h-10 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger 
            value="all" 
            className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md gap-1 sm:gap-1.5 px-2 sm:px-4"
          >
            <span className="hidden xs:inline">Tất cả</span>
            <span className="xs:hidden">All</span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs h-4 sm:h-5 px-1 sm:px-1.5 min-w-[18px]">
              {tabCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="my" 
            className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md gap-1 sm:gap-1.5 px-2 sm:px-4"
          >
            <span className="hidden xs:inline">Của tôi</span>
            <span className="xs:hidden">My</span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs h-4 sm:h-5 px-1 sm:px-1.5 min-w-[18px]">
              {tabCounts.my}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="review" 
            className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md gap-1 sm:gap-1.5 px-2 sm:px-4"
          >
            <span className="hidden xs:inline">Chờ duyệt</span>
            <span className="xs:hidden">Review</span>
            <Badge 
              variant="secondary" 
              className={`text-[10px] sm:text-xs h-4 sm:h-5 px-1 sm:px-1.5 min-w-[18px] ${tabCounts.review > 0 ? 'bg-yellow-500/20 text-yellow-600' : ''}`}
            >
              {tabCounts.review}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="scheduled" 
            className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md gap-1 sm:gap-1.5 px-2 sm:px-4"
          >
            <span className="hidden xs:inline">Đã lên lịch</span>
            <span className="xs:hidden">Plan</span>
            <Badge 
              variant="secondary" 
              className={`text-[10px] sm:text-xs h-4 sm:h-5 px-1 sm:px-1.5 min-w-[18px] ${tabCounts.scheduled > 0 ? 'bg-blue-500/20 text-blue-600' : ''}`}
            >
              {tabCounts.scheduled}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 sm:mt-6">
          {isLoading ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-56 sm:h-64 rounded-xl" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <ListTodo className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-base sm:text-lg font-medium text-muted-foreground mb-1">
                  Không có nội dung nào
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground/70 max-w-sm">
                  {activeTab === 'my'
                    ? 'Bạn chưa được phân công nội dung nào. Liên hệ quản lý để được giao việc.'
                    : activeTab === 'review'
                    ? 'Không có nội dung nào đang chờ duyệt. Tất cả đã được xử lý!'
                    : activeTab === 'scheduled'
                    ? 'Không có nội dung nào được lên lịch. Hãy lên lịch đăng bài.'
                    : 'Hãy tạo nội dung mới từ Đa kênh hoặc các phân hệ khác.'}
                </p>
              </CardContent>
            </Card>
          ) : viewMode === 'kanban' ? (
            <TasksKanbanBoard
              tasks={filteredTasks}
              currentUserId={user?.id}
              onContentStatusChange={updateStatus}
              onAssignmentStatusChange={updateAssignmentStatus}
              onRefresh={handleRefresh}
            />
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
