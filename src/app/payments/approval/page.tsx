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
    
    // 페이지 제목 설정
    document.title = '결제 처리 중 - 숙경팜';
    
    // 헤더와 푸터를 숨기기 위한 스타일 추가
    const style = document.createElement('style');
    style.innerHTML = `
      header, footer, nav, main > .container {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        width: 0 !important;
        height: 0 !important;
        position: absolute !important;
        left: -9999px !important;
      }
      
      body {
        background-color: #f9fafb !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: hidden !important;
      }
      
      main {
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        width: 100vw !important;
        height: 100vh !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        overflow: hidden !important;
      }
      
      #payment-approval-content {
        display: flex !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 9999 !important;
        background-color: #f9fafb !important;
        justify-content: center !important;
        align-items: center !important;
        flex-direction: column !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (style.parentNode) {
        document.head.removeChild(style);
      }
    };
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

  // 상태에 따른 아이콘 결정
  const getStatusIcon = () => {
    switch(status) {
      case 'success':
        return (
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
        );
      case 'cancel':
        return (
          <div className="rounded-full h-12 w-12 bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'fail':
        return (
          <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        );
    }
  };

  return (
    <div id="payment-approval-content" className="min-h-screen min-w-full flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        {getStatusIcon()}
        <h1 className="text-xl font-semibold text-gray-800 mb-2">{message}</h1>
        <p className="text-gray-600 text-sm">이 창은 잠시 후 자동으로 닫힙니다...</p>
      </div>
    </div>
  );
} 