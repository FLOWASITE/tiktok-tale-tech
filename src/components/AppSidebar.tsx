import { Film, Images, Bookmark, Layers, LayoutDashboard, Shield, LogOut, ChevronUp, ChevronDown, CalendarDays, ClipboardList, Building2, User, Globe, Flag, BarChart3, GitBranch, Package, Lightbulb, Sparkles, BookOpen, Newspaper, Check, Plus, HelpCircle, ExternalLink, Target, Megaphone, FileText, Network, MessageSquare, GalleryHorizontalEnd, AlertTriangle, Ticket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { NavLink } from '@/components/NavLink';
import { useSidebar } from '@/components/ui/sidebar';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ORG_ROLE_LABELS } from '@/types/organization';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '@/hooks/useSubscription';
import { getPlanBadge } from '@/lib/plan-badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import logoImage from '@/assets/logo.png';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar';

// Menu Item Component với premium styling
interface MenuItem {
  title: string;
  titleKey: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  isMain?: boolean;
}

function PremiumMenuItem({ item, isCollapsed, isAdminItem = false }: { item: MenuItem; isCollapsed: boolean; isAdminItem?: boolean }) {
  const location = useLocation();
  const { t } = useTranslation();
  const isActive = location.pathname === item.url || (item.url !== '/' && location.pathname.startsWith(item.url));
  const label = t(item.titleKey, { defaultValue: item.title });
  
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={label}>
        <NavLink
          to={item.url}
          className={cn(
            "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl",
            "text-muted-foreground transition-all duration-200 ease-out",
            "hover:text-foreground hover:bg-muted/50",
            isAdminItem && item.isMain && "text-destructive/70 hover:text-destructive",
          )}
          activeClassName={cn(
            "text-primary font-medium",
            "bg-primary/8 backdrop-blur-sm",
            "shadow-[inset_0_0_20px_hsl(var(--primary)/0.08)]",
            isAdminItem && item.isMain && "bg-destructive/10 text-destructive"
          )}
        >
          {/* Active indicator bar */}
          <span className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2",
            "w-[3px] h-0 rounded-full",
            "bg-gradient-to-b from-primary to-secondary",
            "transition-all duration-300 ease-out",
            isActive && "h-5",
            isAdminItem && item.isMain && isActive && "from-destructive to-destructive/70"
          )} />
          
          <item.icon className={cn(
            "w-4 h-4 flex-shrink-0 transition-all duration-200",
            "group-hover:scale-110",
            isActive && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]",
            isAdminItem && item.isMain && isActive && "drop-shadow-[0_0_6px_hsl(var(--destructive)/0.5)]"
          )} />
          <span className={isCollapsed ? 'sr-only' : ''}>{label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// Group Label Component
function PremiumGroupLabel({ children, isCollapsed }: { children: React.ReactNode; isCollapsed: boolean }) {
  return (
    <SidebarGroupLabel className={cn(
      "flex items-center gap-2 px-3 mb-1",
      isCollapsed && 'sr-only'
    )}>
      <span className="w-1 h-1 rounded-full bg-primary/60" />
      <span className="uppercase tracking-wider text-[10px] font-semibold text-muted-foreground/70">
        {children}
      </span>
    </SidebarGroupLabel>
  );
}

// Gradient Separator Component
function GradientSeparator() {
  return (
    <div className="my-4 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
  );
}

// Quota Progress Indicator - shows average usage across all metrics
function QuotaWarningIndicator() {
  const { currentPlanLimits, usage, currentPeriod, subscription } = useSubscription();
  const navigate = useNavigate();
  const planBadge = getPlanBadge(subscription?.plan_type);

  if (!currentPlanLimits || !usage) {
    return <p className="text-[10px] text-muted-foreground/70">One Flow. All Content.</p>;
  }

  const checks = [
    { used: usage.scripts, limit: currentPlanLimits.monthly_scripts },
    { used: usage.carousels, limit: currentPlanLimits.monthly_carousels },
    { used: usage.multichannel, limit: currentPlanLimits.monthly_multichannel },
    { used: usage.images, limit: currentPlanLimits.monthly_images },
    { used: usage.brands, limit: currentPlanLimits.monthly_brands },
  ].filter(c => c.limit !== -1 && c.limit > 0);

  const avgPct = checks.length > 0
    ? Math.round(checks.reduce((acc, c) => acc + (c.used / c.limit) * 100, 0) / checks.length)
    : 0;
  const clampedPct = Math.min(100, avgPct);

  const now = new Date();
  const periodEnd = new Date(currentPeriod.end);
  const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / 86400000));

  const barColor = clampedPct >= 90
    ? 'bg-destructive'
    : clampedPct >= 70
      ? 'bg-yellow-500'
      : 'bg-emerald-500';

  const metricDetails = [
    { label: 'Scripts', used: usage.scripts, limit: currentPlanLimits.monthly_scripts },
    { label: 'Carousels', used: usage.carousels, limit: currentPlanLimits.monthly_carousels },
    { label: 'Đa kênh', used: usage.multichannel, limit: currentPlanLimits.monthly_multichannel },
    { label: 'Ảnh AI', used: usage.images, limit: currentPlanLimits.monthly_images },
    { label: 'Brands', used: usage.brands, limit: currentPlanLimits.monthly_brands },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate('/account')}
            className="w-full text-left cursor-pointer group mt-0.5"
          >
            <div className="flex items-center justify-between text-[10px] mb-0.5 gap-2">
              <span className="text-muted-foreground/80 group-hover:text-foreground transition-colors">
                Hạn mức: {clampedPct}%
              </span>
              <span className="text-muted-foreground/60">{daysRemaining} ngày còn lại</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', barColor)}
                style={{ width: `${clampedPct}%` }}
              />
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="w-52 p-3">
          <div className="space-y-1.5 text-xs">
            <p className="font-semibold border-b border-border pb-1 mb-1">Chi tiết hạn mức</p>
            {metricDetails.map(m => {
              const isUnlimited = m.limit === -1;
              const pct = isUnlimited ? 0 : Math.min(100, Math.round((m.used / m.limit) * 100));
              return (
                <div key={m.label} className="flex justify-between">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className={cn(
                    'font-medium tabular-nums',
                    !isUnlimited && pct >= 90 ? 'text-destructive' : !isUnlimited && pct >= 70 ? 'text-amber-500' : ''
                  )}>
                    {m.used}/{isUnlimited ? '∞' : m.limit} {!isUnlimited && `(${pct}%)`}
                  </span>
                </div>
              );
            })}
            <div className="pt-1 border-t border-border mt-1 font-semibold flex justify-between">
              <span>Trung bình</span>
              <span>{clampedPct}%</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const { isAdmin } = useAdmin();
  const { subscription } = useSubscription();
  const planBadge = getPlanBadge(subscription?.plan_type);
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { organizations, currentOrganization, switchOrganization } = useOrganizationContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const isCollapsed = state === 'collapsed';
  
  const isOnAdminPage = location.pathname.startsWith('/admin');
  const [adminOpen, setAdminOpen] = useState(isOnAdminPage);

  // Nhóm 1: Quick Access
  const quickItems: MenuItem[] = [
    { title: 'Dashboard', titleKey: 'app.sidebar.dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Kho Ý Tưởng', titleKey: 'app.sidebar.ideaBank', url: '/topics', icon: Lightbulb },
    { title: 'Core Content', titleKey: 'app.sidebar.coreContent', url: '/core-content', icon: FileText },
    { title: 'Gallery', titleKey: 'app.sidebar.gallery', url: '/gallery', icon: GalleryHorizontalEnd },
  ];

  // Nhóm 2: Content Creation
  const contentItems: MenuItem[] = [
    { title: 'Nội dung đa kênh', titleKey: 'app.sidebar.multichannel', url: '/multichannel', icon: Layers },
    { title: 'Kịch bản Video', titleKey: 'app.sidebar.videoScript', url: '/scripts', icon: Film },
    { title: 'Carousel', titleKey: 'app.sidebar.carousel', url: '/carousel', icon: Images },
    { title: 'Ad Copies', titleKey: 'app.sidebar.adCopies', url: '/ad-copies', icon: Megaphone },
  ];

  // Nhóm 3: Management
  const managementItems: MenuItem[] = [
    { title: 'Chiến dịch', titleKey: 'app.sidebar.campaigns', url: '/campaigns', icon: Target },
    { title: 'Công việc', titleKey: 'app.sidebar.tasks', url: '/tasks', icon: ClipboardList },
    { title: 'Lịch đăng', titleKey: 'app.sidebar.calendar', url: '/calendar', icon: CalendarDays },
  ];

  // Nhóm 4: Settings
  const settingsItems: MenuItem[] = [
    { title: 'Quản lý Brand', titleKey: 'app.sidebar.brandManagement', url: '/brands', icon: Bookmark },
  ];

  // Nhóm 5: Admin
  const adminItems: MenuItem[] = [
    { title: 'Dashboard', titleKey: 'app.sidebar.adminDashboard', url: '/admin/dashboard', icon: BarChart3 },
    { title: 'Users', titleKey: 'app.sidebar.adminUsers', url: '/admin/users', icon: User },
    { title: 'AI Management', titleKey: 'app.sidebar.adminAI', url: '/admin/ai', icon: Sparkles },
    { title: 'Social Platforms', titleKey: 'app.sidebar.adminSocial', url: '/admin/social-settings', icon: Globe },
    { title: 'Industry Park', titleKey: 'app.sidebar.adminIndustry', url: '/admin/industries', icon: Layers },
    { title: 'Knowledge Graph', titleKey: 'app.sidebar.adminKnowledgeGraph', url: '/admin/knowledge-graph', icon: Network },
    { title: 'Countries', titleKey: 'app.sidebar.adminCountries', url: '/admin/countries', icon: Flag },
    { title: 'Categories', titleKey: 'app.sidebar.adminCategories', url: '/admin/categories', icon: Bookmark },
    { title: 'Curated Events', titleKey: 'app.sidebar.adminEvents', url: '/admin/events', icon: CalendarDays },
    { title: 'Curated News', titleKey: 'app.sidebar.adminNews', url: '/admin/industry-news', icon: Newspaper },
    { title: 'Help Articles', titleKey: 'app.sidebar.adminHelp', url: '/admin/help-articles', icon: BookOpen },
    { title: 'Organizations', titleKey: 'app.sidebar.adminOrgs', url: '/admin/organizations', icon: Building2 },
    { title: 'Vouchers', titleKey: 'app.sidebar.adminVouchers', url: '/admin/vouchers', icon: Ticket },
    { title: 'Version History', titleKey: 'app.sidebar.adminVersions', url: '/admin/versions', icon: GitBranch },
  ];

  const handleSwitchOrg = (orgId: string) => {
    switchOrganization(orgId);
    toast.success(t('app.userMenu.switchedOrg'));
  };

  const handleSupportClick = () => {
    window.open('https://docs.lovable.dev', '_blank');
  };

  const getAvatarUrl = () => {
    return profile?.avatar_url || user?.user_metadata?.avatar_url;
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    if (profile?.full_name) return profile.full_name;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    return user?.email?.split('@')[0] || 'User';
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success(t('app.userMenu.signedOut'));
    navigate('/auth');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/30">
      {/* Premium Header */}
      <SidebarHeader className="p-3 border-b border-border/20">
        <div className="flex items-center gap-3 px-2 py-2 relative">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150" />
            <img src={logoImage} alt="Flowa Logo" className="w-9 h-9 object-contain relative z-10" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gradient">Flowa</h1>
                <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-full border flex items-center gap-0.5 ${planBadge.className}`}>
                  <Sparkles className="w-2.5 h-2.5" />
                  {planBadge.label}
                </span>
              </div>
              <QuotaWarningIndicator />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Flowa Team - Most prominent item */}
        <SidebarGroup className="py-2 pb-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('app.sidebar.flowaTeam', { defaultValue: 'Flowa Team' })}>
                  <NavLink
                    to="/chat"
                    className={cn(
                      "group relative flex items-center gap-3 px-3 py-3 rounded-xl",
                      "bg-gradient-to-r from-primary/10 to-secondary/10",
                      "border border-primary/20",
                      "text-foreground font-semibold transition-all duration-200 ease-out",
                      "hover:from-primary/15 hover:to-secondary/15 hover:border-primary/30",
                      "hover:shadow-[0_0_16px_hsl(var(--primary)/0.15)]",
                    )}
                    activeClassName={cn(
                      "from-primary/15 to-secondary/15 border-primary/40",
                      "shadow-[0_0_20px_hsl(var(--primary)/0.2)]",
                      "animate-pulse-glow",
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <Sparkles className={cn(
                        "w-5 h-5 text-primary transition-transform duration-300",
                        "group-hover:rotate-12 group-hover:scale-110",
                        "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]",
                      )} />
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-sm">{t('app.sidebar.flowaTeam', { defaultValue: 'Flowa Team' })}</span>
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-primary/25 font-bold">
                          AI
                        </Badge>
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <GradientSeparator />

        {/* Nhóm 1: Quick Access */}
        <SidebarGroup className="py-2">
          <PremiumGroupLabel isCollapsed={isCollapsed}>{t('app.sidebar.quick')}</PremiumGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {quickItems.map((item) => (
                <PremiumMenuItem key={item.url} item={item} isCollapsed={isCollapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <GradientSeparator />

        {/* Nhóm 2: Content Creation */}
        <SidebarGroup className="py-2">
          <PremiumGroupLabel isCollapsed={isCollapsed}>{t('app.sidebar.content')}</PremiumGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentItems.map((item) => (
                <PremiumMenuItem key={item.url} item={item} isCollapsed={isCollapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <GradientSeparator />

        {/* Nhóm 3: Management */}
        <SidebarGroup className="py-2">
          <PremiumGroupLabel isCollapsed={isCollapsed}>{t('app.sidebar.management')}</PremiumGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <PremiumMenuItem key={item.url} item={item} isCollapsed={isCollapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <GradientSeparator />

        {/* Nhóm 4: Settings */}
        <SidebarGroup className="py-2">
          <PremiumGroupLabel isCollapsed={isCollapsed}>{t('app.sidebar.settings')}</PremiumGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <PremiumMenuItem key={item.url} item={item} isCollapsed={isCollapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Nhóm 5: Admin */}
        {isAdmin && (
          <>
            <GradientSeparator />
            <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
              <SidebarGroup className={cn(
                "py-2 rounded-xl transition-colors",
                adminOpen && "bg-destructive/5"
              )}>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className={cn(
                    "cursor-pointer flex items-center justify-between hover:bg-muted/50 rounded-lg px-3 py-2 transition-all",
                    isCollapsed && 'sr-only'
                  )}>
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-destructive/70" />
                      <span className="uppercase tracking-wider text-[10px] font-semibold text-destructive/70">
                        {t('app.sidebar.admin')}
                      </span>
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform duration-300",
                      adminOpen && "rotate-180"
                    )} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent className="animate-accordion-down">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {adminItems.map((item) => (
                        <PremiumMenuItem 
                          key={item.url} 
                          item={item} 
                          isCollapsed={isCollapsed} 
                          isAdminItem 
                        />
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          </>
        )}
      </SidebarContent>

      {/* Premium Footer */}
      <SidebarFooter className="p-3">
        <div className={cn(
          "glass-card rounded-xl transition-all duration-200",
          !isCollapsed && "p-1.5"
        )}>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className={cn(
                      "w-full rounded-lg transition-all duration-200",
                      "hover:-translate-y-0.5 hover:shadow-lg",
                      "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    )}
                    tooltip={getDisplayName()}
                  >
                    <div className="relative">
                      <div className="absolute -inset-0.5 bg-gradient-to-br from-primary to-secondary rounded-full opacity-75" />
                      <Avatar className="h-9 w-9 border-2 border-background relative">
                        <AvatarImage src={getAvatarUrl()} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary text-xs font-semibold">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                    </div>
                    {!isCollapsed && (
                      <>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-semibold truncate">{getDisplayName()}</p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Online
                          </p>
                        </div>
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      </>
                    )}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="start"
                  className="w-64 glass-card border-border/30 shadow-xl bg-popover"
                >
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {t('app.userMenu.profile')}
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate('/account')} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    {t('app.userMenu.account')}
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-border/30" />
                  
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {t('app.userMenu.organization')}
                  </DropdownMenuLabel>
                  
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                      <Building2 className="h-4 w-4" />
                      <span className="flex-1 truncate">
                        {currentOrganization?.name || t('app.userMenu.selectOrg')}
                      </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="w-56 bg-popover">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          {t('app.userMenu.yourOrgs')}
                        </DropdownMenuLabel>
                        
                        {organizations.length === 0 ? (
                          <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                            {t('app.userMenu.noOrgs')}
                          </div>
                        ) : (
                          organizations.map((org) => (
                            <DropdownMenuItem
                              key={org.id}
                              onClick={() => handleSwitchOrg(org.id)}
                              className="gap-2 cursor-pointer"
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
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  
                  <DropdownMenuItem onClick={() => navigate('/organization')} className="cursor-pointer">
                    <Building2 className="mr-2 h-4 w-4" />
                    {t('app.userMenu.orgSettings')}
                  </DropdownMenuItem>
                  
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator className="bg-border/30" />
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        {t('app.userMenu.admin')}
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigate('/admin/dashboard')} className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4 text-destructive" />
                        {t('app.userMenu.adminDashboard')}
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator className="bg-border/30" />
                  
                  <DropdownMenuItem onClick={handleSupportClick} className="cursor-pointer">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    {t('app.userMenu.help')}
                    <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-border/30" />
                  
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('app.userMenu.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>

      <SidebarRail className="hover:after:bg-gradient-to-b hover:after:from-primary/30 hover:after:via-secondary/30 hover:after:to-primary/30" />
    </Sidebar>
  );
}
