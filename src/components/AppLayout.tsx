import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

import { UserAvatar } from '@/components/UserAvatar';
import { Separator } from '@/components/ui/separator';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { OrganizationSwitcher } from '@/components/OrganizationSwitcher';
import { HeaderBrandSwitcher } from '@/components/HeaderBrandSwitcher';
import { QuickSearch } from '@/components/QuickSearch';
import { HelpChatWidget } from '@/components/help/HelpChatWidget';
import { HelpHeaderButton } from '@/components/help/HelpHeaderButton';
import { MobileSidebarTrigger } from '@/components/MobileSidebarTrigger';


import { useAutoLanguage } from '@/hooks/useAutoLanguage';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  useAutoLanguage();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full overflow-x-hidden bg-background">
        <AppSidebar />
        
        <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
          {/* Top Header Bar - Sticky when scrolling */}
          <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-xl flex items-center px-4 gap-1.5 sm:gap-3">
            {/* Mobile menu trigger - only visible on mobile */}
            <MobileSidebarTrigger />
            
            {/* Desktop sidebar trigger - hidden on mobile */}
            <SidebarTrigger className="h-8 w-8 hidden md:flex" />
            <Separator orientation="vertical" className="h-6 hidden md:block" />
            <OrganizationSwitcher />
            <Separator orientation="vertical" className="h-6 hidden md:block" />
            <HeaderBrandSwitcher />
            <div className="flex-1" />
            
            <div className="flex items-center gap-2">
              <QuickSearch />
              <div className="hidden sm:flex"><HelpHeaderButton /></div>
              <NotificationDropdown />
              <div className="hidden sm:flex"><ThemeToggle /></div>
              <UserAvatar />
            </div>
          </header>

          {/* Main Content - contain: layout isolates from sidebar animations */}
          <main className="flex-1 min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6" style={{ contain: 'layout' }}>
            {children}
          </main>
        </div>
        
        {/* Help Chat Widget - Floating */}
        <HelpChatWidget />
      </div>
    </SidebarProvider>
  );
}
