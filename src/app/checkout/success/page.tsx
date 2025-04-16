'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuthHeader } from '@/utils/auth';

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [processingComplete, setProcessingComplete] = useState(false);
  
  useEffect(() => {
    async function confirmPayment() {
      try {
        const paymentKey = searchParams.get('paymentKey');
        const orderId = searchParams.get('orderId');
        const amount = searchParams.get('amount');
        
        if (!paymentKey || !orderId || !amount) {
          throw new Error('결제 정보가 올바르지 않습니다.');
        }
        
        console.log('결제 승인 시작:', { paymentKey, orderId, amount });
        
        // 사용자 ID 직접 가져오기
        const userId = localStorage.getItem('userId');
        console.log('로컬스토리지 userId:', userId);
        
        // 인증 헤더 직접 구성
        const authHeader: {Authorization?: string} = {};
        if (userId) {
          authHeader.Authorization = `Bearer ${encodeURIComponent(userId)}`;
          console.log('인증 헤더 직접 구성:', authHeader);
        } else {
          // getAuthHeader로 백업 시도
          const backupHeader = getAuthHeader();
          if (backupHeader.Authorization) {
            Object.assign(authHeader, backupHeader);
            console.log('백업 인증 헤더 사용:', backupHeader);
          } else {
            console.error('사용자 ID를 찾을 수 없습니다.');
          }
        }
        
        // 디버깅 정보 저장
        const tokenDebugInfo = {
          hasAuthHeader: !!authHeader.Authorization,
          headerLength: authHeader.Authorization ? authHeader.Authorization.length : 0,
          localStorageUserId: userId || '없음',
          localStorageToken: localStorage.getItem('token') ? '존재함' : '존재하지 않음'
        };
        
        setDebugInfo(JSON.stringify(tokenDebugInfo, null, 2));
        console.log('인증 정보 디버깅:', tokenDebugInfo);
        
        // 인증 헤더가 비어있는지 확인
        if (!authHeader.Authorization) {
          console.error('인증 정보를 구성할 수 없습니다.');
          throw new Error('인증 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
        }
        
        // 결제 데이터 구성
        const paymentData = {
          paymentKey,
          orderId,
          amount: Number(amount),
        };
        
        console.log('결제 승인 요청 데이터:', paymentData);
        console.log('요청 헤더:', authHeader);
        
        try {
          // 결제 승인 요청
          const response = await fetch('/api/payments/toss', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeader
            },
            body: JSON.stringify(paymentData),
          });
          
          console.log('결제 승인 응답 상태:', response.status);
          
          // 응답 텍스트 확인
          const responseText = await response.text();
          console.log('결제 승인 응답 텍스트:', responseText);
          
          // 응답 다시 파싱
          let responseData;
          try {
            responseData = responseText ? JSON.parse(responseText) : {};
          } catch (parseError) {
            console.error('응답 파싱 오류:', parseError);
            responseData = { error: '응답을 파싱할 수 없습니다: ' + responseText };
          }
          
          if (!response.ok) {
            console.error('결제 승인 실패:', responseData);
            setDetailError(JSON.stringify(responseData, null, 2));
            throw new Error(responseData.error || '결제 승인에 실패했습니다.');
          }
          
          console.log('결제 승인 성공:', responseData);
          setProcessingComplete(true);
          
          // 장바구니 및 체크아웃 관련 로컬 스토리지 정리
          localStorage.removeItem('checkoutItems');
          localStorage.removeItem('directCheckoutItems');
          localStorage.removeItem('currentOrderId');
          
          // 2초 후 주문 상세 페이지로 이동 (화면 전환 전 성공 메시지를 보여주기 위함)
          setTimeout(() => {
            console.log('주문 상세 페이지로 이동합니다:', orderId);
            router.push(`/orders/${orderId}/detail`);
          }, 2000);
        } catch (fetchError: unknown) {
          console.error('HTTP 요청 오류:', fetchError);
          const errorMessage = fetchError instanceof Error 
            ? fetchError.message 
            : '알 수 없는 네트워크 오류';
          throw new Error('네트워크 요청 중 오류가 발생했습니다: ' + errorMessage);
        }
      } catch (error: unknown) {
        console.error('결제 확인 오류:', error);
        setError(error instanceof Error ? error.message : '결제 확인 중 오류가 발생했습니다.');
      }
    }
    
    confirmPayment();
  }, [router, searchParams]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">결제 처리 중</h2>
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <strong className="font-bold">오류:</strong>
            <span className="block sm:inline"> {error}</span>
            
            {detailError && (
              <div className="mt-2">
                <p className="font-semibold">상세 오류:</p>
                <pre className="text-xs mt-1 bg-red-50 p-2 rounded overflow-auto max-h-40">
                  {detailError}
                </pre>
              </div>
            )}
            
            {debugInfo && (
              <div className="mt-2">
                <p className="font-semibold">디버깅 정보:</p>
                <pre className="text-xs mt-1 bg-gray-50 p-2 rounded overflow-auto max-h-40">
                  {debugInfo}
                </pre>
              </div>
            )}
            
            <div className="mt-4 flex space-x-2">
              <button 
                onClick={() => router.push('/checkout')}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                결제 페이지로 돌아가기
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                다시 시도
              </button>
            </div>
          </div>
        ) : (
          <>
            {processingComplete ? (
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <svg 
                    className="w-16 h-16 text-green-500" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-green-600 mb-2">결제가 완료되었습니다</h3>
                <p className="text-gray-700 mb-4">주문 상세 페이지로 이동합니다...</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500"></div>
                </div>
                <p className="text-center text-gray-700 mb-4">결제를 완료하고 있습니다. 잠시만 기다려주세요.</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}