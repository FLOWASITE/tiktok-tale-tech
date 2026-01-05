import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  LayoutDashboard, 
  Flag, 
  FileText, 
  BarChart3, 
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import { useCampaignDetail, useCampaigns } from '@/hooks/useCampaigns';
import { AppLayout } from '@/components/AppLayout';
import { CampaignDetailHero } from '@/components/campaign/detail/CampaignDetailHero';
import { CampaignDetailOverview } from '@/components/campaign/detail/CampaignDetailOverview';
import { CampaignDetailMilestones } from '@/components/campaign/detail/CampaignDetailMilestones';
import { CampaignDetailContents } from '@/components/campaign/detail/CampaignDetailContents';
import { CampaignDetailKPIs } from '@/components/campaign/detail/CampaignDetailKPIs';
import { CampaignAnalyticsDashboard } from '@/components/campaign/analytics/CampaignAnalyticsDashboard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { campaign, industries, milestones, contents, kpiLogs, isLoading, error } = useCampaignDetail(id);
  const { deleteCampaign, updateStatus, updateBudgetSpent, isDeleting } = useCampaigns();
  
  const handleUpdateBudgetSpent = async (newSpent: number) => {
    if (!id) return;
    await updateBudgetSpent({ id, budgetSpent: newSpent });
  };
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    await deleteCampaign(id);
    navigate('/campaigns');
  };

  const handleToggleStatus = async () => {
    if (!campaign || !id) return;
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    await updateStatus({ id, status: newStatus });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error || !campaign) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">Không tìm thấy chiến dịch</p>
          <Button onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại danh sách
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <p className="text-muted-foreground text-sm">Chi tiết chiến dịch</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/campaigns/${id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Chỉnh sửa
              </DropdownMenuItem>
              {campaign.status === 'active' ? (
                <DropdownMenuItem onClick={handleToggleStatus}>
                  <Pause className="h-4 w-4 mr-2" />
                  Tạm dừng
                </DropdownMenuItem>
              ) : campaign.status === 'paused' || campaign.status === 'draft' ? (
                <DropdownMenuItem onClick={handleToggleStatus}>
                  <Play className="h-4 w-4 mr-2" />
                  Kích hoạt
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa chiến dịch
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Hero Section */}
        <CampaignDetailHero campaign={campaign} milestones={milestones} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Tổng quan</span>
            </TabsTrigger>
            <TabsTrigger value="milestones" className="gap-2">
              <Flag className="h-4 w-4" />
              <span className="hidden sm:inline">Milestones</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Nội dung</span>
            </TabsTrigger>
            <TabsTrigger value="kpis" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">KPIs</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <CampaignDetailOverview campaign={campaign} milestones={milestones} contents={contents} />
          </TabsContent>

          <TabsContent value="milestones">
            <CampaignDetailMilestones campaignId={id!} milestones={milestones} />
          </TabsContent>

          <TabsContent value="content">
            <CampaignDetailContents campaignId={id!} contents={contents} />
          </TabsContent>

          <TabsContent value="kpis">
            <CampaignDetailKPIs campaignId={id!} campaign={campaign} kpiLogs={kpiLogs} industries={industries} />
          </TabsContent>

          <TabsContent value="analytics">
            <CampaignAnalyticsDashboard 
              campaign={campaign} 
              milestones={milestones} 
              kpiLogs={kpiLogs}
              onUpdateBudgetSpent={handleUpdateBudgetSpent}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa chiến dịch?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan đến chiến dịch "{campaign.name}" sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
