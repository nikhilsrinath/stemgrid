import { now } from '@/lib/clock';
import { fmtDateTime } from '@/lib/dates';
import { PageHead, s } from '@/ui/bits';
import RunDaily from './RunDaily';

export default function Cron() {
  return (
    <div className={s.narrow}>
      <PageHead title="Daily job" lead={`In production this runs once a day. Here you press the button. Pretend date: ${fmtDateTime(now())}.`} />
      <div className={s.card}>
        <ol style={{ margin: '0 0 16px', paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Go-live for institutes paid 7+ days ago</li>
          <li>Reminders 14 and 7 days before a free period ends</li>
          <li>Plan recommendation in the last 30 days (applied after 7 days if not confirmed)</li>
          <li>Free period end → active (with AutoPay) or grace (without)</li>
          <li>Grace day 7 → suspended; due date + 30 days → lapsed</li>
          <li>Usage history and 80% / 100% warnings</li>
          <li>Data deletion 60 days after lapse or cancellation; expire old links</li>
        </ol>
        <RunDaily />
      </div>
    </div>
  );
}
