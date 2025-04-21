'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Spinner } from '@/components/ui/CommonStyles';
import toast from 'react-hot-toast';

// 주문 상태 색상 및 텍스트
const orderStatusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'bg-yellow-100 text-yellow-800', text: '주문 대기중' },
  payment_pending: { color: 'bg-blue-100 text-blue-800', text: '결제 진행중' },
  paid: { color: 'bg-green-100 text-green-800', text: '결제 완료' },
  preparing: { color: 'bg-indigo-100 text-indigo-800', text: '상품 준비중' },
  shipping: { color: 'bg-purple-100 text-purple-800', text: '배송중' },
  delivered: { color: 'bg-green-100 text-green-800', text: '배송 완료' },
  canceled: { color: 'bg-red-100 text-red-800', text: '주문 취소' },
  cancelled: { color: 'bg-red-100 text-red-800', text: '주문 취소' },
  refunded: { color: 'bg-gray-100 text-gray-800', text: '환불 완료' },
};

// 날짜 포맷팅 함수
const formatDate = (dateString: string) => {
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
  return price.toLocaleString('ko-KR') + '원';
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentStatus, setCurrentStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // 주문 데이터 가져오기
  useEffect(() => {
    fetchOrders();
  }, [currentStatus, currentPage, sortBy, sortOrder]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        toast.error('관리자 권한이 없습니다');
        router.push('/admin/login');
        return;
      }

      // 검색 조건에 따라 쿼리 파라미터 구성
      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', '10'); // 페이지당 10개
      queryParams.append('sort', sortBy);
      queryParams.append('order', sortOrder);
      
      if (currentStatus !== 'all') {
        queryParams.append('status', currentStatus);
      }
      
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }

      const response = await fetch(`/api/admin/orders?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        throw new Error('주문 목록을 가져오는데 실패했습니다');
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('주문 목록 로딩 오류:', error);
      toast.error('주문 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 주문 상태 필터 변경 핸들러
  const handleStatusChange = (status: string) => {
    setCurrentStatus(status);
    setCurrentPage(1);
  };

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOrders();
  };

  // 정렬 변경 핸들러
  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // 페이지네이션 렌더링
  const renderPagination = () => {
    const pages = [];
    const maxDisplayPages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxDisplayPages / 2));
    const endPage = Math.min(totalPages, startPage + maxDisplayPages - 1);
    
    if (endPage - startPage + 1 < maxDisplayPages) {
      startPage = Math.max(1, endPage - maxDisplayPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`px-3 py-1 mx-1 rounded ${
            currentPage === i
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex justify-center mt-6 flex-wrap">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 border border-gray-300 rounded-l bg-white text-gray-700 disabled:opacity-50"
        >
          이전
        </button>
        {pages}
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border border-gray-300 rounded-r bg-white text-gray-700 disabled:opacity-50"
        >
          다음
        </button>
      </div>
    );
  };

  // 결제 방법 표시
  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'card': return '카드';
      case 'bank': return '무통장입금';
      case 'kakao': return '카카오페이';
      case 'toss': return '토스페이';
      default: return method;
    }
  };

  // 상품 정보 표시
  const renderProductInfo = (order: any) => {
    if (!order.items || order.items.length === 0) {
      return <span className="text-gray-500">상품 정보 없음</span>;
    }

    const firstItem = order.items[0];
    
    return (
      <div className="flex items-center">
        <div>
          <div className="font-medium">{firstItem.product_name || '상품명 없음'}</div>
          {order.items.length > 1 && (
            <div className="text-sm text-gray-500">외 {order.items.length - 1}건</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4 pt-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">주문 관리</h1>
        
        {/* 검색 및 필터 */}
        <div className="flex flex-col mb-4 gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={currentStatus === 'all' ? 'primary' : 'outline'}
              onClick={() => handleStatusChange('all')}
              className="text-xs sm:text-sm px-2 py-1"
            >
              전체
            </Button>
            <Button
              variant={currentStatus === 'pending' || currentStatus === 'payment_pending' ? 'primary' : 'outline'}
              onClick={() => handleStatusChange('pending')}
              className="text-xs sm:text-sm px-2 py-1"
            >
              대기중
            </Button>
            <Button
              variant={currentStatus === 'paid' ? 'primary' : 'outline'}
              onClick={() => handleStatusChange('paid')}
              className="text-xs sm:text-sm px-2 py-1"
            >
              결제완료
            </Button>
            <Button
              variant={currentStatus === 'preparing' ? 'primary' : 'outline'}
              onClick={() => handleStatusChange('preparing')}
              className="text-xs sm:text-sm px-2 py-1"
            >
              상품준비중
            </Button>
            <Button
              variant={currentStatus === 'shipping' ? 'primary' : 'outline'}
              onClick={() => handleStatusChange('shipping')}
              className="text-xs sm:text-sm px-2 py-1"
            >
              배송중
            </Button>
            <Button
              variant={currentStatus === 'delivered' ? 'primary' : 'outline'}
              onClick={() => handleStatusChange('delivered')}
              className="text-xs sm:text-sm px-2 py-1"
            >
              배송완료
            </Button>
            <Button
              variant={currentStatus === 'canceled' || currentStatus === 'cancelled' ? 'primary' : 'outline'}
              onClick={() => handleStatusChange('canceled')}
              className="text-xs sm:text-sm px-2 py-1"
            >
              취소
            </Button>
            <Button
              variant={currentStatus === 'refunded' ? 'primary' : 'outline'}
              onClick={() => handleStatusChange('refunded')}
              className="text-xs sm:text-sm px-2 py-1"
            >
              환불
            </Button>
          </div>
          
          <form onSubmit={handleSearch} className="flex gap-2 w-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="주문번호, 고객명, 연락처 검색"
              className="border border-gray-300 rounded px-3 py-2 flex-grow"
            />
            <Button type="submit">검색</Button>
          </form>
        </div>
      </div>
      
      {/* 주문 목록 */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">주문 내역이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {/* PC 화면용 테이블 (md 이상 크기에서만 표시) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-md">
              <thead className="bg-gray-100">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('order_number')}
                  >
                    주문번호
                    {sortBy === 'order_number' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    고객 정보
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    상품 정보
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('total_amount')}
                  >
                    주문 금액
                    {sortBy === 'total_amount' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    결제 방법
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    주문 상태
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('created_at')}
                  >
                    주문일
                    {sortBy === 'created_at' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    배송 정보
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{order.shipping_name}</div>
                      <div className="text-sm text-gray-500">{order.shipping_phone}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="mb-3">
                        {renderProductInfo(order)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(order.total_amount)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getPaymentMethodText(order.payment_method)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        orderStatusMap[order.status]?.color || 'bg-gray-100 text-gray-800'
                      }`}>
                        {orderStatusMap[order.status]?.text || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {order.shipments && order.shipments.length > 0 ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{order.shipments[0].carrier}</div>
                          <div className="text-gray-500">{order.shipments[0].tracking_number}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">배송정보 없음</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <Link 
                        href={`/admin/orders/${order.id}`}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 화면용 카드 UI (md 미만 크기에서 표시) */}
          <div className="md:hidden space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-medium">{order.order_number}</div>
                    <div className="text-xs text-gray-500">{formatDate(order.created_at)}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    orderStatusMap[order.status]?.color || 'bg-gray-100 text-gray-800'
                  }`}>
                    {orderStatusMap[order.status]?.text || order.status}
                  </span>
                </div>
                
                <div className="mb-3">
                  {renderProductInfo(order)}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <div className="font-medium text-gray-500">고객정보</div>
                    <div>{order.shipping_name}</div>
                    <div>{order.shipping_phone}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500">주문금액</div>
                    <div className="font-medium">{formatPrice(order.total_amount)}</div>
                    <div>{getPaymentMethodText(order.payment_method)}</div>
                  </div>
                </div>
                
                {order.shipments && order.shipments.length > 0 && (
                  <div className="text-xs mb-3">
                    <div className="font-medium text-gray-500">배송정보</div>
                    <div className="grid grid-cols-2 gap-1">
                      <div>택배사: {order.shipments[0].carrier}</div>
                      <div>송장번호: {order.shipments[0].tracking_number}</div>
                    </div>
                  </div>
                )}
                
                <div className="text-right">
                  <Link 
                    href={`/admin/orders/${order.id}`}
                    className="inline-block px-3 py-1 bg-green-50 text-green-600 rounded text-sm font-medium"
                  >
                    상세보기
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 페이지네이션 */}
      {!loading && orders.length > 0 && renderPagination()}
    </div>
  );
} 