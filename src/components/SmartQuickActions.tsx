import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Minus, 
  Smile, 
  Target, 
  Briefcase, 
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Zap,
  Hash,
  SmilePlus,
  Type,
  Loader2,
  Wrench,
  CheckCircle2
} from 'lucide-react';
import { ComplianceIssue, ContentAnalysis } from '@/hooks/useContentAnalysis';

interface SmartQuickActionsProps {
  analysis: ContentAnalysis;
  onAction: (instruction: string) => void;
  onApplyBrandVoice: () => void;
  isLoading?: boolean;
  hasBrandVoice?: boolean;
}

interface QuickAction {
  label: string;
  icon: typeof Minus;
  instruction: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  priority: number;
}

const baseActions: QuickAction[] = [
  { 
    label: 'Ngắn gọn hơn', 
    icon: Minus, 
    instruction: 'Viết ngắn gọn, súc tích hơn, giữ nguyên ý chính',
    priority: 50,
  },
  { 
    label: 'Thêm emoji', 
    icon: SmilePlus, 
    instruction: 'Thêm emoji phù hợp để sinh động hơn',
    priority: 40,
  },
  { 
    label: 'CTA mạnh', 
    icon: Target, 
    instruction: 'Thêm hoặc cải thiện call-to-action cho thuyết phục hơn',
    priority: 30,
  },
  { 
    label: 'Chuyên nghiệp', 
    icon: Briefcase, 
    instruction: 'Viết lại với tone chuyên nghiệp, formal hơn',
    priority: 20,
  },
  { 
    label: 'Thêm hook', 
    icon: MessageSquare, 
    instruction: 'Thêm hook mạnh, thu hút vào 1-2 dòng đầu tiên',
    priority: 35,
  },
];

function getContextAwareActions(analysis: ContentAnalysis): QuickAction[] {
  const actions: QuickAction[] = [];
  
  // Add fix actions based on issues
  analysis.issues.forEach(issue => {
    const existingAction = actions.find(a => a.instruction === issue.autoFixInstruction);
    if (!existingAction) {
      let icon = Sparkles;
      let label = 'Sửa lỗi';
      
      switch (issue.type) {
        case 'length':
          icon = Type;
          label = issue.message.includes('Vượt') ? 'Rút gọn' : 'Bổ sung';
          break;
        case 'hook':
          icon = MessageSquare;
          label = 'Thêm hook';
          break;
        case 'cta':
          icon = Target;
          label = 'Thêm CTA';
          break;
        case 'emoji':
          icon = Smile;
          label = issue.message.includes('Vượt') ? 'Giảm emoji' : 'Xóa emoji';
          break;
        case 'hashtag':
          icon = Hash;
          label = issue.message.includes('Vượt') ? 'Giảm hashtag' : 'Xóa hashtag';
          break;
      }
      
      actions.push({
        label,
        icon,
        instruction: issue.autoFixInstruction,
        variant: issue.severity === 'error' ? 'destructive' : 'secondary',
        priority: issue.severity === 'error' ? 100 : 80,
      });
    }
  });
  
  // Add relevant base actions that don't conflict with issues
  const issueTypes = new Set(analysis.issues.map(i => i.type));
  
  baseActions.forEach(action => {
    // Skip actions that would conflict with issues
    if (action.label === 'Thêm emoji' && issueTypes.has('emoji')) return;
    if (action.label === 'Thêm hook' && !issueTypes.has('hook') && analysis.hasHook) return;
    if (action.label === 'CTA mạnh' && !issueTypes.has('cta') && analysis.hasCTA) return;
    
    // Skip "Ngắn gọn hơn" if content is already too short
    if (action.label === 'Ngắn gọn hơn' && 
        analysis.issues.some(i => i.type === 'length' && i.message.includes('Thiếu'))) return;
    
    actions.push(action);
  });
  
  // Sort by priority
  return actions.sort((a, b) => b.priority - a.priority);
}

function generateFixAllInstruction(issues: ComplianceIssue[]): string {
  if (issues.length === 0) return '';
  
  const instructions = issues.map((issue, index) => {
    return `${index + 1}. ${issue.autoFixInstruction}`;
  });
  
  return `Sửa TẤT CẢ các lỗi sau trong nội dung, thực hiện đồng thời và giữ nguyên ý chính:

${instructions.join('\n')}

Đảm bảo output vẫn tự nhiên, mạch lạc sau khi sửa tất cả các lỗi trên.`;
}

export function SmartQuickActions({ 
  analysis, 
  onAction, 
  onApplyBrandVoice,
  isLoading,
  hasBrandVoice = false,
}: SmartQuickActionsProps) {
  const contextActions = useMemo(() => getContextAwareActions(analysis), [analysis]);
  
  // Separate fix actions from enhancement actions
  const fixActions = contextActions.filter(a => a.priority >= 80);
  const enhanceActions = contextActions.filter(a => a.priority < 80).slice(0, 4);
  
  // Generate fix all instruction
  const fixAllInstruction = useMemo(() => generateFixAllInstruction(analysis.issues), [analysis.issues]);
  const hasMultipleIssues = analysis.issues.length > 1;
  
  const handleFixAll = () => {
    if (fixAllInstruction) {
      onAction(fixAllInstruction);
    }
  };
  
  return (
    <div className="space-y-3">
      {/* Compliant status */}
      {analysis.issues.length === 0 && (
        <div className="flex items-center gap-2 text-green-500 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-medium">Nội dung đạt chuẩn compliance</span>
        </div>
      )}
      
      {/* Apply Brand Voice - Primary action */}
      {hasBrandVoice && (
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={onApplyBrandVoice}
                  disabled={isLoading}
                  className="gap-1.5 gradient-primary text-primary-foreground transition-all duration-300 hover:shadow-lg hover:shadow-primary/25"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  Apply Brand Voice
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Viết lại nội dung theo Brand Voice profile</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <span className="text-xs text-muted-foreground">
            Tự động điều chỉnh theo giọng điệu brand
          </span>
        </div>
      )}
      
      {/* Fix All Issues - Show when multiple issues */}
      {hasMultipleIssues && (
        <div className="animate-fade-in">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleFixAll}
                  disabled={isLoading}
                  className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 group"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wrench className="w-3.5 h-3.5 transition-transform group-hover:rotate-12" />
                  )}
                  Sửa tất cả ({analysis.issues.length} lỗi)
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">AI sẽ tự động sửa:</p>
                <ul className="text-xs space-y-0.5">
                  {analysis.issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-amber-400">•</span>
                      <span>{issue.message}</span>
                    </li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      
      {/* Fix Actions - Issues that need fixing */}
      {fixActions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-amber-500">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Sửa nhanh</span>
            {hasMultipleIssues && (
              <span className="text-muted-foreground">(hoặc chọn từng lỗi)</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {fixActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <TooltipProvider key={`fix-${index}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={action.variant || 'outline'}
                        size="sm"
                        onClick={() => onAction(action.instruction)}
                        disabled={isLoading}
                        className="gap-1.5 text-xs transition-all duration-200 hover:scale-105"
                      >
                        <Icon className="w-3 h-3" />
                        {action.label}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{action.instruction}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Enhancement Actions */}
      {enhanceActions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cải thiện</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {enhanceActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={`enhance-${index}`}
                  variant="outline"
                  size="sm"
                  onClick={() => onAction(action.instruction)}
                  disabled={isLoading}
                  className="gap-1.5 text-xs transition-all duration-200 hover:scale-105"
                >
                  <Icon className="w-3 h-3" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
