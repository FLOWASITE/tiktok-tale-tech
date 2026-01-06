import { Link } from "react-router-dom";
import { Sparkles, Facebook, Twitter, Linkedin, Instagram, Youtube } from "lucide-react";

const footerLinks = {
  product: {
    title: "Sản phẩm",
    links: [
      { name: "Tính năng", href: "#features" },
      { name: "Bảng giá", href: "#pricing" },
      { name: "Integrations", href: "#" },
      { name: "Changelog", href: "#" },
      { name: "Roadmap", href: "#" },
    ],
  },
  company: {
    title: "Công ty",
    links: [
      { name: "Về chúng tôi", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Tuyển dụng", href: "#" },
      { name: "Liên hệ", href: "#" },
      { name: "Đối tác", href: "#" },
    ],
  },
  resources: {
    title: "Tài nguyên",
    links: [
      { name: "Hướng dẫn", href: "#" },
      { name: "API Docs", href: "#" },
      { name: "Templates", href: "#" },
      { name: "Webinars", href: "#" },
      { name: "Hỗ trợ", href: "#" },
    ],
  },
  legal: {
    title: "Pháp lý",
    links: [
      { name: "Điều khoản", href: "#" },
      { name: "Bảo mật", href: "#" },
      { name: "Cookies", href: "#" },
      { name: "Licenses", href: "#" },
    ],
  },
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

export function FooterSection() {
  const scrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <footer className="bg-muted/30 border-t border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Main Footer */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-secondary opacity-90" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
              <span className="text-xl font-bold text-gradient">Flowa</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Nền tảng tạo nội dung AI đa kênh cho doanh nghiệp. 
              One Flow. All Content.
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h4 className="font-semibold text-foreground mb-4">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.name}>
                    {link.href.startsWith("#") ? (
                      <button
                        onClick={() => scrollToSection(link.href)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.name}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Flowa. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              Made with ❤️ in Vietnam
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
