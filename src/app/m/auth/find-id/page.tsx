'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { Spinner } from '@/components/ui/CommonStyles';

enum Step {
  FORM = 'form',
  VERIFICATION = 'verification',
  RESULT = 'result'
}

export default function MobileFindIdPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(Step.FORM);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [result, setResult] = useState<{ login_id: string; created_at: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/users/find-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '아이디 찾기 중 오류가 발생했습니다.');
      }
      
      if (!data.success) {
        toast.error('일치하는 회원정보를 찾을 수 없습니다.');
        return;
      }
      
      // 인증 단계로 전환
      toast.success('이메일로 인증 코드가 발송되었습니다.');
      setStep(Step.VERIFICATION);
    } catch (error: any) {
      console.error('아이디 찾기 오류:', error);
      toast.error(error.message || '아이디 찾기 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/users/verify-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '인증 코드 확인 중 오류가 발생했습니다.');
      }
      
      if (!data.success) {
        toast.error('인증 코드가 일치하지 않습니다.');
        return;
      }
      
      // 결과 설정 및 결과 단계로 전환
      setResult({
        login_id: data.login_id || data.loginId || '',
        created_at: data.created_at || data.createdAt || ''
      });
      setStep(Step.RESULT);
    } catch (error: any) {
      console.error('인증 코드 확인 오류:', error);
      toast.error(error.message || '인증 코드 확인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (isResending) return;
    
    setIsResending(true);
    
    try {
      const response = await fetch('/api/users/find-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        toast.error('인증 코드 재발송에 실패했습니다.');
        return;
      }
      
      toast.success('인증 코드가 재발송되었습니다.');
    } catch (error: any) {
      console.error('인증 코드 재발송 오류:', error);
      toast.error(error.message || '인증 코드 재발송 중 오류가 발생했습니다.');
    } finally {
      setIsResending(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '날짜 정보 없음';
    
    try {
      const date = new Date(dateString);
      // 유효하지 않은 날짜 확인
      if (isNaN(date.getTime())) {
        return '날짜 정보 없음';
      }
      
      return new Intl.DateTimeFormat('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).format(date);
    } catch (error) {
      console.error('날짜 형식 변환 오류:', error);
      return '날짜 정보 없음';
    }
  };

  const handleGoBack = () => {
    if (step === Step.VERIFICATION) {
      setStep(Step.FORM);
    } else {
      router.push('/m/auth');
    }
  };

  const maskId = (id: string) => {
    // 마스킹 제거하고 아이디 전체 반환
    return id;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="top-center" />
      
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 shadow-sm fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center">
          <button
            onClick={handleGoBack}
            className="p-1 mr-2"
            aria-label="뒤로 가기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">아이디 찾기</h1>
        </div>
      </div>
      
      <div className="pt-16 px-4">
        {step === Step.FORM && (
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-center text-gray-600 mb-6">
              가입 시 등록한 이메일과 이름을 입력하시면<br />인증 코드를 보내드립니다.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="가입 시 등록한 이메일"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="가입 시 등록한 이름"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex justify-center items-center"
              >
                {isLoading ? <Spinner size="sm" /> : '인증 메일 받기'}
              </button>
            </form>
          </div>
        )}

        {step === Step.VERIFICATION && (
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-center text-gray-600 mb-6">
              {email}로 인증 코드가 발송되었습니다.<br />메일에 포함된 인증 코드를 입력해주세요.
            </p>
            
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                  인증 코드
                </label>
                <input
                  type="text"
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="인증 코드 6자리"
                  required
                  maxLength={6}
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex justify-center items-center"
              >
                {isLoading ? <Spinner size="sm" /> : '확인'}
              </button>
              
              <div className="flex justify-center mt-3">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  {isResending ? '재발송 중...' : '인증코드 재발송'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {step === Step.RESULT && result && (
          <div className="bg-white rounded-lg shadow p-5">
            <div className="text-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-medium">아이디 찾기 결과</h2>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-500 mb-2">아이디</p>
              <p className="text-lg font-bold">{maskId(result.login_id)}</p>
              {result.created_at && (
                <p className="text-xs text-gray-500 mt-1">가입일: {formatDate(result.created_at)}</p>
              )}
            </div>
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => router.push('/m/auth')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-md font-medium"
              >
                로그인하기
              </button>
              <button
                onClick={() => router.push('/m/auth/reset-password')}
                className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-md font-medium"
              >
                비밀번호 찾기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 