'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Textarea, Radio, Checkbox, Card, Spinner } from '@/components/ui/CommonStyles';
import ShippingAddressModal from './ShippingAddressModal';
import { getAuthHeader, checkToken } from '@/utils/auth';
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";

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

interface CartItem {
  id: string;
  productId: string;
  productOptionId?: string | null;
  name: string;
  price: number;
  quantity: number;
  image: string;
  option?: {
    name: string;
    value: string;
    additional_price: number;
  };
  shippingFee: number;
  originalPrice: number;
  additionalPrice: number;
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
}

export default function MobileCheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<any[]>([]);
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
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [token, setToken] = useState('');
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  
  // 계산된 가격 정보
  const [totalPrice, setTotalPrice] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  
  // 토스 페이먼츠 위젯 관련 상태
  const [widgets, setWidgets] = useState<any>(null);
  const [ready, setReady] = useState(false);
  
  // 결제 UI 컨테이너 참조
  const paymentMethodRef = useRef<HTMLDivElement>(null);
  const agreementRef = useRef<HTMLDivElement>(null);

  // 로그인 상태 확인
  const checkLoginStatus = async () => {
    try {
      const { user: tokenUser, isLoggedIn } = checkToken();
      
      if (!isLoggedIn || !tokenUser) {
        router.push('/m/auth');
        return;
      }

      const headers = getAuthHeader();
      if (!headers.Authorization) {
        router.push('/m/auth');
        return;
      }

      const response = await fetch('/api/auth/check-session', {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setUser({ id: tokenUser.id });
        } else {
          router.push('/m/auth');
        }
      } else {
        router.push('/m/auth');
      }
    } catch (error) {
      console.error('로그인 상태 확인 오류:', error);
      router.push('/m/auth');
    }
  };

  // 주문 상품 로드
  const loadCheckoutItems = async () => {
    setLoading(true);
    try {
      // URL 쿼리에서 direct 파라미터 확인
      const urlParams = new URLSearchParams(window.location.search);
      const isDirect = urlParams.get('direct') === 'true';
      
      if (isDirect) {
        // 바로 구매 아이템 가져오기
        const directItems = localStorage.getItem('directCheckoutItems');
        if (!directItems) {
          setError('바로 구매 정보를 찾을 수 없습니다.');
          router.push('/m/products');
          return;
        }
        
        try {
          const parsedItems = JSON.parse(directItems);
          if (Array.isArray(parsedItems)) {
            // directCheckoutItems의 형식을 기존 체크아웃 아이템 형식으로 변환
            const formattedItems = parsedItems.map(item => {
              // 상품 가격 - 옵션 추가 가격이 포함된 가격 사용
              const itemPrice = item.option_price || (item.product.discount_price || item.product.price);
              // 옵션 추가 가격이 있는 경우
              const additionalPrice = item.product_option ? item.product_option.additional_price : 0;
              const totalItemPrice = itemPrice * item.quantity;
              
              return {
                id: `direct_${item.product_id}${item.product_option_id ? '_' + item.product_option_id : ''}`,
                productId: item.product_id,
                productOptionId: item.product_option_id || null,
                name: item.product.name,
                price: itemPrice,
                originalPrice: item.product.discount_price || item.product.price,
                additionalPrice: additionalPrice,
                quantity: item.quantity,
                image: item.product.thumbnail_url || '/images/default-product.png',
                option: item.product_option ? {
                  name: item.product_option.option_name,
                  value: item.product_option.option_value,
                  additional_price: additionalPrice
                } : undefined,
                totalPrice: totalItemPrice,
                shippingFee: 0
              };
            });
            
            setItems(formattedItems);
            
            // 상품 그룹화
            const grouped = groupItemsByProduct(formattedItems);
            setGroupedItems(grouped);
            
            // 가격 계산
            const total = calculateItemsTotalPrice(formattedItems);
            const shipping = calculateTotalShippingFee(grouped);
            
            setTotalPrice(total);
            setShippingFee(shipping);
            setFinalPrice(total + shipping);
          } else {
            throw new Error('유효하지 않은 바로 구매 아이템 형식');
          }
        } catch (parseError) {
          console.error('바로 구매 아이템 파싱 오류:', parseError);
          setError('바로 구매 아이템 형식이 올바르지 않습니다.');
          router.push('/m/products');
        }
      } else {
        // 기존 장바구니 체크아웃 아이템 가져오기
        const checkoutItems = localStorage.getItem('checkoutItems');
        if (!checkoutItems) {
          router.push('/m/cart');
          return;
        }

        try {
          const parsedItems = JSON.parse(checkoutItems);
          if (Array.isArray(parsedItems)) {
            const formattedItems = parsedItems.map(item => ({
              ...item,
              productOptionId: item.option ? (item.productOptionId || null) : null,
              shippingFee: 0
            }));
            
            setItems(formattedItems);
            
            // 상품 그룹화
            const grouped = groupItemsByProduct(formattedItems);
            setGroupedItems(grouped);
            
            // 가격 계산
            const total = calculateItemsTotalPrice(formattedItems);
            const shipping = calculateTotalShippingFee(grouped);
            
            setTotalPrice(total);
            setShippingFee(shipping);
            setFinalPrice(total + shipping);
          } else {
            throw new Error('유효하지 않은 체크아웃 아이템 형식');
          }
        } catch (parseError) {
          console.error('체크아웃 아이템 파싱 오류:', parseError);
          setError('체크아웃 아이템 형식이 올바르지 않습니다.');
          router.push('/m/cart');
        }
      }
    } catch (error) {
      console.error('체크아웃 아이템 로드 오류:', error);
      setError('체크아웃 아이템을 로드하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 상품 그룹화
  const groupItemsByProduct = (items: CartItem[]) => {
    const grouped: Record<string, any> = {};
    
    items.forEach(item => {
      if (!grouped[item.productId]) {
        grouped[item.productId] = {
          productId: item.productId,
          name: item.name,
          image: item.image,
          items: [],
          totalQuantity: 0,
          totalPrice: 0
        };
      }
      
      grouped[item.productId].items.push(item);
      grouped[item.productId].totalQuantity += item.quantity;
      grouped[item.productId].totalPrice += item.price * item.quantity;
    });
    
    return Object.values(grouped);
  };

  // 배송비 계산
  const calculateShippingFeeByPrice = (price: number, quantity: number) => {
    return price * quantity >= 30000 ? 0 : 3000;
  };

  // 총 상품 금액 계산
  const calculateItemsTotalPrice = (items: CartItem[]) => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // 총 배송비 계산
  const calculateTotalShippingFee = (groupedItems: any[]) => {
    return groupedItems.reduce((total, group) => {
      return total + calculateShippingFeeByPrice(group.totalPrice, group.totalQuantity);
    }, 0);
  };

  // 배송지 목록 로드
  const loadShippingAddresses = async () => {
    if (!user) return;
    
    try {
      const headers = getAuthHeader();
      const response = await fetch(`/api/shipping-addresses?userId=${user.id}`, {
        method: 'GET',
        headers,
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.addresses && Array.isArray(data.addresses)) {
          setAddresses(data.addresses);
          
          // 기본 배송지가 있으면 선택
          const defaultAddress = data.addresses.find((addr: ShippingAddress) => addr.is_default);
          if (defaultAddress) {
            handleAddressChange(defaultAddress);
          }
        }
      } else {
        console.error('배송지 목록 로드 실패:', response.status);
      }
    } catch (error) {
      console.error('배송지 목록 로드 오류:', error);
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

  // 토스 페이먼츠 위젯 초기화
  const initTossPayments = async () => {
    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';
      const userId = user?.id || localStorage.getItem('userId') || 'ANONYMOUS';
      
      const tossPayments = await loadTossPayments(clientKey);
      const widgetsInstance = tossPayments.widgets({ 
        customerKey: userId 
      });
      
      setWidgets(widgetsInstance);
    } catch (error) {
      console.error('토스 페이먼츠 초기화 오류:', error);
    }
  };

  // 페이지 초기화
  useEffect(() => {
    const initializePage = async () => {
      try {
        setLoading(true);
        await checkLoginStatus();
        await loadCheckoutItems();
        await initTossPayments();
      } catch (error) {
        console.error('페이지 초기화 오류:', error);
        setError('페이지 로딩 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, []);

  // 사용자 정보가 변경되면 배송지 목록 로드
  useEffect(() => {
    if (user) {
      loadShippingAddresses();
    }
  }, [user]);

  // 위젯과 DOM이 준비되면 렌더링
  useEffect(() => {
    if (widgets && paymentMethodRef.current && agreementRef.current && finalPrice > 0) {
      renderWidgets();
    }
  }, [widgets, finalPrice, paymentMethodRef.current, agreementRef.current]);

  // 금액 변경 시 위젯 업데이트
  useEffect(() => {
    if (!widgets || !ready) return;
    
    const updateAmount = async () => {
      try {
        const amountToSet = Math.max(finalPrice, 1000);
        await widgets.setAmount({
          currency: 'KRW',
          value: amountToSet,
        });
      } catch (error) {
        console.error('결제 금액 업데이트 실패:', error);
      }
    };
    
    updateAmount();
  }, [widgets, finalPrice, ready]);

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
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-red-500 mb-4">{error}</p>
        <Button
          onClick={() => router.push('/m/cart')}
          className="bg-green-600 text-white"
        >
          장바구니로 돌아가기
        </Button>
      </div>
    );
  }

  // 위젯 렌더링
  const renderWidgets = async () => {
    if (!widgets || !paymentMethodRef.current || !agreementRef.current) return;
    
    try {
      const amountToSet = Math.max(finalPrice, 1000);
      
      await widgets.setAmount({
        currency: 'KRW',
        value: amountToSet,
      });
      
      await widgets.renderPaymentMethods({
        selector: "#payment-method",
        variantKey: "DEFAULT",
      });
      
      await widgets.renderAgreement({
        selector: "#agreement",
        variantKey: "AGREEMENT",
      });
      
      setReady(true);
    } catch (error) {
      console.error('위젯 렌더링 실패:', error);
    }
  };

  // 주문 제출
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreeToTerms) {
      alert('주문 및 결제 정보 수집 동의가 필요합니다.');
      return;
    }
    
    if (!validateShippingInfo()) {
      return;
    }
    
    if (!widgets || !ready) {
      alert('결제 모듈이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      initTossPayments(); // 다시 초기화 시도
      return;
    }
    
    setOrderProcessing(true);
    setOrderError(null);
    
    try {
      console.log('주문 처리 시작');
      
      const authHeader = getAuthHeader();
      if (!authHeader.Authorization) {
        throw new Error('로그인이 필요합니다. 로그인 후 다시 시도해주세요.');
      }
      
      const userId = user?.id || localStorage.getItem('userId');
      if (!userId) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }
      
      // 한글 등이 포함된 문자열을 안전하게 처리
      const safeString = (str: string) => {
        if (!str) return '';
        return str.normalize('NFC');
      };
      
      // 주문 데이터 구성
      const orderData = {
        userId: userId,
        items: items.map(item => ({
          productId: item.productId,
          productOptionId: item.productOptionId || null,
          name: safeString(item.name),
          price: item.price,
          originalPrice: item.originalPrice || item.price,
          additionalPrice: item.additionalPrice || 0,
          totalPrice: item.totalPrice || (item.price * item.quantity),
          quantity: item.quantity,
          image: item.image,
          selectedOptions: item.option ? { 
            name: safeString(item.option.name), 
            value: safeString(item.option.value),
            additional_price: item.option.additional_price || 0
          } : null
        })),
        shipping: {
          name: safeString(shippingInfo.name),
          phone: shippingInfo.phone,
          address: safeString(shippingInfo.address),
          detailAddress: shippingInfo.detailAddress ? safeString(shippingInfo.detailAddress) : null,
          memo: shippingInfo.memo ? safeString(shippingInfo.memo) : null
        },
        payment: {
          method: 'toss',
          totalAmount: finalPrice
        }
      };
      
      // JSON 문자열로 변환 후 다시 파싱하여 인코딩 문제 방지
      const orderDataString = JSON.stringify(orderData);
      const orderDataParsed = JSON.parse(orderDataString);
      
      console.log('주문 데이터:', orderDataParsed);
      
      // 주문 생성 API 호출
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({ orderData: orderDataParsed })
      });
      
      console.log('주문 API 응답 상태:', orderResponse.status);
      
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        console.error('주문 API 에러 응답:', errorData);
        throw new Error(errorData.error || errorData.message || '주문 생성에 실패했습니다.');
      }
      
      const orderResult = await orderResponse.json();
      console.log('주문 생성 결과:', orderResult);
      
      // orderId 저장
      localStorage.setItem('currentOrderId', orderResult.orderId);
      
      // 토스 페이먼츠 위젯으로 결제 요청
      try {
        console.log('토스 페이먼츠 결제 요청');
        
        await widgets.requestPayment({
          orderId: orderResult.orderId,
          orderName: items.length > 1 
            ? `${items[0].name} 외 ${items.length - 1}건`
            : items[0].name,
          customerName: shippingInfo.name,
          customerEmail: user?.email || '',
          successUrl: `${window.location.origin}/m/checkout/success`,
          failUrl: `${window.location.origin}/m/checkout/fail?orderId=${orderResult.orderId}`,
        });
        
        console.log('토스 페이먼츠 결제 요청 완료');
      } catch (paymentError: any) {
        console.error('결제 요청 오류:', paymentError);
        
        // 결제 취소 처리
        if (paymentError.message === '취소되었습니다.' || 
            paymentError.message.includes('cancel') || 
            paymentError.message.includes('취소')) {
          console.log('사용자가 결제를 취소했습니다.');
          
          // 주문 취소 API 호출
          try {
            const cancelResponse = await fetch(`/api/orders/cancel`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...authHeader
              },
              body: JSON.stringify({ orderId: orderResult.orderId })
            });
            
            if (cancelResponse.ok) {
              console.log('주문이 정상적으로 취소되었습니다.');
            }
          } catch (cancelError) {
            console.error('주문 취소 API 호출 실패:', cancelError);
          }
          
          setOrderError('결제가 취소되었습니다. 결제를 다시 시도하려면 아래 버튼을 클릭해주세요.');
          setOrderProcessing(false);
        } else {
          throw new Error(paymentError.message || '결제 요청에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('주문 처리 오류:', error);
      setOrderError(error instanceof Error ? error.message : '주문 처리 중 오류가 발생했습니다.');
      setOrderProcessing(false);
    }
  };

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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      {/* 주문 상품 목록 */}
      <div className="bg-white p-4 mb-4">
        <h2 className="text-lg font-medium mb-4">주문 상품</h2>
        {groupedItems.map((group) => (
          <div key={group.productId} className="mb-4 pb-4 border-b border-gray-100 last:border-0">
            <div className="flex items-start">
              <div className="relative w-20 h-20 mr-3">
                <Image
                  src={group.image}
                  alt={group.name}
                  fill
                  className="object-cover rounded"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{group.name}</h3>
                <p className="text-sm text-gray-500">
                  {group.totalQuantity}개 | {group.totalPrice.toLocaleString()}원
                </p>
                {group.items.map((item: CartItem) => (
                  <div key={item.id} className="text-sm text-gray-600 mt-1">
                    {item.option && (
                      <p>{item.option.name}: {item.option.value}</p>
                    )}
                    <p>{item.quantity}개 × {item.price.toLocaleString()}원</p>
                  </div>
                ))}
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
            onClick={() => setShowAddressModal(true)}
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

      {/* 결제 수단 */}
      <div className="bg-white p-4 mb-4">
        <h2 className="text-lg font-medium mb-4">결제 수단</h2>
        <div id="payment-method" ref={paymentMethodRef}></div>
        <div id="agreement" ref={agreementRef}></div>
      </div>

      {/* 결제 정보 */}
      <div className="bg-white p-4 mb-4">
        <h2 className="text-lg font-medium mb-4">결제 정보</h2>
        <div className="space-y-2 border-b pb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">상품 금액</span>
            <span>{totalPrice.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">배송비</span>
            <span>{shippingFee.toLocaleString()}원</span>
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
            onClick={handleSubmitOrder}
            disabled={!selectedAddressId || !agreeToTerms || orderProcessing}
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

          {!ready && (
          <p className="text-yellow-600 text-sm mt-2 text-center">
            결제 모듈을 불러오는 중입니다...
          </p>
          )}
          
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
        userId={user?.id || null}
        onAddressSelect={handleAddressChange}
        currentAddresses={addresses}
      />
    </div>
  );
} 