import type { User } from '@supabase/supabase-js';
import type { Profile, Viewer } from '@/lib/types';

export function toViewer(user: User | null, profile: Profile | null): Viewer {
  if (!user) return null;
  return {
    id: user.id,
    name: profile?.display_name || user.email?.split('@')[0] || 'You',
    username: profile?.username ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };
}
