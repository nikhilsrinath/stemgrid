import TextPage from '@/ui/TextPage';
import { CONTACT } from '@/lib/urls';
import { s } from '@/ui/bits';

export const metadata = { title: 'Membership terms · StemGrid' };

/* Placeholder until the owner supplies the membership terms text (brief §18). */
export default function Terms() {
  return (
    <TextPage title="Membership terms">
      <p className={s.warnBox}>Placeholder: the StemGrid membership terms (version {process.env.TERMS_VERSION ?? '—'}) will be published here.</p>
      <p>Your membership details (wave, free period, locked prices and minimum term) are shown on your institute&apos;s billing page after you join.</p>
      <p>Questions: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> · {CONTACT.phone}</p>
    </TextPage>
  );
}
