import { now } from '@/lib/clock';
import { fmtDateTime, isoDay } from '@/lib/dates';
import { PageHead, s } from '@/ui/bits';
import { ActionForm, Field, Submit } from '@/ui/Form';
import { setClock } from '@/dev/actions';

export default function Clock() {
  const t = now();
  const shifted = Math.abs(t.getTime() - Date.now()) > 60_000;
  return (
    <div className={s.narrow}>
      <PageHead title="Pretend date" lead={<>The whole portal, the console and the daily job think it is <b>{fmtDateTime(t)}</b>{shifted ? ' (pretend)' : ''}.</>} />
      <div className={s.stack}>
        <div className={s.card}>
          <ActionForm action={setClock}>
            <Field label="Jump to a date"><input className={s.input} type="date" name="date" defaultValue={isoDay(t)} /></Field>
            <Submit>Set date</Submit>
          </ActionForm>
        </div>
        <div className={s.card}>
          <h2 className={s.h2}>Move forward or back</h2>
          <div className={s.row}>
            {[1, 5, 7, 8, 14, 30, 45, -1].map(d => (
              <ActionForm key={d} action={setClock} className={s.row} showOk={false}>
                <input type="hidden" name="days" value={d} />
                <Submit className={s.btnGhost}>{d > 0 ? `+${d}` : d} day{Math.abs(d) === 1 ? '' : 's'}</Submit>
              </ActionForm>
            ))}
          </div>
          <p className={`${s.small} ${s.muted}`} style={{ marginTop: 10 }}>Tip: after changing the date, press <b>Run daily job</b> so go-live, reminders, grace and lapse catch up.</p>
        </div>
        {shifted && (
          <ActionForm action={setClock}>
            <input type="hidden" name="reset" value="1" />
            <Submit className={s.btnDark}>Back to today&apos;s real date</Submit>
          </ActionForm>
        )}
      </div>
    </div>
  );
}
