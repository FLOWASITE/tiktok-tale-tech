import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { TopicErrorBoundary } from "@/components/topic/TopicErrorBoundary";

// App pages
import Dashboard from "@/pages/Dashboard";
import Topics from "@/pages/Topics";
import Index from "@/pages/Index";
import ScriptNew from "@/pages/ScriptNew";
import Carousel from "@/pages/Carousel";
import Brands from "@/pages/Brands";
import BrandView from "@/pages/BrandView";
import BrandCreate from "@/pages/BrandCreate";
import MultiChannel from "@/pages/MultiChannel";
import Connections from "@/pages/Connections";
import Tasks from "@/pages/Tasks";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Account from "@/pages/Account";
import Admin from "@/pages/Admin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminAnalytics from "@/pages/AdminAnalytics";
import AdminUsers from "@/pages/AdminUsers";
import AdminAIManagement from "@/pages/AdminAIManagement";
import AdminIndustries from "@/pages/AdminIndustries";
import AdminIndustriesV2 from "@/pages/AdminIndustriesV2";
import AdminIndustryVersions from "@/pages/AdminIndustryVersions";
import AdminIndustryPacks from "@/pages/AdminIndustryPacks";
import AdminCountries from "@/pages/AdminCountries";
import AdminCategories from "@/pages/AdminCategories";
import AdminEvents from "@/pages/AdminEvents";
import AdminIndustryNews from "@/pages/AdminIndustryNews";
const AdminKnowledgeGraph = lazy(() => import("@/pages/AdminKnowledgeGraph"));
import AdminOrganizations from "@/pages/AdminOrganizations";
import OrganizationSettings from "@/pages/OrganizationSettings";
import ContentCalendar from "@/pages/ContentCalendar";
import AccessDenied from "@/pages/AccessDenied";
import NotFound from "@/pages/NotFound";
import MultiChannelCreate from "@/pages/MultiChannelCreate";
import AdminHelpArticles from "@/pages/AdminHelpArticles";
import AdminSocialSettings from "@/pages/AdminSocialSettings";
import AdminVouchers from "@/pages/AdminVouchers";
import AdminEdgeFunctions from "@/pages/AdminEdgeFunctions";
import AdminPlans from "@/pages/AdminPlans";
import Campaigns from "@/pages/Campaigns";
import CampaignCreate from "@/pages/CampaignCreate";
import CampaignDetail from "@/pages/CampaignDetail";
import AdCopies from "@/pages/AdCopies";
import InstagramCallback from "@/pages/InstagramCallback";
import LinkedInCallback from "@/pages/LinkedInCallback";
import FacebookCallback from "@/pages/FacebookCallback";
import ThreadsCallback from "@/pages/ThreadsCallback";
import ZaloCallback from "@/pages/ZaloCallback";
import ZaloOAuthProxy from "@/pages/ZaloOAuthProxy";
import GoogleBusinessCallback from "@/pages/GoogleBusinessCallback";
import XCallback from "@/pages/XCallback";
import TikTokCallback from "@/pages/TikTokCallback";
import CoreContentPage from "@/pages/CoreContentPage";
import GEODashboard from "@/pages/GEODashboard";
import FlowaChatPage from "@/pages/FlowaChatPage";
import Gallery from "@/pages/Gallery";
import PaymentResult from "@/pages/PaymentResult";
import AppPricing from "@/pages/Pricing";

import AgentDashboard from "@/pages/AgentDashboard";
import AgentMonitorPage from "@/pages/AgentMonitorPage";

