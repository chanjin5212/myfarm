'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { checkToken, getAuthHeader } from '@/utils/auth';

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function MobileChangePassword() {
  const [formData, setFormData] = useState<FormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // 실시간 유효성 검사
    if (name === 'newPassword') {
      validatePasswordStrength(value);
    } else if (name === 'confirmPassword') {
      validatePasswordMatch(formData.newPassword, value);
    }
  };

  const validatePasswordStrength = (password: string) => {
    const errors: FormErrors = { ...formErrors };
    
    if (password.length === 0) {
      errors.newPassword = undefined;
    } else if (password.length < 8 || password.length > 16) {
      errors.newPassword = '비밀번호는 8~16자 사이여야 합니다.';
    } else if (!/[A-Z]/.test(password)) {
      errors.newPassword = '대문자를 포함해야 합니다.';
    } else if (!/[a-z]/.test(password)) {
      errors.newPassword = '소문자를 포함해야 합니다.';
    } else if (!/[0-9]/.test(password)) {
      errors.newPassword = '숫자를 포함해야 합니다.';
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.newPassword = '특수문자를 포함해야 합니다.';
    } else {
      errors.newPassword = undefined;
    }
    
    setFormErrors(errors);
  };

  const validatePasswordMatch = (password: string, confirmPassword: string) => {
    const errors: FormErrors = { ...formErrors };
    
    if (confirmPassword.length === 0) {
      errors.confirmPassword = undefined;
    } else if (password !== confirmPassword) {
      errors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    } else {
      errors.confirmPassword = undefined;
    }
    
    setFormErrors(errors);
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    // 현재 비밀번호 검사
    if (!formData.currentPassword) {
      errors.currentPassword = '현재 비밀번호를 입력해주세요.';
    }
    
    // 새 비밀번호 검사
    if (!formData.newPassword) {
      errors.newPassword = '새 비밀번호를 입력해주세요.';
    } else if (formData.newPassword.length < 8 || formData.newPassword.length > 16) {
      errors.newPassword = '비밀번호는 8~16자 사이여야 합니다.';
    } else if (!/[A-Z]/.test(formData.newPassword)) {
      errors.newPassword = '대문자를 포함해야 합니다.';
    } else if (!/[a-z]/.test(formData.newPassword)) {
      errors.newPassword = '소문자를 포함해야 합니다.';
    } else if (!/[0-9]/.test(formData.newPassword)) {
      errors.newPassword = '숫자를 포함해야 합니다.';
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword)) {
      errors.newPassword = '특수문자를 포함해야 합니다.';
    }
    
    // 비밀번호 확인 검사
    if (!formData.confirmPassword) {
      errors.confirmPassword = '비밀번호 확인을 입력해주세요.';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 토큰 확인
      const { isLoggedIn } = checkToken();
      
      if (!isLoggedIn) {
        toast.error('로그인이 필요합니다.');
        router.push('/m/auth');
        return;
      }
      
      // 인증 헤더 생성
      const authHeader = getAuthHeader();
      
      // 비밀번호 변경 요청
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword
        })
      });
      
      // 응답 확인
      if (!response.ok) {
        let errorMessage = '비밀번호 변경에 실패했습니다.';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          console.error('응답 파싱 오류:', jsonError);
          errorMessage = `${errorMessage} (응답 파싱 오류)`;
        }
        
        throw new Error(errorMessage);
      }
      
      // 성공 메시지 표시
      toast.success('비밀번호가 성공적으로 변경되었습니다.');
      
      // 폼 초기화
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // 마이페이지로 이동
      router.push('/m/mypage');
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      toast.error(error instanceof Error ? error.message : '비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-16">
      <Toaster position="top-center" />
      
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="p-1 mr-2"
            aria-label="뒤로 가기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">비밀번호 변경</h1>
        </div>
      </div>
      
      {/* 비밀번호 변경 폼 */}
      <div className="p-4 pt-20">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 현재 비밀번호 입력 */}
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">현재 비밀번호</label>
            <input
              type="password"
              name="currentPassword"
              id="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                formErrors.currentPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="현재 비밀번호 입력"
            />
            {formErrors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{formErrors.currentPassword}</p>
            )}
          </div>
          
          {/* 새 비밀번호 입력 */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
            <input
              type="password"
              name="newPassword"
              id="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                formErrors.newPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="새 비밀번호 입력"
            />
            {formErrors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{formErrors.newPassword}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              비밀번호는 8~16자의 대소문자, 숫자, 특수문자를 모두 포함해야 합니다.
            </p>
          </div>
          
          {/* 비밀번호 확인 입력 */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
            <input
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="새 비밀번호 재입력"
            />
            {formErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
            )}
          </div>
          
          {/* 변경 버튼 */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300"
            >
              {isSubmitting ? '변경 중...' : '비밀번호 변경하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 