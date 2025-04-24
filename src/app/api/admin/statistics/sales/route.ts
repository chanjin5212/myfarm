import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 관리자 토큰 검증 함수
async function verifyAdminToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      login_id: string;
      role: string;
    };
    
    if (decoded.role !== 'admin') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('토큰 검증 오류:', error);
    return null;
  }
}

// 날짜 포맷 함수 (YYYY-MM-DD)
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 일별 매출 데이터 조회
async function fetchDailySales(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total_amount')
    .gte('created_at', startDate)
    .lt('created_at', new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)).toISOString().split('T')[0])
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('일별 매출 조회 오류:', error);
    return [];
  }
  
  // 일별 매출 집계
  const salesByDay = new Map<string, number>();
  
  // 날짜 범위의 모든 날짜에 대해 초기값 설정
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  for (let i = 0; i <= diffDays; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateKey = `${date.getMonth() + 1}/${date.getDate()}`;
    salesByDay.set(dateKey, 0);
  }
  
  // 실제 데이터로 채우기
  data?.forEach(order => {
    const orderDate = new Date(order.created_at);
    const dateKey = `${orderDate.getMonth() + 1}/${orderDate.getDate()}`;
    
    if (salesByDay.has(dateKey)) {
      salesByDay.set(dateKey, (salesByDay.get(dateKey) || 0) + order.total_amount);
    }
  });
  
  // Map을 배열로 변환
  return Array.from(salesByDay, ([label, sales]) => ({ label, sales }))
    .sort((a, b) => {
      const [aMonth, aDay] = a.label.split('/').map(Number);
      const [bMonth, bDay] = b.label.split('/').map(Number);
      if (aMonth !== bMonth) return aMonth - bMonth;
      return aDay - bDay;
    });
}

// 주별 매출 데이터 조회
async function fetchWeeklySales(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total_amount')
    .gte('created_at', startDate)
    .lt('created_at', new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)).toISOString().split('T')[0])
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('주별 매출 조회 오류:', error);
    return [];
  }
  
  // 주별 매출 집계
  const salesByWeek = new Map<string, number>();
  
  // 현재 날짜의 연도와 주차 구하기
  const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  };
  
  // 날짜 범위의 모든 주차에 대해 초기값 설정
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  
  for (let i = 0; i <= diffWeeks; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + (i * 7));
    const weekNo = getWeekNumber(date);
    salesByWeek.set(`${weekNo}주차`, 0);
  }
  
  // 실제 데이터로 채우기
  data?.forEach(order => {
    const orderDate = new Date(order.created_at);
    const weekNo = getWeekNumber(orderDate);
    const weekKey = `${weekNo}주차`;
    
    if (salesByWeek.has(weekKey)) {
      salesByWeek.set(weekKey, (salesByWeek.get(weekKey) || 0) + order.total_amount);
    } else {
      salesByWeek.set(weekKey, order.total_amount);
    }
  });
  
  // Map을 배열로 변환하고 주차 순으로 정렬
  return Array.from(salesByWeek, ([label, sales]) => ({ label, sales }))
    .sort((a, b) => {
      const weekA = parseInt(a.label.replace('주차', ''));
      const weekB = parseInt(b.label.replace('주차', ''));
      return weekA - weekB;
    });
}

// 월별 매출 데이터 조회
async function fetchMonthlySales(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total_amount')
    .gte('created_at', startDate)
    .lt('created_at', new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)).toISOString().split('T')[0])
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('월별 매출 조회 오류:', error);
    return [];
  }
  
  // 월별 매출 집계
  const salesByMonth = new Map<string, number>();
  
  // 날짜 범위의 모든 월에 대해 초기값 설정
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  
  for (let i = 0; i <= diffMonths; i++) {
    const date = new Date(start);
    date.setMonth(start.getMonth() + i);
    const monthKey = `${date.getMonth() + 1}월`;
    salesByMonth.set(monthKey, 0);
  }
  
  // 실제 데이터로 채우기
  data?.forEach(order => {
    const orderDate = new Date(order.created_at);
    const monthKey = `${orderDate.getMonth() + 1}월`;
    
    if (salesByMonth.has(monthKey)) {
      salesByMonth.set(monthKey, (salesByMonth.get(monthKey) || 0) + order.total_amount);
    }
  });
  
  // Map을 배열로 변환
  return Array.from(salesByMonth, ([label, sales]) => ({ label, sales }))
    .sort((a, b) => {
      const monthA = parseInt(a.label.replace('월', ''));
      const monthB = parseInt(b.label.replace('월', ''));
      return monthA - monthB;
    });
}

// 연도별 매출 데이터 조회
async function fetchYearlySales(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total_amount')
    .gte('created_at', startDate)
    .lt('created_at', new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)).toISOString().split('T')[0])
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('연도별 매출 조회 오류:', error);
    return [];
  }
  
  // 연도별 매출 집계
  const salesByYear = new Map<string, number>();
  
  // 날짜 범위의 모든 연도에 대해 초기값 설정
  const startYear = new Date(startDate).getFullYear();
  const endYear = new Date(endDate).getFullYear();
  
  for (let year = startYear; year <= endYear; year++) {
    salesByYear.set(year.toString(), 0);
  }
  
  // 실제 데이터로 채우기
  data?.forEach(order => {
    const orderYear = new Date(order.created_at).getFullYear().toString();
    
    if (salesByYear.has(orderYear)) {
      salesByYear.set(orderYear, (salesByYear.get(orderYear) || 0) + order.total_amount);
    }
  });
  
  // Map을 배열로 변환
  return Array.from(salesByYear, ([label, sales]) => ({ label, sales }))
    .sort((a, b) => parseInt(a.label) - parseInt(b.label));
}

