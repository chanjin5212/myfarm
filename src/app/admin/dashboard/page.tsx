'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Spinner } from '@/components/ui/CommonStyles';
import { formatPrice } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  recentOrders: {
    id: string;
    order_number: string;
    created_at: string;
    status: string;
    total_amount: number;
  }[];
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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    recentOrders: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 관리자 토큰 가져오기
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
          throw new Error('인증 토큰이 없습니다.');
        }
        
        // API 엔드포인트 호출
        const response = await fetch('/api/admin/dashboard', {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error('데이터를 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('대시보드 데이터 로딩 오류:', err);
        setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // 로딩 상태 표시
  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }
  
  // 에러 상태 표시
  if (error) {
    return (
      <div className="p-4">
        <Card>
          <div className="p-4 text-red-700">
            <p>{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-800">대시보드</h1>
      
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">총 매출</h3>
          <p className="text-xl font-bold mt-1">{formatPrice(stats.totalSales)}</p>
        </Card>
        
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">총 주문</h3>
          <p className="text-xl font-bold mt-1">{stats.totalOrders}건</p>
        </Card>
        
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">상품 수</h3>
          <p className="text-xl font-bold mt-1">{stats.totalProducts}개</p>
        </Card>
        
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">회원 수</h3>
          <p className="text-xl font-bold mt-1">{stats.totalUsers}명</p>
        </Card>
      </div>

      {/* 최근 주문 */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="font-medium">최근 주문</h2>
        </div>

        <div className="divide-y">
          {stats.recentOrders.length > 0 ? (
            stats.recentOrders.map((order) => (
              <div key={order.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <OrderStatusBadge status={order.status} />
                    <p className="font-medium mt-1">{formatPrice(order.total_amount)}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p>최근 주문이 없습니다.</p>
            </div>
          )}
        </div>
        
        <div className="p-3 border-t bg-gray-50 text-center">
          <Button
            variant="link"
            onClick={() => router.push('/admin/orders')}
          >
            모든 주문 보기
          </Button>
        </div>
      </Card>
    </div>
  );
} 