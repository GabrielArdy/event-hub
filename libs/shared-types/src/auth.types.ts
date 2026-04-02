export type Role = 'END_USER' | 'ORGANIZER' | 'STAFF' | 'ADMIN';

export interface JwtPayload {
  sub: string;
  role: Role;
  org_id: string | null;
  iat: number;
  exp: number;
}

export interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  is_verified: boolean;
  organizer?: OrganizerInfo | null;
  created_at: string;
}

export interface OrganizerInfo {
  org_name: string;
  org_type: OrgType;
  is_verified: boolean;
  verified_at: string | null;
}

export type OrgType = 'COMMUNITY' | 'COMPANY' | 'INDIVIDUAL' | 'PROMOTER';
