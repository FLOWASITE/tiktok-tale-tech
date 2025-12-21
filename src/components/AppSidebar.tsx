import { Film, Images, Bookmark, Layers, LayoutDashboard, User, Shield } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useSidebar } from '@/components/ui/sidebar';
import { useAdmin } from '@/hooks/useAdmin';
import { OrganizationSwitcher } from '@/components/OrganizationSwitcher';
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
  { title: 'Nội dung đa kênh', url: '/multichannel', icon: Layers },
  { title: 'Kịch bản Video', url: '/scripts', icon: Film },
  { title: 'Carousel Prompt', url: '/carousel', icon: Images },
  { title: 'Quản lý Brand', url: '/brands', icon: Bookmark },
  { title: 'Tài khoản', url: '/account', icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { isAdmin } = useAdmin();
  const isCollapsed = state === 'collapsed';

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
        <OrganizationSwitcher />
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
        <div className={`text-[10px] text-muted-foreground text-center ${isCollapsed ? 'hidden' : ''}`}>
          AI Content Platform
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
