'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { checkToken, getAuthHeader, logout, triggerLoginEvent } from '@/utils/auth';
import toast, { Toaster } from 'react-hot-toast';

// URL 파라미터 처리 컴포넌트
function TabParamsHandler({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'orders') {
      setActiveTab('orders');
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
    product_name: string;
    quantity: number;
    price: number;
  }>;
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

function MobileMyPageContent() {
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);

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
            setOrderHistory(ordersData);
          } else {
            setOrderHistory([]);
          }
        } catch (error) {
          console.error('주문 정보 로딩 중 오류:', error);
          setOrderHistory([]);
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

  // 로그인되지 않은 상태면 이 컴포넌트는 렌더링되지 않음 (위에서 리다이렉트)
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Toaster position="top-center" />
      
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
          </div>
        </div>
      )}
      
      {/* 주문내역 탭 컨텐츠 */}
      {activeTab === 'orders' && (
        <div className="p-4">
          {orderHistory.length > 0 ? (
            <div className="space-y-4">
              {orderHistory.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b">
                    <div>
                      <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                      <p className="font-medium">{order.order_number}</p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  
                  <div className="p-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="py-2 border-b last:border-0">
                        <div className="flex justify-between">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-gray-600 text-sm">{item.quantity}개</p>
                        </div>
                        <p className="text-right text-sm">{item.price.toLocaleString()}원</p>
                      </div>
                    ))}
                    
                    <div className="flex justify-between items-center mt-3 pt-3 border-t">
                      <span className="font-medium">총 결제금액</span>
                      <span className="font-bold text-green-600">{order.total_amount.toLocaleString()}원</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 flex justify-end space-x-2">
                    <Link
                      href={`/m/mypage/orders/${order.id}`}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-700"
                    >
                      주문 상세
                    </Link>
                    
                    {order.status === 'delivered' && (
                      <Link
                        href={`/m/mypage/write-review?order=${order.id}`}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded"
                      >
                        리뷰 작성
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto text-gray-300 mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <p className="text-gray-500">주문 내역이 없습니다</p>
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