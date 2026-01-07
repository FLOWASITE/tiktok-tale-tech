import { motion } from "framer-motion";

export function GradientMesh() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      
      {/* Animated mesh gradient layers */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1.1, 1],
          rotate: [0, 5, -5, 0],
          x: [0, 30, -20, 0],
          y: [0, -20, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(340 82% 52% / 0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      
      <motion.div
        animate={{
          scale: [1.2, 1, 1.3, 1.2],
          rotate: [0, -10, 10, 0],
          x: [0, -40, 20, 0],
          y: [0, 40, -30, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
        className="absolute -bottom-1/4 -right-1/4 w-[900px] h-[900px] rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(199 89% 48% / 0.12) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      
      <motion.div
        animate={{
          scale: [1, 1.4, 1.2, 1],
          opacity: [0.3, 0.5, 0.4, 0.3],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(280 70% 50% / 0.08) 0%, transparent 60%)",
          filter: "blur(50px)",
        }}
      />

      {/* Aurora effect layers */}
      <motion.div
        animate={{
          opacity: [0.3, 0.6, 0.3],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-0 left-0 right-0 h-[400px]"
        style={{
          background: "linear-gradient(180deg, hsl(340 82% 52% / 0.05) 0%, hsl(199 89% 48% / 0.03) 50%, transparent 100%)",
        }}
      />

      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />
    </div>
  );
}
