import { Fraunces, Instrument_Sans } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import type { Metadata, Viewport } from 'next';
import './globals.css';

// Self-hosted by next/font at build time, so the browser never calls Google.
const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['SOFT', 'opsz'],
  display: 'swap',
});
const body = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Eco Bottle — reusable drinkware',
    template: '%s · Eco Bottle',
  },
  description:
    'Glass, steel and bamboo bottles built to be refilled. Browse the catalogue or ask us about bulk and wholesale.',
};

export const viewport: Viewport = {
  themeColor: '#0f5f46',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="bottom-center" toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
}
