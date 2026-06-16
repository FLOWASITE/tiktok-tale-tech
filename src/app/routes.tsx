import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { TopicErrorBoundary } from "@/components/topic/TopicErrorBoundary";

// App pages
import Dashboard from "@/pages/Dashboard";
import Topics from "@/pages/Topics";
// Index and ScriptNew pages deprecated — merged into VideoStudioPage ScriptsTab
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
import AdminCronMonitor from "@/pages/AdminCronMonitor";
import AdminMultichannelObservability from "@/pages/AdminMultichannelObservability";

const AdminStorageMemory = lazy(() => import("@/pages/AdminStorageMemory"));
const AdminSeoHub = lazy(() => import("@/pages/AdminSeoHub"));
const SeoHub = lazy(() => import("@/pages/SeoHub"));
import Campaigns from "@/pages/Campaigns";
const Reports = lazy(() => import("@/pages/Reports"));
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
import BloggerCallback from "@/pages/BloggerCallback";
import WordPressComCallback from "@/pages/WordPressComCallback";
import XCallback from "@/pages/XCallback";
import TikTokCallback from "@/pages/TikTokCallback";
import PinterestCallback from "@/pages/PinterestCallback";
import BlueskyCallback from "@/pages/BlueskyCallback";
import ShopifyCallback from "@/pages/ShopifyCallback";
import WixCallback from "@/pages/WixCallback";
import CoreContentPage from "@/pages/CoreContentPage";
import GEODashboard from "@/pages/GEODashboard";
import FlowaChatPage from "@/pages/FlowaChatPage";
import Gallery from "@/pages/Gallery";
import PaymentResult from "@/pages/PaymentResult";
import AppPricing from "@/pages/Pricing";

