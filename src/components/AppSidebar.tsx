import { Film, Images, Bookmark, Layers, LayoutDashboard, Shield, LogOut, ChevronUp, ChevronDown, CalendarDays, ClipboardList, Building2, User, Globe, Flag, BarChart3, GitBranch, Package, Lightbulb, Settings } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useSidebar } from '@/components/ui/sidebar';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  SidebarSeparator,
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
  { title: 'Admin Panel', url: '/admin', icon: Shield, isMain: true },
  { title: 'Dashboard', url: '/admin/dashboard', icon: BarChart3 },
  { title: 'Industry Memory', url: '/admin/industries', icon: Globe },
  { title: 'Countries', url: '/admin/countries', icon: Flag },
  { title: 'Categories', url: '/admin/categories', icon: Layers },
  { title: 'Memory Packs', url: '/admin/packs', icon: Package },
  { title: 'Version History', url: '/admin/versions', icon: GitBranch },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { isAdmin } = useAdmin();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const isCollapsed = state === 'collapsed';
  
  // Admin section mặc định đóng, mở nếu đang ở trang admin
  const isOnAdminPage = location.pathname.startsWith('/admin');
  const [adminOpen, setAdminOpen] = useState(isOnAdminPage);

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
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="relative flex-shrink-0">
            <img src={logoImage} alt="Flowa Logo" className="w-8 h-8 object-contain" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-base font-bold text-gradient truncate">Flowa</h1>
              <p className="text-[10px] text-muted-foreground truncate">One Flow. All Content.</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Nhóm 1: Quick Access */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            ⚡ Nhanh
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {quickItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className={isCollapsed ? 'sr-only' : ''}>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-3" />

        {/* Nhóm 2: Content Creation */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            📝 Nội dung
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className={isCollapsed ? 'sr-only' : ''}>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-3" />

        {/* Nhóm 3: Management */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            📋 Quản lý
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className={isCollapsed ? 'sr-only' : ''}>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-3" />

        {/* Nhóm 4: Settings */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            ⚙️ Cài đặt
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className={isCollapsed ? 'sr-only' : ''}>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Nhóm 5: Admin - Collapsible */}
        {isAdmin && (
          <>
            <SidebarSeparator className="my-3" />
            <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className={`cursor-pointer flex items-center justify-between hover:bg-muted/50 rounded-md px-2 py-1 transition-colors ${isCollapsed ? 'sr-only' : ''}`}>
                    <span className="flex items-center gap-1">
                      🔒 Quản trị
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {adminItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild tooltip={item.title}>
                            <NavLink
                              to={item.url}
                              className={`flex items-center gap-3 transition-colors ${
                                item.isMain 
                                  ? 'text-red-500/80 hover:text-red-500' 
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                              activeClassName={item.isMain ? 'bg-red-500/10 text-red-500 font-medium' : 'bg-primary/10 text-primary font-medium'}
                            >
                              <item.icon className="w-4 h-4 flex-shrink-0" />
                              <span className={isCollapsed ? 'sr-only' : ''}>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  tooltip={getDisplayName()}
                >
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={getAvatarUrl()} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium truncate">{getDisplayName()}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-56 bg-popover"
              >
                <DropdownMenuItem onClick={() => navigate('/account')}>
                  <User className="mr-2 h-4 w-4" />
                  Tài khoản
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/organization')}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Cài đặt tổ chức
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
