'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Textarea, Radio, Checkbox, Card } from '@/components/ui/CommonStyles';
import ShippingAddressModal from './ShippingAddressModal';
import { getAuthHeader } from '@/utils/auth';
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

export default function CheckoutPage() {
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

  useEffect(() => {
    checkLoginStatus();
    loadCheckoutItems();
    initTossPayments();
  }, []);

  // 사용자 정보가 로드된 후 배송지 목록 로드 시도
  useEffect(() => {
    if (user) {
      console.log('사용자 정보가 로드되어 배송지 목록 로드 시도');
      loadShippingAddresses();
    }
  }, [user]);
  
  // 토스 페이먼츠 위젯 초기화
  const initTossPayments = async () => {
    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';
      console.log('토스 페이먼츠 초기화 시작, 클라이언트 키:', clientKey);
      
      const userId = user?.id || localStorage.getItem('userId') || 'ANONYMOUS';
      console.log('사용자 ID (customerKey):', userId);
      
      // 결제위젯 초기화
      const tossPayments = await loadTossPayments(clientKey);
      const widgetsInstance = tossPayments.widgets({ 
        customerKey: userId 
      });
      
      setWidgets(widgetsInstance);
      console.log('토스 페이먼츠 위젯 초기화 완료');
    } catch (error) {
      console.error('토스 페이먼츠 초기화 오류:', error);
    }
  };
  
  // 위젯을 렌더링하는 함수를 별도로 분리
  const renderWidgets = async () => {
    if (!widgets || !paymentMethodRef.current || !agreementRef.current) {
      console.log('위젯 렌더링 조건이 충족되지 않음');
      return;
    }
    
    try {
      console.log('위젯 렌더링 시작');
      // 최소 1000원 이상으로 금액 설정 (토스페이먼츠 요구사항)
      const amountToSet = Math.max(finalPrice, 1000);
      
      await widgets.setAmount({
        currency: 'KRW',
        value: amountToSet,
      });
      console.log('위젯 금액 설정:', amountToSet);
      
      // 결제 수단 먼저 렌더링
      await widgets.renderPaymentMethods({
        selector: "#payment-method",
        variantKey: "DEFAULT",
      });
      console.log('결제 수단 위젯 렌더링 완료');
      
      // 약관 위젯 렌더링
      await widgets.renderAgreement({
        selector: "#agreement",
        variantKey: "AGREEMENT",
      });
      console.log('이용약관 위젯 렌더링 완료');
      
      setReady(true);
    } catch (error) {
      console.error('위젯 렌더링 실패:', error);
    }
  };
  
  // 위젯과 DOM이 준비되면 렌더링
  useEffect(() => {
    if (widgets && paymentMethodRef.current && agreementRef.current && finalPrice > 0) {
      console.log('위젯 렌더링 조건 충족됨');
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
        console.log('결제 금액 업데이트:', amountToSet);
      } catch (error) {
        console.error('결제 금액 업데이트 실패:', error);
      }
    };
    
    updateAmount();
  }, [widgets, finalPrice, ready]);

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
              const totalItemPrice = itemPrice * item.quantity;
              
              return {
                id: `direct_${item.product_id}${item.product_option_id ? '_' + item.product_option_id : ''}`,
                productId: item.product_id,
                productOptionId: item.product_option_id || null,
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
                totalPrice: totalItemPrice, // 총 가격
                // 배송비는 그룹화 단계에서 계산됨
                shippingFee: 0
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
            // 배송비는 groupItemsByProduct 함수에서 재계산되므로 0으로 설정
            const formattedItems = parsedItems.map(item => {
              // 옵션 ID가 있는지 확인하여 추가
              const productOptionId = item.option ? 
                (item.productOptionId || null) : 
                null;
                
              return {
                ...item,
                productOptionId,
                shippingFee: 0 // 그룹화 과정에서 재계산
              };
            });
            setItems(formattedItems);
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

  // 아이템을 productId 기준으로 그룹화하는 함수
  const groupItemsByProduct = (items: CartItem[]) => {
    const grouped: any[] = [];
    
    // 아이템들을 productId 기준으로 그룹화
    items.forEach(item => {
      const existingGroup = grouped.find(group => group.productId === item.productId);
      
      if (existingGroup) {
        // 이미 해당 상품 그룹이 있는 경우
        existingGroup.items.push(item);
        existingGroup.totalQuantity += item.quantity;
        existingGroup.totalPrice += item.price * item.quantity;
      } else {
        // 새 상품 그룹 생성
        grouped.push({
          productId: item.productId,
          name: item.name,
          image: item.image,
          items: [item],
          totalQuantity: item.quantity,
          totalPrice: item.price * item.quantity
        });
      }
    });
    
    // 각 그룹별 배송비 계산
    grouped.forEach(group => {
      // 3만원 이상 구매 시 무료배송
      group.shippingFee = group.totalPrice >= 30000 ? 0 : 3000;
    });
    
    return grouped;
  };
  
  // 가격에 따른 배송비 계산 함수
  const calculateShippingFeeByPrice = (price: number, quantity: number) => {
    const totalPrice = price * quantity;
    return totalPrice >= 30000 ? 0 : 3000; // 3만원 이상 구매시 무료배송
  };
  
  // 총 상품 금액 계산 (상품 가격 * 수량의 합)
  const calculateItemsTotalPrice = (items: CartItem[]) => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  // 총 배송비 계산 (상품별로 중복 없이 계산)
  const calculateTotalShippingFee = (groupedItems: any[]) => {
    return groupedItems.reduce((total, group) => total + group.shippingFee, 0);
  };
  
  // 상품이 로드되면 그룹화 및 가격 계산
  useEffect(() => {
    if (items.length > 0) {
      // 상품 그룹화
      const grouped = groupItemsByProduct(items);
      setGroupedItems(grouped);
      
      // 가격 계산
      const itemsTotal = calculateItemsTotalPrice(items);
      const shippingTotal = calculateTotalShippingFee(grouped);
      
      setTotalPrice(itemsTotal);
      setShippingFee(shippingTotal);
      setFinalPrice(itemsTotal + shippingTotal);
    }
  }, [items]);

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
        // 비 ASCII 문자를 포함하는지 확인
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
          method: 'toss',  // 토스 페이먼츠로 변경
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
          orderName: `마이팜 상품 ${items.length > 1 ? `외 ${items.length - 1}건` : ''}`,
          customerName: shippingInfo.name,
          customerEmail: user?.email || '',
          successUrl: `${window.location.origin}/checkout/success`,
          failUrl: `${window.location.origin}/checkout/fail?orderId=${orderResult.orderId}`,
        });
        
        console.log('토스 페이먼츠 결제 요청 완료');
      } catch (paymentError: any) {
        console.error('결제 요청 오류:', paymentError);
        
        // 결제 취소 처리 (사용자가 결제창을 닫은 경우 포함)
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
          
          // 사용자에게 취소 메시지 표시 (중복 메시지 제거)
          setOrderError('결제가 취소되었습니다. 결제를 다시 시도하려면 아래 버튼을 클릭해주세요.');
          setOrderProcessing(false); // 결제 취소 시 주문 처리 상태 해제
        } else {
          // 기타 결제 오류
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
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      alert('배송지 정보를 모두 입력해주세요.');
      return false;
    }
    return true;
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

  if (orderProcessing && message) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-6">주문 처리 중</h2>
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500"></div>
          </div>
          <p className="text-center text-gray-700 mb-4">{message}</p>
          <div className="mb-4 bg-yellow-50 border border-yellow-200 p-4 rounded-md">
            <p className="text-center text-sm text-yellow-800 mb-2">
              <strong>주의:</strong> 주문 처리가 완료될 때까지 이 페이지를 닫지 마세요.
            </p>
          </div>
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
            {groupedItems.map((group) => (
              <div key={group.productId} className="mb-6 border-b pb-4">
                <div className="flex items-start">
                  <div className="w-20 h-20 relative flex-shrink-0">
                    <Image
                      src={group.image || '/images/default-product.png'}
                      alt={group.name}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                  <div className="ml-4 flex-grow">
                    <h3 className="font-medium text-lg">{group.name}</h3>
                    <p className="text-sm text-gray-600">
                      총 수량: {group.totalQuantity}개
                    </p>
                    <div className="flex justify-between mt-2">
                      <p className="text-sm text-gray-600">
                        배송비: {group.shippingFee > 0 ? `${group.shippingFee.toLocaleString()}원` : '무료'}
                        {group.shippingFee > 0 && (
                          <span className="text-xs ml-1">(3만원 이상 구매 시 무료)</span>
                        )}
                      </p>
                      <p className="font-semibold">
                        {group.totalPrice.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 상품 내 옵션 목록 */}
                {group.items.length > 0 && (
                  <div className="mt-4 pl-8">
                    {group.items.map((item: CartItem) => (
                      <div key={item.id} className="flex justify-between text-sm py-2 border-t">
                        <div>
                          {item.option ? (
                            <span>
                              옵션: {item.option.name} - {item.option.value}
                              {item.option.additional_price > 0 && (
                                <span className="ml-1 text-gray-500">(+{item.option.additional_price.toLocaleString()}원)</span>
                              )}
                            </span>
                          ) : (
                            <span>기본 상품</span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{(item.price * item.quantity).toLocaleString()}원</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            <div className="mt-4 text-right">
              <p className="text-gray-600">상품 금액: {totalPrice.toLocaleString()}원</p>
              <p className="text-gray-600">배송비: {shippingFee.toLocaleString()}원</p>
              <p className="text-lg font-semibold">
                결제 예정 금액: {finalPrice.toLocaleString()}원
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
          
          {/* 결제 수단 선택 */}
          <Card title="결제 수단" className="mb-6">
            <div id="payment-method" ref={paymentMethodRef} className="mt-4"></div>
            {/* 이용약관 UI */}
            <div id="agreement" ref={agreementRef} className="mt-6"></div>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          {/* 결제 정보 요약 */}
          <Card title="결제 정보" className="mb-6 sticky top-4">
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
                disabled={loading || !agreeToTerms || orderProcessing || !ready}
                variant="primary"
                size="lg"
                fullWidth
                className="mt-4"
              >
                {orderProcessing ? '처리 중...' : '결제하기'}
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