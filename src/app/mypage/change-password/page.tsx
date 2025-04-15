'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { checkToken, getAuthHeader } from '@/utils/auth';

// 비밀번호 유효성 검사 타입
interface PasswordValidation {
  length: boolean;
  upperLower: boolean;
  number: boolean;
  special: boolean;
  allValid: boolean;
}

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    length: false,
    upperLower: false,
    number: false,
    special: false,
    allValid: false
  });
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const router = useRouter();

  // 비밀번호 일치 여부 확인
  useEffect(() => {
    if (confirmPassword || newPassword) {
      setPasswordMatch(newPassword === confirmPassword);
    } else {
      setPasswordMatch(null);
    }
  }, [newPassword, confirmPassword]);

  // 로그인 상태 확인
  useEffect(() => {
    const checkLoginStatus = async () => {
      setIsLoading(true);
      try {
        const { isLoggedIn } = checkToken();
        if (!isLoggedIn) {
          toast.error('로그인이 필요합니다.');
          router.push('/auth');
          return;
        }

        // 사용자 정보를 불러와서 소셜로그인 여부 확인
        const checkSocialLogin = async () => {
          try {
            // auth.ts의 getAuthHeader 함수 사용
            const headers = getAuthHeader();
            
            if (!headers.Authorization) {
              throw new Error('인증 정보가 없습니다');
            }

            const response = await fetch('/api/users/me', {
              headers
            });

            if (!response.ok) {
              throw new Error('사용자 정보를 불러올 수 없습니다');
            }

            const userData = await response.json();
            // login_id가 없으면 소셜 로그인 사용자로 판단
            if (!userData.login_id) {
              toast.error('소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.');
              router.push('/mypage');
            }
          } catch (error) {
            console.error('사용자 정보 확인 오류:', error);
            toast.error('사용자 정보를 확인할 수 없습니다.');
            router.push('/mypage');
          }
        };

        await checkSocialLogin();
      } catch (error) {
        console.error('[비밀번호 변경] 인증 체크 오류:', error);
        toast.error('인증 정보를 확인할 수 없습니다.');
        router.push('/auth');
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, [router]);

  // 현재 비밀번호 검증 함수
  const verifyCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      setVerifyError('현재 비밀번호를 입력해주세요.');
      toast.error('현재 비밀번호를 입력해주세요.');
      return;
    }

    setVerifying(true);
    setVerifyError('');

    try {
      // auth.ts의 getAuthHeader 함수 사용
      const headers = getAuthHeader();
      
      if (!headers.Authorization) {
        setVerifyError('로그인 정보가 없습니다. 다시 로그인해주세요.');
        toast.error('로그인 정보가 없습니다. 다시 로그인해주세요.');
        setVerifying(false);
        router.push('/auth');
        return;
      }

      const response = await fetch('/api/users/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({ password: currentPassword }),
      });

      let data;
      try {
        const text = await response.text();
        if (text.trim()) {
          data = JSON.parse(text);
        } else {
          throw new Error('서버 응답이 비어있습니다');
        }
      } catch (error) {
        console.error('응답 파싱 오류:', error);
        throw new Error('서버 응답을 처리하는 중 오류가 발생했습니다');
      }

      if (response.ok && data && data.verified) {
        // 검증 성공
        setIsPasswordVerified(true);
        setVerifyError('');
        toast.success('현재 비밀번호가 확인되었습니다.');
      } else {
        // 검증 실패
        const errorMessage = data?.error || '비밀번호가 일치하지 않습니다.';
        setVerifyError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('비밀번호 확인 중 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '비밀번호 확인 중 오류가 발생했습니다.';
      setVerifyError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  // 입력값 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'currentPassword') {
      setCurrentPassword(value);
      // 비밀번호 변경 시 확인 상태 초기화
      if (isPasswordVerified) {
        setIsPasswordVerified(false);
      }
    } else if (name === 'newPassword') {
      setNewPassword(value);
      
      // 비밀번호 정책 검사
      const length = value.length >= 8 && value.length <= 16;
      const upperLower = /(?=.*[a-z])(?=.*[A-Z])/.test(value);
      const number = /(?=.*\d)/.test(value);
      const special = /(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(value);
      const allValid = length && upperLower && number && special;
      
      setPasswordValidation({
        length,
        upperLower,
        number,
        special,
        allValid
      });
    } else if (name === 'confirmPassword') {
      setConfirmPassword(value);
    }
  };

  // 비밀번호 유효성 검사
  const validateForm = () => {
    const newErrors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    let isValid = true;

    if (!isPasswordVerified) {
      newErrors.currentPassword = '현재 비밀번호 확인이 필요합니다.';
      isValid = false;
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = '새 비밀번호를 입력해주세요.';
      isValid = false;
    } else {
      // 8~16자 검증
      if (newPassword.length < 8 || newPassword.length > 16) {
        newErrors.newPassword = '비밀번호는 8~16자여야 합니다.';
        isValid = false;
      }
      // 대/소문자 포함 검증
      else if (!/(?=.*[a-z])(?=.*[A-Z])/.test(newPassword)) {
        newErrors.newPassword = '비밀번호는 대문자와 소문자를 모두 포함해야 합니다.';
        isValid = false;
      }
      // 숫자 포함 검증
      else if (!/(?=.*\d)/.test(newPassword)) {
        newErrors.newPassword = '비밀번호는 숫자를 포함해야 합니다.';
        isValid = false;
      }
      // 특수문자 포함 검증
      else if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(newPassword)) {
        newErrors.newPassword = '비밀번호는 특수문자를 포함해야 합니다.';
        isValid = false;
      }
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
      isValid = false;
    }

    if (currentPassword === newPassword && currentPassword.trim()) {
      newErrors.newPassword = '현재 비밀번호와 다른 비밀번호를 입력해주세요.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // 비밀번호 변경 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // auth.ts의 getAuthHeader 함수 사용
      const headers = getAuthHeader();
      
      if (!headers.Authorization) {
        toast.error('로그인 정보가 없습니다. 다시 로그인해주세요.');
        setIsSubmitting(false);
        router.push('/auth');
        return;
      }

      // 비밀번호 변경 API 요청
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword
        })
      });

      // 응답 처리
      let data;
      try {
        const text = await response.text();
        if (text.trim()) {
          data = JSON.parse(text);
        }
      } catch (error) {
        console.error('응답 파싱 오류:', error);
        throw new Error('서버 응답을 처리하는 중 오류가 발생했습니다');
      }

      if (response.ok) {
        toast.success('비밀번호가 성공적으로 변경되었습니다.');
        // 모든 입력 필드 초기화
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsPasswordVerified(false);
        
        // 마이페이지로 리다이렉트
        setTimeout(() => {
          router.push('/mypage');
        }, 2000);
      } else {
        // 에러 메시지 처리
        const errorMessage = data?.error || '비밀번호 변경에 실패했습니다.';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('비밀번호 변경 중 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '비밀번호 변경 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Toaster position="top-center" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-md">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">비밀번호 변경</h1>
              <button
                onClick={() => router.push('/mypage')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* 현재 비밀번호 */}
              {!isPasswordVerified ? (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">현재 비밀번호</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="flex-1 p-2 border rounded-md"
                      disabled={isPasswordVerified}
                    />
                    <button
                      type="button"
                      onClick={verifyCurrentPassword}
                      disabled={verifying || !currentPassword}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {verifying ? '확인중...' : '확인'}
                    </button>
                  </div>
                  {verifyError && (
                    <p className="text-red-500 text-xs mt-1">{verifyError}</p>
                  )}
                </div>
              ) : (
                <>
                  {/* 새 비밀번호 */}
                  <div className="mb-4">
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      새 비밀번호
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={newPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="새 비밀번호 입력 (8~16자)"
                    />
                    {errors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                    )}
                    
                    {/* 비밀번호 정책 안내 */}
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      <p className={passwordValidation.length ? 'text-green-600' : 'text-gray-400'}>
                        * 8~16자의 길이
                      </p>
                      <p className={passwordValidation.upperLower ? 'text-green-600' : 'text-gray-400'}>
                        * 대문자와 소문자 포함
                      </p>
                      <p className={passwordValidation.number ? 'text-green-600' : 'text-gray-400'}>
                        * 숫자 포함
                      </p>
                      <p className={passwordValidation.special ? 'text-green-600' : 'text-gray-400'}>
                        * 특수문자 포함
                      </p>
                    </div>
                  </div>

                  {/* 새 비밀번호 확인 */}
                  <div className="mb-6">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      새 비밀번호 확인
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="새 비밀번호 다시 입력"
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                    {confirmPassword && passwordMatch === false && !errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">비밀번호가 일치하지 않습니다</p>
                    )}
                    {confirmPassword && passwordMatch === true && (
                      <p className="mt-1 text-sm text-green-600">비밀번호가 일치합니다</p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => router.push('/mypage')}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !passwordValidation.allValid || !passwordMatch}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? '변경 중...' : '비밀번호 변경'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 