'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

/* Crop the picked image to a centred square, shrink it to 256 px webp, upload it to
   avatars/<uid>/<time>.webp and return its public URL. */
export async function uploadAvatar(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Pick a picture file (JPG, PNG or WebP).');
  if (file.size > 10 * 1024 * 1024) throw new Error('That picture is too big. Pick one under 10 MB.');
  const bmp = await createImageBitmap(file).catch(() => { throw new Error("Couldn't read that picture. Try another one."); });
  const side = Math.min(bmp.width, bmp.height), S = 256;
  const c = document.createElement('canvas'); c.width = c.height = S;
  c.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, S, S);
  bmp.close();
  const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/webp', 0.86));
  if (!blob) throw new Error("Couldn't prepare that picture. Try another one.");
  const sb = supabaseBrowser();
  const path = `${uid}/${Date.now()}.webp`;
  const { error } = await sb.storage.from('avatars').upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000' });
  if (error) throw new Error("Couldn't upload your picture. Try again.");
  // tidy up older pictures (best effort)
  const { data: old } = await sb.storage.from('avatars').list(uid);
  const stale = (old ?? []).map(o => `${uid}/${o.name}`).filter(p => p !== path);
  if (stale.length) await sb.storage.from('avatars').remove(stale);
  return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
