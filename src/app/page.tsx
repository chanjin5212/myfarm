'use client';

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen py-10">
      <div className="container mx-auto px-4">
        {/* 메인 배너 */}
        <div className="flex flex-col items-center text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            신선한 <span className="text-green-600">제철 농산물</span>을 만나보세요
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl">
            강원찐농부에서 정성껏 키운 계절 별 신선한 농산물을 집에서 편하게 받아보세요.
          </p>
          <Link
            href="/products"
            className="px-8 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors text-lg font-medium"
          >
            지금 쇼핑하기
          </Link>
        </div>

        {/* 특징 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="bg-green-100 w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">100% 유기농</h3>
            <p className="text-gray-600">
              화학 농약을 사용하지 않고 정성껏 재배한 건강한 먹거리를 제공합니다.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="bg-green-100 w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">신선 배송</h3>
            <p className="text-gray-600">
              주문 후 24시간 이내에 수확하여 가장 신선한 상태로 배송합니다.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="bg-green-100 w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">정직한 가격</h3>
            <p className="text-gray-600">
              중간 유통 과정 없이 농장에서 직접 배송하여 합리적인 가격을 제공합니다.
            </p>
          </div>
        </div>

        {/* 추천 상품 섹션 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">이달의 제철 상품</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 추후 실제 상품으로 대체 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-4">
                <h3 className="font-semibold mb-2">신선한 딸기</h3>
                <p className="text-gray-600 mb-2">달콤한 제철 딸기를 만나보세요</p>
                <p className="font-bold text-green-600">12,000원</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-4">
                <h3 className="font-semibold mb-2">유기농 당근</h3>
                <p className="text-gray-600 mb-2">달콤하고 아삭한 유기농 당근</p>
                <p className="font-bold text-green-600">8,000원</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-4">
                <h3 className="font-semibold mb-2">신선한 시금치</h3>
                <p className="text-gray-600 mb-2">영양 가득한 유기농 시금치</p>
                <p className="font-bold text-green-600">5,500원</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-4">
                <h3 className="font-semibold mb-2">신선한 블루베리</h3>
                <p className="text-gray-600 mb-2">항산화 성분이 풍부한 블루베리</p>
                <p className="font-bold text-green-600">15,000원</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* 구독 섹션 */}
        <div className="bg-green-50 p-8 rounded-lg text-center">
          <h2 className="text-2xl font-bold mb-4">농산물 소식 구독하기</h2>
          <p className="text-lg text-gray-600 mb-6 max-w-xl mx-auto">
            계절별 최고의 농산물 정보와 특별 할인 소식을 이메일로 받아보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="이메일 주소"
              className="flex-grow px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors">
              구독하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
