import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { runDaily } from '@/lib/daily';

/* POST /api/cron/daily, called once a day by the host's scheduler with
   `Authorization: Bearer <CRON_SECRET>`. Idempotent. GET does the same, because some schedulers
   (Vercel Cron) can only send GET; it still needs the secret. */
export async function GET(request: NextRequest) { return POST(request); }

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const got = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const ok = !!secret && got.length === secret.length && timingSafeEqual(Buffer.from(got), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const result = await runDaily();
  return NextResponse.json(result, { status: result.errors.length ? 207 : 200 });
}
