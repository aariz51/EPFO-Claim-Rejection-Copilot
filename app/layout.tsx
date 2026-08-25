import type { Metadata } from 'next';
import { Atkinson_Hyperlegible, Geist_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';

const atkinson = Atkinson_Hyperlegible({
  variable: '--font-atkinson',
  weight: ['400', '700'],
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Atkinson Hyperlegible has no Devanagari, and half this audience needs Hindi.
const notoDeva = Noto_Sans_Devanagari({
  variable: '--font-deva',
  weight: ['400', '600', '700'],
  subsets: ['devanagari'],
});

export const metadata: Metadata = {
  title: 'PF Precheck - Know before you claim',
  description:
    'A synthetic-data prototype that checks EPF claim readiness, explains rejection reasons, and prepares an evidence-backed grievance.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${atkinson.variable} ${geistMono.variable} ${notoDeva.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
