import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserAvatar } from '@/components/UserAvatar';
import { Separator } from '@/components/ui/separator';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { OrganizationSwitcher } from '@/components/OrganizationSwitcher';
import { QuickSearch } from '@/components/QuickSearch';
import { HelpChatWidget } from '@/components/help/HelpChatWidget';
import { HelpHeaderButton } from '@/components/help/HelpHeaderButton';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full overflow-x-hidden bg-background">
        <AppSidebar />
        
        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          {/* Top Header Bar */}
          <header className="sticky top-0 z-40 h-14 border-b border-border/50 bg-background/95 backdrop-blur-xl flex items-center px-4 gap-4">
            <SidebarTrigger className="h-8 w-8" />
            <Separator orientation="vertical" className="h-6" />
            <OrganizationSwitcher />
            <div className="flex-1" />
            
            <div className="flex items-center gap-2">
              <QuickSearch />
              <HelpHeaderButton />
              <NotificationDropdown />
              <ThemeToggle />
              <UserAvatar />
            </div>
          </header>

          {/* Main Content - contain: layout isolates from sidebar animations */}
          <main className="flex-1 min-w-0 max-w-full overflow-x-hidden overflow-y-auto p-4 sm:p-6" style={{ contain: 'layout' }}>
            {children}
          </main>
        </div>
        
        {/* Help Chat Widget - Floating */}
        <HelpChatWidget />
      </div>
    </SidebarProvider>
  );
}
