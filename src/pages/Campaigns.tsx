import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Search, 
  Target,
  Flame,
  Clock,
  CheckCircle2,
  LayoutGrid,
  List
} from 'lucide-react';
import { CampaignCard } from '@/components/campaign/CampaignCard';
import { useCampaigns } from '@/hooks/useCampaigns';
import { type Campaign, type CampaignStatus } from '@/types/campaign';
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

type FilterStatus = 'all' | 'active' | 'planning' | 'completed';

export default function Campaigns() {
  const navigate = useNavigate();
  const { campaigns, isLoading, deleteCampaign, updateStatus } = useCampaigns();
  
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(search.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && campaign.status === 'active') ||
      (filterStatus === 'planning' && (campaign.status === 'draft' || campaign.status === 'planning')) ||
      (filterStatus === 'completed' && (campaign.status === 'completed' || campaign.status === 'cancelled'));
    
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    active: campaigns.filter(c => c.status === 'active').length,
    planning: campaigns.filter(c => c.status === 'draft' || c.status === 'planning').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
  };

  const handleView = (campaign: Campaign) => {
    navigate(`/campaigns/${campaign.id}`);
  };

  const handleEdit = (campaign: Campaign) => {
    navigate(`/campaigns/${campaign.id}/edit`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteCampaign(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleStatusChange = async (campaign: Campaign, status: CampaignStatus) => {
    await updateStatus({ id: campaign.id, status });
  };

  return (
    <div className="space-y-3 sm:space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <span className="truncate">Quản lý Chiến dịch</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1 hidden sm:block">
            Theo dõi và quản lý các chiến dịch marketing của bạn
          </p>
        </div>
        <Button onClick={() => navigate('/campaigns/new')} className="gap-2 w-full sm:w-auto shrink-0">
          <Plus className="h-4 w-4" />
          <span>Tạo chiến dịch</span>
        </Button>
      </div>

      {/* Stats - Compact on mobile */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
        <div className="flex items-center gap-1.5 sm:flex-col sm:items-center sm:gap-3 p-2 sm:p-4 rounded-lg sm:rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="p-1 sm:p-2 rounded-md sm:rounded-lg bg-green-500/20 shrink-0">
            <Flame className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-green-500" />
          </div>
          <div className="flex items-baseline gap-1 sm:flex-col sm:items-center min-w-0">
            <p className="text-base sm:text-2xl font-bold">{stats.active}</p>
            <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Chạy</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:flex-col sm:items-center sm:gap-3 p-2 sm:p-4 rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="p-1 sm:p-2 rounded-md sm:rounded-lg bg-blue-500/20 shrink-0">
            <Clock className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1 sm:flex-col sm:items-center min-w-0">
            <p className="text-base sm:text-2xl font-bold">{stats.planning}</p>
            <p className="text-[10px] sm:text-sm text-muted-foreground truncate">KH</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:flex-col sm:items-center sm:gap-3 p-2 sm:p-4 rounded-lg sm:rounded-xl bg-purple-500/10 border border-purple-500/20">
          <div className="p-1 sm:p-2 rounded-md sm:rounded-lg bg-purple-500/20 shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-1 sm:flex-col sm:items-center min-w-0">
            <p className="text-base sm:text-2xl font-bold">{stats.completed}</p>
            <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Xong</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:gap-3">
        {/* Search - Mobile */}
        <div className="relative w-full sm:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Tìm..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Tabs - scrollable on mobile */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
              <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                <TabsList className="inline-flex w-auto min-w-max h-8 sm:h-10">
                  <TabsTrigger value="all" className="text-[10px] sm:text-sm px-2 sm:px-3 h-6 sm:h-8">
                    Tất cả ({campaigns.length})
                  </TabsTrigger>
                  <TabsTrigger value="active" className="text-[10px] sm:text-sm px-2 sm:px-3 h-6 sm:h-8">
                    <span className="hidden sm:inline">Đang chạy</span>
                    <span className="sm:hidden">Chạy</span>
                    <span className="ml-0.5 sm:ml-1">({stats.active})</span>
                  </TabsTrigger>
                  <TabsTrigger value="planning" className="text-[10px] sm:text-sm px-2 sm:px-3 h-6 sm:h-8">
                    <span className="hidden sm:inline">Lên kế hoạch</span>
                    <span className="sm:hidden">KH</span>
                    <span className="ml-0.5 sm:ml-1">({stats.planning})</span>
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="text-[10px] sm:text-sm px-2 sm:px-3 h-6 sm:h-8">
                    <span className="hidden sm:inline">Hoàn thành</span>
                    <span className="sm:hidden">Xong</span>
                    <span className="ml-0.5 sm:ml-1">({stats.completed})</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          {/* Search - Desktop */}
          <div className="relative hidden sm:block w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Tìm chiến dịch..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Campaign Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 sm:h-64 rounded-lg sm:rounded-xl" />
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-12">
          <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {search || filterStatus !== 'all' ? 'Không tìm thấy chiến dịch' : 'Chưa có chiến dịch nào'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {search || filterStatus !== 'all' 
              ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
              : 'Bắt đầu bằng cách tạo chiến dịch marketing đầu tiên'}
          </p>
          {!search && filterStatus === 'all' && (
            <Button onClick={() => navigate('/campaigns/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo chiến dịch đầu tiên
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa chiến dịch?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa chiến dịch "{deleteTarget?.name}"? 
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
