'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Spinner } from '@/components/ui/CommonStyles';
import { getAuthHeader, checkToken } from '@/utils/auth';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const isProcessing = useRef(false);
  
  useEffect(() => {
    const paymentKey = searchParams?.get('paymentKey');
    const orderId = searchParams?.get('orderId');
    const amount = searchParams?.get('amount');
    
    const processPayment = async () => {
      // 이미 처리 중이면 중복 실행 방지
      if (isProcessing.current) {
        console.log('이미 결제 처리 중입니다.');
        return;
      }

      if (!paymentKey || !orderId || !amount) {
        setError('결제 정보가 올바르지 않습니다.');
        setLoading(false);
        return;
      }

      try {
        // 처리 중 플래그 설정
        isProcessing.current = true;
        
        setOrderId(orderId);
        
        // 로그인 체크
        const { user, isLoggedIn } = checkToken();
        if (!isLoggedIn || !user) {
          setError('로그인이 필요합니다.');
          setLoading(false);
          return;
        }

        const userId = user.id;
        const authHeader = getAuthHeader();

        // 로컬 스토리지에서 주문 정보 가져오기
        const checkoutItems = JSON.parse(localStorage.getItem('checkoutItems') || '[]');
        const shippingInfo = JSON.parse(localStorage.getItem('checkoutShippingInfo') || '{}');

        // 안전한 문자열 처리 함수
        const safeString = (str: string) => {
          if (!str) return '';
          return str.normalize('NFC');
        };

        // 주문 데이터 생성
        const orderData = {
          userId: user.id,
          items: checkoutItems.map((item: any) => ({
            productId: item.productId,
            productOptionId: item.productOptionId,
            name: safeString(item.name),
            price: item.price,
            additionalPrice: item.option ? item.option.additionalPrice : 0,
            quantity: item.quantity,
            image: item.image,
            selectedOptions: item.option ? {
              name: safeString(item.option.name),
              value: safeString(item.option.value),
              additional_price: item.option.additionalPrice
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
            total_amount: parseInt(amount)
          }
        };

        // 주문 생성 API 호출
        const createOrderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader
          },
          body: JSON.stringify({
            orderId,
            orderData
          })
        });

        if (!createOrderResponse.ok) {
          const errorData = await createOrderResponse.json();
          throw new Error(errorData.error || errorData.message || '주문 생성에 실패했습니다.');
        }

        const createOrderResult = await createOrderResponse.json();
        console.log('주문 생성 성공:', createOrderResult);

        // 주문 번호 저장
        setOrderNumber(createOrderResult.order_number || orderId);

        // 토스페이먼츠 결제 승인 API 호출
        console.log('토스페이먼츠 결제 승인 요청:', { paymentKey, orderId, amount });

        const paymentResponse = await fetch('/api/payments/toss', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: parseInt(amount)
          })
        });

        if (!paymentResponse.ok) {
          const errorData = await paymentResponse.json();
          throw new Error(errorData.error || errorData.message || '결제 승인에 실패했습니다.');
        }

        const paymentResult = await paymentResponse.json();
        console.log('결제 승인 성공:', paymentResult);

        // 로컬 스토리지 정리
        localStorage.removeItem('checkoutItems');
        localStorage.removeItem('checkoutShippingInfo');
        localStorage.removeItem('buyNowItem');
        
        setOrderCompleted(true);
        
        // 주문 상세 페이지로 리디렉션
        const redirectOrderId = paymentResult.orderId || orderId;
        router.push(`/m/orders/${redirectOrderId}/detail`);

      } catch (error) {
        console.error('결제 처리 오류:', error);
        setError(error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
        // 처리 완료 후 플래그 해제
        isProcessing.current = false;
      }
    };

    // 결제 성공 페이지가 로드되면 바로 결제 처리 시작
    processPayment();
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-500">결제를 완료하는 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
        <div className="bg-red-100 p-4 rounded-lg mb-6 w-full max-w-md">
          <h2 className="text-xl font-semibold text-red-700 mb-2">결제 처리 오류</h2>
          <p className="text-red-600">{error}</p>
        </div>
        <Button 
          onClick={() => router.push('/m/cart')}
          className="bg-green-600 text-white w-full max-w-md"
        >
          장바구니로 돌아가기
        </Button>
      </div>
    );
  }
  
  // 일반적으로 이 부분은 보이지 않을 것이지만, 리디렉션 전에 잠시 보여질 수 있음
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <div className="max-w-md w-full">
        <div className="bg-green-100 p-6 rounded-lg mb-6 text-center">
          <svg
            className="w-16 h-16 text-green-600 mx-auto mb-4"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            결제가 완료되었습니다!
          </h2>
          <p className="text-green-700 mb-1">
            주문번호: <span className="font-medium">{orderNumber}</span>
          </p>
          <p className="text-green-700">
            주문 상세 페이지로 이동합니다...
          </p>
        </div>
      </div>
    </div>
  );
} 