'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuthHeader } from '@/utils/auth';
import Image from 'next/image';
import Link from 'next/link';

// 주문 상태 표시 컴포넌트
const OrderStatusBadge = ({ status }: { status: string }) => {
  let bgColor = 'bg-gray-200';
  let textColor = 'text-gray-800';
  let statusText = '상태 정보 없음';

  switch (status) {
    case 'pending':
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
      statusText = '주문 대기중';
      break;
    case 'payment_pending':
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-800';
      statusText = '결제 진행중';
      break;
    case 'paid':
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
      statusText = '결제 완료';
      break;
    case 'preparing':
      bgColor = 'bg-indigo-100';
      textColor = 'text-indigo-800';
      statusText = '상품 준비중';
      break;
    case 'shipping':
      bgColor = 'bg-purple-100';
      textColor = 'text-purple-800';
      statusText = '배송중';
      break;
    case 'delivered':
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
      statusText = '배송 완료';
      break;
    case 'canceled':
    case 'cancelled':
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
      statusText = '주문 취소';
      break;
    case 'refunded':
      bgColor = 'bg-gray-100';
      textColor = 'text-gray-800';
      statusText = '환불 완료';
      break;
  }

  return (
    <span className={`${bgColor} ${textColor} px-3 py-1 rounded-full text-sm font-medium`}>
      {statusText}
    </span>
  );
};

