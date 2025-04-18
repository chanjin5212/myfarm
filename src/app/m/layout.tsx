'use client';

import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import '../globals.css';
import { Spinner } from '@/components/ui/CommonStyles';

// 레이아웃 헤더를 숨길 경로 목록
const HIDE_HEADER_PATHS = [
  '/m/auth',
  '/m/auth/register',
  '/m/auth/find-id',
  '/m/auth/reset-password',
  '/m/mypage',
  '/m/mypage/edit-profile',
  '/m/mypage/change-password',
  '/m/mypage/address-book',  
];

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  
  // 헤더 숨김 여부 확인
  const shouldHideHeader = HIDE_HEADER_PATHS.some(path => 
    pathname === path || 
    pathname?.startsWith('/m/products/') ||  // 상품 상세 페이지
    pathname?.startsWith('/m/mypage/address-book/')  // 배송지 관리 관련 모든 페이지
  );
  
  // 모바일 레이아웃 설정
  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window !== 'undefined') {
      setIsMounted(true);
      
      // body에 모바일 클래스 추가
      document.body.classList.add('mobile-layout');
      
      // body 배경색을 하얀색으로 설정
      document.body.style.backgroundColor = 'white';
      
      // 다크 모드 사용자에게도 라이트 모드로 강제 적용
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      
      return () => {
        // 클린업: 모바일 클래스 제거
        document.body.classList.remove('mobile-layout');
        // body 배경색 초기화
        document.body.style.backgroundColor = '';
      };
    }
  }, []);
  
  if (!isMounted) {
    return null;
  }
  
  return (
    <div className="mobile-layout bg-white text-black min-h-screen" suppressHydrationWarning={true}>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      
      {/* 모바일 헤더 - 상품 상세 페이지에서는 숨김 */}
      {!shouldHideHeader && (
        <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50 border-b border-gray-200" suppressHydrationWarning={true}>
          <div className="container mx-auto py-3 px-4">
            <div className="flex items-center justify-between">
              <Link href="/m" className="font-bold text-xl text-[#e3c478]">숙경팜</Link>
              <div className="flex space-x-3">
                <Link href="/m/search" aria-label="검색" className="text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </Link>
                <Link href="/m/cart" aria-label="장바구니" className="text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                </Link>
                <Link href="/m/mypage" aria-label="마이페이지" className="text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </header>
      )}
      
      {/* 메인 콘텐츠 */}
      <div className={`bg-white text-black min-h-screen ${shouldHideHeader ? '' : 'pt-14'}`}>
        <Suspense fallback={
          <div className="flex justify-center items-center min-h-[60vh] bg-white">
            <Spinner size="lg" />
          </div>
        }>
          {children}
        </Suspense>
      </div>
      
      {/* 모바일 하단 내비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] border-t border-gray-200 z-20" suppressHydrationWarning={true}>
        <div className="flex justify-around items-center h-14">
          <Link href="/m" className="flex flex-col items-center justify-center text-gray-600 hover:text-green-600 flex-1 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className="text-xs">홈</span>
          </Link>
          <Link href="/m/products" className="flex flex-col items-center justify-center text-gray-600 hover:text-green-600 flex-1 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
            </svg>
            <span className="text-xs">상품</span>
          </Link>
          <Link href="/m/cart" className="flex flex-col items-center justify-center text-gray-600 hover:text-green-600 flex-1 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <span className="text-xs">장바구니</span>
          </Link>
          <Link href="/m/mypage" className="flex flex-col items-center justify-center text-gray-600 hover:text-green-600 flex-1 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="text-xs">내정보</span>
          </Link>
        </div>
      </nav>
    </div>
  );
} 