import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import { headers } from 'next/headers';

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "강원찐농부",
  description: "강원찐농부",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isAdminPath = pathname.startsWith('/admin');

  return (
    <html lang="ko" className="light">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        {!isAdminPath && <Header />}
        <Toaster position="top-center" />
        {children}
      </body>
    </html>
  );
}
