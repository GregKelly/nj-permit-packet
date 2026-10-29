import Link from 'next/link';
import './globals.css';

export const metadata = { title: 'Permit Packet', description: 'NJ residential permit packets from a job description' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <Link href="/" className="brand">
            Permit Packet
          </Link>
          <Link href="/">Jobs</Link>
          <Link href="/setup">Setup</Link>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
