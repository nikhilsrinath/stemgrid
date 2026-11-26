import type { TableFacts } from '@/simulator/engine';

/* TinkerAI tutorials. Rows live in Supabase (`tutorials`, migration 20261129100000); the StemGrid
   team edits them on the console (apps/portal, Tutorials page, which checks the steps). `steps` is a JSON array; each step is one of:

     { "do": "add",  "part": "<parts-library id>", "count"?: 2 }
                                                              that part is on the table (plate, quark, ultrasonic, zap…);
                                                              "count" for the second of something, like a second Zap connector
     { "do": "plug", "part": "<module kind>" }                a Zap plug is in that module's socket
     { "do": "wire", "part": "<module kind>", "to": "quark" } that module is wired to the board
     { "do": "code", "notes": [{ "lines": [3], "text": "…" }] } the tutorial's code is filled in (read-only); the student reads the notes and presses Got it
     { "do": "run" }                                          the program is running
     { "do": "try", "part": "ultrasonic", "below": 15, "led": true, "sound"?: true }
                                                              the student makes it happen while the program runs: the part's
                                                              main reading (distance, light %, knob %, temperature, button 1
                                                              pressed = 1) is under `below` and/or over `above`; if `led`,
                                                              the Quark's light is on; if `sound`, a buzzer is sounding
   Every step also has "title", "hint" (what to do) and an optional "why" (what it's for).
   The current step is always the first one not done, so undoing a step (pulling a cable out)
   takes the student back to it. */

export type Level = 'easy' | 'medium' | 'hard';

export type Note = { lines: number[]; text: string };
type Base = { title: string; hint: string; why?: string };
export type Step = Base & (
  | { do: 'add'; part: string; count?: number }
  | { do: 'plug'; part: string }
  | { do: 'wire'; part: string; to: string }
  | { do: 'code'; notes?: Note[] }
  | { do: 'run' }
  | { do: 'try'; part: string; below?: number; above?: number; led?: boolean; sound?: boolean }
);

export type TutorialCard = {
  id: string; slug: string; title: string; summary: string; level: Level;
  board: string; parts: string[]; minutes: number; sort: number;
};
export type Tutorial = TutorialCard & { code: string; outro: string; steps: Step[] };

export const CARD_COLUMNS = 'id, slug, title, summary, level, board, parts, minutes, sort';
export const TUTORIAL_COLUMNS = `${CARD_COLUMNS}, code, outro, steps`;

export const LEVELS: Level[] = ['easy', 'medium', 'hard'];
export const LEVEL_LABEL: Record<Level, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

// Names and pictures of the parts (mirrors LIBRARY in engine.js, for the cards and the step list)
export const PARTS: Record<string, { name: string; img: string }> = {
  plate: { name: 'Base plate', img: '/assets/modules/module-12_base-plate.png' },
  quark: { name: 'Quark C3 controller', img: '/assets/modules/module-01_quark-c3-controller.png' },
  ultrasonic: { name: 'Ultrasonic sensor', img: '/assets/modules/module-02_ultrasonic-sensor.png' },
  dht11: { name: 'Temp & humidity', img: '/assets/modules/module-03_temp-humidity-dht11.png' },
  light: { name: 'Light sensor', img: '/assets/modules/module-04_light-sensor.png' },
  ir: { name: 'IR receiver', img: '/assets/modules/module-05_ir-receiver.png' },
  rfid: { name: 'RFID reader', img: '/assets/modules/module-07_rfid-reader.png' },
  pot: { name: 'Potentiometer', img: '/assets/modules/module-10_potentiometer.png' },
  buttons: { name: 'Dual push button', img: '/assets/modules/module-11_dual-push-button.png' },
  oled: { name: 'OLED display', img: '/assets/modules/module-06_oled-display.png' },
  servo: { name: 'Servo motor', img: '/assets/modules/module-08_servo-motor.png' },
  // simulator-only part with no product photo: the same drawn icon as LIBRARY's RGB_ICON
  rgb: { name: 'RGB LED', img: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="10" y="22" width="44" height="34" rx="6" fill="#FF8044"/><rect x="15" y="27" width="34" height="24" rx="3" fill="#1F7A55"/><circle cx="32" cy="30" r="13" fill="#E4121B" opacity=".25"/><path d="M24 40v-9a8 8 0 0 1 16 0v9z" fill="#ff5a5a"/><rect x="22" y="40" width="20" height="4" rx="1" fill="#eee"/></svg>') },
  buzzer: { name: 'Buzzer', img: '/assets/modules/module-09_buzzer.png' },
  zap: { name: 'Zap connector', img: '/assets/modules/module-13_zap-connectors.png' },
};
export const partName = (id: string) => PARTS[id]?.name ?? id;

/* What the tutor remembers that the table can't tell it. */
export type Memory = { codeRead: boolean; tried: boolean };

export function stepDone(step: Step, f: TableFacts, mem: Memory): boolean {
  switch (step.do) {
    case 'add': {
      const n = step.count ?? 1;
      return (step.part === 'plate' ? f.plates : step.part === 'zap' ? f.cables : f.modules.filter(m => m.kind === step.part).length) >= n;
    }
    case 'plug': return f.modules.some(m => m.kind === step.part && m.plugged);
    case 'wire': return f.modules.some(m => m.kind === step.to && m.links.includes(step.part));
    case 'code': return mem.codeRead;
    case 'run': return f.modules.some(m => m.running || m.ran);
    case 'try': return mem.tried || tryOk(step, f);
  }
}

export function tryOk(step: Extract<Step, { do: 'try' }>, f: TableFacts) {
  const board = f.modules.find(m => m.running);
  if (!board) return false;
  const v = readingOf(step.part, f)?.value;
  if (v == null) return false;
  if (step.below != null && !(v < step.below)) return false;
  if (step.above != null && !(v > step.above)) return false;
  if (step.sound && !f.modules.some(m => m.sound)) return false;
  return step.led ? board.led : true;
}

/* The main reading of the first module of that kind on the table. */
export function readingOf(kind: string, f: TableFacts) {
  return f.modules.find(m => m.kind === kind)?.reading ?? null;
}

/* The first step that isn't done (steps.length when the tutorial is finished). */
export function currentStep(steps: Step[], f: TableFacts, mem: Memory) {
  const i = steps.findIndex(s => !stepDone(s, f, mem));
  return i === -1 ? steps.length : i;
}
