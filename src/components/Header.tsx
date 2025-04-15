'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkToken, logout, LOGIN_STATUS_CHANGE, User } from '@/utils/auth';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 로그인 상태 확인 함수
    const checkLoginStatus = () => {
      const { user: currentUser, isLoggedIn: loggedIn } = checkToken();
      setUser(currentUser);
      setIsLoggedIn(loggedIn);
      setIsLoading(false);
    };

    // 초기 로그인 상태 확인
    checkLoginStatus();
    
    // 로그인 상태 변경 이벤트 리스너
    const handleLoginStatusChange = () => {
      checkLoginStatus();
    };
    
    window.addEventListener(LOGIN_STATUS_CHANGE, handleLoginStatusChange);
    
    return () => {
      window.removeEventListener(LOGIN_STATUS_CHANGE, handleLoginStatusChange);
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="bg-white shadow-md py-4 px-6">
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="숙경팜 로고"
              width={150}
              height={40}
              priority
              className="h-10 w-auto"
            />
          </Link>
          
          <nav className="flex items-center space-x-6">
            <Link href="/products" className="text-gray-600 hover:text-gray-800">
              상품
            </Link>
            <Link href="/cart" className="text-gray-600 hover:text-gray-800">
              장바구니
            </Link>
            {isLoading ? (
              <div className="w-20 h-8 bg-gray-200 animate-pulse rounded"></div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt="User Profile"
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                      {user?.nickname?.charAt(0) || user?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="text-gray-800 font-medium ml-2">
                    {user.nickname || user.name || user.email.split('@')[0]}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Link
                    href="/mypage"
                    className="px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-md"
                  >
                    마이페이지
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-md"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/auth"
                className="px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-md"
              >
                로그인
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
} 