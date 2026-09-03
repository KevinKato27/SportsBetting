import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OVERLAY v0.1 — Sports Betting Research OS',
  description:
    'A mobile-first, auditable sports betting research, calibration, and experiment tracking workspace.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
