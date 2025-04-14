'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Modal, Checkbox } from '@/components/ui/CommonStyles';

interface ShippingAddress {
  id: string;
  recipient_name: string;
  phone: string;
  address: string;
  detail_address?: string;
  is_default: boolean;
  memo?: string;
  default_user_address?: boolean;
}

interface ShippingAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onAddressSelect: (address: ShippingAddress) => void;
  currentAddresses: ShippingAddress[];
}

export default function ShippingAddressModal({
  isOpen,
  onClose,
  userId,
  onAddressSelect,
  currentAddresses = []
}: ShippingAddressModalProps) {
  const [addresses, setAddresses] = useState<ShippingAddress[]>(currentAddresses);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    recipient_name: '',
    phone: '',
    address: '',
    detail_address: '',
    is_default: false,
    memo: ''
  });

  useEffect(() => {
    if (isOpen && userId) {
      loadAddresses();
    }
  }, [isOpen, userId]);

  // 배송지 목록 로드
  const loadAddresses = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/shipping-addresses?userId=${userId}`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.addresses && Array.isArray(data.addresses)) {
          setAddresses(data.addresses);
        }
      } else {
        setError('배송지 목록을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('배송지 목록 로드 오류:', error);
      setError('배송지 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 배송지 선택
  const handleSelectAddress = (address: ShippingAddress) => {
    onAddressSelect(address);
    onClose();
  };

  // 주소 검색 (다음 주소 API)
  const handleSearchAddress = () => {
    if (typeof window.daum === 'undefined') {
      // 다음 주소 API 스크립트 로드
      const script = document.createElement('script');
      script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.async = true;
      document.head.appendChild(script);
      
      script.onload = () => {
        searchAddressWithDaum();
      };
    } else {
      searchAddressWithDaum();
    }
  };
  
  const searchAddressWithDaum = () => {
    new window.daum.Postcode({
      oncomplete: function(data: any) {
        // 선택한 주소 데이터 활용
        const fullAddress = data.address;
        
        setNewAddress(prev => ({
          ...prev,
          address: fullAddress,
          detail_address: '' // 상세주소 초기화
        }));
      }
    }).open();
  };

  // 배송지 추가
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      alert('로그인이 필요합니다.');
      return;
    }
    
    if (!newAddress.recipient_name || !newAddress.phone || !newAddress.address) {
      alert('받는 사람, 연락처, 주소는 필수 입력 항목입니다.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/shipping-addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...newAddress
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '배송지를 추가할 수 없습니다.');
      }
      
      const data = await response.json();
      alert('배송지가 성공적으로 추가되었습니다.');
      
      // 새로운 배송지 목록 로드
      loadAddresses();
      setShowAddForm(false);
      setNewAddress({
        recipient_name: '',
        phone: '',
        address: '',
        detail_address: '',
        is_default: false,
        memo: ''
      });
    } catch (error) {
      console.error('배송지 추가 오류:', error);
      alert(error instanceof Error ? error.message : '배송지를 추가할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="배송지 관리"
      size="lg"
    >
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <>
          {/* 배송지 목록 */}
          {addresses.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">저장된 배송지</h3>
              <div className="space-y-3">
                {addresses.map((address) => (
                  <div 
                    key={address.id}
                    className={`border rounded-lg p-4 cursor-pointer hover:border-green-500 ${
                      address.is_default ? 'bg-green-50 border-green-500' : ''
                    }`}
                    onClick={() => handleSelectAddress(address)}
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{address.recipient_name}</p>
                        <p className="text-sm text-gray-600">{address.phone}</p>
                      </div>
                      <div className="flex space-x-2">
                        {address.is_default && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">기본 배송지</span>
                        )}
                        {address.default_user_address && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">내 기본 주소</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm mt-2">{address.address}</p>
                    {address.detail_address && (
                      <p className="text-sm text-gray-500">{address.detail_address}</p>
                    )}
                    {address.memo && (
                      <p className="text-xs text-gray-500 mt-1">메모: {address.memo}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg text-center mb-6">
              <p className="text-gray-500">저장된 배송지가 없습니다.</p>
            </div>
          )}
          
          {/* 배송지 추가 폼 또는 버튼 */}
          {showAddForm ? (
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">새 배송지 추가</h3>
              <form onSubmit={handleAddAddress}>
                <div className="space-y-4 mb-4">
                  <Input
                    label="받는 사람 *"
                    type="text"
                    value={newAddress.recipient_name}
                    onChange={(e) => setNewAddress({...newAddress, recipient_name: e.target.value})}
                    required
                  />
                  
                  <Input
                    label="연락처 *"
                    type="text"
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})}
                    required
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      주소 *
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={newAddress.address}
                        readOnly
                        className="w-full px-3 py-2 border rounded-md mr-2 border-gray-300"
                        required
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleSearchAddress}
                      >
                        주소 검색
                      </Button>
                    </div>
                  </div>
                  
                  <Input
                    label="상세 주소"
                    type="text"
                    value={newAddress.detail_address}
                    onChange={(e) => setNewAddress({...newAddress, detail_address: e.target.value})}
                  />
                  
                  <Input
                    label="배송 메모"
                    type="text"
                    value={newAddress.memo}
                    onChange={(e) => setNewAddress({...newAddress, memo: e.target.value})}
                  />
                  
                  <Checkbox
                    label="기본 배송지로 설정"
                    checked={newAddress.is_default}
                    onChange={(e) => setNewAddress({...newAddress, is_default: e.target.checked})}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    disabled={loading}
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                  >
                    {loading ? '저장 중...' : '저장'}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <Button
              onClick={() => setShowAddForm(true)}
              variant="primary"
              fullWidth
            >
              새 배송지 추가
            </Button>
          )}
        </>
      )}
    </Modal>
  );
}

// DaumPostcodeResult 타입 정의
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