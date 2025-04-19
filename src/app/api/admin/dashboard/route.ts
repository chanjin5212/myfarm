import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // 인증 토큰 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
    }

    // 총 매출 조회
    const { data: salesData, error: salesError } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('status', 'delivered');

    if (salesError) {
      console.error('매출 조회 오류:', salesError);
      return NextResponse.json({ message: '매출 정보를 가져올 수 없습니다.' }, { status: 500 });
    }

    const totalSales = salesData.reduce((sum, order) => sum + order.total_amount, 0);

    // 총 주문 수 조회
    const { count: totalOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (ordersError) {
      console.error('주문 수 조회 오류:', ordersError);
      return NextResponse.json({ message: '주문 수를 가져올 수 없습니다.' }, { status: 500 });
    }

    // 총 상품 수 조회
    const { count: totalProducts, error: productsError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (productsError) {
      console.error('상품 수 조회 오류:', productsError);
      return NextResponse.json({ message: '상품 수를 가져올 수 없습니다.' }, { status: 500 });
    }

    // 총 회원 수 조회
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      console.error('회원 수 조회 오류:', usersError);
      return NextResponse.json({ message: '회원 수를 가져올 수 없습니다.' }, { status: 500 });
    }

    // 최근 주문 조회
    const { data: recentOrders, error: recentOrdersError } = await supabase
      .from('orders')
      .select('id, order_number, created_at, status, total_amount')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentOrdersError) {
      console.error('최근 주문 조회 오류:', recentOrdersError);
      return NextResponse.json({ message: '최근 주문을 가져올 수 없습니다.' }, { status: 500 });
    }

    // 응답 데이터 구성
    const responseData = {
      totalSales,
      totalOrders,
      totalProducts,
      totalUsers,
      recentOrders
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('대시보드 데이터 조회 오류:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 