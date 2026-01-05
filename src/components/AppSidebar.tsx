import { Film, Images, Bookmark, Layers, LayoutDashboard, Shield, LogOut, ChevronUp, ChevronDown, CalendarDays, ClipboardList, Building2, User, Globe, Flag, BarChart3, GitBranch, Package, Lightbulb, Sparkles, BookOpen, Newspaper, Check, Plus, HelpCircle, ExternalLink } from 'lucide-react';
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

// Nhóm 1: Quick Access - Dùng thường xuyên
const quickItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Kho Ý Tưởng', url: '/topics', icon: Lightbulb },
];

// Nhóm 2: Content Creation - Tạo nội dung
const contentItems = [
  { title: 'Nội dung đa kênh', url: '/multichannel', icon: Layers },
  { title: 'Kịch bản Video', url: '/scripts', icon: Film },
  { title: 'Carousel', url: '/carousel', icon: Images },
];

// Nhóm 3: Management - Quản lý
const managementItems = [
  { title: 'Công việc', url: '/tasks', icon: ClipboardList },
  { title: 'Lịch đăng', url: '/calendar', icon: CalendarDays },
];

// Nhóm 4: Settings - Cài đặt
const settingsItems = [
  { title: 'Quản lý Brand', url: '/brands', icon: Bookmark },
];

// Nhóm 5: Admin - Quản trị hệ thống
const adminItems = [
  { title: 'Dashboard', url: '/admin/dashboard', icon: BarChart3 },
  { title: 'Users', url: '/admin/users', icon: User },
  { title: 'AI Management', url: '/admin/ai', icon: Sparkles },
  { title: 'Industry Memory', url: '/admin/industries', icon: Globe },
  { title: 'Countries', url: '/admin/countries', icon: Flag },
  { title: 'Categories', url: '/admin/categories', icon: Layers },
  { title: 'Memory Packs', url: '/admin/packs', icon: Package },
  { title: 'Curated Events', url: '/admin/events', icon: CalendarDays },
  { title: 'Curated News', url: '/admin/industry-news', icon: Newspaper },
  { title: 'Help Articles', url: '/admin/help-articles', icon: BookOpen },
  { title: 'Version History', url: '/admin/versions', icon: GitBranch },
];

// Menu Item Component với premium styling
interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  isMain?: boolean;
}

function PremiumMenuItem({ item, isCollapsed, isAdminItem = false }: { item: MenuItem; isCollapsed: boolean; isAdminItem?: boolean }) {
  const location = useLocation();
  const isActive = location.pathname === item.url || (item.url !== '/' && location.pathname.startsWith(item.url));
  
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.title}>
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
          <span className={isCollapsed ? 'sr-only' : ''}>{item.title}</span>
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

export function AppSidebar() {
  const { state } = useSidebar();
  const { isAdmin } = useAdmin();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { organizations, currentOrganization, switchOrganization } = useOrganizationContext();
  const navigate = useNavigate();
  const location = useLocation();
  const isCollapsed = state === 'collapsed';
  
  // Admin section mặc định đóng, mở nếu đang ở trang admin
  const isOnAdminPage = location.pathname.startsWith('/admin');
  const [adminOpen, setAdminOpen] = useState(isOnAdminPage);

  const handleSwitchOrg = (orgId: string) => {
    switchOrganization(orgId);
    toast.success('Đã chuyển tổ chức');
  };

  const handleSupportClick = () => {
    window.open('https://docs.lovable.dev', '_blank');
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

  const handleSignOut = async () => {
    await signOut();
    toast.success('Đã đăng xuất');
    navigate('/auth');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/30">
      {/* Premium Header */}
      <SidebarHeader className="p-3 border-b border-border/20">
        <div className="flex items-center gap-3 px-2 py-2 relative">
          {/* Logo với glow effect */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150" />
            <img src={logoImage} alt="Flowa Logo" className="w-9 h-9 object-contain relative z-10" />
          </div>
          
          {!isCollapsed && (
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gradient">Flowa</h1>
                <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-primary/10 text-primary rounded-full border border-primary/20 flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" />
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground/70">One Flow. All Content.</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Nhóm 1: Quick Access */}
        <SidebarGroup className="py-2">
          <PremiumGroupLabel isCollapsed={isCollapsed}>Nhanh</PremiumGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {quickItems.map((item) => (
                <PremiumMenuItem key={item.title} item={item} isCollapsed={isCollapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <GradientSeparator />

        {/* Nhóm 2: Content Creation */}
        <SidebarGroup className="py-2">
          <PremiumGroupLabel isCollapsed={isCollapsed}>Nội dung</PremiumGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentItems.map((item) => (
                <PremiumMenuItem key={item.title} item={item} isCollapsed={isCollapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <GradientSeparator />

        {/* Nhóm 3: Management */}
        <SidebarGroup className="py-2">
          <PremiumGroupLabel isCollapsed={isCollapsed}>Quản lý</PremiumGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <PremiumMenuItem key={item.title} item={item} isCollapsed={isCollapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <GradientSeparator />

        {/* Nhóm 4: Settings */}
        <SidebarGroup className="py-2">
          <PremiumGroupLabel isCollapsed={isCollapsed}>Cài đặt</PremiumGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <PremiumMenuItem key={item.title} item={item} isCollapsed={isCollapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Nhóm 5: Admin - Collapsible với distinct styling */}
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
                        Admin
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
                          key={item.title} 
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
                    {/* Avatar với gradient ring */}
                    <div className="relative">
                      <div className="absolute -inset-0.5 bg-gradient-to-br from-primary to-secondary rounded-full opacity-75" />
                      <Avatar className="h-9 w-9 border-2 border-background relative">
                        <AvatarImage src={getAvatarUrl()} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary text-xs font-semibold">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online indicator */}
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
                  {/* Hồ sơ cá nhân */}
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Hồ sơ cá nhân
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate('/account')} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Tài khoản
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-border/30" />
                  
                  {/* Tổ chức */}
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Tổ chức
                  </DropdownMenuLabel>
                  
                  {/* Organization Switcher */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                      <Building2 className="h-4 w-4" />
                      <span className="flex-1 truncate">
                        {currentOrganization?.name || 'Chọn Tổ chức'}
                      </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="w-56 bg-popover">
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
                    Cài đặt tổ chức
                  </DropdownMenuItem>
                  
                  {/* Admin */}
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator className="bg-border/30" />
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Quản trị
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigate('/admin/dashboard')} className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4 text-destructive" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator className="bg-border/30" />
                  
                  <DropdownMenuItem onClick={handleSupportClick} className="cursor-pointer">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Trợ giúp
                    <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-border/30" />
                  
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Đăng xuất
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
