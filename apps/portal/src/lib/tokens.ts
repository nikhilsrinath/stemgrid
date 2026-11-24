import 'server-only';
import { createHash, randomBytes, randomInt } from 'node:crypto';

/* Single-use link tokens: the link carries the token, the database keeps only its hash. */
export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
export const newOtp = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
