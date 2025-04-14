'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function FindIdPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationStep, setVerificationStep] = useState<'form' | 'verification' | 'result'>('form');
  const [userVerificationCode, setUserVerificationCode] = useState('');
  const [foundId, setFoundId] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const handleFindId = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    
    try {
      // 서버에 사용자 정보 확인 요청
      const response = await fetch('/api/users/find-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setErrorMessage(data.error || '일치하는 회원 정보가 없습니다.');
        return;
      }

      // 인증 단계로 전환
      setVerificationStep('verification');
    } catch (error) {
      console.error('아이디 찾기 오류:', error);
      setErrorMessage('아이디 찾기 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // 인증 코드 검증
      const response = await fetch('/api/users/verify-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: userVerificationCode
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setErrorMessage(data.error || '인증 코드가 유효하지 않습니다.');
        return;
      }
      
      // 응답에서 로그인 아이디 가져오기
      setFoundId(data.loginId);
      setVerificationStep('result');
    } catch (error) {
      console.error('인증 코드 검증 오류:', error);
      setErrorMessage('인증 코드 검증 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (isResending) return;
    
    setIsResending(true);
    setErrorMessage(null);
    
    try {
      const response = await fetch('/api/users/find-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setErrorMessage(data.error || '인증 코드 재발송에 실패했습니다.');
        return;
      }

      alert('인증 코드가 재발송되었습니다. 이메일을 확인해주세요.');
    } catch (error) {
      console.error('인증 코드 재발송 오류:', error);
      setErrorMessage('인증 코드 재발송 중 오류가 발생했습니다.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            아이디 찾기
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            회원가입 시 입력한 이름과 이메일로 아이디를 찾을 수 있습니다.
          </p>
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
        
        {verificationStep === 'form' && (
          <form className="mt-8 space-y-6" onSubmit={handleFindId}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  이름
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm mt-1"
                  placeholder="이름을 입력하세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  이메일
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm mt-1"
                  placeholder="이메일을 입력하세요"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
                disabled={isLoading}
              >
                {isLoading ? '처리 중...' : '인증 메일 받기'}
              </button>
            </div>
          </form>
        )}
        
        {verificationStep === 'verification' && (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyCode}>
            <div>
              <p className="text-sm text-gray-700 mb-4">
                {email}로 인증 코드가 발송되었습니다. 메일에 포함된 인증 코드를 입력해주세요.
              </p>
              <div className="rounded-md shadow-sm">
                <div>
                  <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                    인증 코드
                  </label>
                  <input
                    id="verificationCode"
                    name="verificationCode"
                    type="text"
                    required
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm mt-1"
                    placeholder="인증 코드 6자리"
                    value={userVerificationCode}
                    onChange={(e) => setUserVerificationCode(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleResendVerification}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                disabled={isResending}
              >
                {isResending ? '재발송 중...' : '인증번호 재발송'}
              </button>
            </div>

            <div>
              <button
                type="submit"
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
                disabled={isLoading}
              >
                {isLoading ? '확인 중...' : '확인'}
              </button>
            </div>
          </form>
        )}
        
        {verificationStep === 'result' && foundId && (
          <div className="mt-8 space-y-6">
            <div className="bg-gray-50 p-6 rounded-md border border-gray-200">
              <p className="text-gray-700 mb-2">
                회원님의 아이디는 다음과 같습니다:
              </p>
              <p className="text-lg font-bold text-blue-700 py-2">{foundId}</p>
            </div>
            
            <div className="flex space-x-4">
              <Link href="/auth" className="w-full">
                <button
                  type="button"
                  className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  로그인하기
                </button>
              </Link>
              <Link href="/auth/reset-password" className="w-full">
                <button
                  type="button"
                  className="w-full py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  비밀번호 찾기
                </button>
              </Link>
            </div>
          </div>
        )}
        
        <div className="mt-4 text-center">
          <Link href="/auth" className="text-sm text-blue-600 hover:text-blue-800">
            로그인 페이지로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
} 