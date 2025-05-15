'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Textarea, Radio, Checkbox, Card, Spinner } from '@/components/ui/CommonStyles';
import ShippingAddressModal from './ShippingAddressModal';
import { getAuthHeader, checkToken } from '@/utils/auth';
import { Noto_Sans_Lao_Looped } from 'next/font/google';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

// 네이버페이 타입 선언
declare global {
  interface Window {
    Naver?: {
      Pay: {
        create: (options: any) => {
          open: (paymentOptions: any) => void;
        };
      };
    };
  }
}

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

  // 결제 관련 상태
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
        
        console.log('buyNowItem 데이터:', buyNowItem); // 디버깅용 로그 추가
        
        // 모든 옵션 정보가 있을 경우 (새 형식)
        if (buyNowItem.allOptions && buyNowItem.allOptions.length > 0) {
          // 각 옵션별로 아이템 생성
          directItems = buyNowItem.allOptions.map((option: any) => {
            const additionalPrice = parseInt(option.additionalPrice) || 0;
            const totalUnitPrice = basePrice + additionalPrice;
            
            return {
              id: `direct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              product_id: buyNowItem.product.id,
              product_option_id: option.id,
              quantity: option.quantity,
              product: {
                id: buyNowItem.product.id,
                name: buyNowItem.product.name,
                price: basePrice,
                thumbnail_url: buyNowItem.product.thumbnail_url
              },
              product_option: {
                id: option.id,
                option_name: option.name,
                option_value: option.value,
                additional_price: additionalPrice,
              },
              total_price: totalUnitPrice * option.quantity // 총 가격 추가
            };
          });
        } else {
          // 기존 형식 (단일 옵션 또는 옵션 없음)
          const additionalPrice = buyNowItem.option ? parseInt(buyNowItem.option.additionalPrice) || 0 : 0;
          const totalUnitPrice = basePrice + additionalPrice;
          
          // buyNowItem에 totalPrice가 있으면 그것을 사용
          const itemTotalPrice = buyNowItem.totalPrice || (totalUnitPrice * buyNowItem.quantity);
          
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
            total_price: itemTotalPrice // buyNowItem의 총 가격 사용
          }];
        }
        
        // 디버깅용 로그 추가
        console.log('체크아웃용 아이템:', directItems);
        
        // 상품 여러 개를 즉시 구매할 수 있도록 아이템 설정
        setCartItems(directItems);
        
        // 그룹화된 상품 정보 생성
        const grouped = groupItemsByProduct(directItems);
        setGroupedItems(grouped);
        
        // 총 가격 계산
        calculateTotalProductPrice(grouped);
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
      console.error('주문 정보 로딩 에러:', error);
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
      
      // 기본 가격과 추가 가격을 분리하여 처리
      const basePrice = parseInt(item.product.price) || 0;
      const additionalPrice = item.product_option ? (parseInt(item.product_option.additional_price) || 0) : 0;
      
      // total_price가 이미 계산되어 있으면 그 값을 사용, 없으면 계산
      const itemTotalPrice = item.total_price || ((basePrice + additionalPrice) * item.quantity);
      
      // 옵션 정보 저장
      groupedItems[productId].options.push({
        id: item.product_option ? item.product_option.id : 'base',
        option_name: item.product_option ? item.product_option.option_name : '기본',
        option_value: item.product_option ? item.product_option.option_value : '옵션 없음',
        additional_price: additionalPrice,
        quantity: item.quantity,
        price: basePrice + additionalPrice
      });
      
      // 그룹 전체의 수량 및 가격 합산
      groupedItems[productId].totalQuantity += item.quantity;
      groupedItems[productId].totalPrice += itemTotalPrice;
    });

    return Object.values(groupedItems);
  };

  // 총 상품 가격 계산
  const calculateTotalProductPrice = (groupedItems: GroupedCartItem[]) => {
    const total = groupedItems.reduce((total, group) => {
      // 그룹의 totalPrice 값이 이미 올바르게 계산되어 있으므로 이를 사용
      return total + group.totalPrice;
    }, 0);
    
    // 계산된 가격 설정
    setTotalPrice(total);
    setFinalPrice(total);
    
    return total;
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
  
  // 네이버페이 결제 처리 함수
  const handleNaverPayment = () => {
    if (typeof window === 'undefined' || !window.Naver || !window.Naver.Pay) {
      toast.error('네이버페이를 초기화할 수 없습니다.');
      return;
    }
    
    // 환경 변수를 사용하여 설정
    // 환경 변수가 작동하지 않는 경우 여기에 직접 값을 입력하세요
    const clientId = process.env.NEXT_PUBLIC_NAVER_PAY_CLIENT_ID || '여기에_클라이언트ID_입력';
    const chainId = process.env.NEXT_PUBLIC_NAVER_PAY_CHAIN_ID || '여기에_체인ID_입력';
    
    if (!clientId) {
      console.error('네이버페이 클라이언트 ID가 설정되지 않았습니다.');
      toast.error('결제 설정이 올바르지 않습니다. 관리자에게 문의해주세요.');
      return;
    }
    
    // 주문명 확인 및 생성
    let productName = orderNameForPayment;
    if (!productName || productName.trim() === '') {
      // orderNameForPayment가 비어있는 경우 다시 생성
      productName = cartItems.length > 0 
        ? cartItems.length > 1 
          ? `${cartItems[0].product.name} 외 ${cartItems.length - 1}건`
          : cartItems[0].product.name
        : '상품 주문';
    }
    
    // 고유한 주문 ID 생성
    const merchantPayKey = orderIdForPayment || uuidv4();
    
    // 네이버페이 객체 생성
    const oPay = window.Naver.Pay.create({
      "mode": "development", // 샌드박스 환경 설정
      "clientId": clientId,
      "chainId": chainId // chainId가 없을 경우 빈 문자열
    });
    
    console.log('네이버페이 결제 요청 정보:', {
      merchantUserKey: user?.id || 'guest',
      merchantPayKey: merchantPayKey,
      productName: productName,
      totalPayAmount: finalPrice,
      taxScopeAmount: finalPrice,
      taxExScopeAmount: 0
    });
    
    // 네이버페이 결제창 열기
    oPay.open({
      "merchantUserKey": user?.id || 'guest',
      "merchantPayKey": merchantPayKey,
      "productName": productName, // 재생성한 상품명 사용
      "totalPayAmount": finalPrice,
      "taxScopeAmount": finalPrice,
      "taxExScopeAmount": 0,
      "returnUrl": `${window.location.origin}/m/checkout/success?orderId=${merchantPayKey}`
    });
  };
  
  // 네이버페이 결제 버튼 클릭 핸들러
  const handleOpenNaverPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreeToTerms) {
      toast.error('주문 및 결제 정보 수집 동의가 필요합니다.');
      return;
    }
    
    if (!validateShippingInfo()) {
      return;
    }
    
    setOrderProcessing(true);
    
    try {
      // 배송 정보를 localStorage에 저장
      localStorage.setItem('checkoutShippingInfo', JSON.stringify(shippingInfo));
      
      // 주문 상품 정보를 localStorage에 저장
      const checkoutItems = cartItems.map(item => {
        const itemPrice = parseInt(item.product.price) || 0;
        const additionalPrice = item.product_option ? parseInt(item.product_option.additional_price) || 0 : 0;
        
        return {
          productId: item.product_id,
          productOptionId: item.product_option_id,
          name: item.product.name,
          price: itemPrice,
          originalPrice: itemPrice,
          quantity: item.quantity,
          image: item.product.thumbnail_url || '/images/default-product.png',
          option: item.product_option ? {
            id: item.product_option.id,
            name: item.product_option.option_name,
            value: item.product_option.option_value,
            additionalPrice: additionalPrice,
            quantity: item.quantity
          } : null
        };
      });
      
      localStorage.setItem('checkoutItems', JSON.stringify(checkoutItems));
      
      // 주문명 생성
      const orderName = cartItems.length > 1 
        ? `${cartItems[0].product.name} 외 ${cartItems.length - 1}건`
        : cartItems[0].product.name || '상품 주문';
      
      // UUID 형식의 주문 ID 생성
      const tempOrderId = uuidv4();
      console.log('tempOrderId', tempOrderId);
      
      // 임시 주문 ID와 주문명 저장
      setOrderIdForPayment(tempOrderId);
      setOrderNameForPayment(orderName);
      
      // 상태 업데이트 후에 네이버페이 결제창 호출을 위해 약간의 지연 추가
      setTimeout(() => {
        console.log('결제 정보 설정 완료:', { orderName, tempOrderId });
        handleNaverPayment();
        setOrderProcessing(false);
      }, 100);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : '주문 처리 중 오류가 발생했습니다.');
      setOrderProcessing(false);
    }
  };

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

  // 네이버페이 스크립트 로드 확인
  useEffect(() => {
    const checkNaverPayScript = () => {
      if (typeof window !== 'undefined') {
        if (window.Naver && window.Naver.Pay) {
          console.log('네이버페이 SDK가 로드되었습니다.');
          
          // 환경 변수 확인
          console.log('NAVER_PAY_CLIENT_ID 설정됨:', !!process.env.NEXT_PUBLIC_NAVER_PAY_CLIENT_ID);
          console.log('NAVER_PAY_CHAIN_ID 설정됨:', !!process.env.NEXT_PUBLIC_NAVER_PAY_CHAIN_ID);
        } else {
          console.log('네이버페이 SDK가 로드되지 않았습니다. 스크립트 확인이 필요합니다.');
          
          // 수동으로 스크립트 로드 시도
          const script = document.createElement('script');
          script.src = 'https://nsp.pay.naver.com/sdk/js/naverpay.min.js';
          script.async = true;
          script.onload = () => console.log('네이버페이 SDK가 수동으로 로드되었습니다.');
          script.onerror = () => console.error('네이버페이 SDK 로드 실패');
          document.head.appendChild(script);
        }
      }
    };
    
    // 페이지 로드 후 약간의 지연시간을 두고 확인
    const timer = setTimeout(checkNaverPayScript, 1500);
    return () => clearTimeout(timer);
  }, []);

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
      toast.error('받는 사람 이름을 입력해주세요.');
      return false;
    }
    if (!shippingInfo.phone) {
      toast.error('연락처를 입력해주세요.');
      return false;
    }
    if (!shippingInfo.address) {
      toast.error('주소를 입력해주세요.');
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
            onClick={handleOpenNaverPayment}
            disabled={!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address || !agreeToTerms || orderProcessing}
            className={`w-full py-3 mt-4 ${
              orderProcessing ? 'bg-gray-400' : 'bg-[#03C75A]'
            } text-white flex justify-center items-center`}
            id="naverPayBtn"
          >
            {orderProcessing ? (
              <div className="flex items-center justify-center">
                <Spinner size="sm" className="mr-2" />
                처리 중...
              </div>
            ) : (
              <>
                <span className="font-bold mr-1.5 text-lg">N</span>
                <span>네이버페이 결제하기</span>
              </>
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
    </div>
  );
} 