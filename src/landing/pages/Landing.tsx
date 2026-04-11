import {
  LandingNav,
  HeroSection,
  SocialProofSection,
  ProblemSection,
  ReframeSection,
  WorkflowSection,
  CampaignSection,
  FeaturesSection,
  IndustryMemorySection,
  LearningSection,
  TrustSection,
  PricingSection,
  FAQSection,
  CTASection,
  FooterSection,
} from "@/landing/components";
import { ScrollProgress } from "@/landing/components/ScrollProgress";
import { BackToTop } from "@/landing/components/BackToTop";
import { SalesChatWidget } from "@/landing/components/SalesChatWidget";
import { SEOHead, LandingSEOSchemas } from "@/components/SEOHead";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Flowa — AI Marketing Agent tự vận hành Content Pipeline"
        description="AI Agent tự nghiên cứu, tạo nội dung 12 kênh, tự chấm điểm chất lượng, tự đăng bài. Campaign Autopilot cho chiến dịch tháng, lễ hội, ra mắt sản phẩm. Hỗ trợ VI/TH/EN."
        canonicalPath="/"
      />
      <LandingSEOSchemas />
      <ScrollProgress />
      <LandingNav />
      <main>
        <HeroSection />
        <SocialProofSection />
        <ProblemSection />
        <ReframeSection />
        <WorkflowSection />
        <CampaignSection />
        <FeaturesSection />
        <IndustryMemorySection />
        <LearningSection />
        <TrustSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <FooterSection />
      <BackToTop />
      <SalesChatWidget />
    </div>
  );
}
