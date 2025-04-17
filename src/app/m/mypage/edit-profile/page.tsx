'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import toast, { Toaster } from 'react-hot-toast';
import { checkToken, getAuthHeader } from '@/utils/auth';

interface User {
  id: string;
  email: string;
  name?: string;
  nickname?: string;
  phone_number?: string;
  postcode?: string;
  address?: string;
  detail_address?: string;
  marketing_agreed?: boolean;
}

interface FormData {
  name: string;
  nickname: string;
  phoneNumberPrefix: string;
  phoneNumberMiddle: string;
  phoneNumberSuffix: string;
  postcode: string;
  address: string;
  detailAddress: string;
  marketingAgreed: boolean;
}

interface FormErrors {
  name?: string;
  nickname?: string;
  phoneNumberMiddle?: string;
  phoneNumberSuffix?: string;
  postcode?: string;
  address?: string;
}

export default function MobileEditProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    nickname: '',
    phoneNumberPrefix: '010',
    phoneNumberMiddle: '',
    phoneNumberSuffix: '',
    postcode: '',
    address: '',
    detailAddress: '',
    marketingAgreed: false,
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const router = useRouter();

  // 휴대폰 번호 선택 옵션
  const prefixOptions = ['010', '011', '016', '017', '018', '019'];

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        // auth 유틸 함수를 사용하여 토큰 확인
        const { user: authUser, isLoggedIn } = checkToken();
        
        if (!isLoggedIn || !authUser) {
          // 로그인되어 있지 않으면 로그인 페이지로 리다이렉트
          toast.error('로그인이 필요합니다.');
          router.push('/m/auth');
          return;
        }

        // auth 유틸을 사용하여 인증 헤더 생성
        const authHeader = getAuthHeader();
        
        // 사용자 정보 요청
        const response = await fetch('/api/users/me', {
          headers: authHeader
        });

        if (!response.ok) {
          throw new Error('사용자 정보를 불러오는데 실패했습니다.');
        }

        const userData = await response.json();
        setUser(userData);

        // 전화번호 파싱
        let phonePrefix = '010';
        let phoneMiddle = '';
        let phoneSuffix = '';

        if (userData.phone_number) {
          const phoneNumber = userData.phone_number;
          
          // 하이픈이 있으면 하이픈으로 분리
          if (phoneNumber.includes('-')) {
            const parts = phoneNumber.split('-');
            phonePrefix = parts[0] || '010';
            phoneMiddle = parts[1] || '';
            phoneSuffix = parts[2] || '';
          } else {
            // 길이에 따라 적절히 분리
            if (phoneNumber.length >= 10) {
              phonePrefix = phoneNumber.substring(0, 3);
              phoneMiddle = phoneNumber.substring(3, 7);
              phoneSuffix = phoneNumber.substring(7);
            }
          }
        }
        
        setFormData({
          name: userData.name || '',
          nickname: userData.nickname || '',
          phoneNumberPrefix: phonePrefix,
          phoneNumberMiddle: phoneMiddle,
          phoneNumberSuffix: phoneSuffix,
          postcode: userData.postcode || '',
          address: userData.address || '',
          detailAddress: userData.detail_address || '',
          marketingAgreed: userData.marketing_agreed || false,
        });
      } catch (error) {
        console.error('사용자 정보 로딩 오류:', error);
        toast.error('사용자 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserInfo();
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

  const openPostcodeSearch = () => {
    if (typeof window !== 'undefined' && (window as any).daum && (window as any).daum.Postcode) {
      new (window as any).daum.Postcode({
        oncomplete: function(data: any) {
          // 우편번호와 주소 정보를 입력폼에 넣는다.
          setFormData(prev => ({
            ...prev,
            postcode: data.zonecode,
            address: data.address,
          }));
          
          // 상세주소 입력 필드로 포커스 이동
          document.getElementById('detailAddress')?.focus();
        }
      }).open();
    } else {
      toast.error('주소 검색 서비스를 불러오는데 실패했습니다.');
    }
  };

  const getFullPhoneNumber = () => {
    if (!formData.phoneNumberMiddle || !formData.phoneNumberSuffix) {
      return '';
    }
    return `${formData.phoneNumberPrefix}-${formData.phoneNumberMiddle}-${formData.phoneNumberSuffix}`;
  };

  const validateForm = () => {
    const errors: FormErrors = {};
    
    // 휴대폰 번호 검증
    if (formData.phoneNumberMiddle && formData.phoneNumberMiddle.length !== 4) {
      errors.phoneNumberMiddle = '휴대폰 번호 중간 자리는 4자리여야 합니다.';
    }
    
    if (formData.phoneNumberSuffix && formData.phoneNumberSuffix.length !== 4) {
      errors.phoneNumberSuffix = '휴대폰 번호 뒷자리는 4자리여야 합니다.';
    }
    
    // 주소 검증 - 우편번호와 기본주소는 함께 있어야 함
    if ((formData.postcode && !formData.address) || (!formData.postcode && formData.address)) {
      errors.address = '우편번호와 기본주소는 함께 입력되어야 합니다.';
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
    
    try {
      // auth 유틸 함수를 사용하여 토큰 확인
      const { isLoggedIn } = checkToken();
      
      if (!isLoggedIn) {
        toast.error('로그인이 필요합니다.');
        router.push('/m/auth');
        return;
      }
      
      // auth 유틸을 사용하여 인증 헤더 생성
      const authHeader = getAuthHeader();
      
      // 전화번호 결합
      const fullPhoneNumber = getFullPhoneNumber();
      
      // 프로필 업데이트 요청
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          name: formData.name,
          nickname: formData.nickname,
          phone_number: fullPhoneNumber,
          postcode: formData.postcode,
          address: formData.address,
          detail_address: formData.detailAddress,
          marketing_agreed: formData.marketingAgreed
        })
      });
      
      // 응답 확인
      if (!response.ok) {
        let errorMessage = '프로필 업데이트에 실패했습니다.';
        
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
      toast.success('프로필이 성공적으로 업데이트되었습니다.');
      
      // 마이페이지로 이동
      router.push('/m/mypage');
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      toast.error(error instanceof Error ? error.message : '프로필 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <Toaster position="top-center" />
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />
      
      {/* 헤더 */}
      <div className="sticky top-12 z-10 bg-white shadow-sm">
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="text-gray-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h1 className="text-lg font-bold">개인정보 수정</h1>
            <div className="w-6 h-6"></div> {/* 빈 공간으로 중앙 정렬 유지 */}
          </div>
        </div>
      </div>
      
      {/* 프로필 수정 폼 */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 이름 입력 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="닉네임을 입력하세요"
            />
          </div>
          
          {/* 휴대폰 번호 입력 */}
          <div>
            <label htmlFor="phoneNumberPrefix" className="block text-sm font-medium text-gray-700 mb-1">휴대폰 번호</label>
            <div className="flex items-center space-x-2">
              <select
                name="phoneNumberPrefix"
                id="phoneNumberPrefix"
                value={formData.phoneNumberPrefix}
                onChange={handleChange}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {prefixOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span className="text-gray-500">-</span>
              <input
                type="text"
                name="phoneNumberMiddle"
                id="phoneNumberMiddle"
                value={formData.phoneNumberMiddle}
                onChange={handleChange}
                maxLength={4}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0000"
              />
              <span className="text-gray-500">-</span>
              <input
                type="text"
                name="phoneNumberSuffix"
                id="phoneNumberSuffix"
                value={formData.phoneNumberSuffix}
                onChange={handleChange}
                maxLength={4}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0000"
              />
            </div>
            {(formErrors.phoneNumberMiddle || formErrors.phoneNumberSuffix) && (
              <p className="mt-1 text-sm text-red-600">
                {formErrors.phoneNumberMiddle || formErrors.phoneNumberSuffix}
              </p>
            )}
          </div>
          
          {/* 주소 입력 */}
          <div>
            <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">우편번호</label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                name="postcode"
                id="postcode"
                value={formData.postcode}
                onChange={handleChange}
                className="w-28 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="우편번호"
                readOnly
              />
              <button
                type="button"
                onClick={openPostcodeSearch}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                주소 검색
              </button>
            </div>
            
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">기본주소</label>
            <input
              type="text"
              name="address"
              id="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
              placeholder="기본주소"
              readOnly
            />
            
            <label htmlFor="detailAddress" className="block text-sm font-medium text-gray-700 mb-1">상세주소</label>
            <input
              type="text"
              name="detailAddress"
              id="detailAddress"
              value={formData.detailAddress}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="상세주소를 입력하세요"
            />
            
            {formErrors.address && (
              <p className="mt-1 text-sm text-red-600">{formErrors.address}</p>
            )}
          </div>
          
          {/* 마케팅 정보 수신 동의 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="marketingAgreed"
              id="marketingAgreed"
              checked={formData.marketingAgreed}
              onChange={handleChange}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="marketingAgreed" className="ml-2 block text-sm text-gray-700">
              마케팅 정보 수신에 동의합니다.
            </label>
          </div>
          
          {/* 저장 버튼 */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300"
            >
              {isSaving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 