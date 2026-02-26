// ============================================
// WorkflowPreviewTooltip Component
// Shows predicted agent workflow before sending
// ============================================

import { useMemo } from 'react';
import { Search, ClipboardList, PenTool, Image, ShieldCheck, Brain, Shield, Gauge } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface WorkflowPreviewTooltipProps {
  input: string;
  children: React.ReactNode;
  enabled?: boolean;
}

const WORKFLOW_AGENTS = [
  { key: 'research', label: 'Research', icon: Search, patterns: [/nghiên cứu|research|xu hướng|trend|tìm|search|phân tích/i] },
  { key: 'brand_memory', label: 'Brand Memory', icon: Brain, patterns: [/.*/] }, // always included
  { key: 'compliance', label: 'Compliance', icon: Shield, patterns: [/quảng cáo|ad|policy|tuân thủ|compliance|facebook|google|tiktok/i] },
  { key: 'strategy', label: 'Strategy', icon: ClipboardList, patterns: [/chiến lược|strategy|kế hoạch|plan|content mix/i] },
  { key: 'content', label: 'Content', icon: PenTool, patterns: [/.*/] }, // always included for content gen
  { key: 'visual', label: 'Visual', icon: Image, patterns: [/hình|image|ảnh|visual|thiết kế|design|banner|poster/i] },
  { key: 'reviewer', label: 'Reviewer', icon: ShieldCheck, patterns: [/.*/] }, // always reviews
  { key: 'governor', label: 'Governor', icon: Gauge, patterns: [/.*/] }, // always governs
];

export function WorkflowPreviewTooltip({ input, children, enabled = true }: WorkflowPreviewTooltipProps) {
  const predictedAgents = useMemo(() => {
    if (!input.trim()) return [];
    return WORKFLOW_AGENTS.filter(agent =>
      agent.patterns.some(p => p.test(input))
    );
  }, [input]);

  if (!enabled || !input.trim()) {
    return <>{children}</>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-56 p-3" sideOffset={8}>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Workflow dự kiến
        </p>
        <div className="space-y-1">
          {predictedAgents.map((agent, i) => {
            const Icon = agent.icon;
            return (
              <div key={agent.key} className="flex items-center gap-2 py-1">
                <span className="text-[10px] text-muted-foreground/60 w-3">{i + 1}</span>
                <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                  <Icon className="w-3 h-3 text-primary/70" />
                </div>
                <span className="text-[11px]">{agent.label}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[9px] text-muted-foreground mt-2 border-t pt-1.5">
          {predictedAgents.length} agents sẽ được kích hoạt
        </p>
      </PopoverContent>
    </Popover>
  );
}
