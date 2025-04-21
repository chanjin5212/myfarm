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

export async function POST(
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

    const { id: orderId } = await params;
    
    if (!orderId) {
      return NextResponse.json(
        { error: '주문 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 요청 본문 파싱
    const { reason } = await request.json();
    
    if (!reason) {
      return NextResponse.json(
        { error: '취소 사유가 필요합니다' },
        { status: 400 }
      );
    }

    // 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError || !order) {
      console.error('주문 정보 조회 오류:', orderError);
      return NextResponse.json(
        { error: '주문 정보를 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }

    // 주문 상태 확인 - 이미 취소되었거나 배송완료된 주문은 취소 불가
    if (['canceled', 'cancelled', 'delivered', 'refunded'].includes(order.status)) {
      return NextResponse.json(
        { error: '이미 취소되었거나 완료된 주문은 취소할 수 없습니다' },
        { status: 400 }
      );
    }

    // 주문 취소 - 상태 변경
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'canceled', 
        cancel_reason: reason,
        updated_at: new Date().toISOString() 
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (updateError) {
      console.error('주문 취소 오류:', updateError);
      return NextResponse.json(
        { error: '주문 취소에 실패했습니다' },
        { status: 500 }
      );
    }

    // 주문 아이템 조회하여 재고 복구
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    
    if (itemsError) {
      console.error('주문 아이템 조회 오류:', itemsError);
      // 에러가 발생했지만, 이미 주문 상태는 취소로 변경됨
    } else {
      // 재고 복구 처리
      for (const item of orderItems) {
        if (item.product_option_id) {
          // 상품 옵션 정보 조회
          const { data: option, error: optionError } = await supabase
            .from('product_options')
            .select('stock')
            .eq('id', item.product_option_id)
            .single();
          
          if (!optionError && option) {
            // 재고 업데이트
            await supabase
              .from('product_options')
              .update({ 
                stock: option.stock + item.quantity 
              })
              .eq('id', item.product_option_id);
          }
        }
      }
    }

    // 취소 내역 로그 기록
    await supabase
      .from('order_logs')
      .insert({
        order_id: orderId,
        user_id: authResult.userId,
        action: 'cancel',
        details: { reason },
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: '주문이 취소되었습니다',
      order: updatedOrder
    });
    
  } catch (error) {
    console.error('주문 취소 에러:', error);
    return NextResponse.json(
      { error: '주문 취소에 실패했습니다' },
      { status: 500 }
    );
  }
} 