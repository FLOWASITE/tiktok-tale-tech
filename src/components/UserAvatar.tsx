import { useState } from 'react';
import { User, LogOut, Settings, Sparkles, Palette, HelpCircle, Check, Shield, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAdmin } from '@/hooks/useAdmin';
import { useAIProviders } from '@/hooks/useAIProviders';
import { AI_PROVIDERS, AIProviderType } from '@/types/aiProvider';
import { AIProviderSettings } from './AIProviderSettings';
import { Badge } from '@/components/ui/badge';

export function UserAvatar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { config, getProviderConfig, setSelectedProvider } = useAIProviders();
  const activeProvider = AI_PROVIDERS.find(p => p.id === config.selectedProvider);
  const isConfigured = !!getProviderConfig(config.selectedProvider);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Đã đăng xuất');
    navigate('/auth');
  };

  const getInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const handleQuickSwitch = (providerId: AIProviderType) => {
    if (!getProviderConfig(providerId)) {
      toast.error(`${AI_PROVIDERS.find(p => p.id === providerId)?.name} chưa được cấu hình`);
      setSettingsOpen(true);
      return;
    }
    setSelectedProvider(providerId);
    toast.success(`Đã chuyển sang ${AI_PROVIDERS.find(p => p.id === providerId)?.name}`);
  };

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer border border-border/50 hover:border-primary/50 transition-colors">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tài khoản</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-64 bg-popover">
          <div className="px-3 py-2">
            <p className="text-sm font-medium">{getDisplayName()}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            {isAdmin && (
              <Badge variant="destructive" className="mt-1 text-xs">Admin</Badge>
            )}
          </div>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => navigate('/account')}>
            <User className="mr-2 h-4 w-4" />
            Tài khoản
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => navigate('/organization')}>
            <Building2 className="mr-2 h-4 w-4" />
            Tổ chức
          </DropdownMenuItem>
          
          {isAdmin && (
            <DropdownMenuItem onClick={() => navigate('/admin')}>
              <Shield className="mr-2 h-4 w-4 text-red-500" />
              Admin Panel
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            AI Provider
          </DropdownMenuLabel>
          
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <span className="text-base">{activeProvider?.icon || '🤖'}</span>
              <span className="flex-1">
                {activeProvider?.name.split(' ')[0] || 'Chọn Provider'}
              </span>
              {isConfigured && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-56">
                {AI_PROVIDERS.map((provider) => {
                  const providerConfig = getProviderConfig(provider.id);
                  const isActive = config.selectedProvider === provider.id;
                  
                  return (
                    <DropdownMenuItem
                      key={provider.id}
                      onClick={() => handleQuickSwitch(provider.id)}
                      className="gap-2"
                    >
                      <span className="text-base">{provider.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm">{provider.name}</p>
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
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Cài đặt API
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => navigate('/brands')}>
            <Palette className="mr-2 h-4 w-4" />
            Quản lý Brand
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem>
            <HelpCircle className="mr-2 h-4 w-4" />
            Hỗ trợ
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Đăng xuất
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
