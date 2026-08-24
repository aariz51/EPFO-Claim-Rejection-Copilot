import type { Metadata } from 'next';
import { Atkinson_Hyperlegible, Geist_Mono } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'PF Precheck - Know before you claim',
  description:
    'A synthetic-data prototype that checks EPF claim readiness, explains rejection reasons, and prepares an evidence-backed grievance.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${atkinson.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