// Landing pages (lazy loaded for app domain preview/dev access)
const LandingPage = lazy(() => import("@/landing/pages/Landing"));
const About = lazy(() => import("@/landing/pages/About"));
const Blog = lazy(() => import("@/landing/pages/Blog"));
const BlogPost = lazy(() => import("@/landing/pages/BlogPost"));
const Contact = lazy(() => import("@/landing/pages/Contact"));
const Careers = lazy(() => import("@/landing/pages/Careers"));
const Pricing = lazy(() => import("@/landing/pages/Pricing"));
const TermsOfService = lazy(() => import("@/landing/pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("@/landing/pages/PrivacyPolicy"));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Đang tải...</div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Landing/public pages accessible on app domain too (preview/local/dev) */}
      <Route path="/landing" element={<Suspense fallback={<LoadingFallback />}><LandingPage /></Suspense>} />
      <Route path="/about" element={<Suspense fallback={<LoadingFallback />}><About /></Suspense>} />
      <Route path="/contact" element={<Suspense fallback={<LoadingFallback />}><Contact /></Suspense>} />
      <Route path="/careers" element={<Suspense fallback={<LoadingFallback />}><Careers /></Suspense>} />
      <Route path="/blog" element={<Suspense fallback={<LoadingFallback />}><Blog /></Suspense>} />
      <Route path="/blog/:slug" element={<Suspense fallback={<LoadingFallback />}><BlogPost /></Suspense>} />
      <Route path="/pricing" element={<ProtectedRoute><AppLayout><AppPricing /></AppLayout></ProtectedRoute>} />
      <Route path="/terms" element={<Suspense fallback={<LoadingFallback />}><TermsOfService /></Suspense>} />
      <Route path="/privacy" element={<Suspense fallback={<LoadingFallback />}><PrivacyPolicy /></Suspense>} />

      {/* Auth routes */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/instagram/callback" element={<InstagramCallback />} />
      <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
      <Route path="/auth/facebook/callback" element={<FacebookCallback />} />
      <Route path="/auth/threads/callback" element={<ThreadsCallback />} />
      <Route path="/auth/zalo/callback" element={<ZaloCallback />} />
      <Route path="/api/zalo/callback" element={<ZaloOAuthProxy />} />
      <Route path="/auth/google-business/callback" element={<GoogleBusinessCallback />} />
      <Route path="/auth/x/callback" element={<XCallback />} />
      <Route path="/auth/tiktok/callback" element={<TikTokCallback />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/payment/result" element={<ProtectedRoute><AppLayout><PaymentResult /></AppLayout></ProtectedRoute>} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TopicErrorBoundary
                fallbackTitle="Không thể tải Dashboard"
                fallbackDescription="Đã xảy ra lỗi. Vui lòng tải lại trang."
              >
                <Dashboard />
              </TopicErrorBoundary>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/chat" element={<ProtectedRoute><AppLayout><FlowaChatPage /></AppLayout></ProtectedRoute>} />
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
      <Route path="/core-content" element={<ProtectedRoute><AppLayout><CoreContentPage /></AppLayout></ProtectedRoute>} />
      <Route path="/geo" element={<ProtectedRoute><AppLayout><GEODashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><AppLayout><Tasks /></AppLayout></ProtectedRoute>} />
      <Route path="/scripts" element={<ProtectedRoute><AppLayout><Index /></AppLayout></ProtectedRoute>} />
      <Route path="/scripts/new" element={<ProtectedRoute><AppLayout><ScriptNew /></AppLayout></ProtectedRoute>} />
      <Route path="/carousel" element={<ProtectedRoute><AppLayout><Carousel /></AppLayout></ProtectedRoute>} />
      <Route path="/gallery" element={<ProtectedRoute><AppLayout><Gallery /></AppLayout></ProtectedRoute>} />
      <Route path="/brands" element={<ProtectedRoute><AppLayout><Brands /></AppLayout></ProtectedRoute>} />
      <Route path="/brands/:id" element={<ProtectedRoute><AppLayout><BrandView /></AppLayout></ProtectedRoute>} />
      <Route path="/brands/new" element={<ProtectedRoute><BrandCreate /></ProtectedRoute>} />
      <Route path="/connections" element={<ProtectedRoute><AppLayout><Connections /></AppLayout></ProtectedRoute>} />
      <Route path="/multichannel" element={<ProtectedRoute><AppLayout><MultiChannel /></AppLayout></ProtectedRoute>} />
      <Route path="/multichannel/new" element={<ProtectedRoute><MultiChannelCreate /></ProtectedRoute>} />
      <Route path="/campaigns" element={<ProtectedRoute><AppLayout><Campaigns /></AppLayout></ProtectedRoute>} />
      <Route path="/campaigns/new" element={<ProtectedRoute><CampaignCreate /></ProtectedRoute>} />
      <Route path="/campaigns/:id/edit" element={<ProtectedRoute><CampaignCreate /></ProtectedRoute>} />
      <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
      <Route path="/ad-copies" element={<ProtectedRoute><AppLayout><AdCopies /></AppLayout></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><AppLayout><ContentCalendar /></AppLayout></ProtectedRoute>} />
      <Route path="/agents" element={<ProtectedRoute><AppLayout><AgentDashboard /></AppLayout></ProtectedRoute>} />
      
      <Route path="/agent-monitor" element={<ProtectedRoute><AppLayout><AgentMonitorPage /></AppLayout></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><AppLayout><Account /></AppLayout></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><Admin /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminDashboard /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminAnalytics /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminUsers /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/organizations" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminOrganizations /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/ai" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminAIManagement /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/industries" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminIndustriesV2 /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/industries-legacy" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminIndustries /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/countries" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminCountries /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/categories" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminCategories /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/packs" element={<Navigate to="/admin/industries" replace />} />
      <Route path="/admin/versions" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminIndustryVersions /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/events" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminEvents /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/industry-news" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminIndustryNews /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/knowledge-graph" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><Suspense fallback={<LoadingFallback />}><AdminKnowledgeGraph /></Suspense></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/help-articles" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminHelpArticles /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/social-settings" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminSocialSettings /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/vouchers" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminVouchers /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/edge-functions" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminEdgeFunctions /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/plans" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminPlans /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />

      {/* Other */}
      <Route path="/access-denied" element={<AccessDenied />} />
      <Route path="/organization" element={<ProtectedRoute><AppLayout><OrganizationSettings /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
