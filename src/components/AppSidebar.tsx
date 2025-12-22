import { Film, Images, Bookmark, Layers, LayoutDashboard, Shield, LogOut, ChevronUp, CalendarDays } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useSidebar } from '@/components/ui/sidebar';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Lịch nội dung', url: '/calendar', icon: CalendarDays },
  { title: 'Nội dung đa kênh', url: '/multichannel', icon: Layers },
  { title: 'Kịch bản Video', url: '/scripts', icon: Film },
  { title: 'Carousel Prompt', url: '/carousel', icon: Images },
  { title: 'Quản lý Brand', url: '/brands', icon: Bookmark },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { isAdmin } = useAdmin();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const isCollapsed = state === 'collapsed';

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
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            Công cụ
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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

        {isAdmin && (
          <>
            <SidebarSeparator className="my-2" />
            <SidebarGroup>
              <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
                Quản trị
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Admin Panel">
                      <NavLink
                        to="/admin"
                        className="flex items-center gap-3 text-red-500/80 hover:text-red-500 transition-colors"
                        activeClassName="bg-red-500/10 text-red-500 font-medium"
                      >
                        <Shield className="w-4 h-4 flex-shrink-0" />
                        <span className={isCollapsed ? 'sr-only' : ''}>Admin Panel</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
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
                  Tài khoản
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/organization')}>
                  Tổ chức
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
