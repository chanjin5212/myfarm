'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LOGIN_STATUS_CHANGE } from '@/components/Header';
import { Button, Input } from '@/components/ui/CommonStyles';

export default function AuthPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
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
        setErrorMessage(data.error || '아이디 또는 비밀번호가 일치하지 않습니다.');
        return;
      }

      // 로그인 성공 - 서버에서 반환한 사용자 정보 사용
      const token = {
        user: data.user, // 서버에서 받은 사용자 정보
        expiresAt: Date.now() + 3600000 // 1시간 후 만료
      };
      localStorage.setItem('token', JSON.stringify(token));
      
      // 사용자 ID 저장 (API 호출을 위한 간편한 방법)
      localStorage.setItem('userId', data.user.id);
      
      // 로그인 상태 변경 이벤트 발생
      window.dispatchEvent(new Event(LOGIN_STATUS_CHANGE));
      
      alert('로그인에 성공했습니다!');
      router.push('/');
    } catch (error) {
      console.error('로그인 오류:', error);
      setErrorMessage('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 구글 로그인 함수는 주석 처리되었지만 나중에 필요할 수 있으므로 보존
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleGoogleLogin = () => {
    // Generate a random state
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('oauth_state', state);
    
    // Create the Google OAuth URL
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'email profile';
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${googleClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${state}` +
      `&access_type=offline` +
      `&prompt=consent`;
    
    // Redirect to Google login
    window.location.href = googleAuthUrl;
  };

  const handleNaverLogin = () => {
    // 랜덤 상태 문자열 생성
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('oauth_state', state);
    
    // 네이버 OAuth 인증 URL 생성
    const authUrl = new URL('https://nid.naver.com/oauth2.0/authorize');
    authUrl.searchParams.append('client_id', process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || '');
    authUrl.searchParams.append('redirect_uri', `${window.location.origin}/auth/naver/callback`);
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
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/kakao/callback`);
    const scope = encodeURIComponent('profile_nickname account_email');
    
    // Redirect to Kakao login
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=${state}&scope=${scope}`;
    window.location.href = kakaoAuthUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            로그인
          </h2>
        </div>
        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{errorMessage}</h3>
              </div>
            </div>
          </div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <Input
              label="아이디"
              id="loginId"
              name="loginId"
              type="text"
              required
              placeholder="아이디"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              disabled={isLoading}
            />
            <Input
              label="비밀번호"
              id="password"
              name="password"
              type="password"
              required
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isLoading}
              className="transition-all duration-200 hover:shadow-md active:scale-[0.98] transform"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </div>
          
          <div className="flex justify-between text-sm mt-2">
            <Link href="/auth/find-id" className="text-green-600 hover:text-green-800">
              아이디 찾기
            </Link>
            <span className="text-gray-500">|</span>
            <Link href="/auth/reset-password" className="text-green-600 hover:text-green-800">
              비밀번호 찾기
            </Link>
            <span className="text-gray-500">|</span>
            <Link href="/auth/register" className="text-green-600 hover:text-green-800">
              회원가입
            </Link>
          </div>
        </form>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">간편 로그인</span>
            </div>
          </div>
          
          <div className="mt-6 flex justify-center gap-4">
            <button
              type="button"
              onClick={handleNaverLogin}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-[#03C75A] text-white border-0 shadow-md transition-all duration-200 transform hover:scale-110 hover:shadow-lg hover:-translate-y-1 active:scale-95 active:shadow-md focus:outline-none cursor-pointer"
              disabled={isLoading}
            >
              <span className="font-bold text-lg">N</span>
            </button>
            <button
              type="button"
              onClick={handleKakaoLogin}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-[#FEE500] text-black border-0 shadow-md transition-all duration-200 transform hover:scale-110 hover:shadow-lg hover:-translate-y-1 active:scale-95 active:shadow-md focus:outline-none cursor-pointer"
              disabled={isLoading}
            >
              <span className="font-bold text-lg">K</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 