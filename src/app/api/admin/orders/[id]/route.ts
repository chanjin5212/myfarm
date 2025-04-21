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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const orderId = params.id;
    
    if (!orderId) {
      return NextResponse.json(
        { error: '주문 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      console.error('주문 정보 조회 오류:', orderError);
      return NextResponse.json(
        { error: '주문 정보를 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }
    
    if (!order) {
      return NextResponse.json(
        { error: '존재하지 않는 주문입니다' },
        { status: 404 }
      );
    }

    // 주문 아이템 조회
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        product:products(id, name)
      `)
      .eq('order_id', orderId);
    
    if (orderItemsError) {
      console.error('주문 아이템 조회 오류:', orderItemsError);
      return NextResponse.json(
        { error: '주문 아이템을 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }

    // 상품 이미지 및 이름 추가
    const enhancedOrderItems = orderItems.map(item => {
      let product_name = '';
      
      if (item.product) {
        product_name = item.product.name;
      }
      
      return {
        ...item,
        product_name
      };
    });

    // 배송 정보 조회
    const { data: shipments, error: shipmentsError } = await supabase
      .from('shipments')
      .select('*')
      .eq('order_id', orderId);
    
    if (shipmentsError) {
      console.error('배송 정보 조회 오류:', shipmentsError);
      return NextResponse.json(
        { error: '배송 정보를 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      order,
      orderItems: enhancedOrderItems,
      shipments
    });
    
  } catch (error) {
    console.error('주문 상세 조회 에러:', error);
    return NextResponse.json(
      { error: '주문 정보를 가져오는데 실패했습니다' },
      { status: 500 }
    );
  }
} 