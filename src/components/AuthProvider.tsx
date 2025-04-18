'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 인증 컨텍스트 타입 정의
interface AuthContextType {
  isLoggedIn: boolean;
  userId: string | null;
  login: (userId: string, token: string) => void;
  logout: () => void;
  checkAuth: () => boolean;
}

// 인증 컨텍스트 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 인증 컨텍스트 사용을 위한 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내에서 사용해야 합니다');
  }
  return context;
};

// 인증 제공자 컴포넌트
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  // 초기 인증 상태 확인
  useEffect(() => {
    checkAuth();
  }, []);

  // 로그인 상태 확인
  const checkAuth = (): boolean => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUserId = localStorage.getItem('userId');
      
      if (storedToken && storedUserId) {
        setIsLoggedIn(true);
        setUserId(storedUserId);
        return true;
      } else {
        setIsLoggedIn(false);
        setUserId(null);
        return false;
      }
    } catch (error) {
      console.error('인증 확인 중 오류 발생:', error);
      setIsLoggedIn(false);
      setUserId(null);
      return false;
    }
  };

  // 로그인 처리
  const login = (newUserId: string, token: string) => {
    try {
      // 로컬 스토리지에 저장
      localStorage.setItem('token', token);
      localStorage.setItem('userId', newUserId);
      
      // 상태 업데이트
      setIsLoggedIn(true);
      setUserId(newUserId);
      
      console.log('로그인 성공:', newUserId);
    } catch (error) {
      console.error('로그인 중 오류 발생:', error);
    }
  };

  // 로그아웃 처리
  const logout = () => {
    try {
      // 로컬 스토리지에서 제거
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      
      // 상태 업데이트
      setIsLoggedIn(false);
      setUserId(null);
      
      console.log('로그아웃 완료');
      
      // 홈으로 리다이렉트
      router.push('/');
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
    }
  };

  // 컨텍스트 값
  const value: AuthContextType = {
    isLoggedIn,
    userId,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 