'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { triggerLoginEvent } from '@/utils/auth';
import { Toaster } from 'react-hot-toast';

// URL 파라미터에서 성공 메시지를 가져오는 컴포넌트
function SuccessMessageHandler({ setSuccessMessage }: { setSuccessMessage: (message: string | null) => void }) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'password-reset') {
      setSuccessMessage('비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.');
    }
  }, [searchParams, setSuccessMessage]);
  
  return null;
}

export default function MobileAuthPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      // 서버에 비밀번호 검증 요청
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login_id: loginId,
          password: password
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setError(data.error || '아이디 또는 비밀번호가 일치하지 않습니다.');
        return;
      }

      // 로그인 성공 - 서버에서 반환한 사용자 정보 사용
      const token = {
        user: data.user, // 서버에서 받은 사용자 정보
        expiresAt: Date.now() + 3600000 // 1시간 후 만료
      };
      
      localStorage.setItem('token', JSON.stringify(token));
      
      // 로그인 상태 변경 이벤트 발생
      triggerLoginEvent();
      
      router.push('/m');
    } catch (error) {
      console.error('로그인 오류:', error);
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNaverLogin = () => {
    // 랜덤 상태 문자열 생성
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('oauth_state', state);
    
    // 네이버 OAuth 인증 URL 생성
    const authUrl = new URL('https://nid.naver.com/oauth2.0/authorize');
    authUrl.searchParams.append('client_id', process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || '');
    authUrl.searchParams.append('redirect_uri', `${window.location.origin}/m/auth/naver/callback`);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state);
    // 전화번호 정보 요청 추가
    authUrl.searchParams.append('auth_type', 'reprompt');
    // 전화번호 정보에 대한 동의 요청 추가
    authUrl.searchParams.append('scope', 'name email phone');
    
    // 네이버 로그인 페이지로 리디렉션
    window.location.href = authUrl.toString();
  };

  const handleKakaoLogin = () => {
    // Generate a random state string for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('kakaoLoginState', state);
    
    // Construct the OAuth URL
    const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/m/auth/kakao/callback`);
    const scope = encodeURIComponent('profile_nickname account_email');
    
    // Redirect to Kakao login
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=${state}&scope=${scope}`;
    window.location.href = kakaoAuthUrl;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="top-center" />
      
      {/* Suspense로 URL 파라미터 처리 */}
      <Suspense fallback={null}>
        <SuccessMessageHandler setSuccessMessage={setSuccessMessage} />
      </Suspense>
      
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center">
          <h1 className="text-xl font-bold">로그인</h1>
        </div>
      </div>
      
      <div className="pt-20 px-4">
        <div className="bg-white rounded-lg shadow p-5">
          {/* 성공 메시지 */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
              {successMessage}
            </div>
          )}
          
          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
              {error}
            </div>
          )}
          
          {/* 로그인 폼 */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="loginId" className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
              <input
                id="loginId"
                name="loginId"
                type="text"
                required
                placeholder="아이디를 입력하세요"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-3 rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          
          <div className="flex justify-between text-sm mt-4">
            <Link href="/m/auth/find-id" className="text-green-600">
              아이디 찾기
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/m/auth/reset-password" className="text-green-600">
              비밀번호 찾기
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/m/auth/register" className="text-green-600">
              회원가입
            </Link>
          </div>
          
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">간편 로그인</span>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center space-x-6">
              <button
                type="button"
                onClick={handleNaverLogin}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-[#03C75A] text-white"
                disabled={isLoading}
              >
                <span className="font-bold text-base">N</span>
              </button>
              <button
                type="button"
                onClick={handleKakaoLogin}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-[#FEE500] text-black"
                disabled={isLoading}
              >
                <span className="font-bold text-base">K</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 