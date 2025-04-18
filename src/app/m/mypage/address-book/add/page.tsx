'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { checkToken, getAuthHeader } from '@/utils/auth';
import { Spinner } from '@/components/ui/CommonStyles';

interface AddressFormData {
  recipient_name: string;
  phoneNumberPrefix: string;
  phoneNumberMiddle: string;
  phoneNumberSuffix: string;
  address: string;
  detail_address: string;
  is_default: boolean;
  memo: string;
}

// DaumPostcodeResult 타입 정의
interface DaumPostcodeResult {
  zonecode: string; // 우편번호
  address: string; // 기본 주소
  addressType: string;
  userSelectedType: string;
  jibunAddress: string;
  roadAddress: string;
  buildingName?: string;
  apartment?: string;
}

export default function AddShippingAddress() {
  const router = useRouter();
  const [formData, setFormData] = useState<AddressFormData>({
    recipient_name: '',
    phoneNumberPrefix: '010',
    phoneNumberMiddle: '',
    phoneNumberSuffix: '',
    address: '',
    detail_address: '',
    is_default: false,
    memo: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 로그인 체크
    const { isLoggedIn } = checkToken();
    if (!isLoggedIn) {
      router.push('/m/auth');
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // 체크박스 처리
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    // 전화번호 중간 자리와 끝자리는 숫자 4자리만 허용
    if (name === 'phoneNumberMiddle' || name === 'phoneNumberSuffix') {
      const numericValue = value.replace(/\D/g, '').slice(0, 4);
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressSearch = () => {
    if (typeof window === 'undefined') return;
    
    if (typeof window.daum === 'undefined') {
      // 다음 주소 API 스크립트 로드
      const script = document.createElement('script');
      script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.async = true;
      document.head.appendChild(script);
      
      script.onload = openDaumPostcode;
    } else {
      openDaumPostcode();
    }
  };
  
  const openDaumPostcode = () => {
    new window.daum.Postcode({
      oncomplete: function(data: DaumPostcodeResult) {
        setFormData(prev => ({
          ...prev,
          address: data.address
        }));
      }
    }).open();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!formData.recipient_name || !formData.phoneNumberMiddle || !formData.phoneNumberSuffix || !formData.address) {
      toast.error('받는 사람, 연락처, 주소는 필수 입력 항목입니다.');
      return;
    }
    
    setLoading(true);
    
    try {
      const { isLoggedIn, user } = checkToken();
      if (!isLoggedIn || !user?.id) {
        router.push('/m/auth');
        return;
      }
      
      const authHeader = getAuthHeader();
      
      // 전화번호 조합
      const phone = `${formData.phoneNumberPrefix}-${formData.phoneNumberMiddle}-${formData.phoneNumberSuffix}`;
      
      const response = await fetch('/api/shipping-addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          userId: user.id,
          recipient_name: formData.recipient_name,
          phone,
          address: formData.address,
          detail_address: formData.detail_address,
          is_default: formData.is_default,
          memo: formData.memo
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '배송지 추가에 실패했습니다.');
      }
      
      toast.success('배송지가 추가되었습니다.');
      router.push('/m/mypage/address-book');
    } catch (error: any) {
      console.error('배송지 추가 오류:', error);
      toast.error(error.message || '배송지 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 shadow-sm fixed top-0 left-0 right-0 z-30">
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
          <h1 className="text-xl font-bold">배송지 추가</h1>
        </div>
      </div>
      
      {/* 입력 폼 */}
      <div className="pt-16 pb-24 px-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                받는 사람 *
              </label>
              <input
                type="text"
                name="recipient_name"
                value={formData.recipient_name}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                휴대폰 번호 *
              </label>
              <div className="flex space-x-2">
                <select
                  id="phoneNumberPrefix"
                  name="phoneNumberPrefix"
                  value={formData.phoneNumberPrefix}
                  onChange={handleChange}
                  className="w-1/4 rounded-md p-2.5 border border-gray-300 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="010">010</option>
                  <option value="011">011</option>
                  <option value="016">016</option>
                  <option value="017">017</option>
                  <option value="018">018</option>
                  <option value="019">019</option>
                </select>
                <input
                  id="phoneNumberMiddle"
                  name="phoneNumberMiddle"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0000"
                  value={formData.phoneNumberMiddle}
                  onChange={handleChange}
                  className="w-1/3 rounded-md p-2.5 border border-gray-300 focus:ring-green-500 focus:border-green-500"
                />
                <input
                  id="phoneNumberSuffix"
                  name="phoneNumberSuffix"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0000"
                  value={formData.phoneNumberSuffix}
                  onChange={handleChange}
                  className="w-1/3 rounded-md p-2.5 border border-gray-300 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                주소 *
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  readOnly
                  className="w-2/5 rounded-l-md p-2.5 border border-gray-300 focus:ring-green-500 focus:border-green-500"
                  placeholder="우편번호"
                  required
                />
                <button
                  type="button"
                  onClick={handleAddressSearch}
                  className="shrink-0 rounded-r-md px-4 py-2.5 font-medium text-sm bg-gray-600 text-white hover:bg-gray-700"
                >
                  주소 검색
                </button>
              </div>
              <input
                type="text"
                name="address"
                value={formData.address}
                readOnly
                className="w-full rounded-md p-2.5 border border-gray-300 focus:ring-green-500 focus:border-green-500 mb-2"
                placeholder="기본주소"
                required
              />
              <input
                type="text"
                name="detail_address"
                value={formData.detail_address}
                onChange={handleChange}
                placeholder="상세 주소"
                className="w-full rounded-md p-2.5 border border-gray-300 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                배송 메모
              </label>
              <input
                type="text"
                name="memo"
                value={formData.memo}
                onChange={handleChange}
                placeholder="예: 부재시 경비실에 맡겨주세요"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_default"
                name="is_default"
                checked={formData.is_default}
                onChange={handleChange}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="is_default" className="ml-2 block text-sm text-gray-700">
                기본 배송지로 설정
              </label>
            </div>
          </div>
          
          <div className="mt-6 flex space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-md font-medium"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-md font-medium flex justify-center items-center"
            >
              {loading ? <Spinner size="sm" /> : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: DaumPostcodeResult) => void;
      }) => {
        open: () => void;
      };
    }
  }
} 