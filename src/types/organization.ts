export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
  // Joined profile data
  profile?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface OrganizationWithRole extends Organization {
  role: OrgRole;
}

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Chủ sở hữu',
  admin: 'Quản trị viên',
  member: 'Thành viên',
  viewer: 'Người xem',
};

export const ORG_ROLE_COLORS: Record<OrgRole, string> = {
  owner: 'bg-amber-500/20 text-amber-500',
  admin: 'bg-blue-500/20 text-blue-500',
  member: 'bg-green-500/20 text-green-500',
  viewer: 'bg-muted text-muted-foreground',
};

export const canManageMembers = (role: OrgRole): boolean => {
  return role === 'owner' || role === 'admin';
};

export const canEditOrganization = (role: OrgRole): boolean => {
  return role === 'owner' || role === 'admin';
};

export const canDeleteOrganization = (role: OrgRole): boolean => {
  return role === 'owner';
};

export const canCreateContent = (role: OrgRole): boolean => {
  return role !== 'viewer';
};
