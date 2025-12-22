import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { 
  Download, 
  Search,
  Calendar as CalendarIcon,
  TrendingUp,
  FileSpreadsheet,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { usePublishingLogs } from '@/hooks/usePublishingLogs';
import { PUBLISHING_ACTIONS } from '@/types/publishing';
import { CHANNELS } from '@/types/multichannel';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const channelColors: Record<string, string> = {
  facebook: '#4F46E5',
  instagram: '#EC4899',
  linkedin: '#0EA5E9',
  twitter: '#1D9BF4',
  youtube: '#EF4444',
  tiktok: '#000000',
  telegram: '#0088CC',
  zalo_oa: '#0068FF',
  google_maps: '#34A853',
  website: '#8B5CF6',
  email: '#F59E0B',
};

const actionIcons: Record<string, React.ReactNode> = {
  published: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
  scheduled: <Clock className="h-4 w-4 text-yellow-500" />,
  cancelled: <XCircle className="h-4 w-4 text-muted-foreground" />,
  rescheduled: <RefreshCw className="h-4 w-4 text-blue-500" />,
};

const actionColors: Record<string, string> = {
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  scheduled: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  rescheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function PublishingHistory() {
  const { logs, isLoading, fetchLogs } = usePublishingLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(false);
  const [displayedItems, setDisplayedItems] = useState(25);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const tableEndRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = !searchQuery || 
        log.channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.error_message && log.error_message.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesChannel = channelFilter === 'all' || log.channel === channelFilter;
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      
      const logDate = parseISO(log.performed_at);
      const matchesDate = logDate >= startOfDay(dateRange.from) && logDate <= endOfDay(dateRange.to);
      
      return matchesSearch && matchesChannel && matchesAction && matchesDate;
    });
  }, [logs, searchQuery, channelFilter, actionFilter, dateRange]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setDisplayedItems(itemsPerPage);
  }, [searchQuery, channelFilter, actionFilter, dateRange, itemsPerPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // Paginated or infinite scroll logs
  const displayedLogs = useMemo(() => {
    if (useInfiniteScroll) {
      return filteredLogs.slice(0, displayedItems);
    }
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, useInfiniteScroll, displayedItems, startIndex, endIndex]);

  // Infinite scroll handler
  const loadMore = useCallback(() => {
    if (isLoadingMore || displayedItems >= filteredLogs.length) return;
    
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedItems(prev => Math.min(prev + itemsPerPage, filteredLogs.length));
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, displayedItems, filteredLogs.length, itemsPerPage]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!useInfiniteScroll) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedItems < filteredLogs.length) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (tableEndRef.current) {
      observerRef.current.observe(tableEndRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [useInfiniteScroll, loadMore, displayedItems, filteredLogs.length]);

  // Pagination navigation
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Statistics
  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const published = filteredLogs.filter(l => l.action === 'published').length;
    const failed = filteredLogs.filter(l => l.action === 'failed').length;
    const scheduled = filteredLogs.filter(l => l.action === 'scheduled').length;
    
    return { total, published, failed, scheduled };
  }, [filteredLogs]);

  // Daily chart data
  const dailyChartData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    return days.map(day => {
      const dayLogs = filteredLogs.filter(log => {
        const logDate = parseISO(log.performed_at);
        return format(logDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });
      
      return {
        date: format(day, 'dd/MM'),
        published: dayLogs.filter(l => l.action === 'published').length,
        scheduled: dayLogs.filter(l => l.action === 'scheduled').length,
        failed: dayLogs.filter(l => l.action === 'failed').length,
      };
    });
  }, [filteredLogs, dateRange]);

  // Channel distribution
  const channelDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    filteredLogs.forEach(log => {
      distribution[log.channel] = (distribution[log.channel] || 0) + 1;
    });
    
    return Object.entries(distribution)
      .map(([channel, count]) => ({
        name: CHANNELS.find(c => c.value === channel)?.label || channel,
        value: count,
        color: channelColors[channel] || '#6B7280',
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLogs]);

  // Export functions
  const exportToCSV = () => {
    const headers = ['Thời gian', 'Kênh', 'Hành động', 'Lỗi', 'Chi tiết'];
    const rows = filteredLogs.map(log => [
      format(parseISO(log.performed_at), 'dd/MM/yyyy HH:mm'),
      CHANNELS.find(c => c.value === log.channel)?.label || log.channel,
      PUBLISHING_ACTIONS.find(a => a.value === log.action)?.label || log.action,
      log.error_message || '',
      JSON.stringify(log.details || {}),
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `publishing-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToExcel = () => {
    // For Excel, we create an HTML table that Excel can parse
    const headers = ['Thời gian', 'Kênh', 'Hành động', 'Lỗi', 'Chi tiết'];
    const rows = filteredLogs.map(log => [
      format(parseISO(log.performed_at), 'dd/MM/yyyy HH:mm'),
      CHANNELS.find(c => c.value === log.channel)?.label || log.channel,
      PUBLISHING_ACTIONS.find(a => a.value === log.action)?.label || log.action,
      log.error_message || '',
      JSON.stringify(log.details || {}),
    ]);
    
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">';
    html += '<head><meta charset="UTF-8"></head><body>';
    html += '<table border="1">';
    html += '<tr>' + headers.map(h => `<th style="background:#f0f0f0;font-weight:bold">${h}</th>`).join('') + '</tr>';
    rows.forEach(row => {
      html += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
    });
    html += '</table></body></html>';
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `publishing-history-${format(new Date(), 'yyyy-MM-dd')}.xls`;
    link.click();
  };

  const chartConfig = {
    published: { label: 'Đã đăng', color: 'hsl(var(--chart-1))' },
    scheduled: { label: 'Lên lịch', color: 'hsl(var(--chart-2))' },
    failed: { label: 'Thất bại', color: 'hsl(var(--chart-3))' },
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lịch sử đăng bài</h1>
          <p className="text-muted-foreground">Theo dõi và thống kê lịch sử đăng bài của bạn</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button size="sm" onClick={() => fetchLogs()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng hoạt động</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đã đăng</p>
                <p className="text-2xl font-bold text-green-600">{stats.published}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lên lịch</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.scheduled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Thất bại</p>
                <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Daily Activity Chart */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Hoạt động theo ngày
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <BarChart data={dailyChartData}>
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="published" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="scheduled" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Channel Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Phân bố theo kênh</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : channelDistribution.length > 0 ? (
              <div className="space-y-2">
                {channelDistribution.slice(0, 5).map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="flex-1 text-sm truncate">{item.name}</span>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Không có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tất cả kênh" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả kênh</SelectItem>
                {CHANNELS.map((channel) => (
                  <SelectItem key={channel.value} value={channel.value}>
                    {channel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tất cả hành động" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả hành động</SelectItem>
                {PUBLISHING_ACTIONS.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-start">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(dateRange.from, 'dd/MM')} - {format(dateRange.to, 'dd/MM/yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="infinite-scroll" className="text-sm">Cuộn vô hạn</Label>
                <Switch
                  id="infinite-scroll"
                  checked={useInfiniteScroll}
                  onCheckedChange={(checked) => {
                    setUseInfiniteScroll(checked);
                    setDisplayedItems(itemsPerPage);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Hiển thị</span>
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(v) => setItemsPerPage(Number(v))}
                >
                  <SelectTrigger className="w-[80px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt.toString()}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">/ trang</span>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {useInfiniteScroll ? (
                <>Đang hiển thị {displayedItems} / {filteredLogs.length} mục</>
              ) : (
                <>
                  Hiển thị {filteredLogs.length > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, filteredLogs.length)} / {filteredLogs.length} mục
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Không có lịch sử nào phù hợp với bộ lọc</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Thời gian</TableHead>
                    <TableHead>Kênh</TableHead>
                    <TableHead>Hành động</TableHead>
                    <TableHead>Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(parseISO(log.performed_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: channelColors[log.channel] || '#6B7280' }}
                          />
                          <span>{CHANNELS.find(c => c.value === log.channel)?.label || log.channel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('gap-1', actionColors[log.action])}>
                          {actionIcons[log.action]}
                          {PUBLISHING_ACTIONS.find(a => a.value === log.action)?.label || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {log.error_message ? (
                          <span className="text-destructive text-sm">{log.error_message}</span>
                        ) : log.details && Object.keys(log.details).length > 0 ? (
                          <span className="text-sm text-muted-foreground truncate block">
                            {JSON.stringify(log.details)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Infinite scroll loader */}
              {useInfiniteScroll && (
                <div ref={tableEndRef} className="p-4 flex justify-center">
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Đang tải thêm...</span>
                    </div>
                  ) : displayedItems < filteredLogs.length ? (
                    <Button variant="ghost" size="sm" onClick={loadMore}>
                      Tải thêm ({filteredLogs.length - displayedItems} còn lại)
                    </Button>
                  ) : displayedItems > 0 ? (
                    <span className="text-sm text-muted-foreground">Đã hiển thị tất cả</span>
                  ) : null}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Traditional Pagination */}
      {!useInfiniteScroll && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {getPageNumbers().map((page, idx) => (
            typeof page === 'number' ? (
              <Button
                key={idx}
                variant={currentPage === page ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => goToPage(page)}
              >
                {page}
              </Button>
            ) : (
              <span key={idx} className="px-2 text-muted-foreground">...</span>
            )
          ))}
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
