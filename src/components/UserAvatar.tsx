import { useState } from 'react';
import { User, LogOut, Check, Shield, Building2, Plus, Globe, Sun, Moon, Leaf, Monitor, Settings, ChevronRight, Palette, HelpCircle, ExternalLink, Bookmark } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
    { key: 'light', icon: Sun },
    { key: 'dark', icon: Moon },
    { key: 'lime', icon: Leaf },
    { key: 'system', icon: Monitor },
  ];

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

  const getAvatarUrl = () => profile?.avatar_url || user?.user_metadata?.avatar_url;

  const getInitials = () => {
    const name = profile?.full_name || user?.user_metadata?.full_name;
    if (name) return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    return profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  };

  const handleSwitchOrg = (orgId: string) => {
    switchOrganization(orgId);
    toast.success('Đã chuyển tổ chức');
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) { toast.error('Vui lòng nhập tên tổ chức'); return; }
    setCreatingOrg(true);
    try {
      const org = await createOrganization(newOrgName.trim());
      if (!org) return;
      toast.success('Đã tạo tổ chức mới');
      setNewOrgName('');
      setCreateOrgDialogOpen(false);
      switchOrganization(org.id);
      navigate('/organization');
    } catch (error: any) {
      toast.error('Lỗi tạo tổ chức: ' + (error?.message ?? 'Unknown error'));
    } finally {
      setCreatingOrg(false);
    }
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
          <TooltipContent><p>Tài khoản</p></TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-64 p-0 bg-popover">
          {/* Profile Header */}
          <div
            className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate('/account')}
          >
            <Avatar className="h-9 w-9 border border-border shrink-0">
              <AvatarImage src={getAvatarUrl()} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{getDisplayName()}</p>
                <Badge className={`text-[9px] px-1 py-0 leading-tight shrink-0 ${planBadge.className}`}>
                  {planBadge.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          <DropdownMenuSeparator className="my-0" />

          {/* Organization */}
          <div className="p-1">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2 rounded-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">
                  {currentOrganization?.name || 'Chọn tổ chức'}
                </span>
                {currentRole && (
                  <Badge variant="outline" className={cn("text-[10px] px-1 py-0 leading-tight shrink-0", ORG_ROLE_COLORS[currentRole])}>
                    {ORG_ROLE_LABELS[currentRole]}
                  </Badge>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-56 bg-popover">
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
                        <span className="flex-1 truncate text-sm">{org.name}</span>
                        {org.id === currentOrganization?.id && (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCreateOrgDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Tạo tổ chức mới
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            {currentOrganization && (
              <DropdownMenuItem onClick={() => navigate('/organization')} className="gap-2 rounded-sm">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Cài đặt tổ chức</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => navigate('/account')} className="gap-2 rounded-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Quản lý tài khoản</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate('/brands')} className="gap-2 rounded-sm">
              <Bookmark className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Quản lý Brand</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate('/connections')} className="gap-2 rounded-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Kết nối kênh</span>
            </DropdownMenuItem>

            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate('/admin/dashboard')} className="gap-2 rounded-sm">
                <Shield className="h-4 w-4 text-destructive" />
                <span className="text-sm">Admin Dashboard</span>
              </DropdownMenuItem>
            )}
          </div>

          <DropdownMenuSeparator className="my-0" />

          {/* Preferences: Language + Theme inline */}
          <div className="p-1">
            {/* Language */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2 rounded-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm">{currentLang.flag} {currentLang.name}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-44 bg-popover">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className="gap-2"
                    >
                      <span>{lang.flag}</span>
                      <span className="flex-1 text-sm">{lang.name}</span>
                      {activeLang === lang.code && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            {/* Theme - inline toggle row */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-sm">
              <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm flex-1">Giao diện</span>
              <div className="flex items-center gap-0.5 bg-muted/60 rounded-md p-0.5">
                {themes.map((t) => {
                  const Icon = t.icon;
                  const isActive = theme === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={(e) => { e.stopPropagation(); setTheme(t.key); }}
                      className={cn(
                        "p-1 rounded transition-all",
                        isActive
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title={t.key}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <DropdownMenuItem
              onClick={() => window.open('https://docs.lovable.dev', '_blank')}
              className="gap-2 rounded-sm"
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm">Trợ giúp</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator className="my-0" />

          {/* Sign out */}
          <div className="p-1">
            <DropdownMenuItem onClick={handleSignOut} className="gap-2 rounded-sm text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Đăng xuất</span>
            </DropdownMenuItem>
          </div>
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
              <label className="text-sm font-medium mb-2 block">Tên tổ chức</label>
              <Input
                placeholder="VD: Công ty ABC"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateOrg()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOrgDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleCreateOrg} disabled={creatingOrg || !newOrgName.trim()}>
                {creatingOrg ? 'Đang tạo...' : 'Tạo tổ chức'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
