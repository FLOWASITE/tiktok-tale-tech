import { motion } from "framer-motion";

interface FloatingShape {
  id: number;
  type: "sphere" | "cube" | "ring" | "diamond";
  size: number;
  x: string;
  y: string;
  delay: number;
  duration: number;
  color: string;
}

const shapes: FloatingShape[] = [
  { id: 1, type: "sphere", size: 60, x: "10%", y: "20%", delay: 0, duration: 8, color: "from-primary/20 to-primary/5" },
  { id: 2, type: "cube", size: 40, x: "85%", y: "15%", delay: 1, duration: 10, color: "from-secondary/20 to-secondary/5" },
  { id: 3, type: "ring", size: 80, x: "75%", y: "60%", delay: 2, duration: 12, color: "from-primary/15 to-transparent" },
  { id: 4, type: "diamond", size: 30, x: "5%", y: "70%", delay: 3, duration: 9, color: "from-secondary/25 to-secondary/5" },
  { id: 5, type: "sphere", size: 45, x: "90%", y: "80%", delay: 4, duration: 11, color: "from-primary/15 to-primary/5" },
  { id: 6, type: "cube", size: 35, x: "15%", y: "85%", delay: 5, duration: 7, color: "from-secondary/20 to-transparent" },
  { id: 7, type: "ring", size: 50, x: "50%", y: "10%", delay: 2.5, duration: 13, color: "from-primary/10 to-transparent" },
  { id: 8, type: "diamond", size: 25, x: "30%", y: "50%", delay: 1.5, duration: 8.5, color: "from-secondary/15 to-secondary/5" },
];

function Shape({ shape }: { shape: FloatingShape }) {
  const baseStyle = `absolute bg-gradient-to-br ${shape.color} backdrop-blur-sm`;
  
  const shapeStyles = {
    sphere: `${baseStyle} rounded-full`,
    cube: `${baseStyle} rounded-lg rotate-45`,
    ring: `${baseStyle} rounded-full border-2 border-primary/10 bg-transparent`,
    diamond: `${baseStyle} rotate-45`,
  };

  return (
    <motion.div
      className={shapeStyles[shape.type]}
      style={{
        width: shape.size,
        height: shape.size,
        left: shape.x,
        top: shape.y,
      }}
      animate={{
        y: [0, -30, 0, 30, 0],
        x: [0, 15, 0, -15, 0],
        rotate: shape.type === "cube" || shape.type === "diamond" 
          ? [45, 90, 45, 0, 45] 
          : [0, 5, 0, -5, 0],
        scale: [1, 1.1, 1, 0.95, 1],
      }}
      transition={{
        duration: shape.duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: shape.delay,
      }}
    />
  );
}

export function FloatingShapes() {
  return (
    <div className="absolute inset-0 -z-5 overflow-hidden pointer-events-none">
      {shapes.map((shape) => (
        <Shape key={shape.id} shape={shape} />
      ))}
    </div>
  );
}
