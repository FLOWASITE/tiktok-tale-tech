export const formatVND = (v: number) =>
  v === 0 ? "Miễn phí" : v.toLocaleString("vi-VN") + "₫";

export const formatLimit = (v: number) => (v === -1 ? "∞" : String(v));

export const formatCompactVND = (v: number) => {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M₫";
  if (v >= 1_000) return Math.round(v / 1_000) + "k₫";
  return v + "₫";
};

/** Tone bar by usage ratio: <50% safe, 50-80% warn, >80% danger */
export const usageTone = (ratio: number): "safe" | "warn" | "danger" => {
  if (ratio >= 0.8) return "danger";
  if (ratio >= 0.5) return "warn";
  return "safe";
};

export const usageBarClass = (tone: "safe" | "warn" | "danger") => {
  switch (tone) {
    case "danger": return "bg-destructive";
    case "warn": return "bg-amber-500";
    default: return "bg-primary";
  }
};
