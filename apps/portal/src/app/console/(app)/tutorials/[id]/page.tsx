import Link from 'next/link';
import { notFound } from 'next/navigation';
import { consoleBase } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { simulatorOrigin } from '@/lib/urls';
import { LEVELS, PART_IDS, STEPS_TEMPLATE, type TutorialRow } from '@/lib/tutorials';
import { PageHead, s } from '@/ui/bits';
import { ActionForm, Field, Submit } from '@/ui/Form';
import { deleteTutorial, saveTutorial } from '../../../tutorial-actions';

const PART_NAMES: Record<string, string> = {
  plate: 'Base plate', quark: 'Quark C3', ultrasonic: 'Ultrasonic', dht11: 'Temp & humidity', light: 'Light sensor', ir: 'IR receiver',
  rfid: 'RFID reader', pot: 'Potentiometer', buttons: 'Push buttons', oled: 'OLED display', rgb: 'RGB LED', servo: 'Servo', buzzer: 'Buzzer', zap: 'Zap connector',
};
const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 13, lineHeight: 1.5, fontWeight: 400 } as const;

/* Edit one TinkerAI tutorial (/tutorials/new makes one). */
export default async function TutorialEdit({ params, searchParams }: PageProps<'/console/tutorials/[id]'>) {
  const { id } = await params;
  const created = (await searchParams).created;
  const b = await consoleBase();
  let t: TutorialRow | null = null;
  if (id !== 'new') {
    const { data } = await supabaseAdmin().from('tutorials').select('*').eq('id', id).maybeSingle();
    if (!data) notFound();
    t = data as TutorialRow;
  }
  const isNew = !t;

  return (
    <>
      <PageHead title={t?.title ?? 'New tutorial'} lead={<Link href={`${b}/tutorials`}>← All tutorials</Link>}>
        {t?.published && <a className={s.btnGhost} href={`${simulatorOrigin()}/simulator?tutorial=${t.slug}`} target="_blank" rel="noreferrer">Open in the simulator ↗</a>}
      </PageHead>
      {created && <p className={s.okBox} style={{ marginBottom: 16 }}>Tutorial created.</p>}

      <div className={s.card}>
        <ActionForm action={saveTutorial}>
          <input type="hidden" name="id" value={t?.id ?? ''} />
          <div className={s.formRow}>
            <Field label="Title"><input className={s.input} name="title" defaultValue={t?.title ?? ''} required maxLength={120} placeholder="LED on/off using ultrasonic sensor" /></Field>
            <Field label="Web address" hint="Lowercase, numbers and dashes. Opens at /simulator?tutorial=…">
              <input className={s.input} name="slug" defaultValue={t?.slug ?? ''} required pattern="[a-z0-9][a-z0-9\-]{2,59}" placeholder="led-ultrasonic" />
            </Field>
          </div>
          <Field label="Summary" hint="Shown on the tutorial card. Up to 400 characters.">
            <textarea className={s.textarea} name="summary" defaultValue={t?.summary ?? ''} maxLength={400} rows={2} />
          </Field>
          <div className={s.formRow}>
            <Field label="Level">
              <select className={s.select} name="level" defaultValue={t?.level ?? 'easy'}>
                {LEVELS.map(l => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Minutes"><input className={s.input} type="number" name="minutes" min={1} max={240} defaultValue={t?.minutes ?? 10} required /></Field>
            <Field label="Order" hint="Lower comes first."><input className={s.input} type="number" name="sort" min={0} max={10000} defaultValue={t?.sort ?? 100} required /></Field>
          </div>
          <Field label="Parts used" hint="For the card picture, the part filter and “Sort by components”.">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', paddingTop: 4 }}>
              {PART_IDS.map(p => (
                <label key={p} className={s.check}><input type="checkbox" name="parts" value={p} defaultChecked={t ? t.parts.includes(p) : ['plate', 'quark', 'zap'].includes(p)} />{PART_NAMES[p]}</label>
              ))}
            </div>
          </Field>
          <Field label="Code" hint="The program the code step fills in, read-only. Python-style, using the simulator's commands (distance(), led.on(), sleep() …).">
            <textarea className={s.textarea} name="code" defaultValue={t?.code ?? ''} rows={14} spellCheck={false} style={mono} required />
          </Field>
          <Field label="Steps (JSON)" hint={<StepsHelp />}>
            <textarea className={s.textarea} name="steps" defaultValue={t ? JSON.stringify(t.steps, null, 2) : STEPS_TEMPLATE} rows={24} spellCheck={false} style={mono} required />
          </Field>
          <Field label="When it's done" hint="Something to try next, shown at the end. Up to 400 characters.">
            <textarea className={s.textarea} name="outro" defaultValue={t?.outro ?? ''} maxLength={400} rows={2} />
          </Field>
          <label className={s.check}><input type="checkbox" name="published" defaultChecked={t?.published ?? false} /><span><b>Published</b>: students can see it on TinkerAI.</span></label>
          <div className={s.row}><Submit>{isNew ? 'Create tutorial' : 'Save changes'}</Submit></div>
        </ActionForm>
      </div>

      {t && (
        <div className={s.card} style={{ marginTop: 16 }}>
          <h2 className={s.h2}>Delete</h2>
          <p className={s.muted}>Removes the tutorial and everyone&apos;s progress in it. Unpublish it instead if you might want it back.</p>
          <ActionForm action={deleteTutorial} confirm={`Delete “${t.title}” for good?`} showOk={false}>
            <input type="hidden" name="id" value={t.id} />
            <div className={s.row}><Submit className={s.btnDanger}>Delete tutorial</Submit></div>
          </ActionForm>
        </div>
      )}
    </>
  );
}

function StepsHelp() {
  return (
    <details>
      <summary style={{ cursor: 'pointer' }}>A list of steps, done in order. How to write them</summary>
      <div style={{ marginTop: 6, lineHeight: 1.6 }}>
        Every step has <code>&quot;title&quot;</code>, <code>&quot;hint&quot;</code> (what to do) and can have <code>&quot;why&quot;</code> (what it&apos;s for). Then one of:<br />
        <code>{'{ "do": "add", "part": "ultrasonic" }'}</code>: that part is on the table (parts: {PART_IDS.join(', ')}). Add <code>&quot;count&quot;: 2</code> for a second one, like a second Zap connector.<br />
        <code>{'{ "do": "plug", "part": "ultrasonic" }'}</code>: a Zap plug is in that module&apos;s socket.<br />
        <code>{'{ "do": "wire", "part": "ultrasonic", "to": "quark" }'}</code>: the module is wired to the Quark.<br />
        <code>{'{ "do": "code", "notes": [{ "lines": [4], "text": "…" }] }'}</code>: shows the code above (read-only) and explains it line by line.<br />
        <code>{'{ "do": "run" }'}</code>: the program is running.<br />
        <code>{'{ "do": "try", "part": "ultrasonic", "below": 15, "led": true }'}</code>: the student makes it happen while the program runs. <code>below</code> / <code>above</code> test the part&apos;s main reading (distance cm, light %, knob %, temperature °C, button 1 pressed = 1); <code>&quot;led&quot;: true</code> wants the Quark&apos;s light on, <code>&quot;sound&quot;: true</code> a buzzer sounding.<br />
        If the student undoes a step (pulls a cable out), the tutor goes back to it.
      </div>
    </details>
  );
}
