import {
  LandingNav,
  HeroSection,
  WorkflowSection,
  SocialChannelsSection,
  IndustryMemorySection,
  SocialProofSection,
  TestimonialsSection,
  PricingSection,
  FAQSection,
  CTASection,
  FooterSection,
} from "@/landing/components";
import { SocialProofBar } from "@/landing/components/SocialProofBar";
import { ProblemSection } from "@/landing/components/ProblemSection";
import { ScrollProgress } from "@/landing/components/ScrollProgress";
import { BackToTop } from "@/landing/components/BackToTop";
import { SalesChatWidget } from "@/landing/components/SalesChatWidget";
import { SEOHead, LandingSEOSchemas, type ReviewItem } from "@/components/SEOHead";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

export default function Landing() {
  const { t } = useTranslation();
  const testimonialItems = t("testimonials.items", { returnObjects: true }) as Array<{
    quote: string; name: string; role: string; company: string;
  }>;
  const reviews: ReviewItem[] = useMemo(() => {
    if (!Array.isArray(testimonialItems)) return [];
    return testimonialItems.map((it) => ({
      author: it.name,
      role: it.role,
      company: it.company,
      rating: 5,
      text: it.quote,
    }));
  }, [testimonialItems]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Flowa — AI Marketing Agent | Tự Động Hóa Content Marketing"
        description="Flowa là AI Marketing Agent tự nghiên cứu thị trường, lên chiến dịch, tạo nội dung 12 kênh, chấm điểm chất lượng và đăng bài tự động."
        canonicalPath="/"
        noscriptContent={`<h2>Flowa giúp Marketing Team làm gì?</h2><ul><li>Tạo content cho 12 kênh (Facebook, TikTok, Instagram, LinkedIn, Blog, Email, X, Threads, Pinterest, YouTube, Zalo, Bluesky)</li><li>Brand Voice AI giữ giọng điệu nhất quán</li><li>Industry Memory tự động tuân thủ quy định ngành</li><li>Multi-platform Publishing</li><li>Carousel AI sequential generation</li><li>AI Video Script & Generation</li></ul><p><strong>Liên kết:</strong> <a href="https://flowa.one/pricing">Bảng giá</a> · <a href="https://flowa.one/blog">Blog</a> · <a href="https://flowa.one/about">Về Flowa</a> · <a href="https://flowa.one/contact">Liên hệ</a></p>`}
      />
      <LandingSEOSchemas reviews={reviews} />
      <ScrollProgress />
      <LandingNav />
      <main>
        <HeroSection />
        <SocialProofBar />
        <ProblemSection />
        <WorkflowSection />
        <SocialChannelsSection />
        <IndustryMemorySection />
        <SocialProofSection />
        <TestimonialsSection />
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