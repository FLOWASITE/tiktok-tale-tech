import { AnimatedToaster } from "@/components/ui/animated-toast";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { TopicErrorBoundary } from "@/components/topic/TopicErrorBoundary";
import { useDomainRouting } from "@/hooks/useDomainRouting";
import Dashboard from "./pages/Dashboard";
import Topics from "./pages/Topics";
import Index from "./pages/Index";
import Carousel from "./pages/Carousel";
import Brands from "./pages/Brands";
import BrandView from "./pages/BrandView";
import BrandCreate from "./pages/BrandCreate";
import MultiChannel from "./pages/MultiChannel";
import Tasks from "./pages/Tasks";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminAIManagement from "./pages/AdminAIManagement";
import AdminIndustries from "./pages/AdminIndustries";
import AdminIndustryVersions from "./pages/AdminIndustryVersions";
import AdminIndustryPacks from "./pages/AdminIndustryPacks";
import AdminCountries from "./pages/AdminCountries";
import AdminCategories from "./pages/AdminCategories";
import AdminEvents from "./pages/AdminEvents";
import AdminIndustryNews from "./pages/AdminIndustryNews";
import OrganizationSettings from "./pages/OrganizationSettings";
import ContentCalendar from "./pages/ContentCalendar";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";

import MultiChannelCreate from "./pages/MultiChannelCreate";
import AdminHelpArticles from "./pages/AdminHelpArticles";
import Campaigns from "./pages/Campaigns";
import CampaignCreate from "./pages/CampaignCreate";
import CampaignDetail from "./pages/CampaignDetail";
import AdCopies from "./pages/AdCopies";
import Landing from "./pages/Landing";
import Contact from "./pages/Contact";
import Careers from "./pages/Careers";
import About from "./pages/About";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";

const queryClient = new QueryClient();

// Domain-aware routing component
function AppRoutes() {
  const { isLandingDomain, isAppDomain } = useDomainRouting();

  // If on landing domain (flowa.one), show only landing page
  if (isLandingDomain) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        {/* Redirect all other routes to landing page on landing domain */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // App domain (app.flowa.one or localhost/preview) - show full app
  return (
    <Routes>
      {/* Landing page still accessible at /landing for preview */}
      <Route path="/landing" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
                path="/topics"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <TopicErrorBoundary
                        fallbackTitle="Không thể tải Kho Ý Tưởng"
                        fallbackDescription="Đã xảy ra lỗi khi hiển thị trang. Vui lòng thử lại."
                      >
                        <Topics />
                      </TopicErrorBoundary>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Tasks />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scripts"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Index />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/carousel"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Carousel />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/brands"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Brands />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/brands/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <BrandView />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              {/* Brand Create/Edit - Full screen, no AppLayout */}
              <Route
                path="/brands/new"
                element={
                  <ProtectedRoute>
                    <BrandCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/multichannel"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <MultiChannel />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              {/* MultiChannel Create - Full screen, no AppLayout */}
              <Route
                path="/multichannel/new"
                element={
                  <ProtectedRoute>
                    <MultiChannelCreate />
                  </ProtectedRoute>
                }
              />
              
              {/* Campaign Management */}
              <Route
                path="/campaigns"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Campaigns />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/campaigns/new"
                element={
                  <ProtectedRoute>
                    <CampaignCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/campaigns/:id/edit"
                element={
                  <ProtectedRoute>
                    <CampaignCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/campaigns/:id"
                element={
                  <ProtectedRoute>
                    <CampaignDetail />
                  </ProtectedRoute>
                }
              />
              
              {/* Ad Copies */}
              <Route
                path="/ad-copies"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AdCopies />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ContentCalendar />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Account />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              {/* Admin routes - protected by AdminProtectedRoute */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminProtectedRoute>
                      <AppLayout>
                        <Admin />
                      </AppLayout>
                    </AdminProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminProtectedRoute>
                      <AppLayout>
                        <AdminDashboard />
                      </AppLayout>
                    </AdminProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute>
                    <AdminProtectedRoute>
                      <AppLayout>
                        <AdminUsers />
                      </AppLayout>
                    </AdminProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/ai"
                element={
                  <ProtectedRoute>
                    <AdminProtectedRoute>
                      <AppLayout>
                        <AdminAIManagement />
                      </AppLayout>
                    </AdminProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/industries"
                element={
                  <ProtectedRoute>
                    <AdminProtectedRoute>
                      <AppLayout>
                        <AdminIndustries />
                      </AppLayout>
                    </AdminProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/countries"
                element={
                  <ProtectedRoute>
                    <AdminProtectedRoute>
                      <AppLayout>
                        <AdminCountries />
                      </AppLayout>
                    </AdminProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <ProtectedRoute>
                    <AdminProtectedRoute>
                      <AppLayout>
                        <AdminCategories />
                      </AppLayout>
                    </AdminProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/packs"
                element={
                  <ProtectedRoute>
                    <AdminProtectedRoute>
                      <AppLayout>
                        <AdminIndustryPacks />
                      </AppLayout>
                    </AdminProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/versions"
                element={
                  <ProtectedRoute>
                    <AdminProtectedRoute>
                      <AppLayout>
                        <AdminIndustryVersions />
                      </AppLayout>
                    </AdminProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/events"
                element={
                  <ProtectedRoute>
                    <AdminProtectedRoute>
                      <AppLayout>
                        <AdminEvents />
                      </AppLayout>
                    </AdminProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/industry-news"
                element={
                  <ProtectedRoute>
                    <AdminProtectedRoute>
                      <AppLayout>
                        <AdminIndustryNews />
                      </AppLayout>
                    </AdminProtectedRoute>
                  </ProtectedRoute>
                }
              />

              
              {/* Help Articles Management */}
              <Route
                path="/admin/help-articles"
                element={
                  <ProtectedRoute>
                    <AdminProtectedRoute>
                      <AppLayout>
                        <AdminHelpArticles />
                      </AppLayout>
                    </AdminProtectedRoute>
                  </ProtectedRoute>
                }
              />
              
              {/* Access denied page */}
              <Route path="/access-denied" element={<AccessDenied />} />
              <Route
                path="/organization"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <OrganizationSettings />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="app-theme" enableSystem themes={["light", "dark", "lime", "system"]}>
      <AuthProvider>
        <OrganizationProvider>
          <TooltipProvider>
            <AnimatedToaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </OrganizationProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
