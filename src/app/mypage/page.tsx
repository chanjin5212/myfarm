'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/CommonStyles';
import { checkToken, getAuthHeader, logout } from '@/utils/auth';
import toast from 'react-hot-toast';
import ShippingAddressModal from './ShippingAddressModal';

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

interface MenuItemProps {
  href: string;
  title: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

function MenuItem({ href, title, icon, onClick }: MenuItemProps) {
  return (
    <Link 
      href={href} 
      className="flex items-center p-4 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm"
      onClick={onClick}
    >
      <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
        {icon}
      </div>
      <div className="ml-3">
        <p className="text-base font-medium text-gray-800">{title}</p>
      </div>
    </Link>
  );
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
    <span className={`${bgColor} ${textColor} px-3 py-1 rounded-full text-xs font-medium`}>
      {statusText}
    </span>
  );
};

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isShippingPopupOpen, setIsShippingPopupOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        // auth 유틸 함수를 사용하여 토큰 확인
        const { user: authUser, isLoggedIn } = checkToken();
        
        if (!isLoggedIn || !authUser) {
          router.push('/auth');
          return;
        }

        // auth 유틸을 사용하여 인증 헤더 생성
        const authHeader = getAuthHeader();
        console.log('[마이페이지] 인증 헤더:', authHeader);
        
        // 사용자 정보 요청
        const response = await fetch('/api/users/me', {
          headers: authHeader
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[마이페이지] 사용자 정보 요청 실패:', response.status, errorData);
          throw new Error(errorData.error || '사용자 정보를 불러오는데 실패했습니다.');
        }

        const userData = await response.json();
        setUser(userData);
        console.log('[마이페이지] 사용자 정보 로드 완료:', userData.id);

        try {
          // 주문 정보 요청 - 별도 try/catch로 분리하여 주문 오류가 있어도 페이지는 로드
          console.log('[마이페이지] 주문 정보 요청 시작');
          const ordersResponse = await fetch('/api/orders/my', {
            headers: authHeader
          });

          console.log('[마이페이지] 주문 응답 상태:', ordersResponse.status);
          if (!ordersResponse.ok) {
            const orderErrorData = await ordersResponse.json().catch(() => ({}));
            console.error('[마이페이지] 주문 정보 요청 실패:', ordersResponse.status, orderErrorData);
            setOrderHistory([]);
          } else {
            const ordersData = await ordersResponse.json();
            console.log('[마이페이지] 주문 정보 로드 완료:', ordersData.length, '건');
            setOrderHistory(ordersData);
          }
        } catch (orderError) {
          console.error('[마이페이지] 주문 정보 로딩 중 오류:', orderError);
          setOrderHistory([]);
          // 주문 오류는 전체 페이지 오류로 취급하지 않음
        }
      } catch (error) {
        console.error('[마이페이지] 데이터 로딩 오류:', error);
        setError(error instanceof Error ? error.message : '데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
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
    try {
      // auth.ts의 logout 함수 사용
      logout();
      console.log('[마이페이지] 로그아웃 실행됨');
      // router.push 대신 location을 사용하여 직접 리디렉션
      window.location.href = '/';
    } catch (error) {
      console.error('[마이페이지] 로그아웃 중 오류:', error);
      // 오류가 발생해도 일단 메인 페이지로 이동
      localStorage.removeItem('token');
      window.location.href = '/';
    }
  };

  const handleAddressModalOpen = () => {
    setIsAddressModalOpen(true);
  };
  
  const handleAddressModalClose = () => {
    setIsAddressModalOpen(false);
  };
  
  const handleAddressUpdate = () => {
    toast.success('배송지 정보가 업데이트되었습니다.');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-center mb-10">마이페이지</h1>
        
        {user && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* 프로필 헤더 */}
            <div className="bg-blue-600 p-6 text-white">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt="프로필 이미지"
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-full border-4 border-white"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-blue-300 flex items-center justify-center text-blue-800 text-2xl font-bold border-4 border-white">
                      {user.nickname?.charAt(0) || user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="ml-6">
                  <h2 className="text-2xl font-bold">{user.nickname || user.name || '회원'}</h2>
                  <p className="text-blue-100">{user.email}</p>
                  <p className="text-blue-100 text-sm mt-1">
                    가입일: {user.created_at ? formatDate(user.created_at) : '정보 없음'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 탭 메뉴 */}
            <div className="border-b">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                    activeTab === 'profile'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  내 정보
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                    activeTab === 'orders'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  주문 내역
                </button>
              </nav>
            </div>
            
            {/* 컨텐츠 영역 */}
            <div className="p-6">
              {/* 프로필 탭 */}
              {activeTab === 'profile' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">회원 정보</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">이메일</p>
                        <p className="font-medium">{user.email}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">이름</p>
                        <p className="font-medium">{user.name || '정보 없음'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">닉네임</p>
                        <p className="font-medium">{user.nickname || '정보 없음'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">휴대폰 번호</p>
                        <p className="font-medium">{formatPhoneNumber(user.phone_number)}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">주소</p>
                      {user.address ? (
                        <div>
                          <p className="font-medium">[{user.postcode}] {user.address}</p>
                          <p className="font-medium">{user.detail_address}</p>
                        </div>
                      ) : (
                        <p className="font-medium">등록된 주소가 없습니다.</p>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold mt-8 mb-4">바로가기</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <MenuItem 
                      href="/mypage/edit-profile"
                      title="개인정보 수정"
                      icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      }
                    />
                    {user?.login_id && (
                      <Link 
                        href="/mypage/change-password" 
                        className="flex items-center p-3 text-base font-medium text-gray-800 rounded-lg hover:bg-gray-100 group hover:shadow"
                      >
                        <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-gray-500 transition duration-75 group-hover:text-gray-900">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="ml-3">비밀번호 변경</span>
                      </Link>
                    )}
                    <div
                      className="flex items-center p-4 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm cursor-pointer"
                      onClick={handleAddressModalOpen}
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-base font-medium text-gray-800">배송지 관리</p>
                      </div>
                    </div>
                    <MenuItem 
                      href="#"
                      title="로그아웃"
                      icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zm6.293 11.293a1 1 0 001.414 1.414l4-4a1 1 0 000-1.414l-4-4a1 1 0 00-1.414 1.414L11.586 10l-2.293 2.293z" clipRule="evenodd" />
                        </svg>
                      }
                      onClick={handleLogout}
                    />
                  </div>
                </div>
              )}
              
              {/* 주문 내역 탭 */}
              {activeTab === 'orders' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">주문 내역</h3>
                  {orderHistory.length > 0 ? (
                    <div className="space-y-6">
                      {orderHistory.map((order) => (
                        <div key={order.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                          <Link href={`/orders/${order.id}/detail`}>
                            <div className="bg-gray-50 p-4 flex justify-between items-center">
                              <div>
                                <p className="font-medium">{order.order_number}</p>
                                <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                              </div>
                              <div>
                                <OrderStatusBadge status={order.status} />
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="space-y-2">
                                {order.items.map((item, index) => (
                                  <div key={index} className="flex justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium">{item.product_name}</p>
                                      <p className="text-sm text-gray-500">{item.quantity}개</p>
                                    </div>
                                    <p className="text-right">{item.price.toLocaleString()}원</p>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                <p className="font-semibold">총 금액</p>
                                <p className="font-bold text-lg">{order.total_amount.toLocaleString()}원</p>
                              </div>
                              <div className="mt-4 text-right">
                                <span className="text-blue-600 text-sm font-medium">주문 상세보기 &rarr;</span>
                              </div>
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-gray-500 mb-4">주문 내역이 없습니다.</p>
                      <Link href="/products" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                        상품 보러가기
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 배송지 관리 모달 */}
        {user && (
          <ShippingAddressModal 
            isOpen={isAddressModalOpen}
            onClose={handleAddressModalClose}
            userId={user.id}
            onAddressUpdate={handleAddressUpdate}
          />
        )}
      </div>
    </div>
  );
} 