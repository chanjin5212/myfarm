'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Spinner } from '@/components/ui/CommonStyles';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// 가격 포맷팅 함수
const formatPrice = (price: number) => {
  return price.toLocaleString('ko-KR') + '원';
};

// 현재 날짜 관련 정보 가져오기
const getCurrentDateInfo = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  return { year, month };
};

// 날짜 포맷 함수 (YYYY-MM-DD)
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 통계 타입 정의
interface SalesData {
  daily: { label: string; sales: number }[];
  weekly: { label: string; sales: number }[];
  monthly: { label: string; sales: number }[];
  yearly: { label: string; sales: number }[];
  timeOfDay: { label: string; sales: number }[];
  topProducts: { id: string; name: string; salesCount: number; salesAmount: number }[];
  averageOrderAmount: number;
  dateRange: {
    startDate: string;
    endDate: string;
    totalAmount: number;
  };
}

const chartColors = [
  'rgba(255, 99, 132, 0.6)',
  'rgba(54, 162, 235, 0.6)',
  'rgba(255, 206, 86, 0.6)',
  'rgba(75, 192, 192, 0.6)',
  'rgba(153, 102, 255, 0.6)',
  'rgba(255, 159, 64, 0.6)',
  'rgba(199, 199, 199, 0.6)',
  'rgba(83, 102, 255, 0.6)',
  'rgba(40, 159, 64, 0.6)',
  'rgba(210, 199, 199, 0.6)',
];

export default function AdminStatisticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(formatDate(new Date(new Date().setDate(new Date().getDate() - 30))));
  const [endDate, setEndDate] = useState(formatDate(new Date()));
  const { year, month } = getCurrentDateInfo();
  
  // 선택된 기간에 따른 데이터 가져오기
  const currentRangeData = salesData?.daily || [];

  // 페이지 로드 시 관리자 토큰 확인
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    setAdminToken(token);
    
    if (!token) {
      toast.error('로그인이 필요합니다');
      router.push('/admin/login');
    } else {
      fetchSalesStatistics();
    }
  }, [router]);

  // 판매 통계 데이터 가져오기
  const fetchSalesStatistics = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        toast.error('관리자 권한이 없습니다');
        router.push('/admin/login');
        return;
      }
      
      const queryParams = new URLSearchParams();
      queryParams.append('startDate', startDate);
      queryParams.append('endDate', endDate);
      
      const response = await fetch(`/api/admin/statistics/sales?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('판매 통계 데이터를 가져오는데 실패했습니다');
      }
      
      const data = await response.json();
      setSalesData(data);
    } catch (error) {
      console.error('판매 통계 로딩 오류:', error);
      toast.error('판매 통계를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = () => {
    fetchSalesStatistics();
  };

  // 매출 추이 차트 데이터
  const salesTrendChartData = {
    labels: currentRangeData.map(item => item.label),
    datasets: [
      {
        label: '매출',
        data: currentRangeData.map(item => item.sales),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.2,
      },
    ],
  };
  
  // 시간대별 판매 현황 차트 데이터
  const timeOfDayChartData = {
    labels: salesData?.timeOfDay.map(item => item.label) || [],
    datasets: [
      {
        label: '시간대별 매출',
        data: salesData?.timeOfDay.map(item => item.sales) || [],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  };
  
  // 상품별 판매 순위 차트 데이터
  const topProductsChartData = {
    labels: salesData?.topProducts.slice(0, 5).map(item => item.name) || [],
    datasets: [
      {
        label: '판매량',
        data: salesData?.topProducts.slice(0, 5).map(item => item.salesCount) || [],
        backgroundColor: chartColors.slice(0, 5),
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-2 sm:px-4 pt-20">
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4 pt-20">
      <h1 className="text-2xl font-bold mb-6">판매 통계</h1>
      <div className="mb-6 flex items-center justify-end">
        <div className="flex space-x-2">
          <div className="flex flex-col">
            <label htmlFor="startDate" className="text-sm font-medium text-gray-700 mb-1">시작일</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="endDate" className="text-sm font-medium text-gray-700 mb-1">종료일</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
            />
          </div>
          <div className="flex flex-col justify-end">
            <Button 
              onClick={handleDateRangeChange}
              className="h-[34px] px-4 text-sm"
            >
              조회
            </Button>
          </div>
        </div>
      </div>

      {/* 주요 지표 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">평균 주문 금액</h3>
          <p className="text-2xl font-bold text-gray-800">{formatPrice(salesData?.averageOrderAmount || 0)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">
            {startDate} ~ {endDate} 기간 총 주문 금액
          </h3>
          <p className="text-2xl font-bold text-green-600">
            {formatPrice(salesData?.dateRange?.totalAmount || 0)}
          </p>
        </div>
      </div>

      {/* 매출 추이 차트 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">매출 추이</h2>
        <div className="h-80">
          <Line 
            data={salesTrendChartData} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: false,
                  ticks: {
                    callback: function(value) {
                      return value.toLocaleString('ko-KR') + '원';
                    }
                  }
                }
              },
              plugins: {
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      return context.dataset.label + ': ' + context.parsed.y.toLocaleString('ko-KR') + '원';
                    }
                  }
                }
              }
            }} 
          />
        </div>
      </div>

      {/* 차트 섹션 - 2단 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* 시간대별 판매 현황 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">시간대별 판매 현황</h2>
          <div className="h-80">
            <Bar 
              data={timeOfDayChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return value.toLocaleString('ko-KR') + '원';
                      }
                    }
                  }
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return context.dataset.label + ': ' + context.parsed.y.toLocaleString('ko-KR') + '원';
                      }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* 상품별 판매 순위 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">상위 5개 상품 판매량</h2>
          <div className="h-80">
            <Pie 
              data={topProductsChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return context.label + ': ' + context.parsed.toLocaleString('ko-KR') + '개';
                      }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* 상품 판매 순위 테이블 */}
        <div className="bg-white rounded-lg shadow p-4 md:col-span-2">
          <h2 className="text-lg font-semibold mb-4">상품별 판매 순위</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">순위</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상품명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">판매수량</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">판매금액</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesData?.topProducts.map((product, index) => (
                  <tr key={product.id} className={index < 3 ? 'bg-yellow-50' : ''}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{product.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{product.salesCount.toLocaleString('ko-KR')}개</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{formatPrice(product.salesAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 