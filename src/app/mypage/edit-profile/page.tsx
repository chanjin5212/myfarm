'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name?: string;
  nickname?: string;
  phone_number?: string;
  marketing_agreed?: boolean;
}

interface FormData {
  name: string;
  nickname: string;
  phoneNumberPrefix: string;
  phoneNumberMiddle: string;
  phoneNumberSuffix: string;
  marketingAgreed: boolean;
}

interface FormErrors {
  name?: string;
  nickname?: string;
  phoneNumberMiddle?: string;
  phoneNumberSuffix?: string;
}

export default function EditProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    nickname: '',
    phoneNumberPrefix: '010',
    phoneNumberMiddle: '',
    phoneNumberSuffix: '',
    marketingAgreed: false,
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  // 휴대폰 번호 선택 옵션
  const prefixOptions = ['010', '011', '016', '017', '018', '019'];

  useEffect(() => {
    const checkLoginStatus = () => {
      try {
        const tokenData = localStorage.getItem('token');
        if (tokenData) {
          const parsedToken = JSON.parse(tokenData);
          
          // 토큰이 만료되었는지 확인
          if (parsedToken.expiresAt && parsedToken.expiresAt > Date.now()) {
            const userData = parsedToken.user || null;
            setUser(userData);
            
            if (userData) {
              // 휴대폰 번호 파싱
              let prefix = '010';
              let middle = '';
              let suffix = '';
              
              if (userData.phone_number) {
                // 번호 형식에 따라 파싱 (01012345678)
                if (userData.phone_number.length === 11) {
                  prefix = userData.phone_number.substring(0, 3);
                  middle = userData.phone_number.substring(3, 7);
                  suffix = userData.phone_number.substring(7);
                }
              }
              
              // 폼 데이터 초기화
              setFormData({
                name: userData.name || '',
                nickname: userData.nickname || '',
                phoneNumberPrefix: prefix,
                phoneNumberMiddle: middle,
                phoneNumberSuffix: suffix,
                marketingAgreed: userData.marketing_agreed || false,
              });
            }
          } else {
            // 만료된 토큰이면 로그인 페이지로 리다이렉션
            router.push('/auth');
          }
        } else {
          // 토큰이 없으면 로그인 페이지로 리다이렉션
          router.push('/auth');
        }
      } catch (error) {
        console.error('토큰 확인 오류:', error);
        router.push('/auth');
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    // 체크박스인 경우 checked 속성을 사용
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    // 휴대폰 번호 중간/끝 부분은 숫자만 입력되도록
    if (name === 'phoneNumberMiddle' || name === 'phoneNumberSuffix') {
      // 숫자만 허용하고 최대 4자리까지
      const numericValue = value.replace(/\D/g, '').slice(0, 4);
      
      setFormData((prev) => ({
        ...prev,
        [name]: numericValue,
      }));
      
      // 유효성 검사 - 4자리인지 확인
      if (numericValue.length !== 4 && numericValue.length > 0) {
        setFormErrors((prev) => ({
          ...prev,
          [name]: '4자리 숫자를 입력해주세요.',
        }));
      } else {
        setFormErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name as keyof FormErrors];
          return newErrors;
        });
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: val,
      }));
    }
  };

  const getFullPhoneNumber = () => {
    const { phoneNumberPrefix, phoneNumberMiddle, phoneNumberSuffix } = formData;
    
    // 중간 또는 끝 부분이 비어있으면 번호 전체를 비워둠
    if (!phoneNumberMiddle || !phoneNumberSuffix) {
      return '';
    }
    
    return `${phoneNumberPrefix}${phoneNumberMiddle}${phoneNumberSuffix}`;
  };

  const validateForm = () => {
    const errors: FormErrors = {};
    
    if (formData.phoneNumberMiddle && formData.phoneNumberMiddle.length !== 4) {
      errors.phoneNumberMiddle = '중간 번호는 4자리여야 합니다.';
    }
    
    if (formData.phoneNumberSuffix && formData.phoneNumberSuffix.length !== 4) {
      errors.phoneNumberSuffix = '끝 번호는 4자리여야 합니다.';
    }
    
    // 중간과 끝 번호 중 하나만 입력된 경우
    if ((formData.phoneNumberMiddle && !formData.phoneNumberSuffix) || 
        (!formData.phoneNumberMiddle && formData.phoneNumberSuffix)) {
      if (!formData.phoneNumberMiddle) errors.phoneNumberMiddle = '중간 번호를 입력해주세요.';
      if (!formData.phoneNumberSuffix) errors.phoneNumberSuffix = '끝 번호를 입력해주세요.';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    setSuccessMessage('');
    
    try {
      if (!user) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }
      
      const fullPhoneNumber = getFullPhoneNumber();
      
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          name: formData.name || null,
          nickname: formData.nickname || null,
          phone_number: fullPhoneNumber || null,
          marketing_agreed: formData.marketingAgreed,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '정보 업데이트에 실패했습니다.');
      }
      
      // 성공적으로 업데이트된 경우
      await response.json();
      
      // 로컬 스토리지의 사용자 정보 업데이트
      const tokenData = localStorage.getItem('token');
      if (tokenData) {
        const parsedToken = JSON.parse(tokenData);
        parsedToken.user = {
          ...parsedToken.user,
          name: formData.name || parsedToken.user.name,
          nickname: formData.nickname || parsedToken.user.nickname,
          phone_number: fullPhoneNumber || parsedToken.user.phone_number,
          marketing_agreed: formData.marketingAgreed,
        };
        localStorage.setItem('token', JSON.stringify(parsedToken));
      }
      
      setSuccessMessage('개인정보가 성공적으로 업데이트되었습니다.');
      
      // 3초 후 성공 메시지 숨기기
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('개인정보 업데이트 오류:', error);
      alert(error instanceof Error ? error.message : '정보 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/mypage');
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-10">개인정보 수정</h1>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 이름 입력 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="이름을 입력하세요"
              />
            </div>
            
            {/* 닉네임 입력 */}
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">닉네임</label>
              <input
                type="text"
                name="nickname"
                id="nickname"
                value={formData.nickname}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="닉네임을 입력하세요"
              />
            </div>
            
            {/* 휴대폰 번호 입력 */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">휴대폰 번호</label>
              <div className="flex items-center space-x-2">
                <select
                  name="phoneNumberPrefix"
                  id="phoneNumberPrefix"
                  value={formData.phoneNumberPrefix}
                  onChange={handleChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {prefixOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500">-</span>
                <input
                  type="text"
                  name="phoneNumberMiddle"
                  id="phoneNumberMiddle"
                  value={formData.phoneNumberMiddle}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0000"
                  maxLength={4}
                />
                <span className="text-gray-500">-</span>
                <input
                  type="text"
                  name="phoneNumberSuffix"
                  id="phoneNumberSuffix"
                  value={formData.phoneNumberSuffix}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0000"
                  maxLength={4}
                />
              </div>
              {formErrors.phoneNumberMiddle && (
                <p className="mt-1 text-sm text-red-600">{formErrors.phoneNumberMiddle}</p>
              )}
              {formErrors.phoneNumberSuffix && (
                <p className="mt-1 text-sm text-red-600">{formErrors.phoneNumberSuffix}</p>
              )}
            </div>
            
            {/* 마케팅 정보 수신 동의 */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  name="marketingAgreed"
                  id="marketingAgreed"
                  checked={formData.marketingAgreed}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="marketingAgreed" className="font-medium text-gray-700">마케팅 정보 수신 동의</label>
                <p className="text-gray-500">이벤트 및 할인 정보를 이메일/SMS로 받아보실 수 있습니다.</p>
              </div>
            </div>
            
            {/* 성공 메시지 */}
            {successMessage && (
              <div className="py-3 px-4 bg-green-100 text-green-800 rounded-md">
                {successMessage}
              </div>
            )}
            
            {/* 버튼 영역 */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={`px-6 py-2 bg-blue-600 rounded-md text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isSaving ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSaving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 