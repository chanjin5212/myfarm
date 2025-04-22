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

// 회원 상세 정보 조회 API
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 관리자 인증
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { id: userId } = await params;

    // userId가 유효한지 확인
    if (!userId || userId === 'undefined') {
      console.error('유효하지 않은 사용자 ID:', userId);
      return NextResponse.json(
        { error: '유효하지 않은 사용자 ID입니다' },
        { status: 400 }
      );
    }

    // 회원 정보 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('회원 정보 조회 오류:', userError);
      return NextResponse.json(
        { error: '회원 정보를 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: '회원을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 비밀번호 필드 제거
    const { password, ...userWithoutPassword } = user;

    // 주문 내역 조회
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        total_amount,
        created_at,
        items:order_items(
          id,
          product_id,
          quantity,
          price,
          product:products(id, name)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('주문 내역 조회 오류:', ordersError);
      return NextResponse.json(
        { error: '주문 내역을 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }

    // 리뷰 내역 조회
    const { data: reviews, error: reviewsError } = await supabase
      .from('product_reviews')
      .select(`
        id,
        rating,
        content,
        created_at,
        product:products(id, name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('리뷰 내역 조회 오류:', reviewsError);
      return NextResponse.json(
        { error: '리뷰 내역을 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }

    // 통계 정보 계산
    // 1. 총 주문 금액
    const totalOrderAmount = orders ? orders.reduce((sum, order) => sum + order.total_amount, 0) : 0;
    
    // 2. 총 주문 횟수
    const totalOrderCount = orders ? orders.length : 0;
    
    // 3. 최근 주문일
    const lastOrderDate = orders && orders.length > 0 ? orders[0].created_at : null;
    
    // 4. 자주 구매한 제품 분석
    const productPurchaseCount: Record<string, { productId: string, productName: string, count: number }> = {};
    
    if (orders) {
      orders.forEach(order => {
        if (order.items) {
          order.items.forEach((item: any) => {
            const productId = item.product_id;
            const productName = item.product?.name || '상품명 없음';
            
            if (!productPurchaseCount[productId]) {
              productPurchaseCount[productId] = {
                productId,
                productName,
                count: 0
              };
            }
            
            productPurchaseCount[productId].count += item.quantity;
          });
        }
      });
    }
    
    // 구매 횟수 기준으로 정렬
    const mostPurchasedProducts = Object.values(productPurchaseCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // 상위 5개 상품만 보여주기
    
    // 5. 평균 리뷰 평점
    const totalRating = reviews ? reviews.reduce((sum, review) => sum + review.rating, 0) : 0;
    const averageRating = reviews && reviews.length > 0 ? totalRating / reviews.length : 0;

    // 6. 주문 상태 통계
    const orderStatusStats: Record<string, number> = {};
    
    if (orders) {
      orders.forEach(order => {
        const status = order.status;
        orderStatusStats[status] = (orderStatusStats[status] || 0) + 1;
      });
    }

    return NextResponse.json({
      user: userWithoutPassword,
      orderHistory: orders,
      reviewHistory: reviews,
      stats: {
        totalOrderAmount,
        totalOrderCount,
        lastOrderDate,
        mostPurchasedProducts,
        averageRating: parseFloat(averageRating.toFixed(1)),
        orderStatusStats
      }
    });
    
  } catch (error) {
    console.error('회원 상세 정보 조회 에러:', error);
    return NextResponse.json(
      { error: '회원 상세 정보를 가져오는데 실패했습니다' },
      { status: 500 }
    );
  }
} 