'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAuthHeader } from '@/utils/auth';

// SearchParams를 사용하는 컴포넌트를 별도로 분리
function SuccessContent() {
  const searchParams = useSearchParams();
  const pgToken = searchParams.get('pg_token');
  const orderId = searchParams.get('order_id');
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrderAndSendMessage() {
      if (!pgToken || !orderId) {
        setError('결제 정보가 올바르지 않습니다.');
        setLoading(false);
        return;
      }

      try {
        // 인증 헤더 가져오기
        const authHeader = getAuthHeader();
        if (!authHeader.Authorization) {
          setError('로그인이 필요합니다.');
          setLoading(false);
          return;
        }

        // 결제 승인 API 호출
        const approveResponse = await fetch(`/api/payments/kakao/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader
          },
          body: JSON.stringify({
            pg_token: pgToken,
            orderId: orderId
          })
        });

        if (!approveResponse.ok) {
          const errorData = await approveResponse.json();
          throw new Error(errorData.error || '결제 승인 중 오류가 발생했습니다.');
        }

        // 성공 시 주문 정보 가져오기
        const orderResponse = await fetch(`/api/orders/${orderId}`, {
          headers: { ...authHeader }
        });

        if (!orderResponse.ok) {
          throw new Error('주문 정보를 가져오는데 실패했습니다.');
        }

        const orderData = await orderResponse.json();
        setOrder(orderData);
        setLoading(false);

        // 장바구니 비우기
        try {
          await fetch(`/api/cart/clear`, {
            method: 'DELETE',
            headers: { ...authHeader }
          });
        } catch (e) {
          console.error('장바구니 비우기 실패:', e);
        }

        // 부모 창이 있는지 확인
        if (window && window.opener) {
          try {
            // 부모 창으로 메시지 전송
            window.opener.postMessage({
              type: 'PAYMENT_COMPLETE',
              orderId: orderId,
              data: orderData
            }, '*');
            
            console.log('부모 창으로 결제 완료 메시지 전송 성공');

            // 1초 후 창 닫기
            setTimeout(() => {
              window.close();
            }, 1000);
          } catch (e) {
            console.error('부모 창으로 메시지 전송 중 오류:', e);
          }
        } else {
          console.log('부모 창이 없거나 접근할 수 없습니다.');
        }
      } catch (error) {
        console.error('결제 처리 오류:', error);
        setError(error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.');
        setLoading(false);
      }
    }

    fetchOrderAndSendMessage();
  }, [pgToken, orderId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-gray-800 mb-2">결제를 완료하는 중입니다...</h1>
            <p className="text-gray-600 text-sm">잠시만 기다려주세요.</p>
          </>
        ) : error ? (
          <>
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-red-600 mb-2">결제 처리 중 오류가 발생했습니다</h1>
            <p className="text-gray-700 mb-4">{error}</p>
            <button 
              onClick={() => window.close()}
              className="bg-gray-500 text-white rounded px-4 py-2 hover:bg-gray-600"
            >
              창 닫기
            </button>
          </>
        ) : (
          <>
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h1 className="text-xl font-semibold text-green-600 mb-2">결제가 성공적으로 완료되었습니다</h1>
            {order && (
              <div className="text-left mt-4 mb-4">
                <p className="text-gray-700"><span className="font-semibold">주문번호:</span> {order.id}</p>
                <p className="text-gray-700"><span className="font-semibold">결제금액:</span> {order.total_amount?.toLocaleString()}원</p>
                <p className="text-gray-700"><span className="font-semibold">주문일시:</span> {new Date(order.created_at).toLocaleString()}</p>
              </div>
            )}
            <p className="text-gray-600 text-sm">이 창은 잠시 후 자동으로 닫힙니다...</p>
          </>
        )}
      </div>
    </div>
  );
}

// 메인 페이지 컴포넌트
export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">페이지를 로드하는 중...</h1>
          <p className="text-gray-600 text-sm">잠시만 기다려주세요.</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
} 