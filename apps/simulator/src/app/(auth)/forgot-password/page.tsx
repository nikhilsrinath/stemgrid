import type { Metadata } from 'next';
import AuthShell from '@/ui/AuthShell';
import { ForgotForm } from '../forms';

export const metadata: Metadata = { title: 'Reset your password · StemGrid Beta' };

export default function ForgotPasswordPage() {
  return <AuthShell><ForgotForm /></AuthShell>;
}
