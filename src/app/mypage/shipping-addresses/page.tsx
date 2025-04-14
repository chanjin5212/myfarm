'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Textarea, Checkbox, Table, Card } from '@/components/ui/CommonStyles';

interface ShippingAddress {
  id: string;
  recipient_name: string;
  phone: string;
  address: string;
  detail_address?: string;
  is_default: boolean;
  default_user_address?: boolean;
  memo?: string;
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

export default function ShippingAddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editAddressId, setEditAddressId] = useState<string | null>(null);
  
  // 새 배송지 폼 상태
  const [newAddress, setNewAddress] = useState({
    recipient_name: '',
    phone: '',
    address: '',
    detail_address: '',
    is_default: false,
    memo: ''
  });
  
  // 수정 배송지 폼 상태
  const [editAddress, setEditAddress] = useState({
    id: '',
    recipient_name: '',
    phone: '',
    address: '',
    detail_address: '',
    is_default: false,
    memo: ''
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  // 배송지 목록 로드
  const loadAddresses = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        router.push('/auth');
        return;
      }
      
      const response = await fetch(`/api/shipping-addresses?userId=${userId}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('배송지 목록을 불러올 수 없습니다.');
      }
      
      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (error) {
      console.error('배송지 목록 로드 오류:', error);
      setError('배송지 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 배송지 추가 폼 제출
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // 유효성 검사
      if (!newAddress.recipient_name || !newAddress.phone || !newAddress.address) {
        alert('받는 사람, 연락처, 주소는 필수 입력 항목입니다.');
        return;
      }
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        alert('로그인이 필요합니다.');
        router.push('/auth');
        return;
      }
      
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
      
      // 배송지 추가 성공
      alert('배송지가 성공적으로 추가되었습니다.');
      loadAddresses(); // 목록 새로고침
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
  
  // 배송지 수정 시작
  const handleEditStart = (address: ShippingAddress) => {
    setEditAddressId(address.id);
    setEditAddress({
      id: address.id,
      recipient_name: address.recipient_name,
      phone: address.phone,
      address: address.address,
      detail_address: address.detail_address || '',
      is_default: address.is_default,
      memo: address.memo || ''
    });
  };
  
  // 배송지 수정 취소
  const handleEditCancel = () => {
    setEditAddressId(null);
  };
  
  // 배송지 수정 제출
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // 유효성 검사
      if (!editAddress.recipient_name || !editAddress.phone || !editAddress.address) {
        alert('받는 사람, 연락처, 주소는 필수 입력 항목입니다.');
        return;
      }
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        alert('로그인이 필요합니다.');
        router.push('/auth');
        return;
      }
      
      const response = await fetch(`/api/shipping-addresses/${editAddress.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...editAddress
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '배송지를 수정할 수 없습니다.');
      }
      
      // 배송지 수정 성공
      alert('배송지가 성공적으로 수정되었습니다.');
      loadAddresses(); // 목록 새로고침
      setEditAddressId(null);
    } catch (error) {
      console.error('배송지 수정 오류:', error);
      alert(error instanceof Error ? error.message : '배송지를 수정할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // 배송지 삭제
  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('정말로 이 배송지를 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        alert('로그인이 필요합니다.');
        router.push('/auth');
        return;
      }
      
      const response = await fetch(`/api/shipping-addresses/${addressId}?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '배송지를 삭제할 수 없습니다.');
      }
      
      // 배송지 삭제 성공
      alert('배송지가 성공적으로 삭제되었습니다.');
      loadAddresses(); // 목록 새로고침
    } catch (error) {
      console.error('배송지 삭제 오류:', error);
      alert(error instanceof Error ? error.message : '배송지를 삭제할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // 주소 검색 (다음 주소 API 사용)
  const handleSearchAddress = (isEdit: boolean) => {
    if (typeof window.daum === 'undefined') {
      // 다음 주소 API 스크립트 로드
      const script = document.createElement('script');
      script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.async = true;
      document.head.appendChild(script);
      
      script.onload = () => {
        searchAddressWithDaum(isEdit);
      };
    } else {
      searchAddressWithDaum(isEdit);
    }
  };
  
  const searchAddressWithDaum = (isEdit: boolean) => {
    new window.daum.Postcode({
      oncomplete: function(data: DaumPostcodeResult) {
        // 선택한 주소 데이터 활용
        const fullAddress = data.address;
        
        if (isEdit) {
          setEditAddress(prev => ({
            ...prev,
            address: fullAddress,
            detail_address: '' // 상세주소 초기화
          }));
        } else {
          setNewAddress(prev => ({
            ...prev,
            address: fullAddress,
            detail_address: '' // 상세주소 초기화
          }));
        }
      }
    }).open();
  };

  if (loading && addresses.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">배송지 관리</h1>
          <Button
            variant="link"
            onClick={() => router.push('/mypage')}
          >
            마이페이지로 돌아가기
          </Button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {/* 배송지 목록 */}
        {addresses.length > 0 ? (
          <Table
            headers={['받는 사람', '연락처', '주소', '관리']}
            data={addresses}
            renderRow={(address, index) => (
              <tr key={address.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {address.recipient_name}
                  {address.is_default && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      기본 배송지
                    </span>
                  )}
                  {address.default_user_address && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      내 기본 주소
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {address.phone}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div>{address.address}</div>
                  {address.detail_address && (
                    <div className="text-xs text-gray-400">{address.detail_address}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editAddressId === address.id ? (
                    <div className="flex justify-end space-x-2">
                      <Button
                        onClick={handleEditSubmit}
                        variant="link"
                        disabled={loading}
                      >
                        저장
                      </Button>
                      <Button
                        onClick={handleEditCancel}
                        variant="link"
                        className="text-gray-600 hover:text-gray-900"
                        disabled={loading}
                      >
                        취소
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end space-x-2">
                      {!address.default_user_address ? (
                        <>
                          <Button
                            onClick={() => handleEditStart(address)}
                            variant="link"
                            disabled={loading}
                          >
                            수정
                          </Button>
                          <Button
                            onClick={() => handleDeleteAddress(address.id)}
                            variant="link"
                            className="text-red-600 hover:text-red-900"
                            disabled={loading}
                          >
                            삭제
                          </Button>
                        </>
                      ) : (
                        <div className="text-xs text-gray-500">마이페이지에서 수정 가능</div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )}
          />
        ) : (
          <div className="bg-white rounded-lg p-6 mb-6 text-center">
            <p className="text-gray-500">등록된 배송지가 없습니다. 배송지를 추가해주세요.</p>
          </div>
        )}
        
        {/* 배송지 추가 버튼 */}
        {!showAddForm && (
          <Button
            onClick={() => setShowAddForm(true)}
            variant="primary"
            disabled={loading}
          >
            배송지 추가
          </Button>
        )}
      </Card>
      
      {/* 배송지 추가 폼 */}
      {showAddForm && (
        <Card title="배송지 추가" className="mb-6">
          <form onSubmit={handleAddAddress}>
            <div className="grid grid-cols-1 gap-6 mb-6">
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
                    className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md mr-2"
                    required
                  />
                  <Button
                    type="button"
                    onClick={() => handleSearchAddress(false)}
                    variant="secondary"
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
                onClick={() => setShowAddForm(false)}
                variant="outline"
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
        </Card>
      )}
      
      {/* 배송지 수정 폼 */}
      {editAddressId && (
        <Card title="배송지 수정" className="mb-6">
          <form onSubmit={handleEditSubmit}>
            <div className="grid grid-cols-1 gap-6 mb-6">
              <Input
                label="받는 사람 *"
                type="text"
                value={editAddress.recipient_name}
                onChange={(e) => setEditAddress({...editAddress, recipient_name: e.target.value})}
                required
              />
              
              <Input
                label="연락처 *"
                type="text"
                value={editAddress.phone}
                onChange={(e) => setEditAddress({...editAddress, phone: e.target.value})}
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주소 *
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={editAddress.address}
                    readOnly
                    className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md mr-2"
                    required
                  />
                  <Button
                    type="button"
                    onClick={() => handleSearchAddress(true)}
                    variant="secondary"
                  >
                    주소 검색
                  </Button>
                </div>
              </div>
              
              <Input
                label="상세 주소"
                type="text"
                value={editAddress.detail_address}
                onChange={(e) => setEditAddress({...editAddress, detail_address: e.target.value})}
              />
              
              <Input
                label="배송 메모"
                type="text"
                value={editAddress.memo}
                onChange={(e) => setEditAddress({...editAddress, memo: e.target.value})}
              />
              
              <Checkbox
                label="기본 배송지로 설정"
                checked={editAddress.is_default}
                onChange={(e) => setEditAddress({...editAddress, is_default: e.target.checked})}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                onClick={handleEditCancel}
                variant="outline"
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
        </Card>
      )}
    </div>
  );
}

// 타입 정의를 위한 window 인터페이스 확장
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