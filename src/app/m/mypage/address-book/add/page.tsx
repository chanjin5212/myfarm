'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { checkToken, getAuthHeader } from '@/utils/auth';
import { Spinner } from '@/components/ui/CommonStyles';

interface AddressFormData {
  recipient_name: string;
  phone: string;
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
    phone: '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    
    // 자동 하이픈 추가
    if (value.length > 3 && value.length <= 7) {
      value = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length > 7) {
      value = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    }
    
    setFormData(prev => ({ ...prev, phone: value }));
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
    if (!formData.recipient_name || !formData.phone || !formData.address) {
      toast.error('받는 사람, 연락처, 주소는 필수 입력 항목입니다.');
      return;
    }
    
    setLoading(true);
    
    try {
      const { isLoggedIn } = checkToken();
      if (!isLoggedIn) {
        router.push('/m/auth');
        return;
      }
      
      const authHeader = getAuthHeader();
      const userId = localStorage.getItem('userId');
      
      const response = await fetch('/api/shipping-addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          userId,
          ...formData
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
    <div className="min-h-screen bg-gray-50 p-4">
      <Toaster position="top-center" />
      <div className="mb-6">
        <h1 className="text-xl font-bold">배송지 추가</h1>
      </div>
      
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
              연락처 *
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="010-0000-0000"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
              maxLength={13}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              주소 *
            </label>
            <div className="flex mb-2">
              <input
                type="text"
                name="address"
                value={formData.address}
                readOnly
                className="w-full p-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
              <button
                type="button"
                onClick={handleAddressSearch}
                className="bg-gray-600 text-white px-3 py-2 rounded-r-md"
              >
                주소 검색
              </button>
            </div>
            
            <input
              type="text"
              name="detail_address"
              value={formData.detail_address}
              onChange={handleChange}
              placeholder="상세 주소"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
              onChange={handleCheckboxChange}
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