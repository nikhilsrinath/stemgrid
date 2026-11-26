import type { Metadata } from 'next';
import AuthSplit from '@/ui/AuthSplit';
import { ForgotForm } from '../forms';
import { PASSWORD_ASIDE } from '../asides';

export const metadata: Metadata = { title: 'Reset your password · StemGrid' };

export default function ForgotPasswordPage() {
  return <AuthSplit aside={PASSWORD_ASIDE(0)}><ForgotForm /></AuthSplit>;
}
