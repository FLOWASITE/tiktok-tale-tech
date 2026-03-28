import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pause, Play, LayoutGrid, CheckSquare, Target, Bot, Zap, Trash2, Pencil, Rocket, BarChart3, Filter, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { PipelineKanban } from '@/components/agents/PipelineKanban';
import { AgentStatusPanel } from '@/components/agents/AgentStatusPanel';
import { ApprovalQueue } from '@/components/agents/ApprovalQueue';
import { GoalWizard } from '@/components/agents/GoalWizard';
import { AICampaignOverview } from '@/components/agents/AICampaignOverview';
import { useAgentPipelines } from '@/hooks/useAgentPipelines';
import { useAgentApprovals } from '@/hooks/useAgentApprovals';
import { useAgentGoals } from '@/hooks/useAgentGoals';
import { useCampaignPlans } from '@/hooks/useCampaignPlans';
import { CampaignDashboard } from '@/components/agents/CampaignDashboard';
import { AgentGoal, AgentPipelineStage, AUTONOMY_LEVELS } from '@/types/agent';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { parseEdgeFunctionError } from '@/lib/edgeFunctionErrors';

export default function AgentDashboard() {
  const { currentOrganization } = useOrganizationContext();
  const { pipelines, isLoading: pipelinesLoading, updateStage, deletePipeline, retryPipeline } = useAgentPipelines();
  const { plans } = useCampaignPlans();
  const { approvals, pendingCount, updateApproval } = useAgentApprovals();
  const { goals, createGoal, updateGoal, deleteGoal } = useAgentGoals();
  const [activeTab, setActiveTab] = useState('overview');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<AgentGoal | null>(null);
  const [filterGoalId, setFilterGoalId] = useState<string | null>(null);
  const [goalFilterOpen, setGoalFilterOpen] = useState(false);
  const [triggeringGoalId, setTriggeringGoalId] = useState<string | null>(null);
  const [autoSelectPlan, setAutoSelectPlan] = useState<{ planId: string; goalName: string } | null>(null);

  const goalNameMap = useMemo(() => {
    const map = new Map<string, string>();
    goals.forEach(g => map.set(g.id, g.name));
    return map;
  }, [goals]);

  const handleSaveGoal = async (data: Parameters<typeof createGoal.mutateAsync>[0]): Promise<string> => {
    await createGoal.mutateAsync(data);
    // Fetch newly created goal id
    const goalsList = await supabase
      .from('agent_goals')
      .select('id')
      .eq('organization_id', currentOrganization?.id || '')
      .order('created_at', { ascending: false })
      .limit(1);
    const newGoalId = goalsList.data?.[0]?.id;
    if (!newGoalId) throw new Error('Không tìm thấy goal vừa tạo');
    return newGoalId;
  };

  const handleGenerateStrategy = async (goalId: string, data: {
    name: string;
    description?: string;
    target_channels: string[];
    campaign_duration_days?: number;
    campaign_start_date?: string;
    approval_mode?: string;
    brand_template_id?: string;
    clarification_context?: Record<string, string>;
  }): Promise<{ total_pieces?: number; pipelines_created?: number; approval_mode?: string; plan_id?: string }> => {
    const { data: result, error } = await supabase.functions.invoke('generate-campaign-strategy', {
      body: {
        goal_id: goalId,
        campaign_title: data.name,
        campaign_description: data.description || '',
        target_channels: data.target_channels || [],
        campaign_duration_days: data.campaign_duration_days || 14,
        campaign_start_date: data.campaign_start_date || new Date().toISOString().split('T')[0],
        approval_mode: data.approval_mode || 'approve_plan',
        brand_template_id: data.brand_template_id || null,
        clarification_context: data.clarification_context || null,
        organization_id: currentOrganization?.id,
      },
    });
    if (error) {
      const parsedError = parseEdgeFunctionError(error, 'Không thể tạo kế hoạch nội dung');
      throw new Error(parsedError.message);
    }
    return result || {};
  };

  const handleWizardComplete = (result: { approval_mode?: string; total_pieces?: number; pipelines_created?: number; plan_id?: string; goal_name?: string }) => {
    setWizardOpen(false);
    setEditingGoal(null);
    if (result.approval_mode === 'full_auto') {
      setActiveTab('pipeline');
    } else {
      setActiveTab('campaign-plans');
      if (result.plan_id) {
        setAutoSelectPlan({ planId: result.plan_id, goalName: result.goal_name || '' });
      }
    }
  };

  const handleEditGoal = (goal: AgentGoal) => {
    setEditingGoal(goal);
    setWizardOpen(true);
  };

  const handleDeleteGoal = (goal: AgentGoal) => {
    if (confirm(`Xóa campaign "${goal.name}"? Các pipeline đang chạy sẽ không bị ảnh hưởng.`)) {
      deleteGoal.mutate(goal.id);
    }
  };

  const handleRunNow = async (goal: AgentGoal) => {
    setTriggeringGoalId(goal.id);
    try {
      toast.info('Đang lên kế hoạch nội dung...');
      const { data: result, error } = await supabase.functions.invoke('generate-campaign-strategy', {
        body: {
          goal_id: goal.id,
          campaign_title: goal.name,
          campaign_description: goal.description || '',
          target_channels: goal.target_channels || [],
          campaign_duration_days: goal.campaign_duration_days || 14,
          campaign_start_date: goal.campaign_start_date || new Date().toISOString().split('T')[0],
          approval_mode: goal.approval_mode || 'approve_plan',
          brand_template_id: goal.brand_template_id || null,
          clarification_context: goal.clarification_context || null,
          organization_id: currentOrganization?.id,
        },
      });

      if (error) {
        const parsedError = parseEdgeFunctionError(error, 'Không thể tạo kế hoạch');
        toast.error(parsedError.message);
        return;
      }

      if (result?.approval_mode === 'full_auto') {
        toast.success(`Đã tạo ${result?.pipelines_created || 0} pipeline tự động`);
      } else {
        toast.success(`Đã lên kế hoạch ${result?.total_pieces || 0} bài viết`);
        setActiveTab('campaign-plans');
      }
    } catch (e) {
      const parsedError = parseEdgeFunctionError(e, 'Không thể tạo kế hoạch');
      toast.error(parsedError.message);
    } finally {
      setTriggeringGoalId(null);
    }
  };

  const activeGoals = goals.filter(g => g.is_active && !g.is_paused);
  const totalInPipeline = pipelines.filter(p => p.current_stage !== 'analyze' && !p.completed_at).length;
  const publishedThisWeek = pipelines.filter(p => {
    if (p.current_stage !== 'publish' && p.current_stage !== 'analyze') return false;
    const d = new Date(p.completed_at || p.updated_at);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length;

  const filteredPipelines = filterGoalId
    ? pipelines.filter(p => p.goal_id === filterGoalId)
    : pipelines;

  const handleStageChange = (id: string, stage: AgentPipelineStage) => {
    updateStage.mutate({ id, stage });
  };

  const getPipelineCountForGoal = (goalId: string) =>
    pipelines.filter(p => p.goal_id === goalId && p.current_stage !== 'analyze' && !p.completed_at).length;

  return (
    <>
      <Helmet><title>AI Agents | Flowa</title></Helmet>
      <div className="flex flex-col gap-4 p-4 sm:p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Content Agents</h1>
              <p className="text-xs text-muted-foreground">Pipeline tự động tạo & tối ưu nội dung</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
              goals.filter(g => g.is_active && !g.is_paused).forEach(g => updateGoal.mutate({ id: g.id, is_paused: true }));
            }}>
              <Pause className="w-3.5 h-3.5" /> Pause All
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => { setEditingGoal(null); setWizardOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> Campaign mới
            </Button>
          </div>
        </div>


        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5 text-xs">
              <BarChart3 className="w-3.5 h-3.5" /> Tổng quan
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1.5 text-xs">
              <LayoutGrid className="w-3.5 h-3.5" /> Pipeline
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-1.5 text-xs">
              <CheckSquare className="w-3.5 h-3.5" /> Duyệt
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-[9px] h-4 px-1.5">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-1.5 text-xs">
              <Target className="w-3.5 h-3.5" /> Campaigns
            </TabsTrigger>
            <TabsTrigger value="campaign-plans" className="gap-1.5 text-xs">
              <BarChart3 className="w-3.5 h-3.5" /> Kế hoạch
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <AICampaignOverview
              goals={goals}
              pipelines={pipelines}
              plans={plans}
              onNavigateToPipeline={(goalId) => {
                setFilterGoalId(goalId);
                setActiveTab('pipeline');
              }}
            />
          </TabsContent>

          <TabsContent value="pipeline" className="mt-4">
            {goals.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Popover open={goalFilterOpen} onOpenChange={setGoalFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={goalFilterOpen} className="w-[260px] h-8 text-xs justify-between font-normal">
                      <span className="truncate">
                        {filterGoalId ? (goals.find(g => g.id === filterGoalId)?.name ?? 'Campaign') + ` (${getPipelineCountForGoal(filterGoalId)})` : `Tất cả campaign (${pipelines.length})`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Tìm campaign..." className="h-8 text-xs" />
                      <CommandList>
                        <CommandEmpty>Không tìm thấy.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="all" onSelect={() => { setFilterGoalId(null); setGoalFilterOpen(false); }} className="text-xs">
                            <Check className={cn("mr-2 h-3 w-3", !filterGoalId ? "opacity-100" : "opacity-0")} />
                            Tất cả campaign ({pipelines.length})
                          </CommandItem>
                          {goals.map(g => (
                            <CommandItem key={g.id} value={g.name} onSelect={() => { setFilterGoalId(g.id); setGoalFilterOpen(false); }} className="text-xs">
                              <Check className={cn("mr-2 h-3 w-3", filterGoalId === g.id ? "opacity-100" : "opacity-0")} />
                              <span className="truncate">{g.name} ({getPipelineCountForGoal(g.id)})</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
            <div className="flex gap-4">
              <div className="flex-1 min-w-0">
                <PipelineKanban
                  pipelines={filteredPipelines}
                  approvals={approvals}
                  campaignNames={goalNameMap}
                  onStageChange={handleStageChange}
                  onRetry={(id) => retryPipeline.mutate(id)}
                  onDelete={(id) => deletePipeline.mutate(id)}
                  onApprove={(id, notes) => updateApproval.mutate({ id, status: 'approved', notes })}
                  onReject={(id, notes) => updateApproval.mutate({ id, status: 'rejected', notes: notes || 'Từ chối' })}
                />
              </div>
              <div className="hidden lg:block w-[200px] flex-shrink-0">
                <AgentStatusPanel pipelines={filteredPipelines} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="approvals" className="mt-4">
            <ApprovalQueue
              approvals={approvals}
              onApprove={(id, notes) => updateApproval.mutate({ id, status: 'approved', notes })}
              onReject={(id, notes) => updateApproval.mutate({ id, status: 'rejected', notes })}
            />
          </TabsContent>

          <TabsContent value="campaigns" className="mt-4">
            <div className="space-y-3">
              {goals.length === 0 ? (
                <div className="text-center py-16">
                  <Target className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">Chưa có campaign nào</p>
                  <Button size="sm" className="gap-1.5" onClick={() => { setEditingGoal(null); setWizardOpen(true); }}>
                    <Plus className="w-3.5 h-3.5" /> Tạo campaign đầu tiên
                  </Button>
                </div>
              ) : (
                goals.map(goal => {
                  const pipeCount = getPipelineCountForGoal(goal.id);
                  const autonomyLabel = AUTONOMY_LEVELS.find(l => l.id === goal.autonomy_level)?.label || goal.autonomy_level;
                  return (
                    <Card key={goal.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium">{goal.name}</p>
                              <Badge variant={goal.is_active ? 'default' : 'secondary'} className="text-[10px] h-4">
                                {goal.is_paused ? 'Tạm dừng' : goal.is_active ? 'Đang chạy' : 'Tắt'}
                              </Badge>
                              {pipeCount > 0 && (
                                <Badge variant="outline" className="text-[10px] h-4">
                                  {pipeCount} pipeline
                                </Badge>
                              )}
                            </div>
                            {goal.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{goal.description}</p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[9px] h-4 bg-primary/5">{autonomyLabel}</Badge>
                              {goal.target_channels.map(ch => (
                                <Badge key={ch} variant="outline" className="text-[9px] h-4">{ch}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => handleRunNow(goal)}
                              disabled={triggeringGoalId === goal.id}
                              title="Chạy ngay"
                            >
                              <Rocket className="w-3.5 h-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => updateGoal.mutate({ id: goal.id, is_paused: !goal.is_paused })}>
                              {goal.is_paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditGoal(goal)} title="Chỉnh sửa">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteGoal(goal)} title="Xóa">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-7 px-2 text-[10px]"
                              onClick={() => { setFilterGoalId(goal.id); setActiveTab('pipeline'); }}
                            >
                              Xem pipeline →
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="campaign-plans" className="mt-4">
            <CampaignDashboard />
          </TabsContent>
        </Tabs>

        <GoalWizard
          open={wizardOpen}
          onOpenChange={(open) => { setWizardOpen(open); if (!open) setEditingGoal(null); }}
          onSaveGoal={handleSaveGoal}
          onGenerateStrategy={handleGenerateStrategy}
          onComplete={handleWizardComplete}
          initialData={editingGoal}
        />
      </div>
    </>
  );
}
