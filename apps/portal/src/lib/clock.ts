import fs from 'node:fs';
import path from 'node:path';
import { isLocal } from '@/lib/mode';

/* The one place the app asks "what time is it?". Use now() everywhere instead of new Date().
   In local mode the owner can pretend it's another day (/dev/clock). The offset lives in a
   local file rather than a cookie, so the portal host, the console host and the daily job all
   agree on the same pretend date. */
export const STATE_FILE = path.join(process.cwd(), 'dev', '.state.json');

export type DevState = { offsetMs?: number };

export function readDevState(): DevState {
  if (!isLocal()) return {};
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as DevState; } catch { return {}; }
}

export function writeDevState(patch: DevState) {
  if (!isLocal()) throw new Error('Local mode only');
  const next = { ...readDevState(), ...patch };
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2));
}

export function now(): Date {
  if (!isLocal()) return new Date();
  return new Date(Date.now() + (readDevState().offsetMs ?? 0));
}
