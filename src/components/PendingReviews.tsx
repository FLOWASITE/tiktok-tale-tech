import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { useApprovalAssignments } from '@/hooks/useApprovalAssignments';
import { useAuth } from '@/contexts/AuthContext';
import { canApproveContent, canApproveSpecificContent } from '@/types/organization';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Eye, CheckCircle, XCircle, ArrowRight, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { SkeletonCard } from '@/components/dashboard/SkeletonCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { PulseIndicator } from '@/components/dashboard/PulseIndicator';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

export const PendingReviews = () => {
  const { contents, updateStatus, loading } = useMultiChannelContents();
  const { currentRole } = useOrganizationContext();
  const { user } = useAuth();
  const { approverRoles, useSpecificApprovers, loading: settingsLoading } = useOrganizationSettings();
  const { assignments, loading: assignmentsLoading } = useApprovalAssignments();

  const canReviewByRole = currentRole ? canApproveContent(currentRole, approverRoles) : false;

  const pendingContents = useMemo(() => {
    const reviewContents = contents.filter(content => content.status === 'review');
    
    if (!user?.id || !currentRole) return [];
    
    if (useSpecificApprovers) {
      return reviewContents.filter(content => {
        if (currentRole === 'owner') return true;
        return canApproveSpecificContent(
          user.id,
          content.user_id || '',
          useSpecificApprovers,
          assignments,
          currentRole,
          approverRoles
        );
      });
    }
    
    return canReviewByRole ? reviewContents : [];
  }, [contents, user?.id, currentRole, useSpecificApprovers, assignments, approverRoles, canReviewByRole]);

  const shouldShow = useMemo(() => {
    if (!currentRole) return false;
    if (currentRole === 'owner') return true;
    if (useSpecificApprovers) {
      return assignments.some(a => a.approver_id === user?.id);
    }
    return canReviewByRole;
  }, [currentRole, useSpecificApprovers, assignments, user?.id, canReviewByRole]);

  const handleApprove = async (contentId: string) => {
    try {
      await updateStatus(contentId, 'approved');
      
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#22c55e', '#10b981', '#34d399'],
      });
      
      toast.success('Đã duyệt nội dung', {
        icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
      });
    } catch {
      toast.error('Không thể duyệt nội dung');
    }
  };

  const handleReject = async (contentId: string) => {
    try {
      await updateStatus(contentId, 'draft');
      toast.success('Đã từ chối nội dung');
    } catch {
      toast.error('Không thể từ chối nội dung');
    }
  };

  if (!shouldShow || settingsLoading || assignmentsLoading) {
    return null;
  }

  if (loading) {
    return (
      <Card className="gradient-card border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 overflow-hidden">
        <CardContent className="p-6">
          <SkeletonCard lines={2} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gradient-card border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 overflow-hidden relative">
      {/* Animated border glow for urgent reviews */}
      {pendingContents.length > 0 && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-amber-500/50 pointer-events-none"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="relative p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <ClipboardCheck className="h-4 w-4 text-amber-600" />
              <PulseIndicator count={pendingContents.length} variant="warning" />
            </div>
            Chờ duyệt
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="group">
            <Link to="/tasks?tab=review">
              Xem tất cả
              <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pendingContents.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Không có nội dung chờ duyệt"
            description="Tất cả nội dung đã được xử lý"
          />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {pendingContents.slice(0, 3).map((content) => (
              <motion.div
                key={content.id}
                variants={itemVariants}
                className="p-3 rounded-xl bg-background/80 border border-border/50 
                         hover:bg-background hover:border-amber-500/30 hover:shadow-md 
                         transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate group-hover:text-amber-600 transition-colors">
                      {content.title}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {content.topic}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <span>
                    {format(new Date(content.created_at), 'dd/MM/yyyy', { locale: vi })}
                  </span>
                  <span>•</span>
                  <span>{content.selected_channels.length} kênh</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs hover:bg-muted"
                    asChild
                  >
                    <Link to={`/multichannel?view=${content.id}`}>
                      <Eye className="h-3 w-3 mr-1" />
                      Xem
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                    onClick={() => handleReject(content.id)}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Từ chối
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                    onClick={() => handleApprove(content.id)}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Duyệt
                  </Button>
                </div>
              </motion.div>
            ))}
            
            {pendingContents.length > 3 && (
              <motion.div variants={itemVariants}>
                <Button variant="ghost" size="sm" className="w-full group" asChild>
                  <Link to="/tasks?tab=review">
                    Xem thêm {pendingContents.length - 3} nội dung khác
                    <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
