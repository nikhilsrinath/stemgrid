import Link from 'next/link';
import { readMailbox } from '@/lib/mail';
import { fmtDateTime } from '@/lib/dates';
import { Empty, PageHead, s } from '@/ui/bits';

/* Every email the portal "sent" in local mode. Links inside are clickable. */
export default async function Mailbox({ searchParams }: PageProps<'/dev/mail'>) {
  const id = String((await searchParams).id ?? '');
  const box = readMailbox();
  const open = box.find(m => m.id === id) ?? box[0];
  const linkify = (text: string) => text.split(/(https?:\/\/\S+)/g).map((part, i) => /^https?:\/\//.test(part) ? <a key={i} href={part} style={{ wordBreak: 'break-all', fontWeight: 700 }}>{part}</a> : part);
  return (
    <>
      <PageHead title="Mailbox" lead="Emails the portal would have sent. Nothing leaves this laptop." />
      {!box.length ? <div className={s.card}><Empty>No emails yet. Approve an enquiry in the console to get an activation email.</Empty></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) 2fr', gap: 16 }}>
          <div className={s.cardTight} style={{ maxHeight: '75vh', overflow: 'auto' }}>
            <ul className={s.list}>
              {box.map(m => (
                <li key={m.id} style={{ padding: '10px 14px', background: m.id === open?.id ? '#fff' : undefined }}>
                  <Link href={`/dev/mail?id=${m.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <b style={{ display: 'block' }}>{m.subject}</b>
                    <span className={`${s.small} ${s.muted}`}>to {m.to} · {fmtDateTime(m.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {open && (
            <div className={s.card}>
              <h2 className={s.h2}>{open.subject}</h2>
              <p className={`${s.small} ${s.muted}`}>To {open.to} · {fmtDateTime(open.at)}</p>
              <hr className={s.divider} style={{ margin: '12px 0' }} />
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{linkify(open.text)}</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
