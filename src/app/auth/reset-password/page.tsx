'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [name, setName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationStep, setVerificationStep] = useState<'form' | 'verification' | 'reset' | 'complete'>('form');
  const [userVerificationCode, setUserVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    upperLower: false,
    number: false,
    special: false,
    allValid: false
  });
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);

  // 비밀번호 입력 시 실시간 유효성 검사
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);

    // 비밀번호 정책 검사
    const length = value.length >= 8 && value.length <= 16;
    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const upperLower = hasUppercase && hasLowercase;
    const number = /[0-9]/.test(value);
    const special = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value);
    const allValid = length && upperLower && number && special;

    setPasswordValidation({
      length,
      upperLower,
      number,
      special,
      allValid
    });

    // 비밀번호 일치 여부 검사
    if (confirmPassword) {
      setPasswordMatch(value === confirmPassword);
    }
  };

  // 비밀번호 확인 입력 시 일치 여부 검사
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setPasswordMatch(newPassword === value);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    
    try {
      // 서버에 사용자 정보 확인 요청
      const response = await fetch('/api/users/request-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          login_id: loginId,
          email
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setErrorMessage(data.error || '일치하는 회원 정보가 없습니다.');
        return;
      }

      // resetId 저장 (있는 경우에만)
      if (data.resetId) {
        setUserId(data.resetId);
      }

      // 인증 단계로 전환
      setVerificationStep('verification');
    } catch (error) {
      console.error('비밀번호 재설정 요청 오류:', error);
      setErrorMessage('비밀번호 재설정 요청 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    
    try {
      console.log('서버 요청 데이터:', { email, code: userVerificationCode, resetId: userId });
      
      // 서버에 인증 코드 검증 요청
      const response = await fetch('/api/users/verify-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: userVerificationCode,
          resetId: userId // resetId 전달
        }),
      });

      // 먼저 응답 상태 코드 확인
      if (!response.ok) {
        const errorText = await response.text();
        console.error('서버 오류 응답:', response.status, errorText);
        
        try {
          // JSON으로 파싱 시도
          const errorData = JSON.parse(errorText);
          setErrorMessage(errorData.error || `인증 시 서버 오류가 발생했습니다(${response.status}). 잠시 후 다시 시도해주세요.`);
        } catch {
          // JSON 파싱 실패 시 기본 오류 메시지 사용
          setErrorMessage(`인증 시 서버 오류가 발생했습니다(${response.status}). 잠시 후 다시 시도해주세요.`);
        }
        return;
      }
      
      // 정상 응답인 경우 JSON 파싱
      const data = await response.json();
      console.log('서버 응답 데이터:', data);
      
      // API 응답 성공 여부 확인
      if (!data.success) {
        // 자세한 오류 메시지 표시
        const errorMsg = data.error || '인증 코드 확인에 실패했습니다.';
        setErrorMessage(errorMsg);
        console.error('인증 코드 검증 실패:', errorMsg);
        return;
      }

      console.log('인증 성공 응답:', data);
      
      // resetId가 없으면 API 응답의 resetId 사용
      if (!userId && data.resetId) {
        setUserId(data.resetId);
      }

      setVerificationStep('reset');
    } catch (error) {
      console.error('인증 코드 검증 요청 오류:', error);
      setErrorMessage('인증 코드 검증 중 네트워크 오류가 발생했습니다. 인터넷 연결을 확인한 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (isResending) return;
    
    setIsResending(true);
    setErrorMessage(null);
    
    try {
      const response = await fetch('/api/users/request-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login_id: loginId,
          email
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setErrorMessage(data.error || '인증 코드 재발송에 실패했습니다.');
        return;
      }

      // resetId 저장 (있는 경우에만)
      if (data.resetId) {
        setUserId(data.resetId);
      }

      alert('인증 코드가 재발송되었습니다. 이메일을 확인해주세요.');
    } catch (error) {
      console.error('인증 코드 재발송 오류:', error);
      setErrorMessage('인증 코드 재발송 중 오류가 발생했습니다.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    // 비밀번호 일치 여부 확인
    if (newPassword !== confirmPassword) {
      setErrorMessage('비밀번호가 일치하지 않습니다.');
      return;
    }
    
    // 비밀번호 강도 검사
    if (!passwordValidation.allValid) {
      setErrorMessage('비밀번호는 8~16자의 대소문자, 숫자, 특수문자를 모두 포함해야 합니다.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('비밀번호 변경 요청:', { email, verificationCode: userVerificationCode, newPassword: '***' });
      
      // 서버에 새 비밀번호 저장 요청
      const response = await fetch('/api/users/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          verificationCode: userVerificationCode,
          newPassword: newPassword
        }),
      });

      // 응답 상태 코드 확인
      if (!response.ok) {
        const errorText = await response.text();
        console.error('서버 오류 응답:', response.status, errorText);
        
        try {
          // JSON으로 파싱 시도
          const errorData = JSON.parse(errorText);
          setErrorMessage(errorData.error || `비밀번호 변경 중 서버 오류가 발생했습니다(${response.status}). 잠시 후 다시 시도해주세요.`);
        } catch {
          // JSON 파싱 실패 시 기본 오류 메시지 사용
          setErrorMessage(`비밀번호 변경 중 서버 오류가 발생했습니다(${response.status}). 잠시 후 다시 시도해주세요.`);
        }
        return;
      }
      
      // 정상 응답인 경우 JSON 파싱
      const data = await response.json();
      console.log('비밀번호 변경 응답:', data);
      
      if (!data.success) {
        setErrorMessage(data.error || '비밀번호 재설정에 실패했습니다.');
        return;
      }

      // 비밀번호 변경 완료
      setVerificationStep('complete');
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      setErrorMessage('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            비밀번호 찾기
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            회원 정보 확인 후 비밀번호를 재설정할 수 있습니다.
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
        
        {/* 1단계: 회원 정보 입력 */}
        {verificationStep === 'form' && (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
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
                <label htmlFor="loginId" className="block text-sm font-medium text-gray-700">
                  아이디
                </label>
                <input
                  id="loginId"
                  name="loginId"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm mt-1"
                  placeholder="아이디를 입력하세요"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
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
        
        {/* 2단계: 인증 코드 확인 */}
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
        
        {/* 3단계: 새 비밀번호 설정 */}
        {verificationStep === 'reset' && (
          <form className="mt-8 space-y-6" onSubmit={handleSetNewPassword}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  새 비밀번호
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm mt-1"
                  placeholder="새 비밀번호"
                  value={newPassword}
                  onChange={handlePasswordChange}
                  disabled={isLoading}
                />
                
                {/* 비밀번호 강도 표시 */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 mr-2 rounded-full border flex items-center justify-center ${passwordValidation.length ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                      {passwordValidation.length && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-gray-700">8~16자 길이</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-4 h-4 mr-2 rounded-full border flex items-center justify-center ${passwordValidation.upperLower ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                      {passwordValidation.upperLower && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-gray-700">대문자와 소문자 포함</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-4 h-4 mr-2 rounded-full border flex items-center justify-center ${passwordValidation.number ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                      {passwordValidation.number && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-gray-700">숫자 포함</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-4 h-4 mr-2 rounded-full border flex items-center justify-center ${passwordValidation.special ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                      {passwordValidation.special && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-gray-700">특수문자 포함</span>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  비밀번호 확인
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className={`appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm mt-1 ${
                    passwordMatch === null ? 'border-gray-300' : passwordMatch ? 'border-green-500' : 'border-red-500'
                  }`}
                  placeholder="비밀번호 확인"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  disabled={isLoading}
                />
                {passwordMatch !== null && (
                  <div className="mt-1">
                    {passwordMatch ? (
                      <span className="text-xs text-green-600">비밀번호가 일치합니다.</span>
                    ) : (
                      <span className="text-xs text-red-600">비밀번호가 일치하지 않습니다.</span>
                    )}
                  </div>
                )}
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
                {isLoading ? '처리 중...' : '비밀번호 변경'}
              </button>
            </div>
          </form>
        )}
        
        {/* 4단계: 완료 */}
        {verificationStep === 'complete' && (
          <div className="mt-8 space-y-6">
            <div className="bg-green-50 p-6 rounded-md border border-green-200">
              <p className="text-green-700 mb-2 font-medium">
                비밀번호가 성공적으로 변경되었습니다.
              </p>
              <p className="text-sm text-gray-600">
                새 비밀번호로 로그인할 수 있습니다.
              </p>
            </div>
            
            <div>
              <Link href="/auth">
                <button
                  type="button"
                  className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  로그인하기
                </button>
              </Link>
            </div>
          </div>
        )}
        
        {verificationStep !== 'complete' && (
          <div className="mt-4 text-center">
            <Link href="/auth" className="text-sm text-blue-600 hover:text-blue-800">
              로그인 페이지로 돌아가기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 