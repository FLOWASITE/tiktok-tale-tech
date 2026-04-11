import { motion } from "framer-motion";

const companies = ["VinGroup", "FPT Software", "Tiki", "MoMo", "VNG Corporation", "Grab Vietnam"];

export function SocialProofSection() {
  return (
    <section className="py-12 bg-[#09090b] border-y border-white/5">
      <div className="container mx-auto px-4 max-w-5xl">
        <p className="text-center text-sm text-gray-500 mb-6">
          Được sử dụng bởi các Marketing Team tại Việt Nam & Thái Lan
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
          {companies.map((name, i) => (
            <motion.span
              key={name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="text-sm font-medium text-gray-600 tracking-wide"
            >
              {name}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
