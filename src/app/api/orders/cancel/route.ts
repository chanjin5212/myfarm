import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    // 요청 본문에서 orderId 추출
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ error: '주문 ID가 필요합니다.' }, { status: 400 });
    }
    
    console.log('주문 취소 요청:', orderId);
    
    // 인증 토큰 확인
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 헤더가 필요합니다.' }, { status: 401 });
    }
    
    // Bearer 토큰에서 사용자 ID 추출
    const userId = authHeader.split(' ')[1].trim();
    
    if (!userId) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    // 주문이 이미 결제 완료 상태인지 확인
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('status, user_id')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      // 주문이 이미 취소되었거나 없는 경우 (오류는 무시하고 성공으로 처리)
      console.log('주문을 찾을 수 없음 - 이미 취소되었을 수 있음:', orderId);
      return NextResponse.json({ 
        success: true, 
        message: '주문이 이미 취소되었거나 존재하지 않습니다.'
      });
    }
    
    // 주문 소유자 확인
    if (orderData.user_id !== userId) {
      console.log('주문 소유자 불일치:', { orderId, requestUserId: userId, orderUserId: orderData.user_id });
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 주문이 이미 결제 완료된 경우 취소 불가
    if (orderData.status === 'completed') {
      console.log('결제가 이미 완료된 주문은 취소할 수 없음:', orderId);
      return NextResponse.json({
        error: '이미 결제가 완료된 주문은 취소할 수 없습니다.'
      }, { status: 400 });
    }
    
    // 결제 세션 조회 및 업데이트
    try {
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_sessions')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      // 결제 세션이 있으면 상태 업데이트
      if (paymentData && paymentData.length > 0) {
        await supabase
          .from('payment_sessions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', paymentData[0].id);
        console.log('결제 세션 취소 상태로 업데이트:', paymentData[0].id);
      }
    } catch (sessionError) {
      console.error('결제 세션 업데이트 오류:', sessionError);
      // 결제 세션 업데이트 실패해도 계속 진행
    }
    
    // 주문 항목 삭제 시도
    try {
      // 먼저 주문 항목 정보를 가져옴
      const { data: orderItems, error: itemsFetchError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsFetchError) {
        console.error('주문 항목 조회 오류:', itemsFetchError);
      } else if (orderItems && orderItems.length > 0) {
        // 각 주문 항목의 재고를 복구
        for (const item of orderItems) {
          if (item.product_option_id) {
            // 먼저 현재 재고를 조회
            const { data: currentOption, error: fetchError } = await supabase
              .from('product_options')
              .select('stock')
              .eq('id', item.product_option_id)
              .single();

            if (fetchError) {
              console.error('옵션 재고 조회 오류:', fetchError);
              continue;
            }

            // 재고 증가
            const { error: optionStockError } = await supabase
              .from('product_options')
              .update({ 
                stock: (currentOption.stock || 0) + item.quantity
              })
              .eq('id', item.product_option_id);

            if (optionStockError) {
              console.error('옵션 재고 복구 오류:', optionStockError);
            }
          }
        }
      }

      // 주문 항목 삭제
      const { error: itemsDeleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);
      
      if (itemsDeleteError) {
        console.error('주문 항목 삭제 오류:', itemsDeleteError);
      } else {
        console.log('주문 항목 삭제 완료:', orderId);
      }
    } catch (itemsError) {
      console.error('주문 항목 삭제 중 예외 발생:', itemsError);
      // 주문 항목 삭제 실패해도 계속 진행
    }
    
    // 주문 삭제 시도
    try {
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);
      
      if (deleteError) {
        console.error('주문 삭제 오류:', deleteError);
        
        // 삭제 실패 시 상태만 업데이트로 폴백
        const { error: updateError } = await supabase
          .from('orders')
          .update({ 
            status: 'cancelled', 
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);
        
        if (updateError) {
          console.error('주문 상태 업데이트도 실패:', updateError);
          return NextResponse.json({ error: '주문 취소 처리 중 오류가 발생했습니다.' }, { status: 500 });
        }
        
        console.log('주문 삭제 대신 상태 업데이트로 대체:', orderId);
      } else {
        console.log('주문 삭제 완료:', orderId);
      }
    } catch (deleteError) {
      console.error('주문 삭제 중 예외 발생:', deleteError);
      return NextResponse.json({ error: '주문 취소 처리 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: '주문이 성공적으로 취소되었습니다.'
    });
  } catch (error) {
    console.error('주문 취소 처리 중 예외 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 