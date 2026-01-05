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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Quản lý Chiến dịch
          </h1>
          <p className="text-muted-foreground text-sm mt-1 hidden sm:block">
            Theo dõi và quản lý các chiến dịch marketing của bạn
          </p>
        </div>
        <Button onClick={() => navigate('/campaigns/new')} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          <span className="sm:inline">Tạo chiến dịch</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-3 p-3 sm:p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/20">
            <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xl sm:text-2xl font-bold">{stats.active}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Đang chạy</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-3 p-3 sm:p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/20">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xl sm:text-2xl font-bold">{stats.planning}</p>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Đang lên kế hoạch</p>
            <p className="text-xs text-muted-foreground sm:hidden">Kế hoạch</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-3 p-3 sm:p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/20">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xl sm:text-2xl font-bold">{stats.completed}</p>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Hoàn thành</p>
            <p className="text-xs text-muted-foreground sm:hidden">Xong</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Search - Mobile first */}
        <div className="relative w-full sm:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Tìm chiến dịch..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center justify-between gap-4">
          {/* Tabs - scrollable on mobile */}
          <div className="flex-1 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <TabsList className="inline-flex w-auto">
                <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">
                  <span className="hidden sm:inline">Tất cả</span>
                  <span className="sm:hidden">Tất cả</span>
                  <span className="ml-1">({campaigns.length})</span>
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs sm:text-sm px-2 sm:px-3">
                  <span className="hidden sm:inline">Đang chạy</span>
                  <span className="sm:hidden">Chạy</span>
                  <span className="ml-1">({stats.active})</span>
                </TabsTrigger>
                <TabsTrigger value="planning" className="text-xs sm:text-sm px-2 sm:px-3">
                  <span className="hidden sm:inline">Lên kế hoạch</span>
                  <span className="sm:hidden">KH</span>
                  <span className="ml-1">({stats.planning})</span>
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs sm:text-sm px-2 sm:px-3">
                  <span className="hidden sm:inline">Hoàn thành</span>
                  <span className="sm:hidden">Xong</span>
                  <span className="ml-1">({stats.completed})</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Search - Desktop */}
          <div className="relative hidden sm:block w-64">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
