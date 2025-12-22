import { OrganizationMember, OrgRole, ORG_ROLE_LABELS } from "@/types/organization";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Crown, Shield, User, Eye, FileText } from "lucide-react";

interface OrganizationStatsProps {
  members: OrganizationMember[];
  totalContent?: number;
}

const ROLE_CONFIG: Record<OrgRole, { icon: React.ElementType; color: string }> = {
  owner: { icon: Crown, color: "text-amber-500" },
  admin: { icon: Shield, color: "text-blue-500" },
  member: { icon: User, color: "text-green-500" },
  viewer: { icon: Eye, color: "text-muted-foreground" },
};

export function OrganizationStats({ members, totalContent = 0 }: OrganizationStatsProps) {
  const roleCounts = members.reduce((acc, member) => {
    acc[member.role] = (acc[member.role] || 0) + 1;
    return acc;
  }, {} as Record<OrgRole, number>);

  const stats = [
    {
      label: "Tổng thành viên",
      value: members.length,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    ...(['owner', 'admin', 'member', 'viewer'] as OrgRole[])
      .filter(role => roleCounts[role])
      .map(role => ({
        label: ORG_ROLE_LABELS[role],
        value: roleCounts[role] || 0,
        icon: ROLE_CONFIG[role].icon,
        color: ROLE_CONFIG[role].color,
        bgColor: `${ROLE_CONFIG[role].color.replace('text-', 'bg-').replace('-500', '-500/10')}`,
      })),
    {
      label: "Nội dung",
      value: totalContent,
      icon: FileText,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
