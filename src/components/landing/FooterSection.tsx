import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Sparkles, Facebook, Twitter, Linkedin, Instagram, Youtube } from "lucide-react";

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

export function FooterSection() {
  const { t } = useTranslation();

  const footerLinks = {
    product: {
      title: t("footer.sections.product.title"),
      links: [
        { name: t("nav.features"), href: "#features" },
        { name: t("nav.pricing"), href: "#pricing" },
        { name: "Integrations", href: "#" },
        { name: "API", href: "#" },
      ],
    },
    company: {
      title: t("footer.sections.company.title"),
      links: [
        { name: t("footer.sections.company.links.0"), href: "#" },
        { name: "Blog", href: "#" },
        { name: t("footer.sections.company.links.2"), href: "#" },
        { name: t("footer.sections.company.links.3"), href: "#" },
      ],
    },
    resources: {
      title: t("footer.sections.resources.title"),
      links: [
        { name: t("footer.sections.resources.links.0"), href: "#" },
        { name: t("footer.sections.resources.links.1"), href: "#" },
        { name: t("footer.sections.resources.links.2"), href: "#" },
        { name: t("footer.sections.resources.links.3"), href: "#" },
      ],
    },
    legal: {
      title: t("footer.sections.legal.title"),
      links: [
        { name: t("footer.sections.legal.links.0"), href: "#" },
        { name: t("footer.sections.legal.links.1"), href: "#" },
        { name: t("footer.sections.legal.links.2"), href: "#" },
        { name: t("footer.sections.legal.links.3"), href: "#" },
      ],
    },
  };

  const scrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <footer className="relative bg-muted/30 border-t border-border/50 overflow-hidden">
      {/* Animated Gradient Divider */}
      <div className="absolute top-0 left-0 right-0 h-px">
        <motion.div
          className="h-full w-full bg-gradient-to-r from-transparent via-primary to-transparent"
          animate={{
            backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ backgroundSize: "200% 100%" }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Main Footer */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <motion.div 
                className="relative w-8 h-8"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-secondary opacity-90" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </motion.div>
              <span className="text-xl font-bold text-gradient">Flowa</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              {t("footer.description")}
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-muted hover:bg-primary/10 transition-colors group"
                  whileHover={{ 
                    scale: 1.15, 
                    boxShadow: "0 0 20px rgba(var(--primary), 0.3)" 
                  }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <social.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([key, section], sectionIndex) => (
            <motion.div 
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: sectionIndex * 0.1 }}
            >
              <h4 className="font-semibold text-foreground mb-4">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.name}>
                    {link.href.startsWith("#") ? (
                      <button
                        onClick={() => scrollToSection(link.href)}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors relative group"
                      >
                        {link.name}
                        <span className="absolute left-0 -bottom-0.5 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors relative group"
                      >
                        {link.name}
                        <span className="absolute left-0 -bottom-0.5 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Bar */}
        <motion.div 
          className="pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-sm text-muted-foreground">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-4">
            <motion.span 
              className="text-xs text-muted-foreground flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
            >
              {t("footer.madeWith")}
            </motion.span>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
