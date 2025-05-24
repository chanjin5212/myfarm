'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Spinner } from '@/components/ui/CommonStyles';
import { getAuthHeader } from '@/utils/auth';

export default function CheckoutFailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  
  useEffect(() => {
    // URL에서 주문 ID와 에러 메시지 가져오기
    const orderId = searchParams?.get('orderId');
    const provider = searchParams?.get('provider');
    const errorMessage = searchParams?.get('message') || '결제에 실패했습니다.';
    
    setOrderId(orderId);
    
    const cancelOrder = async () => {
      if (!orderId) {
        setError('주문 정보가 없습니다.');
        setLoading(false);
        return;
      }
      
      try {
        // 주문 삭제 API 호출
        const response = await fetch(`/api/orders/${orderId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          }
        });
        
        // 로컬 스토리지 정리
        localStorage.removeItem('currentOrderId');
        
        // 카카오페이 관련 정보도 정리
        if (provider === 'kakaopay') {
          localStorage.removeItem('kakaoPayTid');
          localStorage.removeItem('kakaoPayOrderId');
        }
        
        setError(errorMessage);
        setLoading(false);
      } catch (error) {
        console.error('주문 삭제 중 오류 발생:', error);
        setError('결제에 실패했습니다.');
        setLoading(false);
      }
    };
    
    cancelOrder();
  }, [searchParams, router]);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-500">주문을 삭제하는 중입니다...</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <div className="max-w-md w-full">
        <div className="bg-red-100 p-6 rounded-lg mb-6 text-center">
          <svg
            className="w-16 h-16 text-red-600 mx-auto mb-4"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <h2 className="text-2xl font-bold text-red-800 mb-2">
            결제에 실패했습니다
          </h2>
          <p className="text-red-700 mb-4">{error}</p>
          {orderId && (
            <p className="text-red-700 mb-1">
              주문번호: <span className="font-medium">{orderId}</span>
            </p>
          )}
        </div>
        
        <div className="flex flex-col space-y-4">
          <Button 
            onClick={() => router.push('/m/checkout')}
            className="bg-green-600 text-white w-full"
          >
            결제 다시 시도하기
          </Button>
          
          <Button 
            onClick={() => router.push('/m/cart')}
            className="bg-gray-200 text-gray-700 w-full"
          >
            장바구니로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
} 