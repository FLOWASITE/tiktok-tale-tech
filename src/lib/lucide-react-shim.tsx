/**
 * lucide-react SHIM
 * --------------------------------------------------------------
 * Aliased in vite.config.ts so any `import ... from "lucide-react"`
 * across the codebase resolves to this file.
 *
 * Purpose: re-export EVERYTHING from the real lucide-react, but
 * OVERRIDE the social-platform icons with our official brand SVGs
 * from `@/components/icons/SocialIcons` so we get a consistent
 * brand-correct iconography platform-wide without touching ~150
 * import sites individually.
 *
 * NOTE: import the real package via the literal id "lucide-react"
 * is impossible inside this file (would self-recurse via the alias),
 * so we import from the package's resolved entry path instead.
 */
// @ts-ignore - resolved via vite alias to the real package
export * from "lucide-react/dist/esm/lucide-react.js";

import type { LucideIcon, LucideProps } from "lucide-react/dist/esm/lucide-react.js";
import { forwardRef, createElement } from "react";
import {
  FacebookIcon as BrandFacebook,
  InstagramIcon as BrandInstagram,
  LinkedInIcon as BrandLinkedIn,
  YouTubeIcon as BrandYouTube,
  XIcon as BrandX,
} from "@/components/icons/SocialIcons";

/**
 * Wrap a brand SVG so it satisfies the LucideIcon contract:
 *   - accepts `size`, `color`, `strokeWidth`, `className`, `style`, etc.
 *   - forwards ref to the underlying <svg>
 *   - exposes `displayName` for React DevTools
 */
function wrap(
  Brand: (props: React.SVGProps<SVGSVGElement>) => JSX.Element,
  name: string,
): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(function Icon(
    { size = 24, color, className, style, ...rest },
    ref,
  ) {
    return createElement(Brand as any, {
      ref,
      width: size,
      height: size,
      className,
      style: color ? { color, ...style } : style,
      ...rest,
    });
  });
  (Icon as any).displayName = name;
  return Icon as unknown as LucideIcon;
}

// ---------- Brand-correct overrides ----------
// These names MUST match the lucide-react export names that components
// across the app already import. Anything not overridden here passes
// through to the real lucide-react via the `export *` above.
export const Facebook = wrap(BrandFacebook, "Facebook");
export const Instagram = wrap(BrandInstagram, "Instagram");
export const Linkedin = wrap(BrandLinkedIn, "Linkedin");
export const Youtube = wrap(BrandYouTube, "Youtube");
export const Twitter = wrap(BrandX, "Twitter"); // X (formerly Twitter)
