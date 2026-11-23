'use server';

import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { siteOrigin } from '@/lib/origin';
import { safeNext } from '@/lib/safe-next';

export type FormState = { error?: string; done?: boolean; email?: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

/* Supabase's messages, in plain words. */
function friendly(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return "That email and password don't match. Check them and try again.";
  if (m.includes('email not confirmed')) return 'Confirm your email first. Open the link we sent you when you signed up.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'There is already an account with that email. Try signing in.';
  if (m.includes('password') && (m.includes('least') || m.includes('short') || m.includes('weak'))) return 'Pick a longer password: at least 8 characters.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Too many tries in a short time. Wait a minute, then try again.';
  if (m.includes('same as the old') || m.includes('different from the old')) return 'Your new password has to be different from your old one.';
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) return "Google sign-in isn't switched on yet. Use your email for now.";
  return 'Something went wrong. Try again in a moment.';
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form, 'email').toLowerCase(), password = String(form.get('password') ?? '');
  if (!EMAIL.test(email)) return { error: 'Enter your email address.' };
  if (!password) return { error: 'Enter your password.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendly(error.message) };
  redirect(safeNext(str(form, 'next')));
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const name = str(form, 'name').slice(0, 50), email = str(form, 'email').toLowerCase(), password = String(form.get('password') ?? '');
  if (!name) return { error: 'Tell us your name.' };
  if (!EMAIL.test(email)) return { error: 'That email address doesn\'t look right.' };
  if (password.length < 8) return { error: 'Pick a longer password: at least 8 characters.' };
  const next = safeNext(str(form, 'next'), '/projects');
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: friendly(error.message) };
  if (data.session) redirect(next);           // email confirmation switched off: straight in
  return { done: true, email };
}

export async function signInWithGoogle(form: FormData) {
  const next = safeNext(str(form, 'next'));
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/login?error=${encodeURIComponent(friendly(error?.message ?? ''))}`);
  redirect(data.url);
}

export async function forgotPassword(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form, 'email').toLowerCase();
  if (!EMAIL.test(email)) return { error: 'Enter the email you signed up with.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error && /rate|too many|security/i.test(error.message)) return { error: friendly(error.message) };
  return { done: true, email };                // same answer whether or not the account exists
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get('password') ?? ''), again = String(form.get('again') ?? '');
  if (password.length < 8) return { error: 'Pick a longer password: at least 8 characters.' };
  if (password !== again) return { error: "The two passwords don't match." };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: friendly(error.message) };
  redirect('/projects?msg=password');
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/');
}
