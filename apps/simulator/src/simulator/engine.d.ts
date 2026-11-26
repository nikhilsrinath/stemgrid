import type { BuildData } from '@/lib/types';

/* What's on the table, for TinkerAI's step checks. Only modules sitting on a plate (not being dragged). */
export type TableFacts = {
  plates: number;
  cables: number;
  codeOpen: boolean;
  modules: {
    id: number;
    kind: string;
    plugged: boolean;          // a Zap plug is in one of its ports
    links: string[];           // kinds of the modules wired to it
    running: boolean;          // a board whose program is running
    ran: boolean;              // …or ran to the end without an error
    led: boolean;              // a board whose own light is on
    distance: number | null;   // ultrasonic reading, cm
    reading: { label: string; value: number; unit: string } | null;   // a sensor's main reading
    sound: boolean;            // a buzzer that is sounding
  }[];
};

export type PointSpec = { kind: string; at?: 'body' | 'port' | 'free-port' | 'target' } | { cable: 'loose' };

export type Tutor = {
  inspect(): TableFacts;
  highlightPart(id: string | null): void;
  pointAt(spec: PointSpec): [number, number] | null;
  setCode(code: string, lock: boolean): boolean;
  lockCode(lock: boolean): void;
  markLines(lines: number[] | null): void;
  openCode(open?: boolean): void;
};

export type Simulator = {
  stop(): void;
  serialize(): BuildData & { camera?: unknown };
  load(data: BuildData | null | undefined): void;
  snapshot(width?: number, height?: number): Promise<Blob | null>;   // default 480 x 300
  toast(msg: string): void;
  isEmpty(): boolean;
  tutor: Tutor;
};

export function startSimulator(opts?: { onChange?: () => void }): Simulator;
