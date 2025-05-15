'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { checkToken, getAuthHeader, logout, triggerLoginEvent } from '@/utils/auth';
import toast, { Toaster } from 'react-hot-toast';
import DeactivateModal from '@/components/modals/DeactivateModal';
import CancelOrderModal from '@/components/modals/CancelOrderModal';

// URL 파라미터 처리 컴포넌트
function TabParamsHandler({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;
    
    const tabParam = searchParams.get('tab');
    if (tabParam === 'orders') {
      setActiveTab('orders');
    } else if (tabParam === 'reviews') {
      setActiveTab('reviews');
    }
  }, [searchParams, setActiveTab]);

  return null;
}

interface User {
  id: string;
  email: string;
  name?: string;
  nickname?: string;
  avatar_url?: string;
  phone_number?: string;
  postcode?: string;
  address?: string;
  detail_address?: string;
  marketing_agreed?: boolean;
  terms_agreed?: boolean;
  created_at?: string;
  login_id?: string;
}

interface OrderHistory {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
    options: any; // 문자열 또는 객체일 수 있음
    product_image?: string;
    thumbnail_url?: string; // 상품 이미지 URL 추가
  }>;
}

// 리뷰 인터페이스 추가
interface Review {
  id: string;
  product_id: string;
  product?: {
    name: string;
    thumbnail_url?: string;
  };
  order_id?: string;
  rating: number;
  content: string;
  image_url?: string;
  created_at: string;
  updated_at?: string;
}

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
    <span className={`${bgColor} ${textColor} px-2 py-1 rounded-full text-xs font-medium`}>
      {statusText}
    </span>
  );
};

