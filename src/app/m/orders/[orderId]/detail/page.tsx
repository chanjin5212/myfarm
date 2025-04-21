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
  const orderId = params?.orderId as string || '';

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
  const [loadingReviewStatus, setLoadingReviewStatus] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  // 주문 아이템을 상품별로 그룹화하는 함수
  const groupOrderItems = (items: any[]) => {
    const grouped: GroupedOrderItem[] = [];
    
    items.forEach(item => {
      const productId = item.product_id;
      const existingGroup = grouped.find(group => group.product_id === productId);
      
      // 옵션을 JSON 문자열로 변환하여 비교
      const optionsKey = JSON.stringify(item.options || {});
      
      if (existingGroup) {
        // 같은 상품, 같은 옵션인지 확인
        const existingItemIndex = existingGroup.items.findIndex(i => 
          JSON.stringify(i.options || {}) === optionsKey
        );
        
        if (existingItemIndex >= 0) {
          // 같은 옵션을 가진 아이템이 있으면 수량과 가격만 업데이트
          existingGroup.items[existingItemIndex].quantity += item.quantity;
          existingGroup.totalQuantity += item.quantity;
          existingGroup.totalPrice += item.price * item.quantity;
        } else {
          // 새로운 옵션이면 아이템 추가
          existingGroup.items.push(item);
          existingGroup.totalQuantity += item.quantity;
          existingGroup.totalPrice += item.price * item.quantity;
        }
      } else {
        // 새 상품 그룹 생성
        grouped.push({
          product_id: productId,
          name: item.name || (item.options && item.options.name) || '상품명 없음',
          image: item.image || (item.options && item.options.image) || '/images/default-product.png',
          items: [item],
          totalQuantity: item.quantity,
          totalPrice: item.price * item.quantity
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
        // 리뷰 상태 확인 시작 - loading 상태는 여기서 유지
        setLoadingReviewStatus(true);
        checkReviewStatus(grouped, orderId);
      } else {
        // 배송 완료가 아닌 경우 로딩 상태 해제
        setLoading(false);
      }
    } else if (orderInfo) {
      // 주문 아이템이 없는 경우에도 로딩 상태 해제
      setLoading(false);
    }
  }, [orderItems, orderInfo, orderId]);

  // 리뷰 작성 여부를 확인하는 함수
  const checkReviewStatus = async (items: GroupedOrderItem[], orderId: string) => {
    try {
      const authHeader = getAuthHeader();
      
      if (!authHeader.Authorization) {
        setLoading(false);
        return;
      }
      
      const reviewStatus: {[key: string]: boolean} = {};
      
      const reviewPromises = items.map(async (item) => {
        const response = await fetch(`/api/reviews/check?product_id=${item.product_id}`, {
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
      // 리뷰 상태 로딩 완료
      setLoadingReviewStatus(false);
      // 전체 페이지 로딩 완료
      setLoading(false);
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

      console.log('주문 상세 정보 요청 시작:', orderId);
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
        setLoading(false);
        return;
      }

      const responseData = await response.json();
      console.log('주문 상세 API 응답:', JSON.stringify(responseData, null, 2));
      
      // 주문 정보 설정
      setOrderInfo(responseData);
      
      // 응답에 items 배열이 있는 경우 처리
      if (Array.isArray(responseData.items)) {
        console.log('API에서 주문 상품 정보 받음:', responseData.items.length, '개');
        setOrderItems(responseData.items);
      } else {
        console.log('API 응답에 주문 상품 정보가 없음. 별도로 요청합니다.');
        // 주문 상품 정보를 별도로 요청
        try {
          const itemsResponse = await fetch(`/api/orders/${orderId}/items`, {
            headers: {
              ...authHeader
            }
          });

          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json();
            console.log('주문 상품 API 응답:', JSON.stringify(itemsData, null, 2));
            if (Array.isArray(itemsData)) {
              setOrderItems(itemsData);
            } else {
              console.error('주문 상품 API 응답이 배열이 아님');
              setLoading(false);
            }
          } else {
            console.error('주문 상품 API 요청 실패:', itemsResponse.status);
            setLoading(false);
          }
        } catch (itemsError) {
          console.error('주문 상품 API 오류:', itemsError);
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('주문 정보 로딩 오류:', error);
      setError('주문 정보를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
    // 여기서는 finally를 제거하여 setLoading(false)를 호출하지 않음
    // 데이터 로딩 완료와 리뷰 상태 확인이 모두 끝난 후 로딩 상태 해제
  };
  
  const handleOpenReviewModal = (productId: string, productName: string) => {
    setSelectedProduct({ id: productId, name: productName });
    setReviewModalOpen(true);
  };
  
  const handleCloseReviewModal = () => {
    setReviewModalOpen(false);
    setSelectedProduct(null);
    
    if (orderInfo && orderInfo.status === 'delivered' && groupedOrderItems.length > 0) {
      setLoadingReviewStatus(true);
      checkReviewStatus(groupedOrderItems, orderId);
    }
  };

  if (loading || loadingReviewStatus) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
        <p className="ml-4 text-gray-600">주문 정보를 불러오는 중...</p>
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

  console.log('렌더링 중인 주문 정보:', JSON.stringify(orderInfo, null, 2));

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

  // 배송 정보에서 DB 필드명을 먼저 확인하고, 없으면 객체 내부 필드 확인
  const shippingInfo = {
    name: orderInfo.shipping_name || (orderInfo.shipping && orderInfo.shipping.name) || '-',
    phone: orderInfo.shipping_phone || (orderInfo.shipping && orderInfo.shipping.phone) || '-',
    address: orderInfo.shipping_address || (orderInfo.shipping && orderInfo.shipping.address) || '-',
    detailAddress: orderInfo.shipping_detail_address || (orderInfo.shipping && orderInfo.shipping.detailAddress) || '',
    memo: orderInfo.shipping_memo || (orderInfo.shipping && orderInfo.shipping.memo) || ''
  };

  const paymentInfo = {
    method: orderInfo.payment_method || (orderInfo.payment && orderInfo.payment.method) || '-',
    status: orderInfo.status || 'pending',
    totalAmount: orderInfo.total_amount || (orderInfo.payment && orderInfo.payment.totalAmount) || 0
  };

  // 주문번호는 order_number를 우선적으로 사용
  const displayOrderNumber = orderInfo.order_number || orderInfo.orderNumber || orderId;

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
              <h2 className="text-base font-medium">주문번호: {displayOrderNumber}</h2>
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
                      {group.items.map((item, itemIndex) => (
                        <div key={`item-${itemIndex}`} className="mb-1">
                          <div className="text-gray-600">
                            {item.options && typeof item.options === 'object' ? (
                              <span>
                                {item.options.option_name && item.options.option_value ? 
                                  `${item.options.option_name}: ${item.options.option_value}` : 
                                  (item.options.name ? item.options.name : '기본 상품')}
                              </span>
                            ) : (
                              <span>기본 상품</span>
                            )}
                            <span className="ml-2">
                              {item.quantity}개 × {formatPrice(item.price)} = {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
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