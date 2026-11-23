export type Role = 'student' | 'teacher' | 'maker';

export type Profile = {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  role: Role | null;
  bio: string;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  thumbnail_path: string | null;
  module_count: number;
  created_at: string;
  updated_at: string;
};

export type Project = ProjectSummary & { data: BuildData };

/* What the simulator engine's serialize() returns (see engine.js, SAVE + LOAD). */
export type BuildData = {
  v?: number;
  [key: string]: unknown;
};

/* What the simulator page needs to know about the viewer. */
export type Viewer = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
} | null;

export const thumbUrl = (path: string | null, updatedAt?: string) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/thumbnails/${path}${updatedAt ? `?v=${Date.parse(updatedAt)}` : ''}` : null;

export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
