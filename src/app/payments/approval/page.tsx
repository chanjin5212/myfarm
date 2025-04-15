'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PaymentApprovalPage() {
  const searchParams = useSearchParams();
  const pg_token = searchParams.get('pg_token');
  const order_id = searchParams.get('order_id');
  const status = searchParams.get('status') || 'unknown';
  const [message, setMessage] = useState<string>('결제 정보를 확인하는 중입니다...');

  useEffect(() => {
    // 페이지가 로드되면 즉시 부모창으로 결제 상태 전달
    sendMessageToParent();
  }, []);

  // 부모창으로 결제 상태 메시지 전송
  const sendMessageToParent = () => {
    if (window.opener) {
      try {
        // 상태에 따른 메시지 타입과 데이터 결정
        let messageType = 'PAYMENT_ERROR';
        let messageData: Record<string, any> = { reason: '알 수 없는 결제 상태입니다.' };
        
        switch(status) {
          case 'success':
            if (pg_token && order_id) {
              messageType = 'PAYMENT_APPROVAL_NEEDED';
              messageData = { 
                pg_token, 
                order_id, 
                redirectTo: `/orders/${order_id}/detail` 
              };
              setMessage('결제 승인 정보를 전송 중입니다...');
            } else {
              messageType = 'PAYMENT_ERROR';
              messageData = { reason: '결제 정보가 올바르지 않습니다.', redirectTo: '/checkout' };
              setMessage('결제 정보가 올바르지 않습니다.');
            }
            break;
            
          case 'cancel':
            messageType = 'PAYMENT_CANCELLED';
            messageData = { reason: '사용자가 결제를 취소했습니다.', redirectTo: '/checkout' };
            setMessage('결제가 취소되었습니다.');
            break;
            
          case 'fail':
            messageType = 'PAYMENT_FAILED';
            messageData = { reason: '결제 처리 중 오류가 발생했습니다.', redirectTo: '/checkout' };
            setMessage('결제에 실패했습니다.');
            break;
        }
        
        // 부모창으로 메시지 전송
        console.log(`부모창으로 ${messageType} 메시지 전송:`, messageData);
        window.opener.postMessage({
          type: messageType,
          orderId: order_id,
          data: messageData
        }, '*');
        
        // 잠시 후 창 닫기
        setTimeout(() => {
          window.close();
        }, 500);
      } catch (e) {
        console.error('메시지 전송 오류:', e);
        setMessage('부모창과 통신 중 오류가 발생했습니다.');
        
        // 오류 발생시에도 창 닫기
        setTimeout(() => {
          window.close();
        }, 1000);
      }
    } else {
      setMessage('이 페이지는 팝업 창으로 열어야 합니다.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">{message}</h1>
        <p className="text-gray-600 text-sm">이 창은 잠시 후 자동으로 닫힙니다...</p>
      </div>
    </div>
  );
} 