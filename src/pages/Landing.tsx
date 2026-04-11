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
} from "@/components/landing";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { BackToTop } from "@/components/landing/BackToTop";
import { SalesChatWidget } from "@/components/landing/SalesChatWidget";
import { SEOHead, LandingSEOSchemas } from "@/components/SEOHead";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#09090b]">
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