import AgentDashboard from "@/pages/AgentDashboard";
import AgentMonitorPage from "@/pages/AgentMonitorPage";
const TelegramApp = lazy(() => import("@/pages/TelegramApp"));
const AdminTelegramAuthCheck = lazy(() => import("@/pages/AdminTelegramAuthCheck"));
const AgentTelegramPage = lazy(() => import("@/pages/AgentTelegramPage"));
const AgentChannelHubPage = lazy(() => import("@/pages/AgentChannelHubPage"));
const VideoStudioPage = lazy(() => import("@/pages/VideoStudioPage"));
const CharactersPage = lazy(() => import("@/pages/CharactersPage"));

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

      {/* Telegram Mini App — public, auth via initData HMAC */}
      <Route path="/telegram-app" element={<Suspense fallback={<LoadingFallback />}><TelegramApp /></Suspense>} />
      <Route path="/telegram-app/*" element={<Suspense fallback={<LoadingFallback />}><TelegramApp /></Suspense>} />

      {/* Auth routes */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/instagram/callback" element={<InstagramCallback />} />
      <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
      <Route path="/auth/facebook/callback" element={<FacebookCallback />} />
      <Route path="/auth/threads/callback" element={<ThreadsCallback />} />
      <Route path="/auth/zalo/callback" element={<ZaloCallback />} />
      <Route path="/api/zalo/callback" element={<ZaloOAuthProxy />} />
      <Route path="/auth/google-business/callback" element={<GoogleBusinessCallback />} />
      <Route path="/auth/blogger/callback" element={<BloggerCallback />} />
      <Route path="/auth/wordpress-com/callback" element={<WordPressComCallback />} />
      <Route path="/auth/x/callback" element={<XCallback />} />
      <Route path="/auth/tiktok/callback" element={<TikTokCallback />} />
      <Route path="/auth/pinterest/callback" element={<PinterestCallback />} />
      <Route path="/auth/bluesky/callback" element={<BlueskyCallback />} />
      <Route path="/oauth/bluesky/callback" element={<BlueskyCallback />} />
      <Route path="/auth/shopify/callback" element={<ShopifyCallback />} />
      <Route path="/auth/wix/callback" element={<WixCallback />} />
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
      <Route path="/scripts" element={<Navigate to="/videos?tab=scripts" replace />} />
      <Route path="/scripts/new" element={<Navigate to="/videos?tab=scripts" replace />} />
      <Route path="/videos" element={<ProtectedRoute><AppLayout><Suspense fallback={<LoadingFallback />}><VideoStudioPage /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/characters" element={<ProtectedRoute><AppLayout><Suspense fallback={<LoadingFallback />}><CharactersPage /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/carousel" element={<ProtectedRoute><AppLayout><Carousel /></AppLayout></ProtectedRoute>} />
      <Route path="/gallery" element={<ProtectedRoute><AppLayout><Gallery /></AppLayout></ProtectedRoute>} />
      <Route path="/brands" element={<ProtectedRoute><AppLayout><Brands /></AppLayout></ProtectedRoute>} />
      <Route path="/brands/:id" element={<ProtectedRoute><AppLayout><BrandView /></AppLayout></ProtectedRoute>} />
      <Route path="/brands/new" element={<ProtectedRoute><BrandCreate /></ProtectedRoute>} />
      <Route path="/connections" element={<ProtectedRoute><AppLayout><Connections /></AppLayout></ProtectedRoute>} />
      <Route path="/multichannel" element={<ProtectedRoute><AppLayout><MultiChannel /></AppLayout></ProtectedRoute>} />
      <Route path="/multichannel/new" element={<ProtectedRoute><AppLayout><MultiChannelCreate /></AppLayout></ProtectedRoute>} />
      <Route path="/campaigns" element={<ProtectedRoute><AppLayout><Campaigns /></AppLayout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><AppLayout><Suspense fallback={null}><Reports /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/campaigns/new" element={<ProtectedRoute><CampaignCreate /></ProtectedRoute>} />
      <Route path="/campaigns/:id/edit" element={<ProtectedRoute><CampaignCreate /></ProtectedRoute>} />
      <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
      <Route path="/ad-copies" element={<ProtectedRoute><AppLayout><AdCopies /></AppLayout></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><AppLayout><ContentCalendar /></AppLayout></ProtectedRoute>} />
      <Route path="/agents" element={<ProtectedRoute><AppLayout><AgentDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/agents/channels" element={<ProtectedRoute><AppLayout><Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}><AgentChannelHubPage /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/agents/telegram" element={<ProtectedRoute><AppLayout><Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}><AgentTelegramPage /></Suspense></AppLayout></ProtectedRoute>} />

      {/* Legacy /agent/* aliases — links cũ trong Telegram bot, email, notifications. Đừng xoá. */}
      <Route path="/agent" element={<Navigate to="/agents" replace />} />
      <Route path="/agent/telegram" element={<Navigate to="/agents/telegram" replace />} />
      <Route path="/agent/channels" element={<Navigate to="/agents/channels" replace />} />
      <Route path="/agent/approvals" element={<Navigate to="/agents" replace />} />
      <Route path="/agent/pipelines/:id" element={<Navigate to="/agents" replace />} />
      <Route path="/agent/goals/:id" element={<Navigate to="/agents" replace />} />

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
      <Route path="/seo" element={<ProtectedRoute><AppLayout><Suspense fallback={<LoadingFallback />}><SeoHub /></Suspense></AppLayout></ProtectedRoute>} />
      <Route path="/admin/seo" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><Suspense fallback={<LoadingFallback />}><AdminSeoHub /></Suspense></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/seo-pages" element={<Navigate to="/admin/seo" replace />} />
      <Route path="/admin/seo-keywords" element={<Navigate to="/admin/seo" replace />} />
      <Route path="/admin/cron-monitor" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><AdminCronMonitor /></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/storage" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><Suspense fallback={<LoadingFallback />}><AdminStorageMemory /></Suspense></AppLayout></AdminProtectedRoute></ProtectedRoute>} />
      <Route path="/admin/telegram-auth-check" element={<ProtectedRoute><AdminProtectedRoute><AppLayout><Suspense fallback={<LoadingFallback />}><AdminTelegramAuthCheck /></Suspense></AppLayout></AdminProtectedRoute></ProtectedRoute>} />

      {/* Other */}
      <Route path="/access-denied" element={<AccessDenied />} />
      <Route path="/organization" element={<ProtectedRoute><AppLayout><OrganizationSettings /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
