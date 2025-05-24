'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Spinner } from '@/components/ui/CommonStyles';
import { getAuthHeader, checkToken } from '@/utils/auth';
import { v4 as uuidv4 } from 'uuid';

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
    const resultCode = searchParams?.get('resultCode');
    const paymentId = searchParams?.get('paymentId');
    const orderId = searchParams?.get('orderId');
    const provider = searchParams?.get('provider');
    const pgToken = searchParams?.get('pg_token');

    const processPayment = async () => {
      if (isProcessing.current) return;

      try {
        isProcessing.current = true;

        // 1. 주문 생성을 위한 공통 로직
        const { user, isLoggedIn } = checkToken();
        if (!isLoggedIn || !user) {
          setError('로그인이 필요합니다.');
          setLoading(false);
          return;
        }

        const userId = user.id;
        const authHeader = getAuthHeader();
        const checkoutItems = JSON.parse(localStorage.getItem('checkoutItems') || '[]');
        const shippingInfo = JSON.parse(localStorage.getItem('checkoutShippingInfo') || '{}');
        
        // 결제 금액 계산 (checkoutItems의 합산)
        const totalAmount = checkoutItems.reduce((sum: number, item: any) => {
          const price = Number(item.price) || 0;
          const additionalPrice = item.option ? Number(item.option.additionalPrice) || 0 : 0;
          return sum + (price + additionalPrice) * (item.quantity || 1);
        }, 0);

        const safeString = (str: string) => (!str ? '' : str.normalize('NFC'));

        // 카카오페이 처리
        if (provider === 'kakaopay' && pgToken && orderId) {
          const kakaoPayTid = localStorage.getItem('kakaoPayTid');
          const kakaoPayOrderId = localStorage.getItem('kakaoPayOrderId');
          
          if (!kakaoPayTid || !kakaoPayOrderId) {
            setError('카카오페이 결제 정보가 올바르지 않습니다.');
            setLoading(false);
            return;
          }

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
              selectedOptions: item.option
                ? {
                    name: safeString(item.option.name),
                    value: safeString(item.option.value),
                    additional_price: item.option.additionalPrice,
                  }
                : null,
            })),
            shipping: {
              name: safeString(shippingInfo.name),
              phone: shippingInfo.phone,
              address: safeString(shippingInfo.address),
              detailAddress: shippingInfo.detailAddress ? safeString(shippingInfo.detailAddress) : null,
              memo: shippingInfo.memo ? safeString(shippingInfo.memo) : null,
            },
            payment: {
              method: 'kakaopay',
              kakaopay_tid: kakaoPayTid,
              total_amount: totalAmount,
            },
          };

          // 주문 생성 API 호출
          const createOrderResponse = await fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeader,
            },
            body: JSON.stringify({
              orderId: kakaoPayOrderId,
              orderData,
            }),
          });

          if (!createOrderResponse.ok) {
            const errorData = await createOrderResponse.json();
            throw new Error(errorData.error || errorData.message || '주문 생성에 실패했습니다.');
          }

          const createOrderResult = await createOrderResponse.json();
          setOrderNumber(createOrderResult.order_number || kakaoPayOrderId);

          // 카카오페이 결제 승인
          const approveRes = await fetch('/api/payments/kakaopay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'approve',
              tid: kakaoPayTid,
              orderId: kakaoPayOrderId,
              userId: user.id,
              pgToken: pgToken
            }),
          });

          if (!approveRes.ok) {
            const err = await approveRes.text();
            throw new Error('카카오페이 결제 승인 실패: ' + err);
          }

          // 로컬 스토리지 정리
          localStorage.removeItem('checkoutItems');
          localStorage.removeItem('checkoutShippingInfo');
          localStorage.removeItem('buyNowItem');
          localStorage.removeItem('kakaoPayTid');
          localStorage.removeItem('kakaoPayOrderId');

          setOrderCompleted(true);

          // 주문 상세 페이지로 리디렉션
          const redirectOrderId = createOrderResult.orderId || kakaoPayOrderId;
          router.push(`/m/orders/${redirectOrderId}/detail`);
          return;
        }

        // 네이버페이 처리 (기존 로직)
        if (resultCode !== 'Success' || !paymentId || !orderId) {
          setError('결제 정보가 올바르지 않습니다.');
          setLoading(false);
          return;
        }

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
            selectedOptions: item.option
              ? {
                  name: safeString(item.option.name),
                  value: safeString(item.option.value),
                  additional_price: item.option.additionalPrice,
                }
              : null,
          })),
          shipping: {
            name: safeString(shippingInfo.name),
            phone: shippingInfo.phone,
            address: safeString(shippingInfo.address),
            detailAddress: shippingInfo.detailAddress ? safeString(shippingInfo.detailAddress) : null,
            memo: shippingInfo.memo ? safeString(shippingInfo.memo) : null,
          },
          payment: {
            method: 'naverpay',
            naverpay_payment_id: paymentId,
            total_amount: totalAmount,
          },
        };

        // 주문 생성 API 호출
        const createOrderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader,
          },
          body: JSON.stringify({
            orderId: orderId,
            orderData,
          }),
        });

        if (!createOrderResponse.ok) {
          const errorData = await createOrderResponse.json();
          throw new Error(errorData.error || errorData.message || '주문 생성에 실패했습니다.');
        }

        const createOrderResult = await createOrderResponse.json();
        setOrderNumber(createOrderResult.order_number || orderId);

        // 2. 네이버페이 결제 승인
        const approveRes = await fetch('/api/payments/naverpay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId, orderId }),
        });

        if (!approveRes.ok) {
          const err = await approveRes.text();
          throw new Error('네이버페이 결제 승인 실패: ' + err);
        }

        // 로컬 스토리지 정리
        localStorage.removeItem('checkoutItems');
        localStorage.removeItem('checkoutShippingInfo');
        localStorage.removeItem('buyNowItem');

        setOrderCompleted(true);

        // 주문 상세 페이지로 리디렉션
        const redirectOrderId = createOrderResult.orderId || orderId;
        router.push(`/m/orders/${redirectOrderId}/detail`);
      } catch (error) {
        setError(error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
        isProcessing.current = false;
      }
    };

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
          <h2 className="text-2xl font-bold text-green-800 mb-2">결제가 완료되었습니다!</h2>
          <p className="text-green-700 mb-1">
            주문번호: <span className="font-medium">{orderNumber}</span>
          </p>
          <p className="text-green-700">주문 상세 페이지로 이동합니다...</p>
        </div>
      </div>
    </div>
  );
} 