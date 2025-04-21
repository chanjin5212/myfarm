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
async function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isValid: false, error: '인증 토큰이 필요합니다' };
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      login_id: string;
      role: string;
    };
    
    if (decoded.role !== 'admin') {
      return { isValid: false, error: '관리자 권한이 없습니다' };
    }
    
    return { isValid: true, userId: decoded.id };
  } catch (error) {
    return { isValid: false, error: '유효하지 않은 토큰입니다' };
  }
}

export async function GET(request: NextRequest) {
  try {
    // 관리자 인증
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    // 쿼리 파라미터 추출
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    
    // 페이지네이션 계산
    const offset = (page - 1) * limit;
    
    // 기본 쿼리 작성
    let query = supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(id, name)
        ),
        shipments(*)
      `, { count: 'exact' })
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);
    
    // 상태 필터 적용
    if (status && status !== 'all') {
      // 취소 상태는 'canceled'와 'cancelled' 모두 포함
      if (status === 'canceled') {
        query = query.or('status.eq.canceled,status.eq.cancelled');
      } else {
        query = query.eq('status', status);
      }
    }
    
    // 검색어 적용
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,shipping_name.ilike.%${search}%,shipping_phone.ilike.%${search}%`);
    }
    
    // 쿼리 실행
    const { data: orders, count, error } = await query;
    
    if (error) {
      console.error('주문 목록 조회 오류:', error);
      return NextResponse.json(
        { error: '주문 목록을 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }
    
    // 상품 정보 가공
    const processedOrders = orders?.map(order => {
      if (order.items && order.items.length > 0) {
        order.items = order.items.map((item: any) => {
          // 상품 정보에서 product_name 추출
          let product_name = '상품명 없음';
          
          if (item.product) {
            product_name = item.product.name || '상품명 없음';
          }
          
          return {
            ...item,
            product_name
          };
        });
      }
      return order;
    });
    
    // 총 페이지 수 계산
    const totalPages = Math.ceil((count || 0) / limit);
    
    return NextResponse.json({
      orders: processedOrders,
      total: count,
      page,
      limit,
      totalPages
    });
    
  } catch (error) {
    console.error('관리자 주문 목록 조회 에러:', error);
    return NextResponse.json(
      { error: '주문 목록을 가져오는데 실패했습니다' },
      { status: 500 }
    );
  }
} 