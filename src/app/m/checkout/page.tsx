'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Textarea, Radio, Checkbox, Card, Spinner } from '@/components/ui/CommonStyles';
import ShippingAddressModal from './ShippingAddressModal';
import PaymentModal from './PaymentModal';
import { getAuthHeader, checkToken } from '@/utils/auth';
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";
import { Noto_Sans_Lao_Looped } from 'next/font/google';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  login_id?: string;
  name?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  address?: string;
  detail_address?: string;
  postcode?: string;
  memo?: string;
}

interface GroupedCartItem {
  product_id: string;
  product: {
    id: string;
    name: string;
    price: number;
    thumbnail_url?: string;
  };
  options: {
    id: string;
    option_name: string;
    option_value: string;
    additional_price: number;
    quantity: number;
    price: number;
  }[];
  totalQuantity: number;
  totalPrice: number;
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
  default_address?: boolean;
  note?: string;
  display_name?: string;
}

export default function MobileCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDirect = useMemo(() => searchParams?.get('direct') === 'true', [searchParams]);
  const isBuyNow = useMemo(() => searchParams?.get('type') === 'buy-now', [searchParams]);
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectableAddresses, setSelectableAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [groupedItems, setGroupedItems] = useState<GroupedCartItem[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentAttempts, setPaymentAttempts] = useState(0);
  const [orderRequests, setOrderRequests] = useState<string>('');
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    phone: '',
    address: '',
    detailAddress: '',
    memo: '',
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [token, setToken] = useState('');
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  
  // 결제 UI 컨테이너 참조 제거
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);
  const [isNewAddress, setIsNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<ShippingAddress>({
    id: '',
    recipient_name: '',
    phone: '',
    address: '',
    detail_address: '',
    is_default: false
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderIdForPayment, setOrderIdForPayment] = useState('');
  const [orderNameForPayment, setOrderNameForPayment] = useState('');

  // 로그인 상태 확인
  const checkLoginStatus = async () => {
    try {
      const { user: tokenUser, isLoggedIn } = checkToken();
      
      if (!isLoggedIn || !tokenUser) {
        router.push('/m/auth');
        return false;
      }

      const headers = getAuthHeader();
      if (!headers.Authorization) {
        router.push('/m/auth');
        return false;
      }

      const response = await fetch('/api/auth/check-session', {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setUser({ id: tokenUser.id });
          return true;
        } else {
          router.push('/m/auth');
          return false;
        }
      } else {
        router.push('/m/auth');
        return false;
      }
    } catch (error) {
      router.push('/m/auth');
      return false;
    }
  };

  // 배송지 목록 로드 함수
  const loadShippingAddresses = async () => {
    try {
      const { user: tokenUser, isLoggedIn } = checkToken();
      
      if (!isLoggedIn || !tokenUser) {
        setError('로그인이 필요합니다.');
        router.push('/m/auth');
        return;
      }
      
      const userId = tokenUser.id;
      localStorage.setItem('userId', userId);
      
      const headers = getAuthHeader();
      const response = await fetch(`/api/shipping-addresses?userId=${userId}`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error('배송지 정보를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      const addressList = data.addresses || [];
      setAddresses(addressList);
      
      const defaultAddress = addressList.find((addr: ShippingAddress) => 
        addr.is_default || addr.default_address
      );
      
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
        setSelectedAddressId(defaultAddress.id);
        setShippingInfo({
          name: defaultAddress.recipient_name,
          phone: defaultAddress.phone,
          address: defaultAddress.address,
          detailAddress: defaultAddress.detail_address || '',
          memo: defaultAddress.memo || '',
        });
      }
    } catch (error) {
      setError('배송지 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 주문 상품 로드
  const loadDirectCheckoutItems = () => {
    try {
      let directItems: any[] = [];
      
      if (isBuyNow) {
        const buyNowData = localStorage.getItem('buyNowItem');
        if (!buyNowData) {
          setErrorMessage('상품 정보를 찾을 수 없습니다.');
          return;
        }
        
        const buyNowItem = JSON.parse(buyNowData);
        const basePrice = parseInt(buyNowItem.product.price) || 0;
        const additionalPrice = buyNowItem.option ? parseInt(buyNowItem.option.additionalPrice) || 0 : 0;
        const totalUnitPrice = basePrice + additionalPrice;
        
        directItems = [{
          id: `direct_${Date.now()}`,
          product_id: buyNowItem.product.id,
          product_option_id: buyNowItem.option ? buyNowItem.option.id : null,
          quantity: buyNowItem.quantity,
          product: {
            id: buyNowItem.product.id,
            name: buyNowItem.product.name,
            price: basePrice,
            thumbnail_url: buyNowItem.product.thumbnail_url
          },
          product_option: buyNowItem.option ? {
            id: buyNowItem.option.id,
            option_name: buyNowItem.option.name,
            option_value: buyNowItem.option.value,
            additional_price: additionalPrice,
          } : null,
        }];
      } else {
        const checkoutData = localStorage.getItem('checkoutItems');
        if (!checkoutData) {
          setErrorMessage('주문할 상품 정보를 찾을 수 없습니다.');
          return;
        }
        
        const checkoutItems = JSON.parse(checkoutData);
        directItems = checkoutItems.map((item: any) => {
          const totalPrice = parseInt(item.price) || 0;
          const hasOption = !!item.option;
          const additionalPrice = 0;
          const basePrice = totalPrice;
          
          return {
            id: item.id,
            product_id: item.productId,
            product_option_id: item.productOptionId,
            quantity: item.quantity,
            product: {
              id: item.productId,
              name: item.name,
              price: totalPrice,
              thumbnail_url: item.image
            },
            product_option: hasOption ? {
              id: item.productOptionId,
              option_name: item.option.name,
              option_value: item.option.value,
              additional_price: 0
            } : null
          };
        });
      }
      
      setCartItems(directItems);
      const grouped = groupItemsByProduct(directItems);
      setGroupedItems(grouped);
      const productTotal = calculateTotalProductPrice(grouped);
      setTotalPrice(productTotal);
      setFinalPrice(productTotal);
      
    } catch (error) {
      setErrorMessage('주문 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 상품 그룹화
  const groupItemsByProduct = (items: any[]): GroupedCartItem[] => {
    const groupedItems: Record<string, GroupedCartItem> = {};

    items.forEach(item => {
      const productId = item.product_id;
      
      if (!groupedItems[productId]) {
        groupedItems[productId] = {
          product_id: productId,
          product: item.product,
          options: [],
          totalQuantity: 0,
          totalPrice: 0
        };
      }
      
      // 장바구니에서 넘어온 가격 그대로 사용
      const itemTotalPrice = parseInt(item.product.price) * item.quantity;
      
      // 옵션 정보 저장
      groupedItems[productId].options.push({
        id: item.product_option ? item.product_option.id : 'base',
        option_name: item.product_option ? item.product_option.option_name : '기본',
        option_value: item.product_option ? item.product_option.option_value : '옵션 없음',
        additional_price: 0,
        quantity: item.quantity,
        price: parseInt(item.product.price) // 각 옵션의 가격 저장
      });
      
      // 그룹의 총 수량과 가격 갱신
      groupedItems[productId].totalQuantity += item.quantity;
      groupedItems[productId].totalPrice += itemTotalPrice;
      
    });
    
    return Object.values(groupedItems);
  };

  // 총 상품 금액 계산
  const calculateTotalProductPrice = (groupedItems: any[]) => {
    const total = groupedItems.reduce((total, group) => {
      // 각 그룹의 totalPrice를 그대로 사용
      return total + group.totalPrice;
    }, 0);
    
    return total;
  };

  // 주문 검증 및 모달 오픈
  const handleOpenPaymentModal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreeToTerms) {
      alert('주문 및 결제 정보 수집 동의가 필요합니다.');
      return;
    }
    
    if (!validateShippingInfo()) {
      return;
    }
    
    setOrderProcessing(true);
    
    try {
      // 배송 정보를 localStorage에 저장
      localStorage.setItem('checkoutShippingInfo', JSON.stringify(shippingInfo));
      
      // 주문 상품 정보를 localStorage에 저장 (아직 저장되지 않은 경우)
      if (!localStorage.getItem('checkoutItems')) {
        const checkoutItems = cartItems.map(item => {
          const itemPrice = parseInt(item.product.price) || 0;
          return {
            productId: item.product_id,
            productOptionId: item.product_option_id || null,
            name: item.product.name,
            price: itemPrice,
            quantity: item.quantity,
            image: item.product.thumbnail_url || '/images/default-product.png',
            option: item.product_option ? {
              name: item.product_option.option_name,
              value: item.product_option.option_value,
              additionalPrice: item.product_option.additional_price || 0
            } : null
          };
        });
        
        localStorage.setItem('checkoutItems', JSON.stringify(checkoutItems));
      }
      
      // 주문명 생성
      const orderName = cartItems.length > 1 
        ? `${cartItems[0].product.name} 외 ${cartItems.length - 1}건`
        : cartItems[0].product.name;
      
      // UUID 형식의 주문 ID 생성
      const tempOrderId = uuidv4();
      
      setOrderIdForPayment(tempOrderId);
      setOrderNameForPayment(orderName);
      setShowPaymentModal(true);
      setOrderProcessing(false);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : '주문 처리 중 오류가 발생했습니다.');
      setOrderProcessing(false);
    }
  };

  // 결제 성공 처리
  const handlePaymentSuccess = async () => {
    // 이 단계는 실제로는 successUrl에서 처리됨
    setOrderProcessing(false);
  };

  // 결제 실패 처리
  const handlePaymentFail = (error: any) => {
    setOrderError(error.message || '결제 처리에 실패했습니다.');
    setOrderProcessing(false);
  };

  // 페이지 초기화
  useEffect(() => {
    const initializePage = async () => {
      try {
        setLoading(true);
        const isLoggedIn = await checkLoginStatus();
        
        if (!isLoggedIn) {
          return; // 로그인 실패 시 더 이상 진행하지 않음
        }
        
        // 로그인에 성공한 경우에만 실행
        await Promise.all([
          loadDirectCheckoutItems(),
          loadShippingAddresses()
        ]);
      } catch (error) {
        setErrorMessage('페이지 로딩 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, []);

  // 사용자 정보가 변경되면 배송지 목록 로드
  useEffect(() => {
    if (user && !selectedAddressId) {
      loadShippingAddresses();
    }
  }, [user, selectedAddressId]);

  // 배송지 선택되지 않았지만 배송지 정보 있을 때 처리
  useEffect(() => {
    // 배송지 ID는 없지만 배송 정보가 있을 경우 (예: 모달에서 선택은 안했지만 기본 배송지 정보는 있는 경우)
    if (!selectedAddressId && 
        shippingInfo.name && 
        shippingInfo.phone && 
        shippingInfo.address && 
        addresses.length > 0) {
      // 기본 배송지 선택
      const defaultAddr = addresses.find(addr => addr.is_default || addr.default_address);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      }
    }
  }, [shippingInfo, addresses, selectedAddressId]);

  // 로딩 중일 때 표시할 스피너
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-500">주문 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  // 에러가 있을 때 표시할 화면
  if (errorMessage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-red-500 mb-4">{errorMessage}</p>
        <Button
          onClick={() => router.push('/m/cart')}
          className="bg-green-600 text-white"
        >
          장바구니로 돌아가기
        </Button>
      </div>
    );
  }

  // 배송 정보 유효성 검사
  const validateShippingInfo = () => {
    if (!shippingInfo.name) {
      alert('받는 사람 이름을 입력해주세요.');
      return false;
    }
    if (!shippingInfo.phone) {
      alert('연락처를 입력해주세요.');
      return false;
    }
    if (!shippingInfo.address) {
      alert('주소를 입력해주세요.');
      return false;
    }
    return true;
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
    setSelectedAddressId(address.id);
  };

  // 배송지 변경
  const handleAddressChange = (address: ShippingAddress) => {
    updateShippingInfo(address);
    setShowAddressModal(false);
  };

  // 배송 정보 변경
  const handleShippingInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      {/* 주문 상품 목록 */}
      <div className="bg-white p-4 mb-4">
        <h2 className="text-lg font-medium mb-4">주문 상품</h2>
        {groupedItems.map((group) => (
          <div key={group.product_id} className="mb-4 pb-4 border-b border-gray-100 last:border-0">
            <div className="flex items-start">
              <div className="relative w-20 h-20 mr-3">
                <Image
                  src={group.product.thumbnail_url || '/images/default-product.png'}
                  alt={group.product.name}
                  fill
                  className="object-cover rounded"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{group.product.name}</h3>
                <p className="text-sm text-gray-500">
                  {group.totalQuantity}개 | {group.totalPrice.toLocaleString()}원
                </p>
                {group.options.map((option) => {
                  // 각 옵션의 가격 그대로 사용
                  const optionTotalPrice = option.price * option.quantity;
                  
                  return (
                    <div key={option.id} className="text-sm text-gray-600 mt-1">
                      <p>{option.option_name}: {option.option_value}</p>
                      <p>{option.quantity}개 × {option.price.toLocaleString()}원 = {optionTotalPrice.toLocaleString()}원</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 배송 정보 */}
      <div className="bg-white p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">배송 정보</h2>
          <Button
            onClick={() => {
              setShowAddressModal(true);
            }}
            className="text-sm text-green-600"
          >
            배송지 선택
          </Button>
        </div>
        
        {selectedAddressId ? (
          <div className="space-y-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">수령인</p>
              <p className="font-medium">{shippingInfo.name}</p>
            </div>
            
            <div>
              <p className="text-gray-600 text-sm mb-1">연락처</p>
              <p className="font-medium">{shippingInfo.phone}</p>
            </div>
            
            <div>
              <p className="text-gray-600 text-sm mb-1">주소</p>
              <p className="font-medium">{shippingInfo.address}</p>
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
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500">배송지를 선택해주세요.</p>
          </div>
        )}
      </div>

      {/* 결제 정보 */}
      <div className="bg-white p-4 mb-4">
        <h2 className="text-lg font-medium mb-4">결제 정보</h2>
        <div className="space-y-2 border-b pb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">상품 금액</span>
            <span>{totalPrice.toLocaleString()}원</span>
          </div>
        </div>
        <div className="flex justify-between items-center pt-4 font-semibold">
          <span>총 결제 금액</span>
          <span className="text-xl text-green-600">
            {finalPrice.toLocaleString()}원
          </span>
        </div>

        <div className="mt-6">
          <Checkbox
            label="주문 정보 확인 및 결제에 동의합니다"
            checked={agreeToTerms}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
          />
          
          <Button
            onClick={handleOpenPaymentModal}
            disabled={!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address || !agreeToTerms || orderProcessing}
            className={`w-full py-3 mt-4 ${
              orderProcessing ? 'bg-gray-400' : 'bg-green-600'
            } text-white`}
          >
            {orderProcessing ? (
              <div className="flex items-center justify-center">
                <Spinner size="sm" className="mr-2" />
                처리 중...
              </div>
            ) : (
              '결제하기'
            )}
          </Button>
          
          {orderError && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
              <p className="text-sm">{orderError}</p>
            </div>
          )}
          
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => router.push('/m/cart')}
            >
              장바구니로 돌아가기
            </Button>
          </div>
        </div>
      </div>

      {/* 배송지 선택 모달 */}
      <ShippingAddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        userId={user?.id || ''}
        onAddressSelect={handleAddressChange}
        currentAddresses={addresses}
      />

      {/* 결제 모달 */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        orderId={orderIdForPayment}
        orderName={orderNameForPayment}
        customerName={shippingInfo.name}
        customerEmail={user?.email || ''}
        amount={finalPrice}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFail={handlePaymentFail}
      />
    </div>
  );
} 