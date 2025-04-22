// 주문 상태 맵
export const ORDER_STATUS_MAP: Record<string, { color: string; text: string }> = {
  pending: { color: 'bg-yellow-100 text-yellow-800', text: '주문 대기중' },
  payment_pending: { color: 'bg-blue-100 text-blue-800', text: '결제 진행중' },
  paid: { color: 'bg-green-100 text-green-800', text: '결제 완료' },
  preparing: { color: 'bg-indigo-100 text-indigo-800', text: '상품 준비중' },
  shipping: { color: 'bg-purple-100 text-purple-800', text: '배송중' },
  delivered: { color: 'bg-green-100 text-green-800', text: '배송 완료' },
  canceled: { color: 'bg-red-100 text-red-800', text: '주문 취소' },
  refunded: { color: 'bg-gray-100 text-gray-800', text: '환불 완료' },
};

// 배송 상태 코드 맵
export const DELIVERY_STATUS_MAP: Record<string, string> = {
  UNKNOWN: '알 수 없음',
  INFORMATION_RECEIVED: '송장 등록',
  AT_PICKUP: '집화 완료',
  IN_TRANSIT: '배송 중',
  OUT_FOR_DELIVERY: '배송 출발',
  ATTEMPT_FAIL: '배송 실패',
  DELIVERED: '배송 완료',
  AVAILABLE_FOR_PICKUP: '수령 대기',
  EXCEPTION: '이상 발생',
  NOT_FOUND: '송장 미등록',
};