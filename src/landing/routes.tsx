import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const Landing = lazy(() => import("@/landing/pages/Landing"));
const About = lazy(() => import("@/landing/pages/About"));
const Blog = lazy(() => import("@/landing/pages/Blog"));
const BlogPost = lazy(() => import("@/landing/pages/BlogPost"));
const Contact = lazy(() => import("@/landing/pages/Contact"));
const Careers = lazy(() => import("@/landing/pages/Careers"));
const Pricing = lazy(() => import("@/landing/pages/Pricing"));
const TermsOfService = lazy(() => import("@/landing/pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("@/landing/pages/PrivacyPolicy"));

function LandingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Đang tải...</div>
    </div>
  );
}

export function LandingRoutes() {
  return (
    <Suspense fallback={<LandingFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
