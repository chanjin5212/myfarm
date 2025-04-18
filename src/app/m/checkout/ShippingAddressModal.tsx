'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Modal, Checkbox } from '@/components/ui/CommonStyles';
import { CheckIcon, PlusIcon, PencilIcon, TrashIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface ShippingAddress {
  id: string;
  recipient_name: string;
  phone: string;
  address: string;
  detail_address?: string;
  is_default: boolean;
  memo?: string;
  default_user_address?: boolean;
  default_address?: boolean;
  note?: string;
  display_name?: string;
}

interface ShippingAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onAddressSelect: (address: ShippingAddress) => void;
  currentAddresses?: ShippingAddress[];
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
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({
    recipient_name: '',
    phone: '',
    address: '',
    detail_address: '',
    is_default: false,
    memo: '',
    default_user_address: false
  });

  useEffect(() => {
    if (isOpen && userId) {
      loadAddresses();
    }
  }, [isOpen, userId]);

  // 모달이 닫힐 때 모든 상태 초기화
  const handleClose = () => {
    setShowAddForm(false);
    setShowEditForm(false);
    setCurrentEditId(null);
    resetAddressForm();
    onClose();
  };

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

  // 배송지 삭제
  const handleDeleteAddress = async (addressId: string) => {
    const addressToDelete = addresses.find(addr => addr.id === addressId);
    
    if (addressToDelete?.default_address) {
      toast.error('기본 주소는 삭제할 수 없습니다. 마이페이지의 개인정보 수정에서 주소를 변경해주세요.');
      return;
    }
    
    if (!confirm('정말로 이 배송지를 삭제하시겠습니까?')) {
      return;
    }
    
    setDeleting(addressId);
    try {
      const response = await fetch(`/api/shipping-addresses/${addressId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setAddresses(prev => prev.filter(addr => addr.id !== addressId));
        toast.success('배송지가 삭제되었습니다.');
      } else {
        const data = await response.json();
        throw new Error(data.error || '배송지를 삭제할 수 없습니다.');
      }
    } catch (error) {
      console.error('배송지 삭제 오류:', error);
      toast.error(error instanceof Error ? error.message : '배송지를 삭제할 수 없습니다.');
    } finally {
      setDeleting(null);
    }
  };

  // 배송지 수정 시작
  const handleStartEdit = (address: ShippingAddress) => {
    if (address.default_address) {
      toast.error('기본 주소는 수정할 수 없습니다. 마이페이지의 개인정보 수정에서 주소를 변경해주세요.');
      return;
    }
    
    setNewAddress({
      recipient_name: address.recipient_name,
      phone: address.phone,
      address: address.address,
      detail_address: address.detail_address || '',
      is_default: address.is_default,
      memo: address.memo || '',
      default_user_address: address.default_user_address || false
    });
    setCurrentEditId(address.id);
    setShowEditForm(true);
    setShowAddForm(false);
  };

  // 배송지 수정 취소
  const handleCancelEdit = () => {
    setShowEditForm(false);
    setCurrentEditId(null);
    resetAddressForm();
  };

  // 배송지 수정 저장
  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEditId) return;
    
    if (!newAddress.recipient_name || !newAddress.phone || !newAddress.address) {
      toast.error('받는 사람, 연락처, 주소는 필수 입력 항목입니다.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/shipping-addresses/${currentEditId}`, {
        method: 'PUT',
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
        throw new Error(errorData.error || '배송지를 수정할 수 없습니다.');
      }
      
      toast.success('배송지가 성공적으로 수정되었습니다.');
      await loadAddresses();
      handleCancelEdit();
    } catch (error) {
      console.error('배송지 수정 오류:', error);
      toast.error(error instanceof Error ? error.message : '배송지를 수정할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 주소 검색
  const handleSearchAddress = () => {
    searchAddressWithDaum();
  };

  // 다음 주소 검색
  const searchAddressWithDaum = () => {
    new window.daum.Postcode({
      oncomplete: (data: DaumPostcodeResult) => {
        setNewAddress(prev => ({
          ...prev,
          address: data.address
        }));
      }
    }).open();
  };

  // 배송지 폼 초기화
  const resetAddressForm = () => {
    setNewAddress({
      recipient_name: '',
      phone: '',
      address: '',
      detail_address: '',
      is_default: false,
      memo: '',
      default_user_address: false
    });
  };

  // 새 배송지 추가
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAddress.recipient_name || !newAddress.phone || !newAddress.address) {
      toast.error('받는 사람, 연락처, 주소는 필수 입력 항목입니다.');
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
      
      toast.success('배송지가 성공적으로 추가되었습니다.');
      await loadAddresses();
      setShowAddForm(false);
      resetAddressForm();
    } catch (error) {
      console.error('배송지 추가 오류:', error);
      toast.error(error instanceof Error ? error.message : '배송지를 추가할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 전화번호 포맷팅
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{4})(\d{4})$/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return phone;
  };

  // 전화번호 입력 처리
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setNewAddress(prev => ({
      ...prev,
      phone: formatted
    }));
  };

  // 배송지 폼 렌더링
  const renderAddressForm = (isEdit: boolean, handleSubmit: (e: React.FormEvent) => Promise<void>, handleCancel: () => void) => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          받는 사람
        </label>
        <Input
          type="text"
          name="recipient_name"
          value={newAddress.recipient_name}
          onChange={(e) => setNewAddress(prev => ({ ...prev, recipient_name: e.target.value }))}
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          연락처
        </label>
        <Input
          type="tel"
          name="phone"
          value={newAddress.phone}
          onChange={handlePhoneChange}
          required
          placeholder="010-0000-0000"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          주소
        </label>
        <div className="flex space-x-2 mb-2">
          <Input
            type="text"
            value={newAddress.address}
            readOnly
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleSearchAddress}
            className="bg-gray-100 text-gray-700"
          >
            주소 검색
          </Button>
        </div>
        <Input
          type="text"
          name="detail_address"
          value={newAddress.detail_address}
          onChange={(e) => setNewAddress(prev => ({ ...prev, detail_address: e.target.value }))}
          placeholder="상세 주소"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          배송 메모
        </label>
        <Input
          type="text"
          name="memo"
          value={newAddress.memo}
          onChange={(e) => setNewAddress(prev => ({ ...prev, memo: e.target.value }))}
          placeholder="배송 시 요청사항을 입력해주세요"
        />
      </div>
      
      <div className="flex items-center">
        <Checkbox
          id="is_default"
          label="기본 배송지로 설정"
          checked={newAddress.is_default}
          onChange={(e) => setNewAddress(prev => ({ ...prev, is_default: e.target.checked }))}
        />
      </div>
      
      <div className="flex space-x-2">
        <Button
          type="button"
          onClick={handleCancel}
          className="flex-1 bg-gray-100 text-gray-700"
        >
          취소
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-green-600 text-white"
          disabled={loading}
        >
          {loading ? '처리 중...' : isEdit ? '수정' : '추가'}
        </Button>
      </div>
    </form>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={showAddForm ? '새 배송지 추가' : showEditForm ? '배송지 수정' : '배송지 선택'}
    >
      {loading && !showAddForm && !showEditForm ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : showAddForm ? (
        renderAddressForm(false, handleAddAddress, () => setShowAddForm(false))
      ) : showEditForm ? (
        renderAddressForm(true, handleUpdateAddress, handleCancelEdit)
      ) : (
        <div className="space-y-4">
          {addresses.length > 0 ? (
            <div className="space-y-3">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  onClick={() => handleSelectAddress(address)}
                  className={`p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-green-500 ${
                    address.is_default ? 'border-l-4 border-green-500' : 
                    address.default_address ? 'border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <span className="font-medium">{address.display_name || address.recipient_name}</span>
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
                      <p className="text-sm text-gray-600">{address.phone}</p>
                      <p className="text-sm text-gray-800">
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
                    {!address.default_address && (
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(address);
                          }}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAddress(address.id);
                          }}
                          disabled={deleting === address.id}
                          className={`p-1.5 rounded-full ${
                            deleting === address.id
                              ? 'text-gray-400'
                              : 'text-red-500 hover:text-red-700 hover:bg-gray-100'
                          }`}
                        >
                          {deleting === address.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                          ) : (
                            <TrashIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">등록된 배송지가 없습니다.</p>
            </div>
          )}
          
          <Button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-green-600 text-white flex items-center justify-center"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            새 배송지 추가
          </Button>
        </div>
      )}
    </Modal>
  );
}

interface Window {
  daum: {
    Postcode: new (config: {
      oncomplete: (data: DaumPostcodeResult) => void;
    }) => {
      open: () => void;
    };
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