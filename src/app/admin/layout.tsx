'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { Button, Spinner } from '@/components/ui/CommonStyles';

// 하단 네비게이션 아이템
const navItems = [
  {
    name: '대시보드',
    href: '/admin/dashboard',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    name: '상품',
    href: '/admin/products',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
  },
  {
    name: '주문',
    href: '/admin/orders',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
  {
    name: '회원',
    href: '/admin/users',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
  {
    name: '문의관리',
    href: '/admin/inquiries',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    ),
  },
  {
    name: '리뷰관리',
    href: '/admin/reviews',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
    ),
  },
  {
    name: '통계',
    href: '/admin/statistics',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // 토큰 확인 및 인증 상태 체크
    const checkAuth = async () => {
      try {
        const adminToken = localStorage.getItem('adminToken');
        
        if (!adminToken) {
          // 로그인 페이지가 아니면 로그인 페이지로 리다이렉트
          if (pathname !== '/admin/login') {
            router.push('/admin/login');
            toast.error('관리자 로그인이 필요합니다');
          }
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        
        // 토큰 유효성 검사 API 호출
        const response = await fetch('/api/admin/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error('인증 실패');
        }
        
        setIsAuthenticated(true);
        
        // 이미 로그인되어 있는데 로그인 페이지로 접근하면 대시보드로 리다이렉트
        if (pathname === '/admin/login') {
          router.push('/admin/dashboard');
        }
      } catch (error) {
        console.error('인증 오류:', error);
        localStorage.removeItem('adminToken');
        setIsAuthenticated(false);
        
        if (pathname !== '/admin/login') {
          router.push('/admin/login');
          toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  // 메뉴가 열렸을 때 스크롤 방지
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  // 로딩 상태 표시
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  // 로그인 페이지는 레이아웃 없이 표시
  if (pathname === '/admin/login') {
    return (
      <>
        <Toaster position="top-center" />
        {children}
      </>
    );
  }

  const pageTitle = pathname.includes('/dashboard') ? '대시보드' :
                    pathname.includes('/products') ? '상품 관리' :
                    pathname.includes('/orders') ? '주문 관리' :
                    pathname.includes('/users') ? '회원 관리' :
                    pathname.includes('/inquiries') ? '문의관리' :
                    pathname.includes('/reviews') ? '리뷰관리' :
                    pathname.includes('/statistics') ? '통계' : '관리자';

  return (
    <>
      <Toaster position="top-center" />

      {/* 인증된 경우에만 관리자 레이아웃 표시 */}
      {isAuthenticated && (
        <div className="min-h-screen bg-gray-50">
          {/* 관리자 헤더 */}
          <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-10">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center">
                <button 
                  onClick={() => setMenuOpen(true)}
                  className="mr-3 text-gray-600"
                  aria-label="메뉴 열기"
                >
                  <svg 
                    className="w-6 h-6" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
                <h1 className="text-lg font-bold">숙경팜 관리자</h1>
              </div>
              <div className="flex items-center">
                <span className="text-gray-500 mr-2">{pageTitle}</span>
                <Button
                  variant="link"
                  onClick={() => {
                    localStorage.removeItem('adminToken');
                    router.push('/admin/login');
                    toast.success('로그아웃 되었습니다');
                  }}
                >
                  로그아웃
                </Button>
              </div>
            </div>
          </header>

          {/* 슬라이드 메뉴 */}
          <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div 
              className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-bold">메뉴</h2>
                <button 
                  onClick={() => setMenuOpen(false)}
                  className="text-gray-500"
                  aria-label="메뉴 닫기"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto h-full pb-20">
                <div className="p-4">
                  <nav className="space-y-1">
                    {navItems.map((item) => (
                      <button
                        key={item.href}
                        onClick={() => {
                          router.push(item.href);
                          setMenuOpen(false);
                        }}
                        className={`flex items-center p-2 w-full rounded-md ${
                          pathname.startsWith(item.href) ? 'bg-green-50 text-green-600' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="mr-3">{item.icon}</span>
                        <span>{item.name}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <main className="pt-14 pb-16">
            {children}
          </main>

          {/* 모바일용 하단 네비게이션 바 */}
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
            <div className="grid grid-cols-4 h-16">
              {navItems.slice(0, 4).map((item) => (
                <button 
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`flex flex-col items-center justify-center ${
                    pathname.startsWith(item.href) ? 'text-green-600' : 'text-gray-500'
                  }`}
                >
                  {item.icon}
                  <span className="text-xs mt-1">{item.name}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
    </>
  );
} 