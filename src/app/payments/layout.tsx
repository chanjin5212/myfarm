import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

// 이 경로를 사용하는 모든 페이지에서 사용될 글꼴 정의
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "결제 처리 - 숙경팜",
  description: "결제가 진행 중입니다. 잠시만 기다려주세요.",
};

/**
 * 결제 관련 페이지를 위한 독립적인 레이아웃
 * 헤더와 푸터가 없는 독자적인 레이아웃 구조를 제공합니다.
 */
export default function PaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="결제가 진행 중입니다. 잠시만 기다려주세요." />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
} 