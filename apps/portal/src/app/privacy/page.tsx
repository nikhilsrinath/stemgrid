import TextPage from '@/ui/TextPage';
import { CONTACT, simulatorOrigin } from '@/lib/urls';
import { s } from '@/ui/bits';

export const metadata = { title: 'Privacy · StemGrid' };

/* Placeholder until the owner supplies the privacy policy text (brief §16, §18). It must be replaced
   before the first real student account is created. */
export default function Privacy() {
  return (
    <TextPage title="Privacy">
      <p className={s.warnBox}>Placeholder: StemGrid&apos;s privacy policy will be published here before the portal opens to students.</p>
      <p>What the portal keeps about students: a display name, a username, which batches they are in, their learning activity and their simulator projects. No date of birth, address, phone, email or photo. No ads, no tracking scripts, and no selling of data.</p>
      <p>Institutes declare that they have parental consent before creating student accounts. StemGrid follows India&apos;s Digital Personal Data Protection Act, 2023.</p>
      <p>Questions: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> · {CONTACT.phone}. See also <a href={simulatorOrigin()}>{simulatorOrigin().replace(/^https?:\/\//, '')}</a>.</p>
    </TextPage>
  );
}
