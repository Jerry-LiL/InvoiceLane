import type { Metadata } from 'next';
import { Figtree, Newsreader } from 'next/font/google';
import './globals.css';

const sans = Figtree({ subsets: ['latin'], variable: '--font-figtree' });
const serif = Newsreader({ subsets: ['latin'], variable: '--font-newsreader' });

export const metadata: Metadata = {
  title: {
    default: 'InvoiceLane',
    template: '%s · InvoiceLane',
  },
  description: 'Clients, invoices, PDF copies, and payment reminders.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
