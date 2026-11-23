import type { BuildData } from '@/lib/types';

export type Simulator = {
  stop(): void;
  serialize(): BuildData & { camera?: unknown };
  load(data: BuildData | null | undefined): void;
  snapshot(): Promise<Blob | null>;
  toast(msg: string): void;
  isEmpty(): boolean;
};

export function startSimulator(opts?: { onChange?: () => void }): Simulator;
