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
  title: '강원찐농부 - 강원도 농부가 직접 재배하고 판매하는 감자, 옥수수, 절임배추 쇼핑몰',
  description: '강원도 농부가 직접 재배한 신선한 감자, 옥수수, 절임배추를 산지직송으로 판매하는 강원찐농부 공식 쇼핑몰입니다.',
  openGraph: {
    type: 'website',
    title: '강원찐농부 - 강원도 농부가 직접 재배하고 판매하는 감자, 옥수수, 절임배추 쇼핑몰',
    description: '강원도 농부가 직접 재배한 신선한 감자, 옥수수, 절임배추를 산지직송으로 판매하는 강원찐농부 공식 쇼핑몰입니다.',
    url: 'https://gangwonnongbu.co.kr', // 실제 도메인으로 교체
    images: [
      {
        url: 'https://gangwonnongbu.co.kr/images/logo.png', // 대표 이미지 경로로 교체
        width: 1200,
        height: 630,
        alt: '강원찐농부 대표 이미지',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: '강원찐농부 - 강원도 농부가 직접 재배하고 판매하는 감자, 옥수수, 절임배추 쇼핑몰',
    description: '강원도 농부가 직접 재배한 신선한 감자, 옥수수, 절임배추를 산지직송으로 판매하는 강원찐농부 공식 쇼핑몰입니다.',
    images: ['https://gangwonnongbu.co.kr/images/logo.png'], // 대표 이미지 경로로 교체
  },
  other: {
    'naver-site-verification': '58806f892aab82c55d33e632800042ef33f68eca',
  },
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
      <head>
        <meta name="naver-site-verification" content="58806f892aab82c55d33e632800042ef33f68eca" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        {!isAdminPath && <Header />}
        <Toaster position="top-center" />
        {children}
      </body>
    </html>
  );
}
