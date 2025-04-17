'use client';

import React, { useState, FormEvent, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { Spinner } from '@/components/ui/CommonStyles';

export default function MobileResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="top-center" />
      <Suspense fallback={
        <div className="flex justify-center items-center min-h-screen">
          <Spinner size="lg" />
        </div>
      }>
        <MobileResetPasswordContent />
      </Suspense>
    </div>
  );
}

function MobileResetPasswordContent() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: 아이디/이메일 입력, 2: 인증번호 확인, 3: 비밀번호 변경
  const [isLoading, setIsLoading] = useState(false);

  // 인증번호 요청 (1단계)
  const handleRequestCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!loginId || !email) {
      toast.error('로그인 아이디와 이메일은 필수입니다.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login_id: loginId,
          email: email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('이메일로 인증번호가 발송되었습니다. 인증번호를 입력해주세요.');
        setStep(2); // 인증번호 확인 단계로 이동
      } else {
        toast.error(data.error || '비밀번호 재설정 이메일을 보내는 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('비밀번호 재설정 요청 오류:', error);
      toast.error('서버와 통신 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 인증번호 확인 (2단계)
  const handleVerifyCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!verificationCode) {
      toast.error('인증번호를 입력해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/verify-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('인증이 완료되었습니다. 새 비밀번호를 설정해주세요.');
        setStep(3); // 비밀번호 변경 단계로 이동
      } else {
        toast.error(data.error || '인증번호 확인 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('인증번호 확인 오류:', error);
      toast.error('서버와 통신 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 비밀번호 변경 (3단계)
  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!newPassword || !confirmPassword) {
      toast.error('새 비밀번호와 비밀번호 확인을 모두 입력해주세요.');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      setIsLoading(false);
      return;
    }

    // 비밀번호 유효성 검사
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,16}$/;
    if (!passwordRegex.test(newPassword)) {
      toast.error('비밀번호는 8~16자의 영문 대/소문자, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: verificationCode,
          password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('비밀번호가 성공적으로 변경되었습니다.');
        // 로그인 페이지로 즉시 리다이렉션 (성공 파라미터 추가)
        router.push('/m/auth?success=password_reset');
      } else {
        toast.error(data.error || '비밀번호 변경 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      toast.error('서버와 통신 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 이전 단계로 돌아가기
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.push('/m/auth');
    }
  };

  return (
    <>
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 shadow-sm fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center">
          <button
            onClick={handleBack}
            className="p-1 mr-2"
            aria-label="뒤로 가기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">비밀번호 찾기</h1>
        </div>
      </div>
      
      {/* 단계 표시 */}
      <div className="pt-16 px-4">
        <div className="flex items-center justify-center mt-4 mb-4">
          <div className={`h-2 w-8 rounded-full mx-1 ${step >= 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <div className={`h-2 w-8 rounded-full mx-1 ${step >= 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <div className={`h-2 w-8 rounded-full mx-1 ${step >= 3 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-5">
          {/* 단계 1: 아이디/이메일 입력 */}
          {step === 1 && (
            <>
              <p className="text-center text-gray-600 mb-6">
                가입 시 등록한 로그인 아이디와 이메일을 입력하세요
              </p>
              
              <form onSubmit={handleRequestCode} className="space-y-5">
                <div>
                  <label htmlFor="loginId" className="block text-sm font-medium text-gray-700 mb-1">
                    로그인 아이디
                  </label>
                  <input
                    type="text"
                    id="loginId"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="아이디를 입력하세요"
                    required
                  />
                </div>
                
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
                    placeholder="가입 시 등록한 이메일을 입력하세요"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex justify-center items-center"
                >
                  {isLoading ? <Spinner size="sm" /> : '인증번호 받기'}
                </button>
                
                <div className="flex items-center justify-between mt-4">
                  <button 
                    type="button" 
                    onClick={() => router.push('/m/auth')}
                    className="text-sm text-green-600 hover:text-green-500"
                  >
                    로그인으로 돌아가기
                  </button>
                  <button 
                    type="button"
                    onClick={() => router.push('/m/auth/find-id')}
                    className="text-sm text-green-600 hover:text-green-500"
                  >
                    아이디 찾기
                  </button>
                </div>
              </form>
            </>
          )}
          
          {/* 단계 2: 인증번호 확인 */}
          {step === 2 && (
            <>
              <p className="text-center text-gray-600 mb-6">
                이메일로 전송된 인증번호를 입력하세요
              </p>
              
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div>
                  <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                    인증번호
                  </label>
                  <input
                    type="text"
                    id="verificationCode"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="인증번호 6자리를 입력하세요"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex justify-center items-center"
                >
                  {isLoading ? <Spinner size="sm" /> : '인증번호 확인'}
                </button>
              </form>
            </>
          )}
          
          {/* 단계 3: 비밀번호 변경 */}
          {step === 3 && (
            <>
              <p className="text-center text-gray-600 mb-6">
                새로운 비밀번호를 설정하세요
              </p>
              
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="새 비밀번호를 입력하세요"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    8~16자의 영문 대/소문자, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다.
                  </p>
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호 확인
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="비밀번호를 다시 입력하세요"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex justify-center items-center"
                >
                  {isLoading ? <Spinner size="sm" /> : '비밀번호 변경'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
} 