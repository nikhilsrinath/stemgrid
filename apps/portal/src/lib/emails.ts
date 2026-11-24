import 'server-only';
import { inr } from '@/lib/money';
import { fmtDate } from '@/lib/dates';
import { portalOrigin, CONTACT } from '@/lib/urls';

/* Plain-text emails. Short, friendly, one clear link. */
const sign = `\n\nStemGrid\n${CONTACT.email} · ${CONTACT.phone}`;

export const emails = {
  activation: (p: { name: string; contactName: string; link: string; wave: string }) => ({
    subject: `Welcome to StemGrid: activate ${p.name}`,
    text: `Hello ${p.contactName || 'there'},\n\nGood news: ${p.name} has been approved for a StemGrid membership (${p.wave}).\n\nOpen this link to activate your institute portal. You'll verify your email, set a password, accept the membership terms and pay the joining amount:\n\n${p.link}\n\nThe link works once and expires in 7 days. If it expires, just reply and we'll send a new one.${sign}`,
  }),
  otp: (p: { code: string; name: string }) => ({
    subject: `${p.code} is your StemGrid verification code`,
    text: `Your verification code for activating ${p.name} is:\n\n${p.code}\n\nIt expires in 10 minutes. If you didn't ask for it, you can ignore this email.${sign}`,
  }),
  receipt: (p: { name: string; total: number; invoice: string | null; member: number | null; wave: string; slug: string }) => ({
    subject: `Payment received: welcome, ${p.name}`,
    text: `Thank you! We've received ${inr(p.total)} (including GST).\n\n${p.member ? `You are StemGrid member number ${p.member} (${p.wave}).\n` : ''}${p.invoice ? `Your invoice ${p.invoice} is on your billing page.\n` : ''}\nOur team will be in touch to schedule your onboarding and training. Your portal is ready:\n\n${portalOrigin()}/${p.slug}/login${sign}`,
  }),
  waveFull: (p: { name: string; wave: string }) => ({
    subject: `About your StemGrid payment for ${p.name}`,
    text: `Thank you for your payment. The last ${p.wave} place was taken just before your payment arrived.\n\nOur team will contact you within one working day to offer you a place in the next wave, or a full refund if you prefer.${sign}`,
  }),
  invite: (p: { inviter: string; institute: string; role: string; link: string }) => ({
    subject: `${p.inviter} invited you to ${p.institute} on StemGrid`,
    text: `Hello,\n\n${p.inviter} has invited you to join ${p.institute} on StemGrid as ${p.role}.\n\nAccept the invite and set your password here:\n\n${p.link}\n\nThe link works once and expires in 7 days.${sign}`,
  }),
  reset: (p: { institute: string; link: string }) => ({
    subject: 'Reset your StemGrid password',
    text: `Someone (hopefully you) asked to reset your password for ${p.institute} on StemGrid.\n\nChoose a new password here:\n\n${p.link}\n\nIf you didn't ask, you can ignore this email.${sign}`,
  }),
  freePeriodReminder: (p: { name: string; days: number; ends: string; slug: string }) => ({
    subject: `${p.name}: your free period ends in ${p.days} days`,
    text: `Your unlimited free period ends on ${fmtDate(p.ends)}.\n\nAfter that your monthly plan starts at your locked member price. You can check the recommended plan and your usage on the billing page:\n\n${portalOrigin()}/${p.slug}/admin/billing${sign}`,
  }),
  recommendation: (p: { name: string; plan: string; packs: number; peak: number; due: string; slug: string }) => ({
    subject: `${p.name}: we recommend the ${p.plan} plan`,
    text: `Your busiest month so far had ${p.peak} active students, so we recommend the ${p.plan} plan${p.packs ? ` with ${p.packs} extra pack${p.packs > 1 ? 's' : ''} of 10 students` : ''}.\n\nPlease confirm it (or choose a bigger plan) by ${fmtDate(p.due)}. If you don't, we'll apply this recommendation for you.\n\n${portalOrigin()}/${p.slug}/admin/billing${sign}`,
  }),
  usageWarning: (p: { name: string; pct: number; count: number; limit: number; slug: string }) => ({
    subject: `${p.name}: ${p.pct}% of this month's student limit used`,
    text: `${p.count} of ${p.limit} active students have used the portal this month.${p.pct >= 100 ? '\n\nNew students who haven\'t signed in yet this month will be asked to check with you. You can add an extra pack of 10 students from the billing page or by contacting us.' : ''}\n\n${portalOrigin()}/${p.slug}/admin/dashboard${sign}`,
  }),
  grace: (p: { name: string; slug: string }) => ({
    subject: `${p.name}: payment due`,
    text: `We couldn't collect your monthly payment. Everything keeps working for 7 days while we sort it out.\n\nAfter that, students won't be able to sign in and staff accounts become read-only until the payment is made. Please contact us or check your billing page:\n\n${portalOrigin()}/${p.slug}/admin/billing${sign}`,
  }),
  suspended: (p: { name: string }) => ({
    subject: `${p.name}: portal paused for students`,
    text: `The payment is still overdue, so students can't sign in for now and staff accounts are read-only. Your data is safe. Contact us and we'll get you running again straight away.${sign}`,
  }),
};
