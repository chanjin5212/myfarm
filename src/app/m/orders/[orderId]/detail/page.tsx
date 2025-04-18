'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuthHeader } from '@/utils/auth';
import Image from 'next/image';
import Link from 'next/link';
import ReviewModal from '@/app/mypage/ReviewModal';
import { Button, Spinner } from '@/components/ui/CommonStyles';
import { formatPrice, formatDate } from '@/utils/format';
import toast from 'react-hot-toast';

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

interface GroupedOrderItem {
  product_id: string;
  name: string;
  image: string;
  items: any[];
  totalQuantity: number;
  totalPrice: number;
}

// 주문 상세 페이지
export default function MobileOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  // 주문 관련 상태
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [groupedOrderItems, setGroupedOrderItems] = useState<GroupedOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 리뷰 모달 관련 상태
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{id: string, name: string} | null>(null);
  const [reviewedProducts, setReviewedProducts] = useState<{[key: string]: boolean}>({});
  const [loadingReviewStatus, setLoadingReviewStatus] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  // 주문 아이템을 상품별로 그룹화하는 함수
  const groupOrderItems = (items: any[]) => {
    const grouped: GroupedOrderItem[] = [];
    
    items.forEach(item => {
      const productId = item.product_id || item.productId;
      const existingGroup = grouped.find(group => group.product_id === productId);
      
      if (existingGroup) {
        existingGroup.items.push(item);
        existingGroup.totalQuantity += item.quantity || 1;
        existingGroup.totalPrice += (item.price || 0) * (item.quantity || 1);
      } else {
        grouped.push({
          product_id: productId,
          name: item.name || '상품명 없음',
          image: item.image || '/images/default-product.png',
          items: [item],
          totalQuantity: item.quantity || 1,
          totalPrice: (item.price || 0) * (item.quantity || 1)
        });
      }
    });
    
    return grouped;
  };

  useEffect(() => {
    if (orderItems.length > 0) {
      const grouped = groupOrderItems(orderItems);
      setGroupedOrderItems(grouped);
      
      if (orderInfo && orderInfo.status === 'delivered') {
        checkReviewStatus(grouped, orderId);
      }
    }
  }, [orderItems, orderInfo]);

  // 리뷰 작성 여부를 확인하는 함수
  const checkReviewStatus = async (items: GroupedOrderItem[], orderId: string) => {
    try {
      setLoadingReviewStatus(true);
      const authHeader = getAuthHeader();
      
      if (!authHeader.Authorization) {
        return;
      }
      
      const reviewStatus: {[key: string]: boolean} = {};
      
      const reviewPromises = items.map(async (item) => {
        const response = await fetch(`/api/reviews/check?product_id=${item.product_id}&order_id=${orderId}`, {
          headers: {
            ...authHeader
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          reviewStatus[item.product_id] = data.hasReview;
        }
      });
      
      await Promise.all(reviewPromises);
      setReviewedProducts(reviewStatus);
    } catch (error) {
      console.error('리뷰 상태 확인 오류:', error);
    } finally {
      setLoadingReviewStatus(false);
    }
  };

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const authHeader = getAuthHeader();
      
      if (!authHeader.Authorization) {
        setError('로그인이 필요합니다.');
        router.push('/m/auth');
        return;
      }

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
      
      if (responseData.order) {
        setOrderInfo(responseData.order);
        if (Array.isArray(responseData.items)) {
          setOrderItems(responseData.items);
        }
      } else {
        setOrderInfo(responseData);
        
        try {
          const itemsResponse = await fetch(`/api/orders/${orderId}/items`, {
            headers: {
              ...authHeader
            }
          });

          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json();
            if (Array.isArray(itemsData)) {
              setOrderItems(itemsData);
            }
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
  
  const handleOpenReviewModal = (productId: string, productName: string) => {
    setSelectedProduct({ id: productId, name: productName });
    setReviewModalOpen(true);
  };
  
  const handleCloseReviewModal = () => {
    setReviewModalOpen(false);
    setSelectedProduct(null);
    
    if (orderInfo && orderInfo.status === 'delivered' && groupedOrderItems.length > 0) {
      checkReviewStatus(groupedOrderItems, orderId);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 px-4">
        <h2 className="text-xl font-bold text-red-500 mb-4">오류 발생</h2>
        <p className="mb-4">{error}</p>
        <Button className="w-full" onClick={() => router.push('/m/orders')}>
          주문 목록으로 돌아가기
        </Button>
      </div>
    );
  }

  if (!orderInfo) {
    return (
      <div className="px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">알림:</strong>
          <span className="block"> 주문 정보를 찾을 수 없습니다.</span>
        </div>
        <Link href="/m/mypage/orders" className="text-blue-600 hover:underline">
          주문 목록으로 돌아가기
        </Link>
      </div>
    );
  }

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

  const shippingInfo = {
    name: orderInfo.shipping_name || orderInfo.shipping?.name || '-',
    phone: orderInfo.shipping_phone || orderInfo.shipping?.phone || '-',
    address: orderInfo.shipping_address || orderInfo.shipping?.address || '-',
    detailAddress: orderInfo.shipping_detail_address || orderInfo.shipping?.detailAddress || '',
    memo: orderInfo.shipping_memo || orderInfo.shipping?.memo || ''
  };

  const paymentInfo = {
    method: orderInfo.payment_method || orderInfo.paymentMethod || '-',
    status: orderInfo.status || 'pending',
    totalAmount: orderInfo.total_amount || orderInfo.totalAmount || 0
  };

  return (
    <div className="pb-20">
      {/* 고정 헤더 */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 border-b border-gray-200">
        <div className="container mx-auto py-3 px-4">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold ml-4">주문 상세</h1>
          </div>
        </div>
      </header>

      {/* 컨텐츠 영역 - 헤더 높이만큼 상단 여백 추가 */}
      <div className="pt-14 px-4">
        {/* 주문 기본 정보 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-base font-medium">주문번호: {orderInfo.order_number || orderId}</h2>
              <p className="text-sm text-gray-600">주문일: {orderDate}</p>
            </div>
            <OrderStatusBadge status={paymentInfo.status} />
          </div>
        </div>
        
        {/* 주문 상품 목록 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="text-base font-medium mb-3">주문 상품</h2>
          
          {groupedOrderItems.map((group, groupIndex) => (
            <div key={`group-${groupIndex}`} className="border-b border-gray-100 py-3 last:border-b-0">
              <div className="flex items-start gap-3">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <Image
                    src={group.image}
                    alt={group.name}
                    fill
                    sizes="64px"
                    className="object-cover rounded"
                  />
                </div>
                
                <div className="flex-grow">
                  <h3 className="font-medium text-sm">{group.name}</h3>
                  <p className="text-xs text-gray-600">
                    {group.totalQuantity}개 / {formatPrice(group.totalPrice)}
                  </p>
                  
                  {group.items.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      <span>옵션: </span>
                      {group.items.map((item, itemIndex) => (
                        <span key={`item-${itemIndex}`}>
                          {item.options && (
                            <span className="font-medium">
                              {typeof item.options === 'object' && item.options.name ? 
                                `${item.options.name}: ${item.options.value}` : 
                                (typeof item.options === 'string' ? item.options : '기본 상품')}
                            </span>
                          )}
                          {(!item.options || Object.keys(item.options).length === 0) && (
                            <span className="text-gray-700">기본 상품</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* 리뷰 작성 버튼 */}
                  {paymentInfo.status === 'delivered' && (
                    <div className="mt-2">
                      {loadingReviewStatus ? (
                        <div className="text-xs text-gray-500">
                          <Spinner size="sm" className="mr-1" />
                          리뷰 상태 확인 중...
                        </div>
                      ) : reviewedProducts[group.product_id] ? (
                        <span className="text-xs text-green-600 font-medium">
                          리뷰 작성 완료
                        </span>
                      ) : (
                        <Button 
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleOpenReviewModal(group.product_id, group.name)}
                        >
                          리뷰 작성
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-base font-semibold text-right">
              총 주문금액: {formatPrice(paymentInfo.totalAmount)}
            </p>
          </div>
        </div>
        
        {/* 배송 정보 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="text-base font-medium mb-3">배송 정보</h2>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">수령인:</span> {shippingInfo.name}</p>
            <p><span className="font-medium">연락처:</span> {shippingInfo.phone}</p>
            <p><span className="font-medium">주소:</span> {shippingInfo.address}</p>
            {shippingInfo.detailAddress && (
              <p><span className="font-medium">상세 주소:</span> {shippingInfo.detailAddress}</p>
            )}
            {shippingInfo.memo && (
              <p><span className="font-medium">배송 메모:</span> {shippingInfo.memo}</p>
            )}
          </div>
        </div>
        
        {/* 결제 정보 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-base font-medium mb-3">결제 정보</h2>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">결제 방법:</span> {paymentInfo.method === 'kakao' ? '카카오페이' : paymentInfo.method === 'card' ? '신용카드' : paymentInfo.method === 'bank' ? '무통장입금' : paymentInfo.method === 'toss' ? '토스페이먼츠' : paymentInfo.method}</p>
            <p><span className="font-medium">결제 금액:</span> {formatPrice(paymentInfo.totalAmount)}</p>
            <p><span className="font-medium">결제일:</span> {orderDate}</p>
          </div>
        </div>
      </div>
      
      {/* 리뷰 모달 */}
      {selectedProduct && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={handleCloseReviewModal}
          orderId={orderId}
          productName={selectedProduct.name}
          productId={selectedProduct.id}
        />
      )}
    </div>
  );
} 