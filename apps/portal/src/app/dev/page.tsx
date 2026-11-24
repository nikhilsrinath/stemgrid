import accounts from '../../../dev/demo-accounts.json';
import { PageHead, s } from '@/ui/bits';

const learn = () => process.env.NEXT_PUBLIC_PORTAL_URL || 'http://learn.localhost:3002';
const admin = () => process.env.NEXT_PUBLIC_CONSOLE_URL || 'http://admin.localhost:3002';

export default function DevHome() {
  return (
    <>
      <PageHead title="Local testing" lead="Everything here is fake and lives only on this laptop: no real payments, emails or student data. The step-by-step scripts are in apps/portal/TESTING.md." />
      <div className={s.grid2}>
        <div className={s.cardTight}>
          <div style={{ padding: '16px 18px 4px' }}><h2 className={s.h2}>Demo accounts</h2></div>
          <table className={s.table}>
            <thead><tr><th>Who</th><th>Login</th><th>Password / PIN</th><th /></tr></thead>
            <tbody>{accounts.map(a => (
              <tr key={a.key}><td>{a.label}</td><td className={s.mono}>{a.email ?? a.username}</td><td className={s.mono}>{a.password ?? a.pin}</td>
                <td><a className={`${s.btnGhost} ${s.btnSmall}`} href={`${a.host === 'admin' ? admin() : learn()}/dev/as/${a.key}`}>Sign in</a></td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className={s.card}>
          <h2 className={s.h2}>Addresses</h2>
          <ul className={s.list}>
            <li><span>Console (StemGrid team)</span><a href={`${admin()}/login`}>{admin()}/login</a></li>
            <li><span>Bright Minds sign-in</span><a href={`${learn()}/bright-minds/login`}>/bright-minds/login</a></li>
            <li><span>Nova Robotics sign-in</span><a href={`${learn()}/nova-robotics/login`}>/nova-robotics/login</a></li>
            <li><span>Spark STEM sign-in</span><a href={`${learn()}/spark-stem/login`}>/spark-stem/login</a></li>
            <li><span>Self-join batch code</span><a href={`${learn()}/bright-minds/join/BRT7KQ`}>BRT7KQ</a></li>
            <li><span>Activation link for the approved institute</span><a href="/dev/mail">in the mailbox</a></li>
            <li><span>Supabase Studio (database)</span><a href="http://127.0.0.1:55323">127.0.0.1:55323</a></li>
          </ul>
        </div>
      </div>
    </>
  );
}
