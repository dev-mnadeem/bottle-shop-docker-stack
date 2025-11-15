import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Eco Bottle — reusable drinkware',
    template: '%s · Eco Bottle',
  },
  description:
    'Glass, steel and bamboo bottles built to be refilled. Browse the catalogue or ask us about bulk and wholesale.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
}
