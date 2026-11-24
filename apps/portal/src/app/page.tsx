import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { OPEN_STATUSES, type Institute } from '@/lib/types';
import { InstituteLogo, Mark, s } from '@/ui/bits';
import { CONTACT } from '@/lib/urls';

export const metadata = { title: 'Find your institute · StemGrid' };

/* learn.stemgrid.in: search by institute name, then go to its sign-in page. */
export default async function FindInstitute({ searchParams }: PageProps<'/'>) {
  const sp = await searchParams;
  const q = String(sp.q ?? '').trim().slice(0, 60);
  const unknown = typeof sp.unknown === 'string' ? sp.unknown : null;
  let results: Pick<Institute, 'id' | 'slug' | 'name' | 'city' | 'logo_path' | 'updated_at'>[] = [];
  if (q.length >= 2) {
    const { data } = await supabaseAdmin().from('institutes').select('id, slug, name, city, logo_path, updated_at')
      .in('status', OPEN_STATUSES).ilike('name', `%${q.replace(/[%_]/g, '')}%`).order('name').limit(12);
    results = data ?? [];
  }
  return (
    <div className={s.root}>
      <div className={s.centered}>
        <div className={s.authCardWide}>
          <div className={s.authHead}>
            <Mark />
            <h1 className={s.h1}>Find your institute</h1>
            <p className={s.muted}>Search for your school, academy or centre to get to its sign-in page.</p>
          </div>
          {unknown && <p className={s.warnBox} style={{ marginBottom: 14 }}>We couldn&apos;t find an institute at &ldquo;{unknown}&rdquo;. Check the address, or search below.</p>}
          <form className={s.row} role="search">
            <input className={s.input} style={{ flex: 1 }} name="q" defaultValue={q} placeholder="Institute name" aria-label="Institute name" autoFocus minLength={2} />
            <button className={s.btn}>Search</button>
          </form>
          {q.length >= 2 && (
            <ul className={s.list} style={{ marginTop: 16 }}>
              {results.map(r => (
                <li key={r.id}>
                  <span className={s.row}><InstituteLogo name={r.name} path={r.logo_path} updatedAt={r.updated_at} /> <span><b>{r.name}</b><br /><span className={s.small + ' ' + s.muted}>{r.city}</span></span></span>
                  <Link className={`${s.btnGhost} ${s.btnSmall}`} href={`/${r.slug}/login`}>Sign in</Link>
                </li>
              ))}
              {results.length === 0 && <li className={s.muted}>No institute matches &ldquo;{q}&rdquo;. Ask your teacher for your institute&apos;s StemGrid link.</li>}
            </ul>
          )}
          <div className={s.authFoot}>
            <Link href="/privacy">Privacy</Link><Link href="/terms">Membership terms</Link><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
