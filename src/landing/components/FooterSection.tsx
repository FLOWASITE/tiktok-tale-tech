import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Facebook, Twitter, Linkedin, Instagram, Youtube } from "lucide-react";

const socialLinks = [
  { icon: Facebook, href: "https://www.facebook.com/profile.php?id=61575157292883", label: "Facebook" },
  { icon: Twitter, href: "https://x.com/FlowaSite", label: "X" },
  { icon: Linkedin, href: "https://www.linkedin.com/in/flowaone/", label: "LinkedIn" },
  { icon: Instagram, href: "https://www.instagram.com/flowaone/", label: "Instagram" },
  { icon: Youtube, href: "https://www.youtube.com/@Flowasite", label: "YouTube" },
];

const footerLinks = {
  product: {
    title: "Sản phẩm",
    links: [
      { name: "Tính năng", href: "#features" },
      { name: "Campaign Autopilot", href: "#campaign" },
      { name: "Pricing", href: "#pricing" },
      { name: "API (Coming soon)", href: "#" },
      { name: "Changelog", href: "#" },
    ],
  },
  resources: {
    title: "Tài nguyên",
    links: [
      { name: "Blog", href: "/blog", isInternal: true },
      { name: "Help Center", href: "#" },
      { name: "Hướng dẫn sử dụng", href: "#" },
      { name: "Case Studies", href: "#" },
    ],
  },
  company: {
    title: "Công ty",
    links: [
      { name: "Về Flowa", href: "/about", isInternal: true },
      { name: "Điều khoản dịch vụ", href: "/terms", isInternal: true },
      { name: "Chính sách bảo mật", href: "/privacy", isInternal: true },
      { name: "Liên hệ: info@flowa.one", href: "mailto:info@flowa.one" },
    ],
  },
};

export function FooterSection() {
  const scrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 py-12 lg:py-16 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-1 mb-3">
              <span className="text-xl font-bold text-foreground">Flowa</span>
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            </Link>
            <p className="text-sm text-muted-foreground mb-4">AI Marketing Agent cho thời đại mới</p>
            <div className="flex gap-2">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <s.icon className="w-4 h-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h4 className="font-semibold text-foreground text-sm mb-3">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    {link.isInternal ? (
                      <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link.name}
                      </Link>
                    ) : link.href.startsWith("#") ? (
                      <button
                        onClick={() => scrollToSection(link.href)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.name}
                      </button>
                    ) : (
                      <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} Flowa. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Designed for Marketing Teams in 🇻🇳 🇹🇭 🌏
          </p>
        </div>
      </div>
    </footer>
  );
}
