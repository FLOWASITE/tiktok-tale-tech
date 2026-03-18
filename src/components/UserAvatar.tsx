import { useState } from 'react';
import { User, LogOut, HelpCircle, Check, Shield, Building2, Plus, ExternalLink, Globe, Sun, Moon, Leaf, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrganization } from '@/hooks/useOrganization';
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
import { Badge } from '@/components/ui/badge';
import { ORG_ROLE_LABELS, ORG_ROLE_COLORS } from '@/types/organization';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { getPlanBadge } from '@/lib/plan-badge';

export function UserAvatar() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { organizations, currentOrganization, currentRole, switchOrganization } = useOrganizationContext();
  const { createOrganization } = useOrganization();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const { subscription } = useSubscription();
  const planBadge = getPlanBadge(subscription?.plan_type);

  const languages = [
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'th', name: 'ภาษาไทย', flag: '🇹🇭' },
  ];
  const activeLang = i18n.language?.split('-')[0] || 'vi';
  const currentLang = languages.find((l) => l.code === activeLang) || languages[0];

  const themes = [
    { key: 'light', label: 'Sáng', icon: Sun },
    { key: 'dark', label: 'Tối', icon: Moon },
    { key: 'lime', label: 'Lime', icon: Leaf },
    { key: 'system', label: 'Hệ thống', icon: Monitor },
  ];
  const currentTheme = themes.find((t) => t.key === theme) || themes[0];

  const handleLanguageChange = (langCode: string) => {
    localStorage.setItem('flowa_lang_override', langCode);
    localStorage.setItem('i18nextLng', langCode);
    i18n.changeLanguage(langCode);
  };

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
      const org = await createOrganization(newOrgName.trim());
      if (!org) return;

      toast.success('Đã tạo tổ chức mới');
      setNewOrgName('');
      setCreateOrgDialogOpen(false);

      // Switch to the new org
      switchOrganization(org.id);

      // Navigate to organization settings
      navigate('/organization');
    } catch (error: any) {
      toast.error('Lỗi tạo tổ chức: ' + (error?.message ?? 'Unknown error'));
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
              <Badge className={`text-[10px] ${planBadge.className}`}>
                {planBadge.label}
              </Badge>
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
          
          {/* Hồ sơ cá nhân */}
          <DropdownMenuLabel className="text-xs text-muted-foreground px-2">
            Hồ sơ cá nhân
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigate('/account')}>
            <User className="mr-2 h-4 w-4" />
            Tài khoản
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Tổ chức */}
          <DropdownMenuLabel className="text-xs text-muted-foreground px-2">
            Tổ chức
          </DropdownMenuLabel>
          
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
          
          {currentOrganization && (
            <DropdownMenuItem onClick={() => navigate('/organization')}>
              <Building2 className="mr-2 h-4 w-4" />
              Cài đặt tổ chức
            </DropdownMenuItem>
          )}
          
          {/* Admin */}
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground px-2">
                Quản trị
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate('/admin/dashboard')}>
                <Shield className="mr-2 h-4 w-4 text-destructive" />
                Admin Dashboard
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuSeparator />
          
          {/* Language Switcher */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <Globe className="h-4 w-4" />
              <span className="flex-1">{currentLang.flag} {currentLang.name}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-48 bg-popover">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className="gap-2"
                  >
                    <span>{lang.flag}</span>
                    <span className="flex-1">{lang.name}</span>
                    {activeLang === lang.code && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          {/* Theme Switcher */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <currentTheme.icon className="h-4 w-4" />
              <span className="flex-1">{currentTheme.label}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-48 bg-popover">
                {themes.map((t) => {
                  const Icon = t.icon;
                  return (
                    <DropdownMenuItem
                      key={t.key}
                      onClick={() => setTheme(t.key)}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{t.label}</span>
                      {theme === t.key && (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuItem onClick={handleSupportClick}>
            <HelpCircle className="mr-2 h-4 w-4" />
            Trợ giúp
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
