'use client';

import { useState, useEffect, useRef } from 'react';
import { Spinner } from '@/components/ui/CommonStyles';
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderName: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  onPaymentSuccess: () => void;
  onPaymentFail: (error: any) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  orderId,
  orderName,
  customerName,
  customerEmail,
  amount,
  onPaymentSuccess,
  onPaymentFail
}: PaymentModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [widgets, setWidgets] = useState<any>(null);
  const paymentMethodRef = useRef<HTMLDivElement>(null);
  const agreementRef = useRef<HTMLDivElement>(null);
  
  // 토스 페이먼츠 위젯 초기화
  useEffect(() => {
    if (!isOpen) return;
    
    async function fetchPaymentWidgets() {
      try {
        setLoading(true);
        console.log("토스 페이먼츠 초기화 시작");
        
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';
        const userId = localStorage.getItem('userId') || ANONYMOUS;
        
        const tossPayments = await loadTossPayments(clientKey);
        const widgets = tossPayments.widgets({ customerKey: userId });
        setWidgets(widgets);
        console.log("위젯 초기화 완료");
      } catch (error) {
        console.error('토스 페이먼츠 초기화 오류:', error);
        setError('결제 모듈 초기화에 실패했습니다: ' + (error instanceof Error ? error.message : String(error)));
      } finally {
        setLoading(false);
      }
    }

    fetchPaymentWidgets();
    
    // 모달이 닫힐 때 cleanup
    return () => {
      console.log("모달 cleanup");
      setWidgets(null);
      setReady(false);
      setError(null);
    };
  }, [isOpen]);
  
  // 위젯 렌더링
  useEffect(() => {
    async function renderPaymentWidgets() {
      if (widgets == null || !paymentMethodRef.current || !agreementRef.current) {
        return;
      }
      try {
        console.log("위젯 렌더링 시작");
        
        // 금액 설정
        await widgets.setAmount({
          currency: 'KRW',
          value: amount,
        });
        
        // 결제창 및 약관 렌더링
        await Promise.all([
          widgets.renderPaymentMethods({
            selector: "#payment-method",
            variantKey: "DEFAULT",
          }),
          widgets.renderAgreement({
            selector: "#agreement",
            variantKey: "AGREEMENT",
          }),
        ]);
        
        setReady(true);
        console.log("위젯 렌더링 완료");
      } catch (error) {
        console.error('위젯 렌더링 오류:', error);
        setError('결제 위젯을 로드하는 데 실패했습니다: ' + (error instanceof Error ? error.message : String(error)));
      }
    }

    renderPaymentWidgets();
  }, [widgets, amount]);
  
  // 결제 요청
  const processPayment = async () => {
    if (!widgets) {
      setError('결제 모듈이 준비되지 않았습니다.');
      return;
    }
    
    // UUID 유효성 검사
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
      setError('주문 번호가, UUID 형식이 아닙니다.');
      return;
    }
    
    try {
      console.log("결제 요청 시작");
      
      await widgets.requestPayment({
        orderId: orderId,
        orderName: orderName,
        customerName: customerName,
        customerEmail: customerEmail,
        successUrl: `${window.location.origin}/m/checkout/success`,
        failUrl: `${window.location.origin}/m/checkout/fail?orderId=${orderId}`,
      });
      
      console.log("결제 요청 성공");
      onPaymentSuccess();
    } catch (error: any) {
      console.error('결제 요청 오류:', error);
      
      if (error.message === '취소되었습니다.' || 
          error.message.includes('cancel') || 
          error.message.includes('취소')) {
        // 결제 취소된 경우
        console.log("결제 취소됨");
        onClose();
      } else {
        setError('결제 처리 중 오류가 발생했습니다: ' + error.message);
        onPaymentFail(error);
      }
    }
  };
  
  // 모달이 닫힐 때 처리
  const handleClose = () => {
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">결제 진행</h2>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-4">
          <p className="font-medium mb-1">{orderName}</p>
          <p className="text-lg font-bold text-green-600">{amount.toLocaleString()}원</p>
        </div>
        
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded mb-4">
            <p className="text-sm">{error}</p>
            <button 
              onClick={() => {
                setError(null);
                setTimeout(() => location.reload(), 500);
              }}
              className="mt-2 text-sm underline"
            >
              다시 시도
            </button>
          </div>
        )}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-500">결제 모듈을 준비하는 중입니다...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div id="payment-method" ref={paymentMethodRef} className="w-full"></div>
            <div id="agreement" ref={agreementRef} className="w-full"></div>
            
            <button
              onClick={processPayment}
              disabled={!ready}
              className={`w-full py-3 ${
                !ready ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
              } text-white rounded-md transition-colors`}
            >
              결제하기
            </button>
            
            <button
              onClick={handleClose}
              className="w-full py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              취소
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 