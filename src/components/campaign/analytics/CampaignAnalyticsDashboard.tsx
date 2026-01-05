import { Campaign, CampaignMilestone, CampaignKPILog } from '@/types/campaign';
import { KPIProgressChart } from './KPIProgressChart';
import { GoalCompletionDonut } from './GoalCompletionDonut';
import { BudgetUsageCard } from './BudgetUsageCard';
import { MilestoneProgressCard } from './MilestoneProgressCard';
import { KPIComparisonBar } from './KPIComparisonBar';

interface CampaignAnalyticsDashboardProps {
  campaign: Campaign;
  milestones: CampaignMilestone[];
  kpiLogs: CampaignKPILog[];
}

export function CampaignAnalyticsDashboard({ 
  campaign, 
  milestones, 
  kpiLogs 
}: CampaignAnalyticsDashboardProps) {
  return (
    <div className="space-y-6">
      {/* KPI Progress Over Time */}
      <KPIProgressChart 
        kpiLogs={kpiLogs} 
        goals={campaign.goals} 
      />

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GoalCompletionDonut goals={campaign.goals} />
        <BudgetUsageCard 
          budgetTotal={campaign.budget_total} 
          budgetSpent={campaign.budget_spent}
          currency={campaign.budget_currency}
        />
        <MilestoneProgressCard milestones={milestones} />
      </div>

      {/* KPI Target vs Actual */}
      <KPIComparisonBar goals={campaign.goals} />
    </div>
  );
}
