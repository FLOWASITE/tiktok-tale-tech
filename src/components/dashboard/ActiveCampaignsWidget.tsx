import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target, 
  ArrowRight, 
  Calendar, 
  FileText,
  Flag,
  Flame,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { CampaignSummary } from '@/hooks/useCampaignIntegration';

interface ActiveCampaignsWidgetProps {
  campaigns: CampaignSummary[];
  isLoading?: boolean;
  className?: string;
}

export function ActiveCampaignsWidget({ 
  campaigns, 
  isLoading = false,
  className 
}: ActiveCampaignsWidgetProps) {
  const { t } = useTranslation();
  const displayCampaigns = campaigns.slice(0, 3);

  if (isLoading) {
    return (
      <Card className={`gradient-card border-border/50 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-8" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`gradient-card border-border/50 overflow-hidden ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
        <CardHeader className="relative pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              {t('app.dashboard.activeCampaigns')}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {campaigns.length}
            </Badge>
          </div>
        </CardHeader>
      </div>

      <CardContent className="pt-0 space-y-3">
        {displayCampaigns.length === 0 ? (
          <div className="text-center py-6">
            <Target className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">{t('app.dashboard.noCampaigns')}</p>
            <Button variant="outline" size="sm" className="mt-3 gap-2" asChild>
              <Link to="/campaigns/new">
                {t('app.dashboard.createCampaign')}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {displayCampaigns.map((campaign, index) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={`/campaigns/${campaign.id}`}>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-border transition-colors group">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {campaign.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {campaign.status === 'active' ? (
                            <Badge variant="default" className="text-[10px] h-5 gap-1 bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                              <Flame className="w-2.5 h-2.5" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              Planning
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-lg font-bold text-primary">{campaign.kpi_progress}%</span>
                        <p className="text-[10px] text-muted-foreground">KPI</p>
                      </div>
                    </div>
                    
                    <Progress value={campaign.kpi_progress} className="h-1.5 mb-2" />
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        <span>{campaign.milestones_completed}/{campaign.milestones_total}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>{t('app.dashboard.contentCount', { count: campaign.content_count })}</span>
                      </div>
                      {campaign.days_remaining > 0 ? (
                        <div className="flex items-center gap-1 ml-auto">
                          <Calendar className="w-3 h-3" />
                          <span>{t('app.dashboard.daysRemaining', { count: campaign.days_remaining })}</span>
                        </div>
                      ) : campaign.status === 'planning' ? (
                        <div className="flex items-center gap-1 ml-auto text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{t('app.dashboard.startDate', { date: format(parseISO(campaign.start_date), 'dd/MM', { locale: vi }) })}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
            
            {campaigns.length > 3 && (
              <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground hover:text-foreground" asChild>
                <Link to="/campaigns">
                  {t('app.dashboard.viewAllCampaigns')}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
