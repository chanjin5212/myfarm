'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function CompanyPage() {
  const router = useRouter();

  return (
    <div className="pt-16 pb-32 min-h-screen bg-white">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 border-b border-gray-200">
        <div className="container mx-auto py-3 px-4">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="font-bold text-lg ml-4">회사소개</h1>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="px-4 py-6">
        <div className="mb-8">
          <div className="relative w-full h-40 rounded-lg overflow-hidden mb-4">
            <div className="absolute inset-0 bg-[#e3c478] opacity-20"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <h2 className="text-2xl font-bold text-[#555]">강원찐농부</h2>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
          강원찐농부는 2025년 설립된 농산물 직거래 플랫폼으로, 신선하고 품질 좋은 농산물을 합리적인 가격에 소비자에게 직접 제공하는 것을 목표로 하고 있습니다.
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2 text-[#e3c478]">회사 슬로건</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            &ldquo;농부의 정성을 식탁까지&rdquo; 라는 슬로건 아래, 생산자와 소비자를 직접 연결하여 중간 유통과정을 줄이고 더 신선한 농산물을 더 합리적인 가격에 제공합니다.
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2 text-[#e3c478]">회사 정보</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>상호명: 강원찐농부</p>
            <p>대표: 이창덕</p>
            <p>설립일: 2025년 5월 01일</p>
            <p>사업자등록번호: 302-92-02762</p>
            <p>주소: 강원특별자치도 고성군 간성읍 어천1길 11</p>
            <p>전화: 010-5796-2201</p>
            <p>이메일: oho1114@naver.com</p>
          </div>
        </div>
      </div>

      {/* 모바일 하단 내비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
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