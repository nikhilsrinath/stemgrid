/* TinkerAI tutorials, edited on the console. The table (`tutorials`) and the step format live with
   the simulator: apps/simulator/supabase/migrations/20261129100000_tinkerai_tutorials.sql and
   apps/simulator/src/lib/tutorials.ts. Keep PART_IDS and the checks below in step with that file. */

export type TutorialRow = {
  id: string; slug: string; title: string; summary: string; level: 'easy' | 'medium' | 'hard';
  board: string; parts: string[]; minutes: number; code: string; outro: string; steps: unknown[];
  published: boolean; sort: number; created_at: string; updated_at: string;
};

export const LEVELS = ['easy', 'medium', 'hard'] as const;
export const PART_IDS = ['plate', 'quark', 'ultrasonic', 'dht11', 'light', 'ir', 'rfid', 'pot', 'buttons', 'oled', 'rgb', 'servo', 'buzzer', 'zap'] as const;
export const TUTORIAL_SLUG_RE = /^[a-z0-9][a-z0-9-]{2,59}$/;
const KINDS = ['add', 'plug', 'wire', 'code', 'run', 'try'];

/* Checks steps typed as JSON. Returns a problem in plain words, or null. */
export function stepsProblem(raw: unknown): string | null {
  if (!Array.isArray(raw) || !raw.length) return 'Steps must be a JSON list ([ … ]) with at least one step.';
  const part = (v: unknown) => typeof v === 'string' && (PART_IDS as readonly string[]).includes(v);
  for (const [i, s] of raw.entries()) {
    const n = `Step ${i + 1}`;
    if (!s || typeof s !== 'object' || Array.isArray(s)) return `${n} must be an object { … }.`;
    const o = s as Record<string, unknown>;
    if (!KINDS.includes(o.do as string)) return `${n}: "do" must be one of ${KINDS.join(', ')}.`;
    if (typeof o.title !== 'string' || !o.title.trim()) return `${n} needs a "title".`;
    if (typeof o.hint !== 'string' || !o.hint.trim()) return `${n} needs a "hint".`;
    if (o.why != null && typeof o.why !== 'string') return `${n}: "why" must be text.`;
    if (['add', 'plug', 'wire', 'try'].includes(o.do as string) && !part(o.part)) return `${n}: "part" must be one of ${PART_IDS.join(', ')}.`;
    if (o.do === 'wire' && !part(o.to)) return `${n}: "to" must be a part id, usually "quark".`;
    if (o.do === 'add' && o.count != null && !(Number.isInteger(o.count) && (o.count as number) >= 1 && (o.count as number) <= 8))
      return `${n}: "count" must be a whole number from 1 to 8.`;
    if (o.do === 'try') {
      if (o.below == null && o.above == null && !o.led && !o.sound) return `${n}: a "try" step needs "below", "above", "led" or "sound".`;
      if ((o.below != null && typeof o.below !== 'number') || (o.above != null && typeof o.above !== 'number')) return `${n}: "below" and "above" must be numbers.`;
      if ((o.led != null && typeof o.led !== 'boolean') || (o.sound != null && typeof o.sound !== 'boolean')) return `${n}: "led" and "sound" must be true or false.`;
    }
    if (o.do === 'code' && o.notes != null) {
      if (!Array.isArray(o.notes)) return `${n}: "notes" must be a list.`;
      for (const x of o.notes as Record<string, unknown>[]) {
        if (!Array.isArray(x?.lines) || !x.lines.every(l => Number.isInteger(l) && l > 0) || typeof x?.text !== 'string')
          return `${n}: each note is { "lines": [line numbers], "text": "…" }.`;
      }
    }
  }
  if (!raw.some(s => (s as { do?: string }).do === 'code')) return 'Add a "code" step, so the student sees the code before running it.';
  return null;
}

/* A starting point for a new tutorial. */
export const STEPS_TEMPLATE = JSON.stringify([
  { do: 'add', part: 'plate', title: 'Add a base plate', hint: 'Drag the Base plate from the parts list onto the table.' },
  { do: 'add', part: 'quark', title: 'Add the Quark C3 controller', hint: 'Drag the Quark C3 controller onto the base plate.' },
  { do: 'add', part: 'zap', title: 'Add a Zap connector', hint: 'Drag a Zap connector onto the table.' },
  { do: 'code', title: 'Read the code', hint: 'Read what each part does, then press Got it.', notes: [{ lines: [1], text: 'What this line does.' }] },
  { do: 'run', title: 'Run the program', hint: 'Press ▶ Run in the code panel.' },
], null, 2);
