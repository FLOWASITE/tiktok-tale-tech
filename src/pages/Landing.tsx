import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LandingNav,
  HeroSection,
  PainPointsSection,
  HowItWorksSection,
  FeaturesSection,
  SocialProofSection,
  PricingSection,
  FAQSection,
  CTASection,
  FooterSection,
} from "@/components/landing";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { BackToTop } from "@/components/landing/BackToTop";

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  // Show nothing while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Don't render landing if user is logged in (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <LandingNav />
      <main>
        <HeroSection />
        <PainPointsSection />
        <HowItWorksSection />
        <FeaturesSection />
        <SocialProofSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <FooterSection />
      <BackToTop />
    </div>
  );
}