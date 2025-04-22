import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(req: NextRequest) {
  try {
    console.log('API 요청 시작 - orders');
    const { orderId, orderData } = await req.json();
    console.log('주문 데이터 받음:', { orderId });
    
    // 유효성 검사
    if (!orderId || !orderData) {
      return NextResponse.json(
        { error: '주문 정보가 불완전합니다.' }, 
        { status: 400 }
      );
    }
    
    // 인증 검증
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 정보가 필요합니다.' }, 
        { status: 401 }
      );
    }
    
    // 토큰에서 사용자 ID 추출
    const userId = authHeader.split(' ')[1].trim();
    
    if (!userId) {
      return NextResponse.json(
        { error: '유효하지 않은 인증 정보입니다.' }, 
        { status: 401 }
      );
    }
    
    // 사용자 정보 확인
    if (userId !== orderData.userId) {
      return NextResponse.json(
        { error: '인증된 사용자와 주문 사용자가 일치하지 않습니다.' }, 
        { status: 403 }
      );
    }
    
    // 주문 데이터를 저장할 변수
    let order: any = null;
    
    // 트랜잭션 처리
    try {
      // 1. 주문 생성
      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          user_id: userId,
          status: 'pending',  // 초기 상태는 pending
          payment_method: orderData.payment.method,
          total_amount: orderData.payment.totalAmount,
          shipping_name: orderData.shipping.name,
          shipping_phone: orderData.shipping.phone,
          shipping_address: orderData.shipping.address,
          shipping_detail_address: orderData.shipping.detailAddress || null,
          shipping_memo: orderData.shipping.memo || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (orderError) {
        console.error('주문 생성 SQL 오류:', orderError);
        throw new Error('주문 생성 오류: ' + orderError.message);
      }
      
      // 주문이 정상적으로 생성되었는지 확인
      if (!createdOrder || !createdOrder.id) {
        console.error('주문 생성 실패 - 반환된 주문 데이터 없음');
        throw new Error('주문이 생성되지 않았습니다.');
      }
      
      // 전역 변수에 주문 할당
      order = createdOrder;
      
      console.log('주문 생성 완료:', order.id);
      
      // 2. 주문 상품 생성
      const orderItems = orderData.items.map((item: any) => ({
        order_id: order.id,
        product_id: item.productId,
        product_option_id: item.productOptionId || null,
        quantity: item.quantity,
        price: item.price,
        // options 필드를 JSON 형식으로 저장
        options: {
          name: item.name,
          image: item.image,
          option_name: item.selectedOptions ? item.selectedOptions.name : null,
          option_value: item.selectedOptions ? item.selectedOptions.value : null
        }
      }));
      
      console.log('모든 주문 상품 삽입 시도, 개수:', orderItems.length);
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) {
        console.error('주문 상품 일괄 삽입 오류:', itemsError);
        throw new Error('주문 상품 생성 오류: ' + itemsError.message);
      }
      
      console.log('모든 주문 상품 생성 완료');
      
      // 성공 응답
      return NextResponse.json({
        success: true,
        id: order.id,
        message: '주문이 성공적으로 생성되었습니다.'
      });
      
    } catch (error) {
      // 오류 발생 시 이미 생성된 주문 취소 시도
      if (order && order.id) {
        console.error('오류 발생으로 주문 취소 시도:', order.id);
        try {
          await supabase
            .from('orders')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', order.id);
            
          console.log('주문 취소 완료:', order.id);
        } catch (cancelError) {
          console.error('주문 취소 실패:', cancelError);
        }
      }
      
      console.error('주문 처리 중 오류 발생:', error);
      
      return NextResponse.json(
        { error: error instanceof Error ? error.message : '주문 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API 요청 처리 중 예외 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 