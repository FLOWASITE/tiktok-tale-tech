import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { AIFunctionConfig, getModelInfo } from '@/hooks/useAIConfig';
import { FunctionCard, AIFunction } from './FunctionCard';
import { ChevronDown, ChevronRight, Zap, MessageSquare, Lightbulb, Search, Image, Wand2, RotateCcw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FunctionCategoryGroupProps {
  category: string;
  functions: AIFunction[];
  configs: Map<string, AIFunctionConfig>;
  onEdit: (fn: AIFunction) => void;
  onQuickModelChange?: (functionName: string, model: string | null) => void;
  onBulkReset?: (functionNames: string[]) => void;
  defaultExpanded?: boolean;
  getEnhancedModelInfo: (modelId: string) => ReturnType<typeof getModelInfo>;
}

const CATEGORY_CONFIG: Record<string, { 
  label: string; 
  icon: React.ReactNode; 
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  content: { 
    label: 'Content', 
    icon: <Zap className="h-4 w-4" />, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  chat: { 
    label: 'Chat', 
    icon: <MessageSquare className="h-4 w-4" />, 
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  ideation: { 
    label: 'Ideation', 
    icon: <Lightbulb className="h-4 w-4" />, 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  research: { 
    label: 'Research', 
    icon: <Search className="h-4 w-4" />, 
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  image: { 
    label: 'Image', 
    icon: <Image className="h-4 w-4" />, 
    color: 'text-pink-600',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
  },
  brand: { 
    label: 'Brand', 
    icon: <Wand2 className="h-4 w-4" />, 
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  analysis: { 
    label: 'Analysis', 
    icon: <Search className="h-4 w-4" />, 
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
};

export function FunctionCategoryGroup({
  category,
  functions,
  configs,
  onEdit,
  onQuickModelChange,
  onBulkReset,
  defaultExpanded = true,
  getEnhancedModelInfo,
}: FunctionCategoryGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  
  const categoryConfig = CATEGORY_CONFIG[category] || {
    label: category,
    icon: <Zap className="h-4 w-4" />,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    borderColor: 'border-border',
  };

  const getConfig = (name: string): AIFunctionConfig | undefined => {
    return configs.get(name);
  };

  const overrideCount = functions.filter(fn => {
    const config = getConfig(fn.name);
    return config?.modelOverride;
  }).length;

  const disabledCount = functions.filter(fn => {
    const config = getConfig(fn.name);
    return config && !config.isEnabled;
  }).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-card">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors rounded-lg">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              categoryConfig.bgColor,
              categoryConfig.color
            )}>
              {categoryConfig.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm sm:text-base">{categoryConfig.label}</h3>
                <Badge variant="secondary" className="text-xs">
                  {functions.length}
                </Badge>
                {overrideCount > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                    {overrideCount} override
                  </Badge>
                )}
                {disabledCount > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-muted">
                    {disabledCount} off
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {functions.map(f => f.name).slice(0, 3).join(', ')}
                {functions.length > 3 && ` +${functions.length - 3} more`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Bulk Actions */}
            {overrideCount > 0 && onBulkReset && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onBulkReset(functions.map(f => f.name));
                    }}
                    className="text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-2" />
                    Reset all to default
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {isOpen ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {functions.map((fn) => {
              const config = getConfig(fn.name);
              const displayModel = config?.modelOverride || fn.currentModel;
              const modelInfo = getEnhancedModelInfo(displayModel);
              
              return (
                <FunctionCard
                  key={fn.name}
                  fn={fn}
                  config={config}
                  modelInfo={modelInfo}
                  onEdit={() => onEdit(fn)}
                  onQuickModelChange={
                    onQuickModelChange 
                      ? (model) => onQuickModelChange(fn.name, model) 
                      : undefined
                  }
                  compact
                />
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
