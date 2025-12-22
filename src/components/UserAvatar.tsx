import { useState } from 'react';
import { User, LogOut, Settings, Sparkles, Palette, HelpCircle, Check, Shield, Building2, Plus, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
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
import { ORG_ROLE_LABELS, ORG_ROLE_COLORS } from '@/types/organization';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function UserAvatar() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { organizations, currentOrganization, currentRole, switchOrganization } = useOrganizationContext();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const { config, getProviderConfig, setSelectedProvider } = useAIProviders();
  const activeProvider = AI_PROVIDERS.find(p => p.id === config.selectedProvider);
  const isConfigured = !!getProviderConfig(config.selectedProvider);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Đã đăng xuất');
    navigate('/auth');
  };

  const getAvatarUrl = () => {
    return profile?.avatar_url || user?.user_metadata?.avatar_url;
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    if (profile?.full_name) {
      return profile.full_name;
    }
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

  const handleSwitchOrg = (orgId: string) => {
    switchOrganization(orgId);
    toast.success('Đã chuyển tổ chức');
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) {
      toast.error('Vui lòng nhập tên tổ chức');
      return;
    }
    
    setCreatingOrg(true);
    try {
      // Import dynamically to avoid circular dependency
      const { supabase } = await import('@/integrations/supabase/client');
      
      const slug = newOrgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: newOrgName.trim(),
          slug,
          owner_id: user!.id,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add owner as member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user!.id,
          role: 'owner',
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      toast.success('Đã tạo tổ chức mới');
      setNewOrgName('');
      setCreateOrgDialogOpen(false);
      
      // Switch to the new org
      switchOrganization(org.id);
      
      // Navigate to organization settings
      navigate('/organization');
    } catch (error: any) {
      toast.error('Lỗi tạo tổ chức: ' + error.message);
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleSupportClick = () => {
    window.open('https://docs.lovable.dev', '_blank');
  };

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer border border-border/50 hover:border-primary/50 transition-colors">
                <AvatarImage src={getAvatarUrl()} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tài khoản</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-72 bg-popover">
          {/* Enhanced Header */}
          <div className="px-3 py-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={getAvatarUrl()} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {currentOrganization && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Building2 className="w-3 h-3" />
                  {currentOrganization.name}
                </Badge>
              )}
              {currentRole && (
                <Badge className={`text-xs ${ORG_ROLE_COLORS[currentRole]}`}>
                  {ORG_ROLE_LABELS[currentRole]}
                </Badge>
              )}
              {isAdmin && (
                <Badge variant="destructive" className="text-xs">Admin</Badge>
              )}
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => navigate('/account')}>
            <User className="mr-2 h-4 w-4" />
            Tài khoản
          </DropdownMenuItem>
          
          {currentOrganization && (
            <DropdownMenuItem onClick={() => navigate('/organization')}>
              <Settings className="mr-2 h-4 w-4" />
              Cài đặt tổ chức
            </DropdownMenuItem>
          )}
          {/* Organization Switcher */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="flex-1 truncate">
                {currentOrganization?.name || 'Chọn Tổ chức'}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-64 bg-popover">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Tổ chức của bạn
                </DropdownMenuLabel>
                
                {organizations.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    Chưa có tổ chức nào
                  </div>
                ) : (
                  organizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => handleSwitchOrg(org.id)}
                      className="gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ORG_ROLE_LABELS[org.role]}
                        </p>
                      </div>
                      {org.id === currentOrganization?.id && (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </DropdownMenuItem>
                  ))
                )}
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => setCreateOrgDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo tổ chức mới
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          
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
              <DropdownMenuSubContent className="w-56 bg-popover">
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
          
          <DropdownMenuItem onClick={handleSupportClick}>
            <HelpCircle className="mr-2 h-4 w-4" />
            Hỗ trợ
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* AI Settings Dialog */}
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

      {/* Create Organization Dialog */}
      <Dialog open={createOrgDialogOpen} onOpenChange={setCreateOrgDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Tạo tổ chức mới
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Tên tổ chức
              </label>
              <Input
                placeholder="VD: Công ty ABC"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateOrg()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateOrgDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button
                onClick={handleCreateOrg}
                disabled={creatingOrg || !newOrgName.trim()}
              >
                {creatingOrg ? 'Đang tạo...' : 'Tạo tổ chức'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
