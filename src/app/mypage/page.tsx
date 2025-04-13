'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name?: string;
  nickname?: string;
  avatar_url?: string;
  phone_number?: string;
  marketing_agreed?: boolean;
  terms_agreed?: boolean;
  created_at?: string;
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

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const router = useRouter();

  useEffect(() => {
    const checkLoginStatus = () => {
      try {
        const tokenData = localStorage.getItem('token');
        if (tokenData) {
          const parsedToken = JSON.parse(tokenData);
          
          // 토큰이 만료되었는지 확인
          if (parsedToken.expiresAt && parsedToken.expiresAt > Date.now()) {
            setUser(parsedToken.user || null);
          } else {
            // 만료된 토큰이면 로그인 페이지로 리다이렉션
            router.push('/auth');
          }
        } else {
          // 토큰이 없으면 로그인 페이지로 리다이렉션
          router.push('/auth');
        }
      } catch (error) {
        console.error('토큰 확인 오류:', error);
        router.push('/auth');
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
    
    // 주문 내역 가져오기 (현재는 더미 데이터를 사용)
    const dummyOrderHistory: OrderHistory[] = [
      {
        id: '1',
        order_number: 'ORD-2023-001',
        total_amount: 35000,
        status: '배송 완료',
        created_at: '2023-11-15T12:00:00Z',
        items: [
          { product_name: '유기농 당근', quantity: 2, price: 15000 },
          { product_name: '친환경 양배추', quantity: 1, price: 5000 }
        ]
      },
      {
        id: '2',
        order_number: 'ORD-2023-002',
        total_amount: 45000,
        status: '배송중',
        created_at: '2023-11-20T14:30:00Z',
        items: [
          { product_name: '제철 과일 세트', quantity: 1, price: 45000 }
        ]
      }
    ];
    
    setOrderHistory(dummyOrderHistory);
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
                <button
                  onClick={() => setActiveTab('edit')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                    activeTab === 'edit'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  개인정보 수정
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
                      <p className="text-sm text-gray-500">마케팅 정보 수신 동의</p>
                      <p className="font-medium">{user.marketing_agreed ? '동의함' : '동의하지 않음'}</p>
                    </div>
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
                        <div key={order.id} className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 p-4 flex justify-between items-center">
                            <div>
                              <p className="font-medium">{order.order_number}</p>
                              <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                            </div>
                            <div>
                              <span className={`px-3 py-1 rounded-full text-xs ${
                                order.status === '배송 완료' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {order.status}
                              </span>
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
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">주문 내역이 없습니다.</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* 개인정보 수정 탭 */}
              {activeTab === 'edit' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">개인정보 수정</h3>
                  <p className="mb-4 text-gray-600">
                    개인정보를 수정하시려면 아래 버튼을 클릭하세요.
                  </p>
                  <div className="space-y-4">
                    <Link href="/mypage/edit-profile" className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">
                      개인정보 수정하기
                    </Link>
                    <Link href="/mypage/change-password" className="block px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 inline-block">
                      비밀번호 변경하기
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 