// 시간대별 매출 데이터 조회
async function fetchTimeOfDaySales(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total_amount')
    .gte('created_at', startDate)
    .lt('created_at', new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)).toISOString().split('T')[0])
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('시간대별 매출 조회 오류:', error);
    return [];
  }
  
  // 시간대별 매출 집계 (3시간 단위)
  const timeRanges = [
    { label: '00-03시', start: 0, end: 3 },
    { label: '03-06시', start: 3, end: 6 },
    { label: '06-09시', start: 6, end: 9 },
    { label: '09-12시', start: 9, end: 12 },
    { label: '12-15시', start: 12, end: 15 },
    { label: '15-18시', start: 15, end: 18 },
    { label: '18-21시', start: 18, end: 21 },
    { label: '21-24시', start: 21, end: 24 }
  ];
  
  const salesByTimeRange = new Map<string, number>();
  
  // 초기값 설정
  timeRanges.forEach(range => {
    salesByTimeRange.set(range.label, 0);
  });
  
  // 실제 데이터로 채우기
  data?.forEach(order => {
    const orderDateTime = new Date(order.created_at);
    const hour = orderDateTime.getHours();
    
    for (const range of timeRanges) {
      if (hour >= range.start && hour < range.end) {
        salesByTimeRange.set(range.label, (salesByTimeRange.get(range.label) || 0) + order.total_amount);
        break;
      }
    }
  });
  
  // Map을 배열로 변환
  return Array.from(salesByTimeRange, ([label, sales]) => ({ label, sales }));
}

// 상품별 매출 데이터 조회
async function fetchTopProducts(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      id,
      product_id,
      quantity,
      price,
      orders!inner(created_at),
      products:product_id (
        id,
        name
      )
    `)
    .gte('orders.created_at', startDate)
    .lt('orders.created_at', new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)).toISOString().split('T')[0]);
    
  if (error) {
    console.error('상품별 매출 조회 오류:', error);
    return [];
  }
  
  // 상품별 판매 데이터 집계
  const salesByProduct = new Map<string, { id: string, name: string, salesCount: number, salesAmount: number }>();
  
  data?.forEach(item => {
    if (!item.product_id || !item.products) return;
    
    const productId = item.product_id;
    const productName = (item.products as any).name || '알 수 없는 상품';
    const quantity = item.quantity || 0;
    const amount = item.price * quantity;
    
    if (salesByProduct.has(productId)) {
      const existing = salesByProduct.get(productId)!;
      salesByProduct.set(productId, {
        ...existing,
        salesCount: existing.salesCount + quantity,
        salesAmount: existing.salesAmount + amount
      });
    } else {
      salesByProduct.set(productId, {
        id: productId,
        name: productName,
        salesCount: quantity,
        salesAmount: amount
      });
    }
  });
  
  // Map을 배열로 변환하고 판매액 기준으로 내림차순 정렬
  return Array.from(salesByProduct.values())
    .sort((a, b) => b.salesAmount - a.salesAmount)
    .slice(0, 10); // 상위 10개 상품만 반환
}

// 평균 주문 금액 계산
async function calculateAverageOrderAmount(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('total_amount')
    .gte('created_at', startDate)
    .lt('created_at', new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)).toISOString().split('T')[0]);
    
  if (error || !data || data.length === 0) {
    console.error('평균 주문 금액 계산 오류:', error);
    return 0;
  }
  
  const totalAmount = data.reduce((sum, order) => sum + order.total_amount, 0);
  return Math.round(totalAmount / data.length);
}

// 특정 날짜 범위의 총 주문 금액 계산
async function calculateTotalAmountByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('total_amount')
    .gte('created_at', startDate)
    .lt('created_at', new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)).toISOString().split('T')[0]);
    
  if (error) {
    console.error('날짜별 총 주문 금액 조회 오류:', error);
    return 0;
  }
  
  const totalAmount = data?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
  return totalAmount;
}

export async function GET(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 정보가 없습니다' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const adminUser = await verifyAdminToken(token);
    
    if (!adminUser) {
      return NextResponse.json({ error: '유효하지 않은 인증 정보입니다' }, { status: 401 });
    }

    // URL에서 날짜 범위 파라미터 추출
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || formatDate(new Date(new Date().setDate(new Date().getDate() - 30))); // 기본값: 30일 전
    const endDate = searchParams.get('endDate') || formatDate(new Date()); // 기본값: 오늘

    // 병렬로 모든 데이터 가져오기
    const [
      daily,
      weekly,
      monthly,
      yearly,
      timeOfDay,
      topProducts,
      averageOrderAmount,
      totalAmountInRange
    ] = await Promise.all([
      fetchDailySales(startDate, endDate),
      fetchWeeklySales(startDate, endDate),
      fetchMonthlySales(startDate, endDate),
      fetchYearlySales(startDate, endDate),
      fetchTimeOfDaySales(startDate, endDate),
      fetchTopProducts(startDate, endDate),
      calculateAverageOrderAmount(startDate, endDate),
      calculateTotalAmountByDateRange(startDate, endDate)
    ]);
    
    // 모든 데이터를 하나의 객체로 조합
    const salesData = {
      daily,
      weekly,
      monthly,
      yearly,
      timeOfDay,
      topProducts,
      averageOrderAmount,
      dateRange: {
        startDate,
        endDate,
        totalAmount: totalAmountInRange
      }
    };
    
    return NextResponse.json(salesData);
  } catch (error) {
    console.error('판매 통계 조회 오류:', error);
    return NextResponse.json({ error: '판매 통계를 조회하는 중 오류가 발생했습니다' }, { status: 500 });
  }
} 