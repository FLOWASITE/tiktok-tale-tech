import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAdSequences } from '@/hooks/useAdSequences';
import { AdSequence, AdSequenceStage, FUNNEL_STAGE_CONFIGS, SEQUENCE_STATUS_CONFIG, calculateTotalDuration } from '@/types/adSequence';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, Plus, Play, Pause, Save, Trash2, Sparkles,
  Eye, Scale, ShoppingCart, Heart, Clock, Zap, Rocket, 
  Bell, AlertTriangle, Megaphone, MessageSquare, CalendarClock,
  Flame, CheckCircle, MousePointerClick
} from 'lucide-react';
import { SequenceStageCard } from './SequenceStageCard';

interface SequenceBuilderProps {
  sequence: AdSequence;
  organizationId?: string;
  onBack: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Eye,
  Scale,
  ShoppingCart,
  Heart,
  Clock,
  Zap,
  Rocket,
  Bell,
  AlertTriangle,
  Megaphone,
  MessageSquare,
  CalendarClock,
  Flame,
  CheckCircle,
  MousePointerClick,
};

export function SequenceBuilder({ sequence, organizationId, onBack }: SequenceBuilderProps) {
  const [name, setName] = useState(sequence.name);
  const [isEditing, setIsEditing] = useState(false);
  
  const { 
    updateSequence, 
    addStage, 
    updateStage, 
    deleteStage 
  } = useAdSequences({ organizationId });

  const stages = sequence.stages || [];
  const totalDuration = calculateTotalDuration(stages);
  const totalBudget = stages.reduce((sum, s) => sum + s.budget_percentage, 0);
  const statusConfig = SEQUENCE_STATUS_CONFIG[sequence.status];

  const handleSave = () => {
    if (name !== sequence.name) {
      updateSequence.mutate({ id: sequence.id, name });
    }
    setIsEditing(false);
  };

  const handleStatusToggle = () => {
    const newStatus = sequence.status === 'active' ? 'paused' : 'active';
    updateSequence.mutate({ id: sequence.id, status: newStatus });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 w-[250px]"
                  autoFocus
                />
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-3 w-3 mr-1" />
                  Lưu
                </Button>
              </div>
            ) : (
              <h2 
                className="text-lg font-semibold cursor-pointer hover:text-primary"
                onClick={() => setIsEditing(true)}
              >
                {sequence.name}
              </h2>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn(statusConfig.bgColor, statusConfig.color, "border-0 text-xs")}>
                {statusConfig.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {stages.length} stages • {totalDuration} ngày
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {sequence.status === 'draft' && (
            <Button variant="outline" onClick={handleStatusToggle}>
              <Play className="h-4 w-4 mr-2" />
              Kích hoạt
            </Button>
          )}
          {sequence.status === 'active' && (
            <Button variant="outline" onClick={handleStatusToggle}>
              <Pause className="h-4 w-4 mr-2" />
              Tạm dừng
            </Button>
          )}
          <Button>
            <Sparkles className="h-4 w-4 mr-2" />
            Tạo Ads với AI
          </Button>
        </div>
      </div>

      {/* Budget Allocation Bar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Phân bổ ngân sách</span>
            <span className={cn(
              "text-sm font-medium",
              totalBudget === 100 ? "text-green-600" : "text-yellow-600"
            )}>
              {totalBudget}% / 100%
            </span>
          </div>
          <div className="flex h-6 rounded-lg overflow-hidden border">
            {stages.map((stage, index) => {
              const config = FUNNEL_STAGE_CONFIGS[stage.stage_name];
              return (
                <div
                  key={stage.id}
                  className={cn(
                    "flex items-center justify-center text-xs font-medium transition-all",
                    config?.bgColor || "bg-gray-100"
                  )}
                  style={{ width: `${stage.budget_percentage}%` }}
                  title={`${stage.stage_label || stage.stage_name}: ${stage.budget_percentage}%`}
                >
                  {stage.budget_percentage >= 10 && `${stage.budget_percentage}%`}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="relative">
        <div className="flex items-center gap-4 overflow-x-auto pb-4 px-2">
          {stages.map((stage, index) => {
            const config = FUNNEL_STAGE_CONFIGS[stage.stage_name] || {
              label: stage.stage_label || stage.stage_name,
              color: 'text-gray-600',
              bgColor: 'bg-gray-50 border-gray-200',
              icon: 'Eye',
            };
            const Icon = ICON_MAP[config.icon] || Eye;
            
            return (
              <div key={stage.id} className="flex items-center">
                <SequenceStageCard
                  stage={stage}
                  config={config}
                  icon={<Icon className="h-5 w-5" />}
                  onUpdate={(updates) => updateStage.mutate({ id: stage.id, ...updates })}
                  onDelete={() => deleteStage.mutate(stage.id)}
                  organizationId={organizationId}
                />
                
                {/* Connector Arrow */}
                {index < stages.length - 1 && (
                  <div className="flex items-center px-2 text-muted-foreground">
                    <div className="w-8 h-0.5 bg-muted" />
                    <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-8 border-l-muted" />
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Add Stage Button */}
          <Button
            variant="outline"
            size="lg"
            className="h-[200px] w-[200px] border-dashed shrink-0"
            onClick={() => addStage.mutate({
              sequenceId: sequence.id,
              stageData: {
                stage_name: 'custom',
                stage_label: `Stage ${stages.length + 1}`,
                delay_days: totalDuration,
                duration_days: 7,
                budget_percentage: Math.max(0, 100 - totalBudget),
              }
            })}
          >
            <div className="flex flex-col items-center gap-2">
              <Plus className="h-8 w-8 text-muted-foreground" />
              <span className="text-muted-foreground">Thêm Stage</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Timeline Summary */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                {stages.map((stage, index) => {
                  const config = FUNNEL_STAGE_CONFIGS[stage.stage_name];
                  const widthPercent = (stage.duration_days / totalDuration) * 100;
                  return (
                    <div
                      key={stage.id}
                      className={cn("h-full", config?.color.replace('text-', 'bg-'))}
                      style={{ width: `${widthPercent}%` }}
                      title={`${stage.stage_label || stage.stage_name}: ${stage.duration_days} ngày`}
                    />
                  );
                })}
              </div>
            </div>
            <span className="text-sm font-medium">{totalDuration} ngày</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
