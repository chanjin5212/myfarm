'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@/components/ui/CommonStyles';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: 아이디/이메일 입력, 2: 인증번호 확인, 3: 비밀번호 변경
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 인증번호 요청 (1단계)
  const handleRequestCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    if (!loginId || !email) {
      setError('로그인 아이디와 이메일은 필수입니다.');
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
        setMessage('이메일로 인증번호가 발송되었습니다. 인증번호를 입력해주세요.');
        setStep(2); // 인증번호 확인 단계로 이동
      } else {
        setError(data.error || '비밀번호 재설정 이메일을 보내는 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('비밀번호 재설정 요청 오류:', error);
      setError('서버와 통신 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 인증번호 확인 (2단계)
  const handleVerifyCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    if (!verificationCode) {
      setError('인증번호를 입력해주세요.');
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
        setMessage('인증이 완료되었습니다. 새 비밀번호를 설정해주세요.');
        setStep(3); // 비밀번호 변경 단계로 이동
      } else {
        setError(data.error || '인증번호 확인 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('인증번호 확인 오류:', error);
      setError('서버와 통신 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 비밀번호 변경 (3단계)
  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    if (!newPassword || !confirmPassword) {
      setError('새 비밀번호와 비밀번호 확인을 모두 입력해주세요.');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      setIsLoading(false);
      return;
    }

    // 비밀번호 유효성 검사
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?&quot;:{}|&lt;&gt;])[A-Za-z\d!@#$%^&*(),.?&quot;:{}|&lt;&gt;]{8,16}$/;
    if (!passwordRegex.test(newPassword)) {
      setError('비밀번호는 8~16자의 영문 대/소문자, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다.');
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
        // 성공 시 즉시 로그인 페이지로 리다이렉션하고 쿼리 파라미터로 성공 메시지 전달
        router.push('/auth?success=password_reset');
      } else {
        setError(data.error || '비밀번호 변경 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      setError('서버와 통신 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 이전 단계로 돌아가기
  const handleBack = () => {
    setError(null);
    setMessage(null);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            비밀번호 찾기
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 1 && '가입 시 등록한 로그인 아이디와 이메일을 입력하세요'}
            {step === 2 && '이메일로 발송된 인증번호를 입력하세요'}
            {step === 3 && '새로운 비밀번호를 설정하세요'}
          </p>
          
          {/* 단계 표시 */}
          <div className="flex items-center justify-center mt-4">
            <div className={`h-2 w-8 rounded-full mx-1 ${step >= 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <div className={`h-2 w-8 rounded-full mx-1 ${step >= 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <div className={`h-2 w-8 rounded-full mx-1 ${step >= 3 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          </div>
        </div>
        
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}
        
        {message && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">{message}</h3>
              </div>
            </div>
          </div>
        )}
        
        {/* 단계 1: 이메일 & 아이디 입력 */}
        {step === 1 && (
          <form className="mt-8 space-y-6" onSubmit={handleRequestCode}>
            <div className="space-y-4">
              <Input
                label="로그인 아이디"
                id="loginId"
                name="loginId"
                type="text"
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                disabled={isLoading}
                placeholder="아이디를 입력하세요"
                fullWidth
              />
              
              <Input
                label="이메일"
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="가입 시 등록한 이메일을 입력하세요"
                fullWidth
              />
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? '처리 중...' : '인증번호 받기'}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <Link href="/auth" className="text-sm text-green-600 hover:text-green-500">
                로그인으로 돌아가기
              </Link>
              <Link href="/auth/find-id" className="text-sm text-green-600 hover:text-green-500">
                아이디 찾기
              </Link>
            </div>
          </form>
        )}
        
        {/* 단계 2: 인증번호 확인 */}
        {step === 2 && (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyCode}>
            <div className="space-y-4">
              <Input
                label="인증번호"
                id="verificationCode"
                name="verificationCode"
                type="text"
                required
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                disabled={isLoading}
                placeholder="이메일로 받은 6자리 인증번호를 입력하세요"
                fullWidth
              />
              <p className="text-xs text-gray-500 mt-1">인증번호는 발송 후 1시간 동안 유효합니다.</p>
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? '처리 중...' : '인증번호 확인'}
              </Button>
              
              <button
                type="button"
                onClick={handleBack}
                className="w-full py-2 px-4 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
              >
                이전 단계로
              </button>
            </div>
          </form>
        )}
        
        {/* 단계 3: 비밀번호 변경 */}
        {step === 3 && (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div className="space-y-4">
              <Input
                label="새 비밀번호"
                id="newPassword"
                name="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                placeholder="새 비밀번호를 입력하세요"
                fullWidth
              />
              
              <Input
                label="비밀번호 확인"
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                placeholder="새 비밀번호를 다시 입력하세요"
                fullWidth
              />
              
              <div className="bg-gray-50 p-3 rounded-md text-xs text-gray-600">
                <p className="font-medium mb-1">비밀번호 조건:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>8~16자 사이로 입력</li>
                  <li>영문 대문자(A-Z) 1개 이상 포함</li>
                  <li>영문 소문자(a-z) 1개 이상 포함</li>
                  <li>숫자(0-9) 1개 이상 포함</li>
                  <li>특수문자(!@#$%^&*(),.?&quot;:{}|&lt;&gt;) 1개 이상 포함</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? '처리 중...' : '비밀번호 변경하기'}
              </Button>
              
              <button
                type="button"
                onClick={handleBack}
                className="w-full py-2 px-4 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
              >
                이전 단계로
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 