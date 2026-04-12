import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Users, Building2, Globe2 } from "lucide-react";

export function SocialProofBar() {
  const { t } = useTranslation();

  return (
    <section className="py-8 bg-muted/30 border-y border-border/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              {t("socialProof.heroBar", "Được sử dụng bởi các Marketing Team tại Việt Nam & Thái Lan")}
            </span>
          </div>
          
          <div className="hidden sm:block w-px h-4 bg-border" />
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" />
              <span>500+ teams</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe2 className="w-3.5 h-3.5" />
              <span>3 countries</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
