import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar, 
  FileCheck, 
  TrendingUp,
  HelpCircle,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface DashboardHeaderProps {
  pendingCount?: number;
  todayScheduleCount?: number;
  onStartOnboarding?: () => void;
}

export function DashboardHeader({ 
  pendingCount = 0, 
  todayScheduleCount = 0,
  onStartOnboarding 
}: DashboardHeaderProps) {
  const { user } = useAuth();
  const { t } = useTranslation();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('app.dashboardHeader.morning');
    if (hour < 18) return t('app.dashboardHeader.afternoon');
    return t('app.dashboardHeader.evening');
  }, [t]);

  const userName = useMemo(() => {
    if (!user?.email) return '';
    const emailName = user.email.split('@')[0];
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  }, [user?.email]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Background gradient with animated particles */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-secondary/5 to-primary/3">
        <motion.div 
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-1/4 w-32 h-32 bg-primary/10 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 left-1/4 w-40 h-40 bg-secondary/10 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="p-2.5 sm:p-3 rounded-xl gradient-primary shadow-lg"
            >
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </motion.div>
            <div>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2"
              >
                {greeting}, {userName}! <span className="text-2xl">👋</span>
                <span 
                  onClick={() => navigate('/pricing')}
                  className={`ml-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${planBadge.className}`}
                >
                  {planBadge.label}
                </span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm sm:text-base text-muted-foreground mt-1"
              >
                {t('app.dashboardHeader.overview')}
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-3 sm:gap-4 mt-3 sm:mt-4"
              >
                {todayScheduleCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-sm border border-border/50">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-xs sm:text-sm font-medium">
                      {t('app.dashboardHeader.postsToday', { count: todayScheduleCount })}
                    </span>
                  </div>
                )}
                {pendingCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-sm border border-amber-500/30">
                    <FileCheck className="w-4 h-4 text-amber-500" />
                    <span className="text-xs sm:text-sm font-medium">
                      {t('app.dashboardHeader.pendingApproval', { count: pendingCount })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-sm border border-emerald-500/30">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs sm:text-sm font-medium">
                    {t('app.dashboardHeader.goodPerformance')}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onStartOnboarding}
              className="h-9 gap-2 bg-background/60 backdrop-blur-sm hover:bg-background/80"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{t('app.dashboardHeader.guide')}</span>
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
