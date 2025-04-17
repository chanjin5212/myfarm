import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from '@/components/Header';
import { Providers } from "./providers";
import { AuthProvider } from '@/components/AuthProvider';

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "MyFarm - 농산물 직거래",
  description: "신선한 농산물을 직거래로 만나보세요",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <style 
          dangerouslySetInnerHTML={{ 
            __html: `
              /* 모바일 페이지 스타일링 */
              body.mobile-layout header:not(.bg-white) {
                display: none !important;
              }
            ` 
          }} 
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans bg-gray-50`}
        suppressHydrationWarning={true}
      >
        <Providers>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow">
                {children}
              </main>
            </div>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
