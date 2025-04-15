'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Textarea, Radio, Checkbox, Card } from '@/components/ui/CommonStyles';
import ShippingAddressModal from './ShippingAddressModal';
import { getAuthHeader } from '@/utils/auth';

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
  const [token, setToken] = useState('');
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [kakaoPayPopup, setKakaoPayPopup] = useState<Window | null>(null);

  useEffect(() => {
    checkLoginStatus();
    loadCheckoutItems();

    // 결제 완료 메시지 수신을 위한 이벤트 리스너 등록
    const handlePaymentMessage = async (event: MessageEvent) => {
      // 메시지 타입 확인
      if (!event.data?.type) return;
      
      console.log('결제 관련 메시지 수신:', event.data);
      const { type, orderId, data, error } = event.data;
      
      // 주문 ID가 일치하는지 확인
      const currentOrderId = localStorage.getItem('currentOrderId');
      console.log('메시지 수신 - 주문 ID 비교:', { 
        receivedOrderId: orderId, 
        currentOrderId, 
        isSame: currentOrderId === orderId 
      });
      
      if (currentOrderId !== orderId) return;
      
      // 메시지 타입에 따른 처리
      switch (type) {
        case 'PAYMENT_APPROVAL_NEEDED':
          // 결제 승인 요청 처리
          console.log('결제 승인 요청 메시지 처리 시작');
          setMessage('결제 승인 중입니다...');
          
          try {
            const authHeader = getAuthHeader();
            if (!authHeader.Authorization) {
              throw new Error('로그인이 필요합니다.');
            }
            
            // 결제 승인 API 호출
            const approveResponse = await fetch(`/api/payments/kakao/approve`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...authHeader
              },
              body: JSON.stringify({
                pg_token: data.pg_token,
                orderId: orderId
              })
            });
            
            if (!approveResponse.ok) {
              const errorData = await approveResponse.json();
              throw new Error(errorData.error || '결제 승인 중 오류가 발생했습니다.');
            }
            
            // 결제 승인 성공
            console.log('결제 승인 완료');
            
            // 결제 완료 처리
            setOrderProcessing(false);
            setMessage('');
            localStorage.removeItem('checkoutItems'); // 체크아웃 아이템 삭제
            localStorage.removeItem('currentOrderId');
            localStorage.removeItem('paymentPending'); // 결제 진행 중 상태 제거
            setKakaoPayPopup(null); // 팝업 참조 제거
            
            // 장바구니 비우기
            try {
              await fetch(`/api/cart/clear`, {
                method: 'DELETE',
                headers: { ...authHeader }
              });
            } catch (e) {
              console.error('장바구니 비우기 실패:', e);
            }
            
            // 리다이렉트 경로가 있으면 해당 경로로, 없으면 주문 상세 페이지로 이동
            const redirectPath = data.redirectTo || `/orders/${orderId}/detail`;
            console.log(`결제 완료 페이지로 이동: ${redirectPath}`);
            
            // 약간의 지연 후 페이지 이동 (상태 업데이트 보장)
            setTimeout(() => {
              router.push(redirectPath);
            }, 100);
          } catch (error) {
            console.error('결제 승인 처리 오류:', error);
            setOrderProcessing(false);
            setMessage('');
            setKakaoPayPopup(null);
            localStorage.removeItem('currentOrderId');
            localStorage.removeItem('paymentPending');
            setOrderError(error instanceof Error ? error.message : '결제 승인 중 오류가 발생했습니다.');
          }
          break;
          
        case 'PAYMENT_COMPLETE':
          // 결제 완료 처리
          console.log('결제 완료 메시지 처리 시작');
          setOrderProcessing(false);
          setMessage('');
          localStorage.removeItem('checkoutItems'); // 체크아웃 아이템 삭제
          localStorage.removeItem('currentOrderId');
          localStorage.removeItem('paymentPending'); // 결제 진행 중 상태 제거
          setKakaoPayPopup(null); // 팝업 참조 제거
          
          // 리다이렉트 경로가 있으면 해당 경로로, 없으면 주문 상세 페이지로 이동
          const successRedirectPath = data?.redirectTo || `/orders/${orderId}/detail`;
          console.log(`결제 완료 페이지로 이동: ${successRedirectPath}`);
          
          // 약간의 지연 후 페이지 이동 (상태 업데이트 보장)
          setTimeout(() => {
            router.push(successRedirectPath);
          }, 100);
          break;
          
        case 'PAYMENT_CANCELLED':
          // 결제 취소 처리
          setOrderProcessing(false);
          setMessage('');
          setKakaoPayPopup(null);
          localStorage.removeItem('currentOrderId');
          localStorage.removeItem('paymentPending');
          
          // 취소 메시지 표시
          const cancelReason = data?.reason || '사용자에 의해 취소됨';
          setOrderError(`결제가 취소되었습니다. (${cancelReason})`);
          
          // 취소 후 리다이렉트가 필요한 경우
          if (data?.redirectTo && data.redirectTo !== '/checkout') {
            setTimeout(() => {
              router.push(data.redirectTo);
            }, 1000);
          }
          break;
          
        case 'PAYMENT_FAILED':
          // 결제 실패 처리
          setOrderProcessing(false);
          setMessage('');
          setKakaoPayPopup(null);
          localStorage.removeItem('currentOrderId');
          localStorage.removeItem('paymentPending');
          
          // 오류 메시지 표시
          setOrderError(data?.reason || error || '결제 처리 중 오류가 발생했습니다.');
          
          // 실패 후 리다이렉트가 필요한 경우
          if (data?.redirectTo && data.redirectTo !== '/checkout') {
            setTimeout(() => {
              router.push(data.redirectTo);
            }, 1000);
          }
          break;
          
        case 'PAYMENT_ERROR':
          // 기타 오류 처리
          setOrderProcessing(false);
          setMessage('');
          setKakaoPayPopup(null);
          localStorage.removeItem('currentOrderId');
          localStorage.removeItem('paymentPending');
          
          // 오류 메시지 표시
          setOrderError(data?.reason || '결제 중 오류가 발생했습니다.');
          
          // 오류 후 리다이렉트가 필요한 경우
          if (data?.redirectTo && data.redirectTo !== '/checkout') {
            setTimeout(() => {
              router.push(data.redirectTo);
            }, 1000);
          }
          break;
      }
    };

    window.addEventListener('message', handlePaymentMessage);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('message', handlePaymentMessage);
    };
  }, [router]);

  // 카카오페이 팝업 모니터링
  useEffect(() => {
    let popupCheckInterval: NodeJS.Timeout | null = null;
    let paymentCompleted = false;  // 결제 완료 여부를 추적하는 플래그 추가
    
    // 메시지 이벤트 핸들러 추가 - 결제 완료 메시지를 감지
    const handlePaymentComplete = (event: MessageEvent) => {
      if (event.data?.type === 'PAYMENT_APPROVAL_NEEDED' || event.data?.type === 'PAYMENT_COMPLETE') {
        const currentOrderId = localStorage.getItem('currentOrderId');
        if (currentOrderId === event.data?.orderId) {
          paymentCompleted = true;
          console.log('결제 완료 메시지 감지 - 자동 취소 방지');
        }
      }
    };
    
    window.addEventListener('message', handlePaymentComplete);
    
    // 카카오페이 팝업이 있고 주문 처리 중인 경우에만 모니터링
    if (kakaoPayPopup && orderProcessing) {
      popupCheckInterval = setInterval(() => {
        // 팝업이 닫혔는지 확인
        if (kakaoPayPopup.closed) {
          clearInterval(popupCheckInterval!);
          console.log('사용자가 카카오페이 팝업을 닫았습니다.');
          
          // 결제가 완료된 경우에는 취소 처리하지 않음
          if (paymentCompleted) {
            console.log('결제가 이미 완료되어 취소 처리하지 않음');
            return;
          }
          
          // 결제 완료 메시지를 받지 않았을 때만 취소 처리
          const currentOrderId = localStorage.getItem('currentOrderId');
          if (currentOrderId && orderProcessing) {
            console.log('결제 팝업 닫힘 감지 - 주문 취소 처리:', currentOrderId);
            setOrderProcessing(false);
            setOrderError('결제가 취소되었습니다. (사용자가 창을 닫음)');
            setKakaoPayPopup(null);
            
            // 주문 취소 API 호출
            const cancelOrder = async () => {
              try {
                const authHeader = getAuthHeader();
                if (!authHeader.Authorization) return;
                
                const response = await fetch(`/api/orders/cancel`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...authHeader
                  },
                  body: JSON.stringify({ orderId: currentOrderId })
                });
                
                if (response.ok) {
                  console.log('주문 자동 취소 완료:', currentOrderId);
                  localStorage.removeItem('currentOrderId');
                  localStorage.removeItem('paymentPending');
                } else {
                  console.error('주문 자동 취소 실패 - 응답 오류:', await response.text());
                }
              } catch (err) {
                console.error('주문 자동 취소 실패:', err);
              }
            };
            
            cancelOrder();
          }
        }
      }, 300); // 300ms로 더 빠르게 체크
    }
    
    // 컴포넌트 언마운트 또는 의존성 변경 시 인터벌 제거 및 이벤트 리스너 제거
    return () => {
      if (popupCheckInterval) {
        clearInterval(popupCheckInterval);
      }
      window.removeEventListener('message', handlePaymentComplete);
    };
  }, [kakaoPayPopup, orderProcessing]);

  // 사용자 정보가 로드된 후 배송지 목록 로드 시도
  useEffect(() => {
    if (user) {
      console.log('사용자 정보가 로드되어 배송지 목록 로드 시도');
      loadShippingAddresses();
    }
  }, [user]);

  const checkLoginStatus = async () => {
    try {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        try {
          const parsedToken = JSON.parse(storedToken);
          let userInfo: User | null = null;
          let accessToken = '';
          
          if (parsedToken.user && typeof parsedToken.user === 'object') {
            // 사용자 정보가 객체인지 확인
            const userData = parsedToken.user as User;
            
            // id가 존재하는지 확인
            if (userData.id) {
              userInfo = userData;
              setUser(userInfo);
              
              // 사용자 정보를 사용하여 배송지 정보 설정
              setShippingInfo(prev => ({
                ...prev,
                name: userData.name || '',
                phone: userData.phone_number || '',
                address: userData.address || '',
                detailAddress: userData.detail_address || '',
                memo: userData.memo || '',
                postcode: userData.postcode || ''
              }));
              
              // 사용자 로그인 확인 즉시 배송지 목록 로드 시도
              localStorage.setItem('userId', userData.id);
            } else {
              setUser(null);
            }
          } else {
            setUser(null);
          }
          
          // API 호출을 위한 액세스 토큰 추출
          if (parsedToken.access_token) {
            accessToken = parsedToken.access_token;
            console.log('액세스 토큰 추출 성공, 길이:', accessToken.length);
          } else {
            // 토큰 원본 사용 (이전 방식 지원)
            accessToken = storedToken;
            console.log('기존 토큰 사용, 길이:', storedToken.length);
          }
          
          // 토큰 저장
          setToken(accessToken);
        } catch (error) {
          console.error('토큰 파싱 에러:', error);
          console.log('원본 토큰 사용');
          setUser(null);
          setToken(storedToken);
        }
      } else {
        console.log('저장된 토큰이 없음');
        setUser(null);
        setToken('');
      }
    } catch (error) {
      console.error('로그인 상태 확인 에러:', error);
      setUser(null);
      setToken('');
    }
  };

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
          router.push('/products');
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
              
              return {
                id: `direct_${item.product_id}${item.product_option_id ? '_' + item.product_option_id : ''}`,
                productId: item.product_id,
                name: item.product.name,
                price: itemPrice, // 옵션 가격을 포함한 단일 가격
                originalPrice: item.product.discount_price || item.product.price, // 원래 상품 가격
                additionalPrice: additionalPrice, // 옵션 추가 가격
                quantity: item.quantity,
                image: item.product.thumbnail_url || '/images/default-product.png',
                option: item.product_option ? {
                  name: item.product_option.option_name,
                  value: item.product_option.option_value,
                  additional_price: additionalPrice
                } : undefined,
                totalPrice: item.total_price || (itemPrice * item.quantity), // 총 가격
                shippingFee: calculateShippingFeeByPrice(itemPrice, item.quantity)
              };
            });
            
            setItems(formattedItems);
          } else {
            throw new Error('유효하지 않은 바로 구매 아이템 형식');
          }
        } catch (parseError) {
          console.error('바로 구매 아이템 파싱 오류:', parseError);
          setError('바로 구매 아이템 형식이 올바르지 않습니다.');
          router.push('/products');
        }
      } else {
        // 기존 장바구니 체크아웃 아이템 가져오기
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
      }
    } catch (error) {
      console.error('체크아웃 아이템 로드 오류:', error);
      setError('체크아웃 아이템을 로드하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 가격에 따른 배송비 계산 함수
  const calculateShippingFeeByPrice = (price: number, quantity: number) => {
    const totalPrice = price * quantity;
    return totalPrice >= 30000 ? 0 : 3000; // 3만원 이상 구매시 무료배송
  };

  // 사용자의 배송지 목록 로드
  const loadShippingAddresses = async () => {
    try {
      const userId = user?.id || localStorage.getItem('userId');
      if (!userId) {
        console.log('사용자 ID가 없어 배송지를 로드할 수 없습니다.');
        return;
      }
      
      console.log('배송지 목록 로드 시도:', userId);
      
      const response = await fetch(`/api/shipping-addresses?userId=${userId}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      let hasValidAddresses = false;
      
      if (response.ok) {
        const data = await response.json();
        if (data.addresses && Array.isArray(data.addresses) && data.addresses.length > 0) {
          console.log('불러온 배송지 목록:', data.addresses.length);
          hasValidAddresses = true;
          
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
          console.log('첫 번째 배송지 선택:', data.addresses[0].id);
          setSelectedAddressId(data.addresses[0].id);
          updateShippingInfo(data.addresses[0]);
          return;
        } else {
          console.log('배송지 목록이 비어있습니다.');
          setAddresses([]);
        }
      } else {
        console.error('배송지 목록 API 오류 응답:', response.status);
      }
      
      // 배송지가 없거나 API 오류시 사용자 정보로 배송지 설정
      if (!hasValidAddresses && user) {
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
      // 오류가 발생하면 사용자 정보를 기본 배송지로 사용
      if (user) {
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
      alert('주문 및 결제 정보 수집 동의가 필요합니다.');
      return;
    }
    
    if (!validateShippingInfo()) {
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
        // 비 ASCII 문자를 포함하는지 확인
        return str.normalize('NFC');
      };
      
      // 주문 데이터 구성
      const orderData = {
        userId: userId,
        items: items.map(item => ({
          productId: item.productId,
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
          method: paymentMethod,
          totalAmount: calculateTotalPrice() + calculateTotalShippingFee()
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
      
      // 결제 방법에 따른 처리
      if (paymentMethod === 'kakao') {
        console.log('카카오페이 결제 시작');
        // 카카오페이 결제 프로세스
        const kakaoPayData = {
          orderId: orderResult.orderId,
          totalAmount: calculateTotalPrice() + calculateTotalShippingFee(),
          productName: items.length > 1 
            ? safeString(`${items[0].name} 외 ${items.length - 1}건`)
            : safeString(items[0].name)
        };
        
        console.log('카카오페이 요청 데이터:', kakaoPayData);
        
        const kakaoResponse = await fetch('/api/payments/kakao/ready', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader
          },
          body: JSON.stringify(kakaoPayData)
        });
        
        console.log('카카오페이 API 응답 상태:', kakaoResponse.status);
        
        if (!kakaoResponse.ok) {
          const errorData = await kakaoResponse.json();
          console.error('카카오페이 API 에러 응답:', errorData);
          throw new Error(errorData.error || errorData.message || '카카오페이 결제 요청에 실패했습니다.');
        }
        
        const kakaoResult = await kakaoResponse.json();
        console.log('카카오페이 요청 결과:', kakaoResult);
        
        // 체크아웃 정보 저장 (결제 성공 후 처리를 위함)
        localStorage.setItem('currentOrderId', orderResult.orderId);
        
        // 카카오페이 결제 페이지를 팝업으로 열기
        const width = 450;
        const height = 650;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const popup = window.open(
          kakaoResult.next_redirect_pc_url,
          'kakaopayPopup',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
        );
        
        // 카카오페이 팝업 참조 저장
        setKakaoPayPopup(popup);
        
        // 결제 진행 중 표시 저장
        localStorage.setItem('paymentPending', 'true');
        
        // 현재 페이지는 그대로 유지하면서 결제 진행 상태 메시지 표시
        setOrderProcessing(true);
        setMessage('카카오페이 결제가 진행 중입니다. 팝업 창을 확인해주세요.');
      } else {
        // 다른 결제 방식 처리
        console.log('다른 결제 방식 처리');
        localStorage.removeItem('checkoutItems'); // 체크아웃 아이템 삭제
        router.push(`/orders/${orderResult.orderId}/complete`);
      }
    } catch (error) {
      console.error('주문 처리 오류:', error);
      setOrderError(error instanceof Error ? error.message : '주문 처리 중 오류가 발생했습니다.');
    } finally {
      // paymentMethod가 kakao가 아닐 때만 orderProcessing을 false로 설정
      // kakao 결제의 경우 메시지 이벤트에서 처리
      if (paymentMethod !== 'kakao') {
        setOrderProcessing(false);
      }
    }
  };

  // 배송 정보 유효성 검사
  const validateShippingInfo = () => {
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      alert('배송지 정보를 모두 입력해주세요.');
      return false;
    }
    return true;
  };

  // 컴포넌트 언마운트 시 또는 페이지 언로드 시 결제 취소 처리
  useEffect(() => {
    // 페이지 언로드 이벤트에 결제 취소 처리 추가
    const handleBeforeUnload = () => {
      const currentOrderId = localStorage.getItem('currentOrderId');
      if (currentOrderId && orderProcessing) {
        console.log('페이지 언로드 시 주문 취소 처리:', currentOrderId);
        
        // 동기적 API 호출 (페이지 종료 시 비동기 호출은 보장되지 않음)
        try {
          const authHeader = getAuthHeader();
          if (authHeader.Authorization) {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `/api/orders/cancel`, false); // 동기적 호출
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Authorization', authHeader.Authorization);
            xhr.send(JSON.stringify({ orderId: currentOrderId }));
          }
        } catch (e) {
          console.error('페이지 언로드 시 주문 취소 실패:', e);
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거 및 미완료 주문 취소
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // 컴포넌트 언마운트 시에도 미완료 주문 취소
      const currentOrderId = localStorage.getItem('currentOrderId');
      if (currentOrderId && orderProcessing) {
        console.log('컴포넌트 언마운트 시 주문 취소 처리:', currentOrderId);
        const authHeader = getAuthHeader();
        if (authHeader.Authorization) {
          fetch(`/api/orders/cancel`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeader
            },
            body: JSON.stringify({ orderId: currentOrderId })
          }).catch(err => console.error('컴포넌트 언마운트 시 주문 취소 실패:', err));
        }
      }
    };
  }, [orderProcessing]);

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

  if (orderProcessing && message) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-6">결제 진행 중</h2>
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500"></div>
          </div>
          <p className="text-center text-gray-700 mb-4">{message}</p>
          <div className="mb-4 bg-yellow-50 border border-yellow-200 p-4 rounded-md">
            <p className="text-center text-sm text-yellow-800 mb-2">
              <strong>주의:</strong> 결제가 완료될 때까지 이 페이지를 닫지 마세요.
            </p>
            <p className="text-center text-sm text-yellow-700">
              팝업 창이 보이지 않는 경우, 브라우저의 팝업 차단 설정을 확인하거나 아래 버튼을 클릭하세요.
            </p>
          </div>
          {paymentMethod === 'kakao' && (
            <div className="text-center">
              <button 
                className="bg-yellow-400 hover:bg-yellow-500 text-black py-2 px-4 rounded" 
                onClick={() => {
                  // 로컬 스토리지에서 현재 주문 ID 확인
                  const currentOrderId = localStorage.getItem('currentOrderId');
                  if (currentOrderId) {
                    alert('카카오페이 결제 진행 중입니다. 결제를 완료해주세요.');
                  } else {
                    setOrderProcessing(false);
                    setMessage('');
                  }
                }}
              >
                결제 진행 확인
              </button>
            </div>
          )}
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
                      {item.option.additional_price > 0 && (
                        <span className="ml-1">(+{item.option.additional_price.toLocaleString()}원)</span>
                      )}
                    </p>
                  )}
                  <div className="flex justify-between mt-2">
                    <p className="text-sm">
                      {item.quantity}개 × {item.price.toLocaleString()}원
                      {item.additionalPrice > 0 && (
                        <span className="text-xs text-gray-500 ml-1">
                          (기본가 {item.originalPrice.toLocaleString()}원 + 옵션 {item.additionalPrice.toLocaleString()}원)
                        </span>
                      )}
                    </p>
                    <p className="font-medium">
                      {(item.totalPrice || (item.price * item.quantity)).toLocaleString()}원
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