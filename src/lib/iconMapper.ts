/**
 * Icon Mapper - Maps icon_name strings from database to Lucide React icons
 */

import {
  Briefcase,
  Code,
  ShoppingCart,
  Users,
  Heart,
  Building2,
  Factory,
  Leaf,
  Mountain,
  Zap,
  Building,
  Truck,
  UtensilsCrossed,
  Landmark,
  GraduationCap,
  HeartPulse,
  Music,
  Rocket,
  HelpCircle,
  Wrench,
  Home,
  Plane,
  Palette,
  Shield,
  Gamepad2,
  Cpu,
  Globe,
  Newspaper,
  Car,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Briefcase,
  Code,
  ShoppingCart,
  Users,
  Heart,
  Building2,
  Factory,
  Leaf,
  Mountain,
  Zap,
  Building,
  Truck,
  UtensilsCrossed,
  Landmark,
  GraduationCap,
  HeartPulse,
  Music,
  Rocket,
  HelpCircle,
  Wrench,
  Home,
  Plane,
  Palette,
  Shield,
  Gamepad2,
  Cpu,
  Globe,
  Newspaper,
  Car,
};

/**
 * Get Lucide icon component by name
 * @param name - Icon name from database (e.g., 'Briefcase', 'Code')
 * @returns Lucide icon component, defaults to HelpCircle if not found
 */
export function getIconByName(name: string | null | undefined): LucideIcon {
  if (!name) return HelpCircle;
  return iconMap[name] || HelpCircle;
}
