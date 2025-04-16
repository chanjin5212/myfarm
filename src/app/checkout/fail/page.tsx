'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getAuthHeader } from '@/utils/auth';

function PaymentFailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    async function handlePaymentFail() {
      try {
        // 실패한 주문 취소 처리
        const orderId = searchParams.get('orderId');
        if (orderId) {
          await fetch(`/api/orders/cancel`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeader()
            },
            body: JSON.stringify({ orderId })
          });
          
          localStorage.removeItem('currentOrderId');
        }
      } catch (error) {
        console.error('주문 취소 실패:', error);
      }
    }
    
    handlePaymentFail();
  }, [searchParams]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">결제 실패</h2>
        <p className="text-center text-gray-700 mb-6">
          결제 처리 중 문제가 발생했습니다. 다시 시도해주세요.
        </p>
        <div className="flex justify-center">
          <Link href="/checkout">
            <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
              다시 시도하기
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function FailPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-6">로딩 중...</h2>
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
          </div>
        </div>
      </div>
    }>
      <PaymentFailContent />
    </Suspense>
  );
}