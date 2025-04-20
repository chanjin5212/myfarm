import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // 토큰에서 사용자 ID 추출
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // 토큰 검증
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ message: '인증이 유효하지 않습니다.' }, { status: 401 });
    }
    
    const userId = user.id;
    
    // 페이지네이션 파라미터
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;
    
    // 상태 필터
    const status = url.searchParams.get('status') || undefined;
    
    // 쿼리 작성
    let query = supabase
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .eq('user_id', userId)
      .order('order_date', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // 상태 필터 적용
    if (status) {
      query = query.eq('status', status);
    }
    
    // 주문 정보 조회
    const { data: ordersData, error: ordersError, count } = await query;
    
    if (ordersError) {
      return NextResponse.json({ message: '주문 목록을 가져올 수 없습니다.' }, { status: 500 });
    }
    
    // 주문 데이터 형식 변환
    const orders = ordersData.map(order => {
      // 주문 상품 정보 처리
      const items = order.order_items.map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        name: item.product_name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        option: item.option_name && item.option_value ? {
          name: item.option_name,
          value: item.option_value
        } : null
      }));
      
      // 대표 상품 이미지 및 이름 추출
      const mainItem = order.order_items[0] || {};
      const productCount = order.order_items.length;
      
      return {
        id: order.id,
        date: order.order_date,
        status: order.status,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        mainImage: mainItem.image || null,
        mainProductName: mainItem.product_name || null,
        productCount: productCount,
        hasMoreItems: productCount > 1,
        items // 상세 페이지에서 사용할 수 있도록 모든 아이템 정보 포함
      };
    });
    
    // 페이지네이션 정보
    const totalPages = count ? Math.ceil(count / limit) : 0;
    
    return NextResponse.json({
      orders,
      pagination: {
        totalItems: count || 0,
        totalPages,
        currentPage: page,
        limit
      }
    });
    
  } catch (error) {
    console.error('주문 목록 조회 오류:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 