// 이미지 모달 컴포넌트 추가
const ImageModal = ({ 
  imageUrl, 
  isOpen, 
  onClose 
}: { 
  imageUrl: string; 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
      onClick={onClose}
    >
      <div className="relative max-w-full max-h-full p-2">
        <button 
          className="absolute top-4 right-4 bg-black bg-opacity-50 rounded-full p-2 text-white"
          onClick={onClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <Image 
          src={imageUrl} 
          alt="리뷰 이미지" 
          width={800} 
          height={800}
          className="max-w-full max-h-[80vh] object-contain"
        />
      </div>
    </div>
  );
};

function MobileMyPageContent() {
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [reviewHistory, setReviewHistory] = useState<Review[]>([]);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // URL 파라미터 처리
  useEffect(() => {
    const handleTabParam = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'orders') {
        setActiveTab('orders');
      } else if (tab === 'reviews') {
        setActiveTab('reviews');
      }
    };

    handleTabParam();
  }, []);

  // 로그인 확인 및 데이터 로드
  useEffect(() => {
    // auth 유틸 함수를 사용하여 토큰 확인
    const { user: authUser, isLoggedIn } = checkToken();
    
    if (!isLoggedIn || !authUser) {
      // 로그인되어 있지 않으면 로그인 페이지로 즉시 리다이렉트
      router.push('/m/auth');
      return;
    }

    // 사용자 정보 가져오기
    const fetchUserData = async () => {
      try {
        // auth 유틸을 사용하여 인증 헤더 생성
        const authHeader = getAuthHeader();
        
        // 사용자 정보 요청
        const response = await fetch('/api/users/me', {
          headers: authHeader
        });

        if (!response.ok) {
          throw new Error('사용자 정보를 불러오는데 실패했습니다.');
        }

        const userData = await response.json();
        setUser(userData);

        // 주문 정보 요청
        try {
          const ordersResponse = await fetch('/api/orders/my', {
            headers: authHeader
          });

          if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            
            // 주문에 있는 각 상품에 대한 추가 정보(이미지 등) 가져오기
            const updatedOrdersData = await Promise.all(
              ordersData.map(async (order: OrderHistory) => {
                const updatedItems = await Promise.all(
                  order.items.map(async (item) => {
                    try {
                      // 상품 정보 요청
                      const productResponse = await fetch(`/api/products/${item.product_id}`, {
                        headers: authHeader
                      });
                      
                      if (productResponse.ok) {
                        const productData = await productResponse.json();
                        return {
                          ...item,
                          thumbnail_url: productData.product?.thumbnail_url || null,
                          product_image: productData.product?.thumbnail_url || null
                        };
                      }
                      return item;
                    } catch (error) {
                      console.error('상품 정보 로딩 오류:', error);
                      return item;
                    }
                  })
                );
                
                return {
                  ...order,
                  items: updatedItems
                };
              })
            );
            
            setOrderHistory(updatedOrdersData);
          } else {
            setOrderHistory([]);
          }
        } catch (error) {
          console.error('주문 정보 로딩 중 오류:', error);
          setOrderHistory([]);
        }

        // 리뷰 정보 요청
        try {
          const reviewsResponse = await fetch('/api/reviews/my', {
            headers: authHeader
          });

          if (reviewsResponse.ok) {
            const reviewsData = await reviewsResponse.json();
            setReviewHistory(reviewsData);
          } else {
            setReviewHistory([]);
          }
        } catch (error) {
          console.error('리뷰 정보 로딩 중 오류:', error);
          setReviewHistory([]);
        }
      } catch (error) {
        console.error('데이터 로딩 오류:', error);
        toast.error('데이터를 불러오는데 문제가 발생했습니다.');
      }
    };

    fetchUserData();
  }, [router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  };

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return '등록된 번호가 없습니다';
    
    // 010-1234-5678 형식으로 변환
    if (phone.length === 11) {
      return `${phone.substring(0, 3)}-${phone.substring(3, 7)}-${phone.substring(7)}`;
    }
    return phone;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('cartItems');
    localStorage.removeItem('naver_user_info');
    localStorage.removeItem('naver_access_token');
    localStorage.removeItem('kakao_user_info');
    localStorage.removeItem('kakao_access_token');
    localStorage.removeItem('google_user_info');
    localStorage.removeItem('google_access_token');
    triggerLoginEvent();
    router.push('/m/auth');
  };

  // 주문 취소 기능 추가
  const handleCancelOrder = async (orderId: string) => {
    // 주문 ID 저장 및 모달 열기
    setSelectedOrderId(orderId);
    setShowCancelOrderModal(true);
  };

  // 선택한 취소 사유로 실제 취소 처리
  const processCancelOrder = async (cancelReason: string) => {
    try {
      if (!selectedOrderId) return;
      
      // 모달 닫기
      setShowCancelOrderModal(false);
      
      // 정말 취소할 것인지 재확인
      if (!window.confirm('정말로 이 주문을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        return;
      }
      
      // 인증 헤더 가져오기
      const authHeader = getAuthHeader();
      
      // 인증 정보가 없을 경우 예외 처리
      if (!authHeader.Authorization) {
        toast.error('인증 정보가 없습니다. 다시 로그인해주세요.');
        handleLogout(); // 로그아웃 처리하고 로그인 페이지로 이동
        return;
      }
      
      // 로딩 토스트 표시
      const loadingToast = toast.loading('주문 취소 중입니다...');
      
      // API 호출
      const response = await fetch(`/api/orders/${selectedOrderId}/cancel`, {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cancelReason })
      });
      
      // 로딩 토스트 닫기
      toast.dismiss(loadingToast);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '주문 취소에 실패했습니다.');
      }
      
      toast.success('주문이 성공적으로 취소되었습니다.');
      
      // 주문 목록 업데이트
      setOrderHistory(prev => prev.map(order => 
        order.id === selectedOrderId 
          ? { ...order, status: 'canceled' } 
          : order
      ));
      
      // 선택된 주문 ID 초기화
      setSelectedOrderId(null);
    } catch (error) {
      console.error('주문 취소 오류:', error);
      toast.error(error instanceof Error ? error.message : '주문 취소 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      if (!window.confirm('정말로 이 리뷰를 삭제하시겠습니까?')) {
        return;
      }

      // 인증 헤더 가져오기
      const authHeader = getAuthHeader();
      
      // 인증 정보가 없을 경우 예외 처리
      if (!authHeader.Authorization) {
        toast.error('인증 정보가 없습니다. 다시 로그인해주세요.');
        handleLogout(); // 로그아웃 처리하고 로그인 페이지로 이동
        return;
      }

      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('리뷰 삭제 오류 응답:', errorData);
        throw new Error(errorData.error || '리뷰 삭제에 실패했습니다.');
      }

        toast.success('리뷰가 삭제되었습니다.');
        // 리뷰 목록에서 삭제된 리뷰 제거
        setReviewHistory(prev => prev.filter(review => review.id !== reviewId));
    } catch (error) {
      console.error('리뷰 삭제 오류:', error);
      toast.error(error instanceof Error ? error.message : '리뷰를 삭제하는데 문제가 발생했습니다.');
    }
  };

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedImage(null);
  };

  // 로그인되지 않은 상태면 이 컴포넌트는 렌더링되지 않음 (위에서 리다이렉트)
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Toaster position="top-center" />
      
      {/* 이미지 모달 */}
      {selectedImage && (
        <ImageModal 
          imageUrl={selectedImage}
          isOpen={isImageModalOpen}
          onClose={closeImageModal}
        />
      )}
      
      {/* 회원탈퇴 모달 */}
      <DeactivateModal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        hasPassword={!!user.login_id}
        onComplete={() => router.push('/')}
      />
      
      {/* 주문 취소 모달 */}
      <CancelOrderModal
        isOpen={showCancelOrderModal}
        onClose={() => setShowCancelOrderModal(false)}
        onConfirm={processCancelOrder}
      />
      
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 shadow-sm fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="p-1 mr-2"
              aria-label="뒤로 가기"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h1 className="text-xl font-bold">마이페이지</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600"
          >
            로그아웃
          </button>
        </div>
      </div>
      
      {/* 사용자 정보 요약 */}
      <div className="pt-20 pb-3 px-4 bg-white shadow-sm mb-2">
        <div className="flex items-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
            {user.avatar_url ? (
              <Image 
                src={user.avatar_url} 
                alt={user.nickname || '사용자'} 
                className="w-full h-full object-cover" 
                width={64}
                height={64}
              />
            ) : (
              <span className="text-2xl text-gray-500">
                {(user.nickname || user.name || 'U').charAt(0)}
              </span>
            )}
          </div>
          <div className="ml-4">
            <h2 className="font-semibold text-lg">{user.nickname || user.name || '사용자'}</h2>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>
      </div>
      
      {/* 탭 메뉴 */}
      <div className="bg-white mb-2 shadow-sm">
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-center font-medium ${activeTab === 'profile' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('profile')}
          >
            프로필
          </button>
          <button
            className={`flex-1 py-3 text-center font-medium ${activeTab === 'orders' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('orders')}
          >
            주문내역
          </button>
          <button
            className={`flex-1 py-3 text-center font-medium ${activeTab === 'reviews' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('reviews')}
          >
            리뷰관리
          </button>
        </div>
      </div>
      
      {/* 프로필 탭 컨텐츠 */}
      {activeTab === 'profile' && (
        <div className="p-4">
          {/* 사용자 정보 섹션 */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm text-gray-500">이름</h3>
                  <p className="mt-1">{user.name || '등록된 이름이 없습니다'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm text-gray-500">전화번호</h3>
                  <p className="mt-1">{formatPhoneNumber(user.phone_number)}</p>
                </div>
                
                <div>
                  <h3 className="text-sm text-gray-500">주소</h3>
                  <p className="mt-1">
                    {user.address ? (
                      <>
                        [{user.postcode}] {user.address} {user.detail_address || ''}
                      </>
                    ) : (
                      '등록된 주소가 없습니다'
                    )}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm text-gray-500">가입일</h3>
                  <p className="mt-1">{user.created_at ? formatDate(user.created_at) : '정보 없음'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* 메뉴 옵션 */}
          <div className="space-y-3">
            <Link 
              href="/m/mypage/edit-profile" 
              className="flex items-center justify-between p-4 rounded-lg bg-white shadow-sm"
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600 mr-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span>프로필 수정</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
            
            <Link 
              href="/m/mypage/address-book" 
              className="flex items-center justify-between p-4 rounded-lg bg-white shadow-sm"
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600 mr-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span>배송지 관리</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
            
            {user.login_id && (
              <Link 
                href="/m/mypage/change-password" 
                className="flex items-center justify-between p-4 rounded-lg bg-white shadow-sm"
              >
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600 mr-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span>비밀번호 변경</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            )}
            
            <button 
              onClick={handleLogout}
              className="flex items-center justify-between p-4 rounded-lg bg-white shadow-sm w-full text-left"
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600 mr-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                <span>로그아웃</span>
              </div>
            </button>
            
            {/* 회원탈퇴 버튼 추가 */}
            <button 
              onClick={() => setShowDeactivateModal(true)}
              className="flex items-center justify-between p-4 rounded-lg bg-white shadow-sm w-full text-left mt-6"
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-500 mr-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                <span className="text-red-500">회원탈퇴</span>
              </div>
            </button>
          </div>
        </div>
      )}
      
      {/* 주문내역 탭 컨텐츠 */}
      {activeTab === 'orders' && (
        <div className="p-4">
          {orderHistory.length > 0 ? (
            <div className="space-y-4">
              {orderHistory.map((order) => {
                // 상품 ID별로 그룹화
                const groupedItems = order.items.reduce((acc, item) => {
                  if (!acc[item.product_id]) {
                    acc[item.product_id] = {
                      product_name: item.product_name,
                      product_image: item.product_image,
                      thumbnail_url: item.thumbnail_url,
                      total_quantity: 0,
                      total_price: 0,
                      options: []
                    };
                  }
                  acc[item.product_id].total_quantity += item.quantity;
                  acc[item.product_id].total_price += item.price * item.quantity;
                  
                  // options가 문자열이면 JSON으로 파싱
                  let options = item.options;
                  if (typeof options === 'string') {
                    try {
                      options = JSON.parse(options);
                    } catch (e) {
                      console.error('옵션 파싱 오류:', e);
                      options = { name: '기본', value: '옵션 없음', additional_price: 0 };
                    }
                  }
                  
                  // options가 객체이면 옵션 정보를 추가
                  if (typeof options === 'object' && options !== null) {
                    acc[item.product_id].options.push({
                      option_name: options.option_name || options.name || '기본',
                      option_value: options.option_value || options.value || '옵션 없음',
                      additional_price: options.additional_price || 0,
                      quantity: item.quantity,
                      price: item.price
                    });
                  }
                  
                  return acc;
                }, {} as Record<string, {
                  product_name: string;
                  product_image?: string;
                  thumbnail_url?: string;
                  total_quantity: number;
                  total_price: number;
                  options: Array<{
                    option_name: string;
                    option_value: string;
                    additional_price: number;
                    quantity: number;
                    price: number;
                  }>;
                }>);

                return (
                  <div key={order.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center p-4 border-b">
                      <div>
                        <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                        <p className="font-medium">{order.order_number}</p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    
                    <div className="p-4">
                      {Object.entries(groupedItems).map(([productId, product]) => (
                        <div key={productId} className="py-3 border-b last:border-0">
                          <div className="flex gap-3 mb-3">
                            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {product.thumbnail_url || product.product_image ? (
                                <Image
                                  src={product.thumbnail_url || product.product_image || '/images/default-product.jpg'}
                                  alt={product.product_name}
                                  width={80}
                                  height={80}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <Link 
                                  href={`/m/products/${productId}`}
                                  className="font-medium text-base truncate hover:text-green-600"
                                >
                                  {product.product_name}
                                </Link>
                                <p className="text-gray-600 text-sm whitespace-nowrap ml-2">
                                  총 {product.total_quantity}개
                                </p>
                              </div>
                              
                              <div className="space-y-1 mt-2">
                                {product.options.map((option, index) => (
                                  <div key={index} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">
                                      {option.option_name === '기본' && option.option_value === '옵션 없음' ? (
                                        `수량: ${option.quantity}개`
                                      ) : (
                                        <>
                                          {option.option_name}: {option.option_value}
                                          {option.additional_price > 0 && (
                                            <span className="text-gray-500 ml-1">(+{option.additional_price.toLocaleString()}원)</span>
                                          )}
                                          <span className="ml-2">수량: {option.quantity}개</span>
                                        </>
                                      )}
                                    </span>
                                    <span className="text-gray-800">
                                      {(option.price * option.quantity).toLocaleString()}원
                                    </span>
                                  </div>
                                ))}
                              </div>
                              
                              <div className="flex justify-end mt-2">
                                <span className="text-sm font-medium text-gray-900">
                                  상품 합계: {product.total_price.toLocaleString()}원
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex justify-between items-center mt-4 pt-4 border-t">
                        <span className="font-medium text-base">총 결제금액</span>
                        <span className="font-bold text-lg text-green-600">
                          {order.total_amount.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 flex justify-end space-x-2">
                      <Link
                        href={`/m/orders/${order.id}/detail`}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        주문 상세
                      </Link>
                      
                      {/* 결제 완료 상태일 때만 취소 버튼 표시 */}
                      {(order.status === 'paid' || order.status === 'payment_confirmed') && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="px-4 py-2 text-sm border border-red-300 rounded-md text-red-700 hover:bg-red-50 transition-colors"
                        >
                          주문 취소
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-300 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <p className="text-gray-500 text-lg">주문 내역이 없습니다</p>
              <p className="text-gray-400 text-sm mt-2">새로운 상품을 구매해보세요</p>
            </div>
          )}
        </div>
      )}

      {/* 리뷰관리 탭 컨텐츠 */}
      {activeTab === 'reviews' && (
        <div className="p-4">
          {reviewHistory.length > 0 ? (
            <div className="space-y-4">
              {reviewHistory.map((review) => (
                <div key={review.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4 border-b">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Link 
                          href={`/m/products/${review.product_id}`}
                          className="font-medium hover:text-green-600"
                        >
                          {review.product?.name || '상품명 없음'}
                        </Link>
                        <div className="flex items-center mt-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg 
                                key={star} 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                fill={star <= review.rating ? "currentColor" : "none"}
                                stroke={star <= review.rating ? "none" : "currentColor"}
                                className="w-4 h-4 text-yellow-400"
                              >
                                <path 
                                  fillRule="evenodd" 
                                  d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ))}
                          </div>
                          <span className="ml-2 text-gray-500 text-sm">
                            {new Date(review.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-red-500 text-sm hover:text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                    
                    <p className="text-gray-700 whitespace-pre-line mt-2">{review.content}</p>
                    
                    {review.image_url && (
                      <div 
                        className="mt-3 cursor-pointer"
                        onClick={() => openImageModal(review.image_url!)}
                      >
                        <div className="relative w-20 h-20 bg-gray-100 rounded-md overflow-hidden">
                          <Image
                            src={review.image_url}
                            alt="리뷰 이미지"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-300 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              <p className="text-gray-500 text-lg">작성한 리뷰가 없습니다</p>
              <p className="text-gray-400 text-sm mt-2">상품을 구매하고 리뷰를 작성해보세요</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MobileMyPage() {
  return (
    <>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
        </div>
      }>
        <MobileMyPageContent />
      </Suspense>
    </>
  );
} 