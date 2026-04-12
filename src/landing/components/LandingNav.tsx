import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useTranslation } from "react-i18next";
import { getAuthUrl } from "@/hooks/useDomainRouting";
import logo from "@/assets/logo.png";

export function LandingNav() {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      const sections = ["workflow", "campaign", "industry-memory", "pricing"];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: t('nav.features'), href: "#workflow" },
    { name: t('nav.howItWorks'), href: "#workflow" },
    { name: t('nav.campaign', 'Campaign'), href: "#campaign" },
    { name: t('nav.pricing'), href: "#pricing" },
    { name: t('nav.blog', 'Blog'), href: "/blog" },
  ];

  const scrollToSection = (href: string) => {
    if (href.startsWith("/")) {
      window.location.href = href;
      return;
    }
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-background border-b border-border shadow-sm"
            : "bg-background"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2.5" title="Flowa — AI Marketing Agent">
              <img 
                src={logo} 
                alt="Flowa Logo" 
                className="w-9 h-9 object-contain"
              />
              <span className="text-xl font-bold text-primary">
                Flowa
              </span>
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive = activeSection === link.href.replace("#", "");
                return (
                  <button
                    key={link.name}
                    onClick={() => scrollToSection(link.href)}
                    className={`text-sm font-medium transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {link.name}
                  </button>
                );
              })}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <Button 
                variant="ghost" 
                className="font-medium" 
                onClick={() => window.location.href = getAuthUrl('login')}
              >
                {t('nav.login')}
              </Button>
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-5" 
                onClick={() => window.location.href = getAuthUrl('register')}
              >
                {t('nav.startFree')}
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 lg:hidden bg-background border-b border-border shadow-lg"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => scrollToSection(link.href)}
                  className="block w-full text-left px-4 py-3 text-base font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  {link.name}
                </button>
              ))}
              <div className="pt-4 border-t border-border space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => window.location.href = getAuthUrl('login')}
                >
                  {t('nav.login')}
                </Button>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90" 
                  onClick={() => window.location.href = getAuthUrl('register')}
                >
                  {t('nav.startFree')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
