import type { Metadata } from 'next';
import { Cormorant_Garamond, Noto_Serif_KR, Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

// Display/Heading fonts - dramatic serif for cinematic feel
const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

const notoSerifKR = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-serif-kr',
  display: 'swap',
});

// Body/UI font - clean sans-serif for readability
const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
});

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
    <html lang="ko" className={`${cormorantGaramond.variable} ${notoSerifKR.variable} ${notoSansKR.variable}`}>
      <head>
        {/* Pretendard - Modern Korean font for UI */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans antialiased">
        <Toaster />
        {children}
      </body>
    </html>
  );
}
