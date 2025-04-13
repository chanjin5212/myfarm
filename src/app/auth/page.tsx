'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleGoogleLogin = () => {
    // Google OAuth 2.0 인증 URL 생성
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'email profile';
    const state = Math.random().toString(36).substring(7); // CSRF 방지용 랜덤 문자열

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${state}`;

    // state를 localStorage에 저장 (콜백에서 검증용)
    localStorage.setItem('oauth_state', state);
    
    // Google 로그인 페이지로 리다이렉트
    window.location.href = authUrl;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // users 테이블에서 사용자 확인
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (userError || !userData) {
        alert('이메일 또는 비밀번호가 일치하지 않습니다.');
        return;
      }

      // 로그인 성공
      alert('로그인에 성공했습니다!');
      router.push('/');
    } catch {
      alert('로그인 중 오류가 발생했습니다.');
    }
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
    
    // 네이버 로그인 페이지로 리디렉션
    window.location.href = authUrl.toString();
  };

  const handleKakaoLogin = () => {
    // 랜덤 상태 문자열 생성
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('oauth_state', state);
    
    // 카카오 OAuth 인증 URL 생성
    const authUrl = new URL('https://kauth.kakao.com/oauth/authorize');
    authUrl.searchParams.append('client_id', process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || '');
    authUrl.searchParams.append('redirect_uri', `${window.location.origin}/auth/kakao/callback`);
    authUrl.searchParams.append('response_type', 'code');
    
    // 카카오 로그인 페이지로 리디렉션
    window.location.href = authUrl.toString();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            로그인
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              로그인
            </button>
          </div>
        </form>

        <div className="mt-6 space-y-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
              />
            </svg>
            Google로 로그인
          </button>
          
          <button
            onClick={handleNaverLogin}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.6,10l-2.8,4H7.4V6h3.3l2.8,4V10z" />
              <path fillRule="evenodd" clipRule="evenodd" d="M10,0C4.5,0,0,4.5,0,10s4.5,10,10,10s10-4.5,10-10S15.5,0,10,0z M14.4,15l-4.1-5.9H6.4v5.9h-2V4h7.6l4.1,5.9v5.2H14.4z"/>
            </svg>
            네이버로 로그인
          </button>
          
          <button
            onClick={handleKakaoLogin}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,3C7.03,3,3,6.17,3,10.03c0,2.47,1.49,4.64,3.74,5.95c-0.18,0.68-0.63,2.47-0.73,2.84 c-0.11,0.45,0.17,0.45,0.35,0.33c0.14-0.09,2.32-1.57,3.27-2.21c0.76,0.12,1.54,0.19,2.37,0.19c4.97,0,9-3.17,9-7.06 C21,6.17,16.97,3,12,3"/>
            </svg>
            카카오로 로그인
          </button>
        </div>
      </div>
    </div>
  );
} 