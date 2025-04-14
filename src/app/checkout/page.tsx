'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Textarea, Radio, Checkbox, Card } from '@/components/ui/CommonStyles';
import ShippingAddressModal from './ShippingAddressModal';

interface User {
  id: string;
  login_id?: string;
  name: string;
  nickname?: string;
  email: string;
  phone?: string;
  phone_number?: string;
  address?: string;
  detail_address?: string;
}

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  option?: {
    name: string;
    value: string;
  };
  shippingFee: number;
}

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

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    phone: '',
    address: '',
    detailAddress: '',
    memo: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);

  useEffect(() => {
    checkLoginStatus();
    loadCheckoutItems();
  }, []);

  // 사용자 정보가 로드된 후 1초 후에 배송지 목록 로드 시도
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        loadShippingAddresses();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  const checkLoginStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth');
        return;
      }
      
      // 토큰에서 직접 사용자 정보 추출 시도
      try {
        const tokenData = JSON.parse(token);
        if (tokenData && tokenData.user) {
          setUser(tokenData.user);
          // 사용자 ID를 토큰에서 추출하여 저장
          if (!localStorage.getItem('userId') && tokenData.user.id) {
            localStorage.setItem('userId', tokenData.user.id);
          }
          
          // 사용자 배송지 정보 초기화
          if (tokenData.user.name || tokenData.user.phone_number || tokenData.user.phone || tokenData.user.address) {
            setShippingInfo(prev => ({
              ...prev,
              name: tokenData.user.name || prev.name,
              phone: tokenData.user.phone_number || tokenData.user.phone || prev.phone,
              address: tokenData.user.address || prev.address,
              detailAddress: tokenData.user.detail_address || prev.detailAddress
            }));
          }
          return;
        }
      } catch (parseError) {
        console.error('토큰 파싱 오류:', parseError);
        localStorage.removeItem('token');
        router.push('/auth');
        return;
      }
      
      // 로그인 상태 확인 API 호출
      const response = await fetch('/api/users/is-logged-in', {
        method: 'GET',
      });

      if (!response.ok) {
        // 로그인 상태 확인 실패
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        router.push('/auth');
        return;
      }

      // 사용자 ID 확인
      const userId = localStorage.getItem('userId');
      if (!userId) {
        localStorage.removeItem('token');
        router.push('/auth');
        return;
      }
      
      // 사용자 ID로 정보 조회
      const userResponse = await fetch(`/api/users/${userId}`, {
        method: 'GET',
      });
      
      if (!userResponse.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        router.push('/auth');
        return;
      }
      
      const userData = await userResponse.json();
      if (userData && userData.user) {
        setUser(userData.user);
        // 사용자 배송지 정보 초기화
        if (userData.user.name || userData.user.phone_number || userData.user.phone || userData.user.address) {
          setShippingInfo(prev => ({
            ...prev,
            name: userData.user.name || prev.name,
            phone: userData.user.phone_number || userData.user.phone || prev.phone,
            address: userData.user.address || prev.address,
            detailAddress: userData.user.detail_address || prev.detailAddress
          }));
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        router.push('/auth');
      }
    } catch (error) {
      console.error('로그인 상태 확인 오류:', error);
      setError('로그인 상태를 확인하는 중 오류가 발생했습니다.');
      setTimeout(() => {
        router.push('/auth');
      }, 2000);
    }
  };

  const loadCheckoutItems = async () => {
    setLoading(true);
    try {
      // 로컬 스토리지에서 체크아웃 아이템 가져오기
      const checkoutItems = localStorage.getItem('checkoutItems');
      if (!checkoutItems) {
        router.push('/cart');
        return;
      }

      try {
        const parsedItems = JSON.parse(checkoutItems);
        // 데이터 유효성 검사
        if (Array.isArray(parsedItems)) {
          setItems(parsedItems);
        } else {
          throw new Error('유효하지 않은 체크아웃 아이템 형식');
        }
      } catch (parseError) {
        console.error('체크아웃 아이템 파싱 오류:', parseError);
        setError('체크아웃 아이템 형식이 올바르지 않습니다.');
        router.push('/cart');
      }
    } catch (error) {
      console.error('체크아웃 아이템 로드 오류:', error);
      setError('체크아웃 아이템을 로드하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 사용자의 배송지 목록 로드
  const loadShippingAddresses = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      
      console.log('배송지 목록 로드 시도:', userId);
      
      const response = await fetch(`/api/shipping-addresses?userId=${userId}`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.addresses && Array.isArray(data.addresses)) {
          console.log('불러온 배송지 목록:', data.addresses.length);
          
          // 이미 선택된 배송지가 있는 경우, 해당 ID 저장
          const currentSelectedId = selectedAddressId;
          
          // 배송지 목록 업데이트
          setAddresses(data.addresses);
          
          // 이미 선택된 배송지가 있고, 새로 로드된 배송지 목록에도 있는 경우 유지
          if (currentSelectedId) {
            const selectedAddressExists = data.addresses.find(
              (addr: ShippingAddress) => addr.id === currentSelectedId
            );
            
            if (selectedAddressExists) {
              console.log('기존 선택된 배송지 유지:', currentSelectedId);
              return;
            }
          }
          
          // 선택된 배송지가 없거나 유효하지 않은 경우, 우선순위에 따라 선택
          // 1. 기본 배송지
          const defaultAddress = data.addresses.find((addr: ShippingAddress) => addr.is_default);
          if (defaultAddress) {
            console.log('기본 배송지 선택:', defaultAddress.id);
            setSelectedAddressId(defaultAddress.id);
            updateShippingInfo(defaultAddress);
            return;
          }
          
          // 2. 사용자 기본 주소
          const userDefaultAddress = data.addresses.find(
            (addr: ShippingAddress) => addr.default_user_address
          );
          if (userDefaultAddress) {
            console.log('사용자 기본 주소 선택:', userDefaultAddress.id);
            setSelectedAddressId(userDefaultAddress.id);
            updateShippingInfo(userDefaultAddress);
            return;
          }
          
          // 3. 첫 번째 배송지
          if (data.addresses.length > 0) {
            console.log('첫 번째 배송지 선택:', data.addresses[0].id);
            setSelectedAddressId(data.addresses[0].id);
            updateShippingInfo(data.addresses[0]);
            return;
          }
        }
      } else {
        console.error('배송지 목록 API 오류 응답:', response.status);
      }
      
      // 배송지 목록을 가져오지 못하거나 선택할 배송지가 없는 경우 사용자 정보를 기본 배송지로 사용
      if (!selectedAddressId && user) {
        console.log('배송지 목록을 불러올 수 없어 사용자 정보를 사용합니다.');
        setShippingInfo({
          name: user.name || '',
          phone: user.phone_number || user.phone || '',
          address: user.address || '',
          detailAddress: user.detail_address || '',
          memo: '',
        });
      }
    } catch (error) {
      console.error('배송지 목록 로드 오류:', error);
      // 오류가 발생해도 선택된 배송지가 없는 경우에만 사용자 정보를 기본 배송지로 사용
      if (!selectedAddressId && user) {
        setShippingInfo({
          name: user.name || '',
          phone: user.phone_number || user.phone || '',
          address: user.address || '',
          detailAddress: user.detail_address || '',
          memo: '',
        });
      }
    }
  };

  // 배송지 정보 업데이트
  const updateShippingInfo = (address: ShippingAddress) => {
    setShippingInfo({
      name: address.recipient_name,
      phone: address.phone,
      address: address.address,
      detailAddress: address.detail_address || '',
      memo: address.memo || '',
    });
  };

  // 배송지 선택 변경 핸들러
  const handleAddressChange = (address: ShippingAddress) => {
    setSelectedAddressId(address.id);
    updateShippingInfo(address);
  };

  const handleShippingInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentMethod(e.target.value);
  };

  const calculateTotalPrice = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTotalShippingFee = () => {
    // 배송비 계산 로직 (중복되는 판매자의 배송비는 한 번만 계산)
    const sellerShippingMap = new Map();
    
    items.forEach(item => {
      const sellerId = item.productId.split('-')[0]; // 가정: productId의 첫 부분이 판매자 ID
      if (!sellerShippingMap.has(sellerId) || item.shippingFee > sellerShippingMap.get(sellerId)) {
        sellerShippingMap.set(sellerId, item.shippingFee);
      }
    });
    
    return Array.from(sellerShippingMap.values()).reduce((total, fee) => total + fee, 0);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreeToTerms) {
      alert('주문 정보 및 결제 동의가 필요합니다.');
      return;
    }
    
    if (items.length === 0) {
      alert('주문할 상품이 없습니다.');
      router.push('/cart');
      return;
    }
    
    // 배송 정보가 비어있는지 확인
    const isShippingEmpty = !shippingInfo.name || !shippingInfo.phone || !shippingInfo.address;
    
    // 배송 정보가 비었지만 사용자 정보가 있는 경우, 사용자 정보로 채우기
    if (isShippingEmpty && user) {
      setShippingInfo({
        name: user.name || '',
        phone: user.phone_number || user.phone || '',
        address: user.address || '',
        detailAddress: user.detail_address || '',
        memo: shippingInfo.memo
      });
      
      // 그래도 필수 정보가 없으면 알림
      if (!user.name || (!user.phone_number && !user.phone) || !user.address) {
        alert('배송지 정보를 모두 입력해주세요. 마이페이지에서 기본 주소를 설정해주세요.');
        return;
      }
    } else if (isShippingEmpty) {
      alert('배송지 정보를 모두 입력해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      
      // 토큰 확인
      const token = localStorage.getItem('token');
      if (!token) {
        alert('로그인이 필요합니다.');
        router.push('/auth');
        return;
      }
      
      // 사용자 ID 확인
      const userId = localStorage.getItem('userId');
      if (!userId) {
        // 토큰에서 사용자 ID 추출 시도
        try {
          const tokenData = JSON.parse(token);
          if (tokenData && tokenData.user && tokenData.user.id) {
            localStorage.setItem('userId', tokenData.user.id);
          } else {
            alert('로그인이 필요합니다.');
            router.push('/auth');
            return;
          }
        } catch (parseError) {
          console.error('토큰 파싱 오류:', parseError);
          localStorage.removeItem('token');
          alert('로그인이 필요합니다.');
          router.push('/auth');
          return;
        }
      }
      
      const orderData = {
        userId: localStorage.getItem('userId'), // 다시 가져와서 사용
        items,
        shipping: shippingInfo,
        payment: {
          method: paymentMethod,
          totalAmount: calculateTotalPrice() + calculateTotalShippingFee()
        }
      };
      
      // 주문 API 호출
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '주문 처리 중 오류가 발생했습니다.' }));
        throw new Error(errorData.message || '주문 처리 중 오류가 발생했습니다.');
      }
      
      const data = await response.json();
      
      // 주문 성공 처리
      localStorage.removeItem('checkoutItems');
      alert('주문이 완료되었습니다.');
      router.push(`/mypage/orders/${data.orderId}`);
    } catch (error) {
      console.error('주문 처리 오류:', error);
      alert(error instanceof Error ? error.message : '주문 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">오류:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
        <div className="mt-4">
          <Link href="/cart" className="text-green-600 hover:underline">
            장바구니로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">주문/결제</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* 주문 상품 정보 */}
          <Card title="주문 상품 정보" className="mb-6">
            {items.map((item) => (
              <div key={item.id} className="flex items-center border-b py-4">
                <div className="w-20 h-20 relative flex-shrink-0">
                  <Image
                    src={item.image || '/images/default-product.png'}
                    alt={item.name}
                    fill
                    className="object-cover rounded"
                  />
                </div>
                <div className="ml-4 flex-grow">
                  <h3 className="font-medium">{item.name}</h3>
                  {item.option && (
                    <p className="text-sm text-gray-600">
                      옵션: {item.option.name} - {item.option.value}
                    </p>
                  )}
                  <div className="flex justify-between mt-2">
                    <p className="text-sm">
                      {item.quantity}개 × {item.price.toLocaleString()}원
                    </p>
                    <p className="font-medium">
                      {(item.price * item.quantity).toLocaleString()}원
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    배송비: {item.shippingFee > 0 ? `${item.shippingFee.toLocaleString()}원` : '무료'}
                  </p>
                </div>
              </div>
            ))}
            <div className="mt-4 text-right">
              <p className="text-gray-600">상품 금액: {calculateTotalPrice().toLocaleString()}원</p>
              <p className="text-gray-600">배송비: {calculateTotalShippingFee().toLocaleString()}원</p>
              <p className="text-lg font-semibold">
                결제 예정 금액: {(calculateTotalPrice() + calculateTotalShippingFee()).toLocaleString()}원
              </p>
            </div>
          </Card>
          
          {/* 배송지 정보 */}
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">배송지 정보</h2>
              <Button 
                onClick={() => setShowAddressModal(true)}
                variant="link"
                size="sm"
              >
                배송지 목록 관리
              </Button>
            </div>
            
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-gray-600 text-sm mb-1">수령인</p>
                <p className="font-medium">{shippingInfo.name || '배송지를 선택해주세요'}</p>
              </div>
              
              <div>
                <p className="text-gray-600 text-sm mb-1">연락처</p>
                <p className="font-medium">{shippingInfo.phone || '배송지를 선택해주세요'}</p>
              </div>
              
              <div>
                <p className="text-gray-600 text-sm mb-1">주소</p>
                <p className="font-medium">{shippingInfo.address || '배송지를 선택해주세요'}</p>
                {shippingInfo.detailAddress && (
                  <p className="text-gray-700">{shippingInfo.detailAddress}</p>
                )}
              </div>
              
              <div>
                <Textarea
                  label="배송 메모"
                  id="memo"
                  name="memo"
                  value={shippingInfo.memo}
                  onChange={handleShippingInfoChange}
                  rows={3}
                  placeholder="배송 시 요청사항을 입력해주세요"
                />
              </div>
            </div>
          </Card>
          
          {/* 결제 수단 */}
          <Card title="결제 수단" className="mb-6">
            <div className="space-y-2">
              <Radio
                label="신용/체크카드"
                name="paymentMethod"
                value="card"
                checked={paymentMethod === 'card'}
                onChange={handlePaymentChange}
              />
              <Radio
                label="카카오페이"
                name="paymentMethod"
                value="kakao"
                checked={paymentMethod === 'kakao'}
                onChange={handlePaymentChange}
              />
              <Radio
                label="토스"
                name="paymentMethod"
                value="toss"
                checked={paymentMethod === 'toss'}
                onChange={handlePaymentChange}
              />
            </div>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          {/* 결제 정보 요약 */}
          <Card title="결제 정보" className="mb-6 sticky top-4">
            <div className="space-y-2 border-b pb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">상품 금액</span>
                <span>{calculateTotalPrice().toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">배송비</span>
                <span>{calculateTotalShippingFee().toLocaleString()}원</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 font-semibold">
              <span>총 결제 금액</span>
              <span className="text-xl text-green-600">
                {(calculateTotalPrice() + calculateTotalShippingFee()).toLocaleString()}원
              </span>
            </div>
            
            <div className="mt-6">
              <Checkbox
                label="주문 정보 확인 및 결제에 동의합니다"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
              />
              
              <Button
                onClick={handleSubmitOrder}
                disabled={loading || !agreeToTerms}
                variant="primary"
                size="lg"
                fullWidth
                className="mt-4"
              >
                {loading ? '처리 중...' : '결제하기'}
              </Button>
            </div>
            
            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => router.push('/cart')}
              >
                장바구니로 돌아가기
              </Button>
            </div>
          </Card>
        </div>
      </div>
      
      {/* 배송지 관리 모달 */}
      <ShippingAddressModal 
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        userId={user?.id || localStorage.getItem('userId')}
        onAddressSelect={(address) => {
          // 배송지 정보 직접 업데이트 (loadShippingAddresses 호출하지 않음)
          setSelectedAddressId(address.id);
          updateShippingInfo(address);
          
          // 선택된 배송지를 현재 배송지 목록에 추가/업데이트
          const addressExists = addresses.some(addr => addr.id === address.id);
          if (!addressExists) {
            setAddresses(prev => [address, ...prev]);
          } else {
            // 기존 배열에서 선택된 배송지 정보 업데이트
            setAddresses(prev => 
              prev.map(addr => addr.id === address.id ? address : addr)
            );
          }
        }}
        currentAddresses={addresses}
      />
    </div>
  );
}

// 타입 정의 추가
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

// DaumPostcodeResult 인터페이스 정의 추가
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