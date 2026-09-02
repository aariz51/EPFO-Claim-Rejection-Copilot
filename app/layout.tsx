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

const SITE = 'https://pf-precheck.vercel.app';
const TITLE = 'PF Precheck — know before you claim';
const DESC =
  "EPFO's own charter gives it 20 days. PF Precheck counts your claim against that limit, names the role holding your file, computes what the delay is worth in rupees, and drafts the grievance. No UAN, no OTP, no login.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: '%s — PF Precheck' },
  description: DESC,
  applicationName: 'PF Precheck',
  authors: [{ name: 'Aariz' }],
  keywords: [
    'EPF claim', 'PF withdrawal', 'EPFO grievance', 'EPFiGMS', 'claim rejected',
    'PF claim status', 'provident fund', 'Form 19', 'Form 31', 'EPFO 20 days',
  ],
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'PF Precheck',
    title: TITLE,
    description: DESC,
    locale: 'en_IN',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESC,
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
  category: 'civic technology',
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
