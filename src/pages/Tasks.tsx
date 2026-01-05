import { useState, useEffect, useMemo, useCallback } from 'react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
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
  CalendarDays,
  CalendarRange,
  Sparkles,
  X,
  Filter,
  Eye,
  ThumbsUp,
  ThumbsDown,
  FileEdit
} from 'lucide-react';
import { ContentTaskCard } from '@/components/ContentTaskCard';
import { TasksFAB } from '@/components/TasksFAB';
import { TasksKanbanBoard, ContentTask } from '@/components/TasksKanbanBoard';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { TasksPagination } from '@/components/TasksPagination';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { useContentAssignments } from '@/hooks/useContentAssignments';
import { useContentSchedules } from '@/hooks/useContentSchedules';
import { useCreatorProfiles, CreatorProfile } from '@/hooks/useCreatorProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Skeleton } from '@/components/ui/skeleton';
import { CHANNELS, Channel, CONTENT_STATUSES, ContentStatus } from '@/types/multichannel';
import { ASSIGNMENT_STATUSES, AssignmentStatus, AssignmentPriority, ASSIGNMENT_PRIORITIES } from '@/types/assignment';
import { toast } from 'sonner';
import { useConfetti } from '@/hooks/useConfetti';

export default function Tasks() {
  const { user } = useAuth();
  const { contents, loading: loadingContents, refetch: refetchContents, updateStatus, deleteContent, submitForReview, approveContent, rejectContent, bulkSubmitForReview, bulkApproveContent, bulkRejectContent, approvingContent } = useMultiChannelContents();
  const { assignments, myAssignments, isLoading: loadingAssignments, refreshAssignments, updateAssignmentStatus } = useContentAssignments();
  const { allSchedules, fetchAllSchedules, isLoading: loadingSchedules } = useContentSchedules();
  const { fireConfetti } = useConfetti();
  const { currentRole } = useOrganizationContext();

  // Collect all user IDs once and fetch profiles at parent level
  const allUserIds = useMemo(() => {
    const ids = new Set<string>();
    contents.forEach(c => c.user_id && ids.add(c.user_id));
    assignments.forEach(a => {
      if (a.assigned_to) ids.add(a.assigned_to);
      if (a.assigned_by) ids.add(a.assigned_by);
    });
    return Array.from(ids);
  }, [contents, assignments]);

  const { profiles: creatorProfiles, isLoading: loadingProfiles } = useCreatorProfiles(allUserIds);

  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'review' | 'approved' | 'draft'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchAllSchedules();
  }, []);

  // Clear selection and reset page when filters or tab changes
  useEffect(() => {
    setSelectedIds(new Set());
    setCurrentPage(1);
  }, [activeTab, statusFilter, approvalFilter, channelFilter, priorityFilter, deadlineFilter, searchQuery]);

  const handleRefresh = () => {
    refetchContents();
    refreshAssignments();
    fetchAllSchedules();
    setSelectedIds(new Set());
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

  // Get deadline date range helper
  const getDeadlineDateRange = useCallback((filter: 'today' | 'week' | 'month') => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, []);

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
      // Approval status filter
      if (approvalFilter !== 'all' && ct.content.status !== approvalFilter) return false;
      if (channelFilter !== 'all') {
        const hasChannel = ct.content.selected_channels.includes(channelFilter as Channel);
        if (!hasChannel) return false;
      }
      if (priorityFilter !== 'all') {
        const hasPriority = ct.assignments.some(a => a.priority === priorityFilter);
        if (!hasPriority) return false;
      }
      // Deadline filter
      if (deadlineFilter !== 'all') {
        const range = getDeadlineDateRange(deadlineFilter);
        // Check content deadline
        const hasMatchingDeadline = ct.content.deadline && 
          isWithinInterval(parseISO(ct.content.deadline), range);
        // Check assignment due dates
        const hasMatchingAssignment = ct.assignments.some(a => 
          a.due_date && isWithinInterval(parseISO(a.due_date), range)
        );
        // Check schedule dates
        const hasMatchingSchedule = ct.schedules.some(s => 
          s.scheduled_at && isWithinInterval(parseISO(s.scheduled_at), range)
        );
        if (!hasMatchingDeadline && !hasMatchingAssignment && !hasMatchingSchedule) return false;
      }
      return true;
    });
  }, [filteredByTab, searchQuery, statusFilter, approvalFilter, channelFilter, priorityFilter, deadlineFilter, getDeadlineDateRange]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTasks, currentPage, itemsPerPage]);

  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    setSelectedIds(new Set());
    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, []);

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
    const approved = contents.filter(c => c.status === 'approved').length;
    const draft = contents.filter(c => c.status === 'draft').length;
    
    return { total, completed, inReview, approved, draft, scheduled, myPending, overdue, completionRate };
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

  // Bulk action handlers
  const handleSelectAll = useCallback(() => {
    const allIds = filteredTasks.map(t => t.content.id);
    setSelectedIds(new Set(allIds));
  }, [filteredTasks]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleBulkStatusChange = useCallback(async (status: ContentStatus) => {
    if (selectedIds.size === 0) return;
    
    setIsUpdating(true);
    try {
      const promises = Array.from(selectedIds).map(id => updateStatus(id, status));
      await Promise.all(promises);
      toast.success(`Đã cập nhật trạng thái ${selectedIds.size} nội dung`);
      setSelectedIds(new Set());
      handleRefresh();
      
      // Fire confetti when publishing
      if (status === 'published') {
        fireConfetti();
      }
    } catch (error) {
      toast.error('Có lỗi khi cập nhật trạng thái');
    } finally {
      setIsUpdating(false);
    }
  }, [selectedIds, updateStatus, fireConfetti]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      const promises = Array.from(selectedIds).map(id => deleteContent(id));
      await Promise.all(promises);
      toast.success(`Đã xóa ${selectedIds.size} nội dung`);
      setSelectedIds(new Set());
      handleRefresh();
    } catch (error) {
      toast.error('Có lỗi khi xóa nội dung');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, deleteContent]);

  // Bulk approval handlers
  const handleBulkApprove = useCallback(async (notes?: string) => {
    if (selectedIds.size === 0) return;
    
    const reviewContentIds = Array.from(selectedIds).filter(id => {
      const content = contents.find(c => c.id === id);
      return content?.status === 'review';
    });
    
    if (reviewContentIds.length === 0) {
      toast.error('Không có nội dung nào đang chờ duyệt');
      return;
    }
    
    await bulkApproveContent(reviewContentIds, notes);
    setSelectedIds(new Set());
    handleRefresh();
    fireConfetti();
  }, [selectedIds, contents, bulkApproveContent, fireConfetti]);

  const handleBulkReject = useCallback(async (reason: string) => {
    if (selectedIds.size === 0) return;
    
    const reviewContentIds = Array.from(selectedIds).filter(id => {
      const content = contents.find(c => c.id === id);
      return content?.status === 'review';
    });
    
    if (reviewContentIds.length === 0) {
      toast.error('Không có nội dung nào đang chờ duyệt');
      return;
    }
    
    await bulkRejectContent(reviewContentIds, reason);
    setSelectedIds(new Set());
    handleRefresh();
  }, [selectedIds, contents, bulkRejectContent]);

  const handleBulkSubmitForReview = useCallback(async (notes?: string) => {
    if (selectedIds.size === 0) return;
    
    const draftContentIds = Array.from(selectedIds).filter(id => {
      const content = contents.find(c => c.id === id);
      return content?.status === 'draft';
    });
    
    if (draftContentIds.length === 0) {
      toast.error('Không có nội dung nháp nào để gửi duyệt');
      return;
    }
    
    await bulkSubmitForReview(draftContentIds, notes);
    setSelectedIds(new Set());
    handleRefresh();
  }, [selectedIds, contents, bulkSubmitForReview]);

  // Check if selected items have reviewable or draft content
  const selectedContentStatuses = useMemo(() => {
    const selected = Array.from(selectedIds);
    const hasReviewable = selected.some(id => {
      const content = contents.find(c => c.id === id);
      return content?.status === 'review';
    });
    const hasDraft = selected.some(id => {
      const content = contents.find(c => c.id === id);
      return content?.status === 'draft';
    });
    return { hasReviewable, hasDraft };
  }, [selectedIds, contents]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (approvalFilter !== 'all') count++;
    if (channelFilter !== 'all') count++;
    if (priorityFilter !== 'all') count++;
    if (deadlineFilter !== 'all') count++;
    if (searchQuery) count++;
    return count;
  }, [statusFilter, approvalFilter, channelFilter, priorityFilter, deadlineFilter, searchQuery]);

  const clearAllFilters = () => {
    setStatusFilter('all');
    setApprovalFilter('all');
    setChannelFilter('all');
    setPriorityFilter('all');
    setDeadlineFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-full overflow-x-hidden" style={{ contain: 'layout style' }}>
      {/* Header with animated gradient background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/3 p-4 sm:p-6 border border-border/50">
        {/* Static background orbs - no animation to prevent layout shifts */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl opacity-60" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary/10 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg glow-primary">
              <ClipboardList className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gradient">
                Quản lý công việc
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                Theo dõi tiến độ và quản lý nội dung của bạn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(v) => v && setViewMode(v as 'grid' | 'kanban')}
              className="bg-background/80 backdrop-blur-sm p-1 rounded-xl border border-border/50 shadow-sm"
            >
              <ToggleGroupItem 
                value="grid" 
                aria-label="Grid view" 
                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-md h-9 w-9 rounded-lg transition-all"
              >
                <LayoutGrid className="w-4 h-4" />
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="kanban" 
                aria-label="Kanban view" 
                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-md h-9 w-9 rounded-lg transition-all"
              >
                <Columns3 className="w-4 h-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={isLoading}
              className="h-9 px-3 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background hover:border-primary/30 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="ml-2 hidden sm:inline">Làm mới</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards with hover effects */}
        <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mt-5">
          <Card className="stat-card-glow border-border/50 bg-background/80 backdrop-blur-sm overflow-hidden group">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold number-animate">{stats.total}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Tổng nội dung</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card-glow border-border/50 bg-background/80 backdrop-blur-sm overflow-hidden group">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-green-500 number-animate">{stats.completed}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Đã đăng</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card-glow border-border/50 bg-background/80 backdrop-blur-sm overflow-hidden group">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-yellow-500 number-animate">{stats.inReview}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Chờ duyệt</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card-glow border-border/50 bg-background/80 backdrop-blur-sm overflow-hidden group">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <CalendarCheck className="w-5 h-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-blue-500 number-animate">{stats.scheduled}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Đã lên lịch</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card-glow border-border/50 bg-background/80 backdrop-blur-sm overflow-hidden group">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-purple-500 number-animate">{stats.myPending}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Việc của tôi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`stat-card-glow border-border/50 bg-background/80 backdrop-blur-sm overflow-hidden group ${
            stats.overdue > 0 ? 'border-red-500/40 deadline-urgent' : ''
          }`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
                  stats.overdue > 0 ? 'bg-gradient-to-br from-red-500/20 to-red-500/5' : 'bg-muted/50'
                }`}>
                  <AlertCircle className={`w-5 h-5 ${stats.overdue > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-xl sm:text-2xl font-bold number-animate ${stats.overdue > 0 ? 'text-red-500' : ''}`}>{stats.overdue}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Quá hạn</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Progress Bar */}
        {stats.total > 0 && (
          <Card className="mt-4 border-border/50 bg-background/80 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Tiến độ hoàn thành</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-lg font-bold text-gradient">{stats.completionRate}%</span>
                </div>
              </div>
              <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden progress-shine">
                <div 
                  className="h-full gradient-primary rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  {stats.completed} đã đăng
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {stats.total - stats.completed} còn lại
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Deadline Filters with enhanced styling */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mr-2">
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline font-medium">Deadline:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={deadlineFilter === 'all' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setDeadlineFilter('all')}
            className={`h-8 text-xs sm:text-sm rounded-full px-3 transition-all ${
              deadlineFilter === 'all' ? 'bg-primary/10 text-primary border-primary/20' : 'hover:border-primary/30'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
            Tất cả
          </Button>
          <Button
            variant={deadlineFilter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDeadlineFilter('today')}
            className={`h-8 text-xs sm:text-sm rounded-full px-3 transition-all ${
              deadlineFilter === 'today' ? 'bg-primary hover:bg-primary/90 shadow-md glow-primary' : 'hover:border-primary/30'
            }`}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Hôm nay
          </Button>
          <Button
            variant={deadlineFilter === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDeadlineFilter('week')}
            className={`h-8 text-xs sm:text-sm rounded-full px-3 transition-all ${
              deadlineFilter === 'week' ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md' : 'hover:border-blue-500/30'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5 mr-1.5" />
            Tuần này
          </Button>
          <Button
            variant={deadlineFilter === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDeadlineFilter('month')}
            className={`h-8 text-xs sm:text-sm rounded-full px-3 transition-all ${
              deadlineFilter === 'month' ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md' : 'hover:border-purple-500/30'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
            Tháng này
          </Button>
        </div>
        
        {/* Active filters counter and clear button */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 text-xs rounded-full px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-auto"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Xóa {activeFiltersCount} bộ lọc
          </Button>
        )}
      </div>

      {/* Quick Approval Status Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mr-2">
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline font-medium">Phê duyệt:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={approvalFilter === 'all' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setApprovalFilter('all')}
            className={`h-8 text-xs sm:text-sm rounded-full px-3 transition-all ${
              approvalFilter === 'all' ? 'bg-primary/10 text-primary border-primary/20' : 'hover:border-primary/30'
            }`}
          >
            Tất cả
          </Button>
          <Button
            variant={approvalFilter === 'review' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setApprovalFilter('review')}
            className={`h-8 text-xs sm:text-sm rounded-full px-3 transition-all ${
              approvalFilter === 'review' ? 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-md' : 'hover:border-yellow-500/30'
            }`}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Chờ duyệt
            {stats.inReview > 0 && (
              <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                {stats.inReview}
              </span>
            )}
          </Button>
          <Button
            variant={approvalFilter === 'approved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setApprovalFilter('approved')}
            className={`h-8 text-xs sm:text-sm rounded-full px-3 transition-all ${
              approvalFilter === 'approved' ? 'bg-green-500 hover:bg-green-600 text-white shadow-md' : 'hover:border-green-500/30'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
            Đã duyệt
            {stats.approved > 0 && (
              <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                {stats.approved}
              </span>
            )}
          </Button>
          <Button
            variant={approvalFilter === 'draft' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setApprovalFilter('draft')}
            className={`h-8 text-xs sm:text-sm rounded-full px-3 transition-all ${
              approvalFilter === 'draft' ? 'bg-muted-foreground hover:bg-muted-foreground/90 text-white shadow-md' : 'hover:border-muted-foreground/30'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5 mr-1.5" />
            Nháp/Từ chối
            {stats.draft > 0 && (
              <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                {stats.draft}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Filters with enhanced styling */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Tìm kiếm theo tiêu đề, chủ đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-sm rounded-xl border-border/50 bg-background/80 backdrop-blur-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={`h-10 w-full sm:w-36 text-xs sm:text-sm rounded-xl border-border/50 bg-background/80 backdrop-blur-sm transition-all ${
              statusFilter !== 'all' ? 'border-primary/50 ring-2 ring-primary/20' : ''
            }`}>
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {CONTENT_STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status.color}`} />
                    {status.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className={`h-10 w-full sm:w-36 text-xs sm:text-sm rounded-xl border-border/50 bg-background/80 backdrop-blur-sm transition-all ${
              channelFilter !== 'all' ? 'border-primary/50 ring-2 ring-primary/20' : ''
            }`}>
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
            <SelectTrigger className={`h-10 w-full sm:w-36 text-xs sm:text-sm rounded-xl border-border/50 bg-background/80 backdrop-blur-sm transition-all ${
              priorityFilter !== 'all' ? 'border-primary/50 ring-2 ring-primary/20' : ''
            }`}>
              <SelectValue placeholder="Ưu tiên" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả mức độ</SelectItem>
              {ASSIGNMENT_PRIORITIES.map(priority => (
                <SelectItem key={priority.value} value={priority.value}>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      priority.value === 'urgent' ? 'bg-red-500' :
                      priority.value === 'high' ? 'bg-orange-500' :
                      priority.value === 'normal' ? 'bg-blue-500' : 'bg-muted-foreground'
                    }`} />
                    {priority.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs with enhanced styling */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex sm:h-11 bg-muted/30 backdrop-blur-sm p-1.5 rounded-xl border border-border/50">
          <TabsTrigger 
            value="all" 
            className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-foreground rounded-lg gap-1.5 sm:gap-2 px-3 sm:px-4 transition-all"
          >
            <span className="hidden xs:inline">Tất cả</span>
            <span className="xs:hidden">All</span>
            <Badge variant="secondary" className={`text-[10px] sm:text-xs h-5 px-1.5 min-w-[20px] ${
              activeTab === 'all' ? 'bg-primary/10 text-primary' : ''
            }`}>
              {tabCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="my" 
            className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-foreground rounded-lg gap-1.5 sm:gap-2 px-3 sm:px-4 transition-all"
          >
            <span className="hidden xs:inline">Của tôi</span>
            <span className="xs:hidden">My</span>
            <Badge variant="secondary" className={`text-[10px] sm:text-xs h-5 px-1.5 min-w-[20px] ${
              activeTab === 'my' ? 'bg-primary/10 text-primary' : ''
            }`}>
              {tabCounts.my}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="review" 
            className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-foreground rounded-lg gap-1.5 sm:gap-2 px-3 sm:px-4 transition-all"
          >
            <span className="hidden xs:inline">Chờ duyệt</span>
            <span className="xs:hidden">Review</span>
            <Badge 
              variant="secondary" 
              className={`text-[10px] sm:text-xs h-5 px-1.5 min-w-[20px] ${
                tabCounts.review > 0 ? 'bg-yellow-500/20 text-yellow-600' : ''
              } ${activeTab === 'review' ? 'bg-yellow-500/30' : ''}`}
            >
              {tabCounts.review}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="scheduled" 
            className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-foreground rounded-lg gap-1.5 sm:gap-2 px-3 sm:px-4 transition-all"
          >
            <span className="hidden xs:inline">Đã lên lịch</span>
            <span className="xs:hidden">Plan</span>
            <Badge 
              variant="secondary" 
              className={`text-[10px] sm:text-xs h-5 px-1.5 min-w-[20px] ${
                tabCounts.scheduled > 0 ? 'bg-blue-500/20 text-blue-600' : ''
              } ${activeTab === 'scheduled' ? 'bg-blue-500/30' : ''}`}
            >
              {tabCounts.scheduled}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-5 sm:mt-6 space-y-4">
          {/* Bulk Actions Bar */}
          {filteredTasks.length > 0 && (
            <BulkActionsBar
              selectedCount={selectedIds.size}
              totalCount={filteredTasks.length}
              onSelectAll={handleSelectAll}
              onClearSelection={handleClearSelection}
              onBulkDelete={handleBulkDelete}
              onBulkStatusChange={handleBulkStatusChange}
              onBulkApprove={handleBulkApprove}
              onBulkReject={handleBulkReject}
              onBulkSubmitForReview={handleBulkSubmitForReview}
              isDeleting={isDeleting}
              isUpdating={isUpdating}
              isApproving={approvingContent}
              currentRole={currentRole}
              hasReviewableContent={selectedContentStatuses.hasReviewable}
              hasDraftContent={selectedContentStatuses.hasDraft}
            />
          )}

          {isLoading ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl skeleton-shine" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center mb-5 empty-state-icon">
                  <ListTodo className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-muted-foreground mb-2">
                  Không có nội dung nào
                </h3>
                <p className="text-sm text-muted-foreground/70 max-w-md">
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
              currentRole={currentRole}
              creatorProfiles={creatorProfiles}
              onContentStatusChange={updateStatus}
              onAssignmentStatusChange={updateAssignmentStatus}
              onRefresh={handleRefresh}
              onDelete={deleteContent}
              onSubmitForReview={submitForReview}
              onApprove={approveContent}
              onReject={rejectContent}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          ) : (
            <>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedTasks.map(({ content, assignments, schedules }, index) => (
                  <div key={content.id} className="stagger-item" style={{ animationDelay: `${index * 50}ms` }}>
                    <ContentTaskCard
                      content={content}
                      assignments={assignments}
                      schedules={schedules}
                      currentUserId={user?.id}
                      currentRole={currentRole}
                      creatorProfiles={creatorProfiles}
                      onAssignmentStatusChange={updateAssignmentStatus}
                      onRefresh={handleRefresh}
                      onStatusChange={updateStatus}
                      onDelete={deleteContent}
                      onSubmitForReview={submitForReview}
                      onApprove={approveContent}
                      onReject={rejectContent}
                      isSelected={selectedIds.has(content.id)}
                      onToggleSelect={() => handleToggleSelect(content.id)}
                    />
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              <TasksPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredTasks.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Floating Action Button */}
      <TasksFAB />
    </div>
  );
}
