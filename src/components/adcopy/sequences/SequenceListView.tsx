import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAdSequences } from '@/hooks/useAdSequences';
import { AdSequence, SEQUENCE_TYPES, SEQUENCE_STATUS_CONFIG, calculateTotalDuration } from '@/types/adSequence';
import { cn } from '@/lib/utils';
import { 
  Layers, RotateCw, Rocket, Calendar, Plus, MoreVertical, 
  Edit, Trash2, Copy, Play, Pause, Eye, Loader2 
} from 'lucide-react';
import { CreateSequenceDialog } from './CreateSequenceDialog';
import { SequenceBuilder } from './SequenceBuilder';

interface SequenceListViewProps {
  organizationId?: string;
  campaignId?: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Layers: <Layers className="h-5 w-5" />,
  RotateCw: <RotateCw className="h-5 w-5" />,
  Rocket: <Rocket className="h-5 w-5" />,
  Calendar: <Calendar className="h-5 w-5" />,
};

export function SequenceListView({ organizationId, campaignId }: SequenceListViewProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSequence, setEditingSequence] = useState<AdSequence | null>(null);
  
  const { 
    sequences, 
    isLoading, 
    deleteSequence,
    updateSequence 
  } = useAdSequences({ organizationId, campaignId });

  const handleStatusChange = (sequence: AdSequence, newStatus: 'active' | 'paused') => {
    updateSequence.mutate({ id: sequence.id, status: newStatus });
  };

  if (editingSequence) {
    return (
      <SequenceBuilder
        sequence={editingSequence}
        organizationId={organizationId}
        onBack={() => setEditingSequence(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ad Sequences</h2>
          <p className="text-sm text-muted-foreground">
            Tạo chuỗi quảng cáo theo funnel hoặc chiến dịch
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo Sequence
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sequences.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold mb-1">Chưa có sequence nào</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Tạo chuỗi quảng cáo để chạy các stage theo funnel
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo Sequence đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sequences.map(sequence => {
            const typeConfig = SEQUENCE_TYPES.find(t => t.value === sequence.sequence_type);
            const statusConfig = SEQUENCE_STATUS_CONFIG[sequence.status];
            const totalDuration = sequence.stages ? calculateTotalDuration(sequence.stages) : 0;
            const totalAdCopies = sequence.stages?.reduce(
              (sum, stage) => sum + (stage.ad_copies?.length || 0), 0
            ) || 0;

            return (
              <Card 
                key={sequence.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setEditingSequence(sequence)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        sequence.sequence_type === 'funnel' && "bg-blue-100 text-blue-600",
                        sequence.sequence_type === 'retargeting' && "bg-green-100 text-green-600",
                        sequence.sequence_type === 'launch' && "bg-purple-100 text-purple-600",
                        sequence.sequence_type === 'seasonal' && "bg-orange-100 text-orange-600",
                      )}>
                        {typeConfig && ICON_MAP[typeConfig.icon]}
                      </div>
                      <div>
                        <CardTitle className="text-base">{sequence.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{typeConfig?.label}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setEditingSequence(sequence);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        {sequence.status === 'draft' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(sequence, 'active');
                          }}>
                            <Play className="h-4 w-4 mr-2" />
                            Kích hoạt
                          </DropdownMenuItem>
                        )}
                        {sequence.status === 'active' && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(sequence, 'paused');
                          }}>
                            <Pause className="h-4 w-4 mr-2" />
                            Tạm dừng
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSequence.mutate(sequence.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {sequence.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {sequence.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn(statusConfig.bgColor, statusConfig.color, "border-0")}>
                      {statusConfig.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {sequence.stages?.length || 0} stages
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {totalAdCopies} ads
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {totalDuration} ngày
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateSequenceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        organizationId={organizationId}
        campaignId={campaignId}
        onCreated={(sequence) => {
          setShowCreateDialog(false);
          setEditingSequence(sequence);
        }}
      />
    </div>
  );
}
