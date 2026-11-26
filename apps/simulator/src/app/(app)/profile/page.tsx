import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { toViewer } from '@/lib/viewer';
import AppNav from '@/ui/AppNav';
import s from '@/ui/ui.module.css';
import ProfileForms from './ProfileForms';

export const metadata: Metadata = { title: 'Profile · StemGrid' };

export default async function ProfilePage() {
  const { supabase, user, profile } = await getSession();
  if (!user) redirect('/login?next=/profile');
  if (!profile) redirect('/onboarding');
  const { data: { user: full } } = await supabase.auth.getUser();
  const usesPassword = (full?.identities ?? []).some(i => i.provider === 'email');

  return (
    <div className={`${s.root} ${s.app}`}>
      <AppNav viewer={toViewer(user, profile)!} />
      <main className={s.wrap}>
        <div className={s.head}>
          <div>
            <h1 className={s.h2}>Profile</h1>
            <p className={s.lead}>Signed in as {user.email}</p>
          </div>
        </div>
        <ProfileForms profile={profile} usesPassword={usesPassword} />
      </main>
    </div>
  );
}
