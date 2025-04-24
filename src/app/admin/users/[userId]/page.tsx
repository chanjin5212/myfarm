'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Spinner } from '@/components/ui/CommonStyles';
import toast from 'react-hot-toast';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import Image from 'next/image';

// 날짜 포맷팅 함수
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 가격 포맷팅 함수
const formatPrice = (price: number) => {
  return price ? price.toLocaleString('ko-KR') + '원' : '0원';
};

// 별점 표시 컴포넌트
const RatingStars = ({ rating }: { rating: number }) => {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        star <= rating ? (
          <StarIcon key={star} className="h-5 w-5 text-yellow-400" />
        ) : (
          <StarIconOutline key={star} className="h-5 w-5 text-yellow-400" />
        )
      ))}
    </div>
  );
};

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
    <span className={`${bgColor} ${textColor} px-3 py-1 rounded-full text-xs font-medium`}>
      {statusText}
    </span>
  );
};

interface UserDetailPageProps {
  params: Promise<{ userId: string }>;
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const resolvedParams = use(params);
  const userId = resolvedParams.userId;
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [reviewHistory, setReviewHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (!userId) {
      setError('사용자 ID가 없습니다');
      setLoading(false);
      return;
    }

    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        toast.error('관리자 권한이 없습니다');
        router.push('/admin/login');
        return;
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '회원 정보를 가져오는데 실패했습니다');
      }

      const data = await response.json();
      setUser(data.user || null);
      setOrderHistory(data.orderHistory || []);
      setReviewHistory(data.reviewHistory || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('회원 상세 정보 로딩 오류:', error);
      setError(error instanceof Error ? error.message : '회원 상세 정보를 불러오는데 실패했습니다');
      toast.error('회원 상세 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 소셜 로그인 표시
  const getSocialLoginInfo = (user: any) => {
    if (!user) return '-';
    
    const logins = [];
    if (user.google_id) logins.push('구글');
    if (user.kakao_id) logins.push('카카오');
    if (user.naver_id) logins.push('네이버');
    if (user.login_id) logins.push('일반');
    
    return logins.length > 0 ? logins.join(', ') : '-';
  };

  // 백 버튼 핸들러
  const handleBack = () => {
    router.push('/admin/users');
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-2 sm:px-4 pt-20">
        <div className="min-h-[60vh] flex items-center justify-center">
          <Spinner size="lg" />
          <p className="ml-2 text-gray-500">회원 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto py-6 px-2 sm:px-4 pt-20">
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <p className="text-red-500 mb-4">{error || '회원 정보를 찾을 수 없습니다'}</p>
          <Button onClick={handleBack}>
            회원 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4 pt-20">
      <div className="mb-6 flex items-center">
        <button 
          onClick={handleBack}
          className="mr-4 text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">회원 상세 정보</h1>
      </div>

      {/* 회원 기본 정보 카드 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold">{user.nickname || user.name || '이름 없음'}</h2>
          <p className="text-gray-600">{user.email}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">아이디</h3>
            <p>{user.id}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">로그인 방식</h3>
            <p>{getSocialLoginInfo(user)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">가입일</h3>
            <p>{formatDate(user.created_at)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">최근 로그인</h3>
            <p>{formatDate(user.last_login)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">휴대폰 번호</h3>
            <p>{user.phone_number || '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">마케팅 수신 동의</h3>
            <p>{user.marketing_agreed ? '동의함' : '동의하지 않음'}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">주소</h3>
          <p>{user.postcode ? `[${user.postcode}] ` : ''}{user.address || '-'}</p>
          <p>{user.detail_address || ''}</p>
        </div>
      </div>

      {/* 사용자 통계 카드 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">회원 통계</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">총 주문 금액</p>
            <p className="text-xl font-bold text-blue-700">{formatPrice(stats.totalOrderAmount || 0)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">총 주문 횟수</p>
            <p className="text-xl font-bold text-green-700">{stats.totalOrderCount || 0}회</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">최근 주문일</p>
            <p className="text-lg font-bold text-purple-700">{formatDate(stats.lastOrderDate) || '-'}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">평균 평점</p>
            <div className="flex items-center">
              <p className="text-xl font-bold text-yellow-700 mr-2">{stats.averageRating || 0}</p>
              <RatingStars rating={Math.round(stats.averageRating || 0)} />
            </div>
          </div>
        </div>

        {/* 자주 구매한 상품 */}
        <div className="mt-6">
          <h3 className="text-md font-bold mb-2">자주 구매한 상품</h3>
          {stats.mostPurchasedProducts && stats.mostPurchasedProducts.length > 0 ? (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 gap-2">
                {stats.mostPurchasedProducts.map((product: any, index: number) => (
                  <div key={product.productId} className="flex justify-between items-center p-2 border-b last:border-0">
                    <div>
                      <span className="font-medium">{index + 1}. {product.productName}</span>
                    </div>
                    <div className="text-gray-600">
                      총 {product.count}개 구매
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">구매 내역이 없습니다</p>
          )}
        </div>

        {/* 주문 상태 통계 */}
        {stats.orderStatusStats && Object.keys(stats.orderStatusStats).length > 0 && (
          <div className="mt-6">
            <h3 className="text-md font-bold mb-2">주문 상태 통계</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {Object.entries(stats.orderStatusStats).map(([status, count]: [string, any]) => (
                  <div key={status} className="flex items-center">
                    <OrderStatusBadge status={status} />
                    <span className="ml-2">{count}건</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 탭 인터페이스 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('order')}
              className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                activeTab === 'order'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              주문 내역
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                activeTab === 'review'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              리뷰 내역
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* 주문 내역 탭 */}
          {activeTab === 'order' && (
            <div>
              <h3 className="text-lg font-bold mb-4">주문 내역 ({orderHistory.length})</h3>
              {orderHistory.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  주문 내역이 없습니다
                </div>
              ) : (
                <div className="space-y-4">
                  {orderHistory.map((order: any) => (
                    <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex flex-col sm:flex-row justify-between mb-2">
                        <div>
                          <p className="text-sm text-gray-500">
                            주문번호: {order.order_number} | {formatDate(order.created_at)}
                          </p>
                          <h4 className="font-medium">
                            {order.items && order.items.length > 0 ? (
                              <>{order.items[0].product?.name || '상품명 없음'} {order.items.length > 1 ? `외 ${order.items.length - 1}건` : ''}</>
                            ) : '상품 정보 없음'}
                          </h4>
                        </div>
                        <div className="mt-2 sm:mt-0">
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="font-bold">{formatPrice(order.total_amount)}</p>
                        <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:text-blue-800 text-sm">
                          주문 상세 보기
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 리뷰 내역 탭 */}
          {activeTab === 'review' && (
            <div>
              <h3 className="text-lg font-bold mb-4">리뷰 내역 ({reviewHistory.length})</h3>
              {reviewHistory.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  리뷰 내역이 없습니다
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewHistory.map((review: any) => (
                    <div key={review.id} className="border rounded-lg p-4">
                      <div className="flex justify-between mb-2">
                        <div>
                          <p className="font-medium">{review.product?.name || '상품명 없음'}</p>
                          <div className="flex items-center">
                            <RatingStars rating={review.rating} />
                            <span className="ml-2 text-gray-500 text-sm">{formatDate(review.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 whitespace-pre-line">{review.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 