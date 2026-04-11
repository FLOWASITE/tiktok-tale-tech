import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { getAuthUrl } from "@/hooks/useDomainRouting";
import { ThemeToggle } from "@/components/ThemeToggle";

export function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      const sections = ["features", "workflow", "campaign", "pricing"];
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
    { name: "Tính năng", href: "#features" },
    { name: "Cách hoạt động", href: "#workflow" },
    { name: "Campaign", href: "#campaign" },
    { name: "Pricing", href: "#pricing" },
    { name: "Blog", href: "/blog", isRoute: true },
  ];

  const scrollToSection = (href: string, isRoute?: boolean) => {
    if (isRoute) {
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
            ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="/" className="flex items-center gap-0">
              <span className="text-xl font-bold text-foreground">
                Flowa
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 ml-0.5 mb-0.5 self-end" />
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive = activeSection === link.href.replace("#", "");
                return (
                  <button
                    key={link.name}
                    onClick={() => scrollToSection(link.href, link.isRoute)}
                    className={`text-sm font-medium transition-colors ${
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {link.name}
                  </button>
                );
              })}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <ThemeToggle />
              <button
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => window.location.href = getAuthUrl('login')}
              >
                Đăng nhập
              </button>
              <button
                className="bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full px-5 py-2 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                onClick={() => window.location.href = getAuthUrl('register')}
              >
                Bắt đầu miễn phí
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
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
                  onClick={() => scrollToSection(link.href, link.isRoute)}
                  className="block w-full text-left px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                >
                  {link.name}
                </button>
              ))}
              <div className="pt-4 border-t border-border space-y-3">
                <button
                  className="w-full text-center py-2.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-full transition-colors"
                  onClick={() => window.location.href = getAuthUrl('login')}
                >
                  Đăng nhập
                </button>
                <button
                  className="w-full text-center py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full hover:opacity-90 transition-opacity"
                  onClick={() => window.location.href = getAuthUrl('register')}
                >
                  Bắt đầu miễn phí
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
