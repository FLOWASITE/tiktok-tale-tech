import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAIProviders } from '@/hooks/useAIProviders';
import { AI_PROVIDERS, AIProviderType } from '@/types/aiProvider';
import { AIProviderSettings } from './AIProviderSettings';
import { toast } from 'sonner';
import { Check, ChevronDown } from 'lucide-react';

interface ProviderStatusBadgeProps {
  compact?: boolean;
  showQuickSwitch?: boolean;
}

export function ProviderStatusBadge({ compact = false, showQuickSwitch = true }: ProviderStatusBadgeProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { config, getProviderConfig, setSelectedProvider } = useAIProviders();
  
  const activeProvider = AI_PROVIDERS.find(p => p.id === config.selectedProvider);
  const isConfigured = !!getProviderConfig(config.selectedProvider);
  
  // Get all configured providers for quick switch
  const configuredProviders = AI_PROVIDERS.filter(p => !!getProviderConfig(p.id));

  const handleQuickSwitch = (providerId: AIProviderType) => {
    if (!getProviderConfig(providerId)) {
      toast.error(`${AI_PROVIDERS.find(p => p.id === providerId)?.name} chưa được cấu hình`);
      return;
    }
    setSelectedProvider(providerId);
    toast.success(`Đã chuyển sang ${AI_PROVIDERS.find(p => p.id === providerId)?.name}`);
  };

  if (!activeProvider) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 text-muted-foreground"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="w-3.5 h-3.5" />
              {!compact && <span className="text-xs">Chưa cấu hình AI</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Nhấn để cấu hình AI Provider</p>
          </TooltipContent>
        </Tooltip>
        
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Cài đặt AI Providers
              </DialogTitle>
            </DialogHeader>
            <AIProviderSettings />
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    );
  }

  if (showQuickSwitch && configuredProviders.length > 1) {
    return (
      <>
        <DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 gap-1.5 ${isConfigured ? '' : 'border-destructive/50 text-destructive'}`}
                  >
                    <span className="text-base">{activeProvider.icon}</span>
                    {!compact && (
                      <span className="text-xs font-medium">
                        {activeProvider.name.split(' ')[0]}
                      </span>
                    )}
                    <ChevronDown className="w-3 h-3 opacity-50" />
                    {isConfigured && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="text-xs">
                  <p className="font-medium">{activeProvider.name}</p>
                  <p className="text-muted-foreground">{activeProvider.description}</p>
                  {configuredProviders.length > 1 && (
                    <p className="mt-1 text-primary">Click để chuyển đổi provider</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Chuyển đổi AI Provider
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {AI_PROVIDERS.map((provider) => {
              const providerConfig = getProviderConfig(provider.id);
              const isActive = config.selectedProvider === provider.id;
              
              return (
                <DropdownMenuItem
                  key={provider.id}
                  onClick={() => handleQuickSwitch(provider.id)}
                  disabled={!providerConfig}
                  className="flex items-center gap-2"
                >
                  <span className="text-base">{provider.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{provider.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {providerConfig ? provider.description : 'Chưa cấu hình'}
                    </p>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-primary" />}
                  {providerConfig && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                </DropdownMenuItem>
              );
            })}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Cài đặt Providers
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Cài đặt AI Providers
              </DialogTitle>
            </DialogHeader>
            <AIProviderSettings />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Simple badge when only one provider or quick switch disabled
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 gap-1.5 ${isConfigured ? '' : 'border-destructive/50 text-destructive'}`}
              onClick={() => setSettingsOpen(true)}
            >
              <span className="text-base">{activeProvider.icon}</span>
              {!compact && (
                <span className="text-xs font-medium">
                  {activeProvider.name.split(' ')[0]}
                </span>
              )}
              {isConfigured && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="text-xs">
              <p className="font-medium">{activeProvider.name}</p>
              <p className="text-muted-foreground">{activeProvider.description}</p>
              <p className="mt-1 text-primary">
                {isConfigured ? 'Click để cấu hình' : 'Chưa cấu hình - Click để thêm API key'}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Cài đặt AI Providers
            </DialogTitle>
          </DialogHeader>
          <AIProviderSettings />
        </DialogContent>
      </Dialog>
    </>
  );
}