// 주문 상세 페이지
export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  // 주문 관련 상태
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 주문 정보 가져오기
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const authHeader = getAuthHeader();
      
      if (!authHeader.Authorization) {
        setError('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      // 주문 정보 API 호출
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          ...authHeader
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('주문 정보를 찾을 수 없습니다.');
        } else {
          setError('주문 정보를 불러오는데 실패했습니다.');
        }
        return;
      }

      const responseData = await response.json();
      console.log('주문 API 응답:', responseData);
      
      // API 응답 구조에 따라 데이터 처리
      if (responseData.order) {
        // { order, items } 형태로 응답한 경우
        setOrderInfo(responseData.order);
        if (Array.isArray(responseData.items)) {
          setOrderItems(responseData.items);
        }
      } else {
        // 단일 객체로 응답한 경우
        setOrderInfo(responseData);
        
        // 주문 상품 정보 API 별도 호출
        try {
          const itemsResponse = await fetch(`/api/orders/${orderId}/items`, {
            headers: {
              ...authHeader
            }
          });

          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json();
            console.log('주문 상품 API 응답:', itemsData);
            if (Array.isArray(itemsData)) {
              setOrderItems(itemsData);
            }
          } else {
            console.error('주문 상품 정보를 가져오는데 실패했습니다.');
          }
        } catch (itemsError) {
          console.error('주문 상품 API 오류:', itemsError);
        }
      }
    } catch (error) {
      console.error('주문 정보 로딩 오류:', error);
      setError('주문 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 로딩 중 표시
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // 오류 표시
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">오류:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
        <Link href="/mypage/orders" className="text-blue-600 hover:underline">
          주문 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  // 주문 정보가 없는 경우
  if (!orderInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">알림:</strong>
          <span className="block sm:inline"> 주문 정보를 찾을 수 없습니다.</span>
        </div>
        <Link href="/mypage/orders" className="text-blue-600 hover:underline">
          주문 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  // 주문일 포맷팅 (created_at 필드가 없으면 현재 날짜 사용)
  const orderDate = orderInfo.created_at 
    ? new Date(orderInfo.created_at).toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

  // 배송 정보
  const shippingInfo = {
    name: orderInfo.shipping_name || orderInfo.shipping?.name || '-',
    phone: orderInfo.shipping_phone || orderInfo.shipping?.phone || '-',
    address: orderInfo.shipping_address || orderInfo.shipping?.address || '-',
    detailAddress: orderInfo.shipping_detail_address || orderInfo.shipping?.detailAddress || '',
    memo: orderInfo.shipping_memo || orderInfo.shipping?.memo || ''
  };

  // 결제 정보
  const paymentInfo = {
    method: orderInfo.payment_method || orderInfo.paymentMethod || '-',
    status: orderInfo.status || 'pending',
    totalAmount: orderInfo.total_amount || orderInfo.totalAmount || 0
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* 주문 헤더 */}
        <div className="border-b p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">주문 상세 내역</h1>
              <p className="text-gray-600 mt-1">주문번호: {orderInfo.order_number || orderId}</p>
              <p className="text-gray-600">주문일시: {orderDate}</p>
            </div>
            <div className="mt-4 md:mt-0">
              <OrderStatusBadge status={paymentInfo.status} />
            </div>
          </div>
        </div>

        {/* 주문 상품 */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-4">주문 상품</h2>
          {orderItems.length > 0 ? (
            <div className="space-y-4">
              {orderItems.map((item, index) => (
                <div key={item.id || index} className="flex items-center border-b pb-4">
                  <div className="w-20 h-20 relative flex-shrink-0">
                    <Image
                      src={item.image || '/images/default-product.png'}
                      alt={item.name || '상품명'}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                  <div className="ml-4 flex-grow">
                    <h3 className="font-medium">{item.name || '상품명 없음'}</h3>
                    {item.options && (
                      <p className="text-sm text-gray-600">
                        옵션: {typeof item.options === 'object' && item.options.name ? 
                          `${item.options.name} - ${item.options.value}` : 
                          (typeof item.options === 'string' ? item.options : JSON.stringify(item.options))}
                      </p>
                    )}
                    <div className="flex justify-between mt-2">
                      <p className="text-sm">
                        {item.quantity || 1}개 × {(item.price || 0).toLocaleString()}원
                      </p>
                      <p className="font-medium">
                        {((item.price || 0) * (item.quantity || 1)).toLocaleString()}원
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">상품 정보를 불러올 수 없습니다.</p>
          )}

          <div className="mt-6 text-right">
            <p className="text-lg font-semibold">
              총 결제 금액: {paymentInfo.totalAmount.toLocaleString()}원
            </p>
          </div>
        </div>

        {/* 배송 정보 */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-4">배송 정보</h2>
          <div className="space-y-2">
            <div className="flex">
              <span className="w-28 text-gray-600">수령인:</span>
              <span>{shippingInfo.name}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-gray-600">연락처:</span>
              <span>{shippingInfo.phone}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-gray-600">주소:</span>
              <div>
                <p>{shippingInfo.address}</p>
                {shippingInfo.detailAddress && <p>{shippingInfo.detailAddress}</p>}
              </div>
            </div>
            {shippingInfo.memo && (
              <div className="flex">
                <span className="w-28 text-gray-600">배송 메모:</span>
                <span>{shippingInfo.memo}</span>
              </div>
            )}
          </div>
        </div>

        {/* 결제 정보 */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-4">결제 정보</h2>
          <div className="space-y-2">
            <div className="flex">
              <span className="w-28 text-gray-600">결제 수단:</span>
              <span>
                {paymentInfo.method === 'kakao' 
                  ? '카카오페이' 
                  : paymentInfo.method === 'card'
                  ? '신용카드'
                  : paymentInfo.method === 'bank'
                  ? '무통장입금'
                  : paymentInfo.method}
              </span>
            </div>
            <div className="flex">
              <span className="w-28 text-gray-600">결제 상태:</span>
              <span>
                <OrderStatusBadge status={paymentInfo.status} />
              </span>
            </div>
            <div className="flex">
              <span className="w-28 text-gray-600">결제 금액:</span>
              <span>{paymentInfo.totalAmount.toLocaleString()}원</span>
            </div>
            <div className="flex">
              <span className="w-28 text-gray-600">결제 일시:</span>
              <span>{orderDate}</span>
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="p-6 flex justify-between">
          <Link href="/mypage/orders" className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded">
            주문 목록으로
          </Link>
          {(paymentInfo.status === 'pending' || paymentInfo.status === 'processing') && (
            <button 
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
              onClick={() => {
                if (window.confirm('주문을 취소하시겠습니까?')) {
                  // 주문 취소 API 호출
                  alert('주문 취소 기능은 아직 구현되지 않았습니다.');
                }
              }}
            >
              주문 취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 