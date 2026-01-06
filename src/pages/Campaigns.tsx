import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Target, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CampaignCard } from '@/components/campaign/CampaignCard';
import { CampaignHeroSection } from '@/components/campaign/CampaignHeroSection';
import { CampaignFilters, DateRange } from '@/components/campaign/CampaignFilters';
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

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48];

export default function Campaigns() {
  const navigate = useNavigate();
  const { campaigns, isLoading, deleteCampaign, updateStatus } = useCampaigns();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Stats
  const stats = useMemo(() => ({
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    planning: campaigns.filter(c => c.status === 'draft' || c.status === 'planning').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
  }), [campaigns]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (dateRange.from || dateRange.to) count++;
    return count;
  }, [filterStatus, typeFilter, dateRange]);

  const clearFilters = () => {
    setFilterStatus('all');
    setTypeFilter('all');
    setDateRange({ from: undefined, to: undefined });
    setSearch('');
  };

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      // Search filter
      if (search) {
        const query = search.toLowerCase();
        const matchesName = campaign.name.toLowerCase().includes(query);
        const matchesDesc = campaign.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }
      
      // Status filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'active' && campaign.status !== 'active') return false;
        if (filterStatus === 'planning' && campaign.status !== 'draft' && campaign.status !== 'planning') return false;
        if (filterStatus === 'completed' && campaign.status !== 'completed' && campaign.status !== 'cancelled') return false;
      }

      // Type filter
      if (typeFilter !== 'all' && campaign.campaign_type !== typeFilter) return false;

      // Date filter
      if (dateRange.from) {
        const startDate = new Date(campaign.start_date);
        if (startDate < dateRange.from) return false;
      }
      if (dateRange.to) {
        const endDate = new Date(campaign.end_date);
        const filterEnd = new Date(dateRange.to);
        filterEnd.setHours(23, 59, 59, 999);
        if (endDate > filterEnd) return false;
      }
      
      return true;
    });
  }, [campaigns, search, filterStatus, typeFilter, dateRange]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, typeFilter, dateRange]);

  // Adjust page if out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
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

  const handleAddNew = () => {
    navigate('/campaigns/new');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Close Button - Fixed top right */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/')}
        className="fixed top-3 right-3 z-50 h-8 w-8 bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm"
        title="Đóng"
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 space-y-4">
        {/* Hero Section with Stats */}
        <CampaignHeroSection
          campaigns={campaigns}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAddNew={handleAddNew}
          isLoading={isLoading}
        />

        {/* Filters */}
        <CampaignFilters
          searchQuery={search}
          onSearchChange={setSearch}
          statusFilter={filterStatus}
          onStatusFilterChange={setFilterStatus}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onClearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
          stats={stats}
        />

        {/* Campaign Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 sm:h-64 rounded-xl" />
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 mb-4">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {campaigns.length === 0 ? 'Chưa có chiến dịch nào' : 'Không tìm thấy chiến dịch'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              {campaigns.length === 0
                ? 'Bắt đầu tạo chiến dịch marketing đầu tiên của bạn.'
                : 'Thử thay đổi bộ lọc để tìm chiến dịch phù hợp.'}
            </p>
            {campaigns.length === 0 && (
              <Button onClick={handleAddNew} className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                <Plus className="w-4 h-4" />
                Tạo chiến dịch đầu tiên
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {paginatedCampaigns.map((campaign) => (
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

        {/* Pagination */}
        {!isLoading && filteredCampaigns.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Hiển thị</span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-[70px] h-8">
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
              <span className="text-muted-foreground">
                / {filteredCampaigns.length} chiến dịch
              </span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "ghost"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

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
