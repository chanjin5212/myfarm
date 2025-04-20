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
export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;

  // 주문 관련 상태
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [groupedOrderItems, setGroupedOrderItems] = useState<GroupedOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 리뷰 모달 관련 상태
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{id: string, name: string} | null>(null);
  // 리뷰 작성 여부 확인을 위한 상태 추가
  const [reviewedProducts, setReviewedProducts] = useState<{[key: string]: boolean}>({});
  const [loadingReviewStatus, setLoadingReviewStatus] = useState(true);

  useEffect(() => {
    // 주문 정보 가져오기
    fetchOrderDetails();
  }, [orderId]);

  // 주문 아이템을 상품별로 그룹화하는 함수
  const groupOrderItems = (items: any[]) => {
    const grouped: GroupedOrderItem[] = [];
    
    items.forEach(item => {
      const productId = item.product_id || item.productId;
      const existingGroup = grouped.find(group => group.product_id === productId);
      
      if (existingGroup) {
        // 이미 해당 상품 그룹이 있는 경우
        existingGroup.items.push(item);
        existingGroup.totalQuantity += item.quantity || 1;
        existingGroup.totalPrice += (item.price || 0) * (item.quantity || 1);
      } else {
        // 새 상품 그룹 생성
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

  // 아이템이 변경될 때마다 그룹화 수행
  useEffect(() => {
    if (orderItems.length > 0) {
      const grouped = groupOrderItems(orderItems);
      setGroupedOrderItems(grouped);
      
      // 각 상품에 대한 리뷰 작성 여부 확인
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
      
      // 각 상품에 대한 리뷰 작성 여부 확인
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
        router.push('/auth');
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
  
  // 리뷰 모달 열기 핸들러
  const handleOpenReviewModal = (productId: string, productName: string) => {
    setSelectedProduct({ id: productId, name: productName });
    setReviewModalOpen(true);
  };
  
  // 리뷰 모달 닫기 핸들러
  const handleCloseReviewModal = () => {
    setReviewModalOpen(false);
    setSelectedProduct(null);
    
    // 리뷰 모달이 닫힐 때 리뷰 상태 다시 확인
    if (orderInfo && orderInfo.status === 'delivered' && groupedOrderItems.length > 0) {
      checkReviewStatus(groupedOrderItems, orderId);
    }
  };
  
  // 리뷰 작성 가능 여부 체크 (주문 상태가 배송 완료이면서 아직 리뷰를 작성하지 않은 경우)
  const canWriteReview = (status: string, productId: string) => {
    return status === 'delivered' && !reviewedProducts[productId];
  };

  // 로딩 중 표시
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // 오류 표시
  if (error) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold text-red-500 mb-4">오류 발생</h2>
        <p>{error || '주문 정보를 불러올 수 없습니다.'}</p>
        <Button className="mt-4" onClick={() => router.push('/orders')}>
          주문 목록으로 돌아가기
        </Button>
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
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">주문 상세 정보</h1>
      
      {/* 주문 기본 정보 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold">주문번호: {orderInfo.order_number || orderId}</h2>
            <p className="text-gray-600">주문일: {orderDate}</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              <OrderStatusBadge status={paymentInfo.status} />
            </span>
          </div>
        </div>
      </div>
      
      {/* 주문 상품 목록 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">주문 상품</h2>
        
        {groupedOrderItems.map((group, groupIndex) => (
          <div key={`group-${groupIndex}`} className="border-b border-gray-200 py-4 last:border-b-0">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <Image
                  src={group.image}
                  alt={group.name}
                  fill
                  sizes="80px"
                  className="object-cover rounded-md"
                />
              </div>
              
              <div className="flex-grow">
                <div className="flex flex-col md:flex-row md:justify-between">
                  <div>
                    <h3 className="font-medium">{group.name}</h3>
                    <p className="text-sm text-gray-600">
                      {group.totalQuantity}개 / {formatPrice(group.totalPrice)}
                    </p>
                    
                    {group.items.length > 0 && (
                      <div className="mt-1 text-sm text-gray-500">
                        <span>옵션: </span>
                        {group.items.map((item, itemIndex) => (
                          <span key={`item-${itemIndex}`}>
                            {item.options && (
                              <span className="font-medium text-sm">
                                {typeof item.options === 'object' && item.options.name ? 
                                  `${item.options.name}: ${item.options.value}` : 
                                  (typeof item.options === 'string' ? item.options : '기본 상품')}
                              </span>
                            )}
                            {(!item.options || Object.keys(item.options).length === 0) && (
                              <span className="text-sm text-gray-700">기본 상품</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* 리뷰 작성 버튼 추가 - 리뷰 작성 여부에 따라 다른 버튼 표시 */}
                  {paymentInfo.status === 'delivered' && (
                    <>
                      {loadingReviewStatus ? (
                        <div className="text-sm text-gray-500 mt-2 md:mt-0">
                          <Spinner size="sm" className="mr-2" />
                          리뷰 상태 확인 중...
                        </div>
                      ) : reviewedProducts[group.product_id] ? (
                        <span className="text-sm text-green-600 font-medium mt-2 md:mt-0">
                          리뷰 작성 완료
                        </span>
                      ) : (
                        <Button 
                          size="sm"
                          variant="outline"
                          className="mt-2 md:mt-0"
                          onClick={() => handleOpenReviewModal(group.product_id, group.name)}
                        >
                          리뷰 작성
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        <div className="mt-4 text-right">
          <p className="text-lg font-bold">
            총 주문금액: {formatPrice(paymentInfo.totalAmount)}
          </p>
        </div>
      </div>
      
      {/* 배송 정보 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">배송 정보</h2>
        <div className="space-y-2">
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">결제 정보</h2>
        <div className="space-y-2">
          <p><span className="font-medium">결제 방법:</span> {paymentInfo.method === 'kakao' ? '카카오페이' : paymentInfo.method === 'card' ? '신용카드' : paymentInfo.method === 'bank' ? '무통장입금' : paymentInfo.method === 'toss' ? '토스페이먼츠' : paymentInfo.method}</p>
          <p><span className="font-medium">결제 금액:</span> {formatPrice(paymentInfo.totalAmount)}</p>
          <p><span className="font-medium">결제일:</span> {orderDate}</p>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <Button onClick={() => router.push('/mypage?tab=orders')}>
          주문 목록으로 돌아가기
        </Button>
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