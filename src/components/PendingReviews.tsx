import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Eye, CheckCircle, XCircle, ArrowRight, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

export const PendingReviews = () => {
  const { contents, updateStatus, loading } = useMultiChannelContents();
  const { currentRole } = useOrganizationContext();

  // Only show for admin/owner roles
  const canReview = currentRole === 'owner' || currentRole === 'admin';

  const pendingContents = useMemo(() => {
    return contents.filter(content => content.status === 'review');
  }, [contents]);

  const handleApprove = async (contentId: string) => {
    try {
      await updateStatus(contentId, 'approved');
      toast.success('Đã duyệt nội dung');
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

  if (!canReview) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-amber-500" />
            Chờ duyệt
            {pendingContents.length > 0 && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">
                {pendingContents.length}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/tasks?tab=review">
              Xem tất cả
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pendingContents.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
            Không có nội dung nào chờ duyệt
          </div>
        ) : (
          <div className="space-y-3">
            {pendingContents.slice(0, 3).map((content) => (
              <div
                key={content.id}
                className="p-3 border rounded-lg bg-background"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{content.title}</h4>
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
                    className="h-7 text-xs"
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
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleReject(content.id)}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Từ chối
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs"
                    onClick={() => handleApprove(content.id)}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Duyệt
                  </Button>
                </div>
              </div>
            ))}
            
            {pendingContents.length > 3 && (
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link to="/tasks?tab=review">
                  Xem thêm {pendingContents.length - 3} nội dung khác
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
