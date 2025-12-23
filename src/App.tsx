import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import Carousel from "./pages/Carousel";
import Brands from "./pages/Brands";
import BrandView from "./pages/BrandView";
import MultiChannel from "./pages/MultiChannel";
import Tasks from "./pages/Tasks";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import AdminIndustries from "./pages/AdminIndustries";
import OrganizationSettings from "./pages/OrganizationSettings";
import ContentCalendar from "./pages/ContentCalendar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" storageKey="app-theme" enableSystem themes={["light", "dark", "lime", "system"]}>
      <AuthProvider>
        <OrganizationProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
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
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Admin />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/industries"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AdminIndustries />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
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
          </BrowserRouter>
          </TooltipProvider>
        </OrganizationProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
