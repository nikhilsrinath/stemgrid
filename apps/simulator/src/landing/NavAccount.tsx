'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

/* "Sign in" in the landing nav, or "My projects" once signed in. Checked in the browser
   so the landing page itself can stay static. */
export default function NavAccount({ className }: { className?: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = sb.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <Link href={signedIn ? '/projects' : '/login'} className={className} style={{ visibility: signedIn === null ? 'hidden' : undefined }}>
      {signedIn ? 'My projects' : 'Sign in'}
    </Link>
  );
}
