import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'ATELOS',
  description: 'AI가 만들어가는 당신만의 생존 서사',
  generator: 'ATELOS',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased">
        <Toaster />
        {children}
      </body>
    </html>
  );
}
