'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { CheckIcon, PlusIcon, PencilIcon, TrashIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { checkToken, getAuthHeader } from '@/utils/auth';
import { Spinner } from '@/components/ui/CommonStyles';

interface ShippingAddress {
  id: string;
  user_id: string;
  recipient_name: string;
  phone: string;
  address: string;
  detail_address?: string;
  is_default: boolean;
  memo?: string;
  created_at: string;
  updated_at: string;
  default_address?: boolean;
  default_user_address?: boolean;
  note?: string;
  display_name?: string;
  is_editable?: boolean;
  is_deletable?: boolean;
  type?: string;
}

export default function MobileAddressBook() {
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  // 배송지 목록 불러오기
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const { isLoggedIn } = checkToken();
        if (!isLoggedIn) {
          router.push('/m/auth');
          return;
        }

        const authHeader = getAuthHeader();
        const userId = localStorage.getItem('userId');
        const response = await fetch(`/api/shipping-addresses?userId=${userId}`, {
          headers: authHeader,
        });

        if (!response.ok) {
          throw new Error('배송지 목록을 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        console.log('배송지 목록:', data.addresses);
        
        // 기본값 설정
        const addresses = data.addresses?.map((addr: ShippingAddress) => ({
          ...addr,
          is_editable: addr.is_editable !== false,  // 명시적으로 false가 아니면 true로 설정
          is_deletable: addr.is_deletable !== false // 명시적으로 false가 아니면 true로 설정
        })) || [];
        
        setAddresses(addresses);
      } catch (error) {
        console.error('배송지 불러오기 오류:', error);
        toast.error('배송지 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchAddresses();
  }, [router]);

  // 배송지 삭제
  const handleDeleteAddress = async (addressId: string) => {
    // 삭제하려는 주소가 기본 주소인지 확인
    const addressToDelete = addresses.find(addr => addr.id === addressId);
    if (addressToDelete?.default_address) {
      toast.error('기본 주소는 삭제할 수 없습니다. 마이페이지의 개인정보 수정에서 주소를 변경해주세요.');
      return;
    }
    
    if (!confirm('정말로 이 배송지를 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      setDeleting(addressId);
      const { isLoggedIn } = checkToken();
      if (!isLoggedIn) {
        router.push('/m/auth');
        return;
      }

      const authHeader = getAuthHeader();
      const userId = localStorage.getItem('userId');
      const response = await fetch(`/api/shipping-addresses/${addressId}?userId=${userId}`, {
        method: 'DELETE',
        headers: authHeader,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '배송지 삭제에 실패했습니다.');
      }

      // 삭제 성공 후 목록 업데이트
      setAddresses(addresses.filter(addr => addr.id !== addressId));
      toast.success('배송지가 삭제되었습니다.');
    } catch (error: any) {
      console.error('배송지 삭제 오류:', error);
      toast.error(error.message || '배송지 삭제에 실패했습니다.');
    } finally {
      setDeleting(null);
    }
  };

  // 배송지 추가 페이지로 이동
  const handleAddAddress = () => {
    router.push('/m/mypage/address-book/add');
  };

  // 배송지 수정 페이지로 이동
  const handleEditAddress = (addressId: string) => {
    // 수정하려는 주소가 기본 주소인지 확인
    const addressToEdit = addresses.find(addr => addr.id === addressId);
    if (addressToEdit?.default_address) {
      toast.error('기본 주소는 수정할 수 없습니다. 마이페이지의 개인정보 수정에서 주소를 변경해주세요.');
      return;
    }
    
    router.push(`/m/mypage/address-book/edit/${addressId}`);
  };

  // 로딩 중 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <h1 className="text-xl font-bold mb-4">배송지 관리</h1>
        <div className="flex justify-center items-center h-40">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <Toaster position="top-center" />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">배송지 관리</h1>
        <button
          onClick={handleAddAddress}
          className="flex items-center text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          배송지 추가
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">등록된 배송지가 없습니다.</p>
          <button
            onClick={handleAddAddress}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            배송지 추가하기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <div key={address.id} className={`bg-white rounded-lg shadow p-4 ${
              address.is_default ? 'border-l-4 border-green-500' : 
              address.default_address ? 'border-l-4 border-blue-500' : ''
            }`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <span className="font-medium text-lg">{address.display_name || address.recipient_name}</span>
                  {address.is_default && (
                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full flex items-center">
                      <CheckIcon className="h-3 w-3 mr-0.5" />
                      기본 배송지
                    </span>
                  )}
                  {address.default_address && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center">
                      <LockClosedIcon className="h-3 w-3 mr-0.5" />
                      내 기본 주소
                    </span>
                  )}
                </div>
                {!address.default_address && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditAddress(address.id)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(address.id)}
                      disabled={deleting === address.id}
                      className={`p-1.5 rounded-full ${
                        deleting === address.id
                          ? 'text-gray-400'
                          : 'text-red-500 hover:text-red-700 hover:bg-gray-100'
                      }`}
                    >
                      {deleting === address.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <TrashIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">{address.phone}</p>
              <p className="text-sm text-gray-800 mt-1">
                {address.address} {address.detail_address || ''}
              </p>
              {address.note && (
                <p className="text-xs text-blue-500 mt-1 italic">
                  {address.note}
                </p>
              )}
              {address.memo && (
                <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded">
                  {address.memo}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 