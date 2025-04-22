import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// 서비스 롤 키 반드시 사용, 없으면 익명 키 사용
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(req: NextRequest) {
  try {
    console.log('API 요청 시작 - orders/complete');
    const { orderId, paymentKey, amount, orderData } = await req.json();
    console.log('주문 데이터 받음:', { orderId, amount });
    
    // 유효성 검사
    if (!orderId || !paymentKey || !amount || !orderData) {
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
          status: 'paid',
          payment_method: 'toss',
          tid: paymentKey,
          total_amount: amount,
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
      
      // 데이터베이스에 주문이 실제로 존재하는지 확인
      const { data: orderCheck, error: checkError } = await supabase
        .from('orders')
        .select('id')
        .eq('id', order.id)
        .single();
        
      if (checkError || !orderCheck) {
        console.error('주문 확인 실패:', checkError || '주문을 찾을 수 없음');
        throw new Error('주문이 데이터베이스에 존재하지 않습니다.');
      }
      
      console.log('주문 존재 확인 완료:', orderCheck.id);
      
      // 2. 주문 상품 생성: 가장 기본적인 방식으로 접근
      // 모든 주문 상품 데이터를 한번에 배열로 만들어 삽입 시도
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
      
      // 3. 결제 정보 저장 - 간단하게 유지
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          payment_key: paymentKey,
          payment_method: 'toss',
          payment_provider: 'toss',
          amount: amount,
          status: 'success',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (paymentError) {
        console.error('결제 정보 저장 오류:', paymentError);
        // 결제 정보 저장 실패해도 계속 진행
      }

      // 4. 상품 재고 업데이트
      for (const item of orderData.items) {
        if (!item.productOptionId) {
          continue; // 옵션이 없는 상품은 건너뛰기
        }
        
        // 상품 옵션 정보 조회
        const { data: productOption, error: productOptionError } = await supabase
          .from('product_options')
          .select('stock')
          .eq('id', item.productOptionId)
          .single();

        if (productOptionError || !productOption) {
          console.error('상품 옵션 조회 오류:', productOptionError);
          // 주문 삭제
          await supabase
            .from('orders')
            .delete()
            .eq('id', order.id);
          return NextResponse.json(
            { message: '상품 옵션 정보를 찾을 수 없습니다.' },
            { status: 500 }
          );
        }

        // 재고 업데이트
        const { error: stockError } = await supabase
          .from('product_options')
          .update({ stock: productOption.stock - item.quantity })
          .eq('id', item.productOptionId);

        if (stockError) {
          console.error('재고 업데이트 오류:', stockError);
          // 주문 삭제
          await supabase
            .from('orders')
            .delete()
            .eq('id', order.id);
          return NextResponse.json(
            { message: '재고 업데이트에 실패했습니다.' },
            { status: 500 }
          );
        }
      }
      
      return NextResponse.json({
        status: 'success',
        orderId: orderId,
        message: '주문이 성공적으로 처리되었습니다.',
      });
    } catch (error: any) {
      // 오류 발생 시 롤백 (주문 취소)
      console.error('주문 처리 중 오류 발생:', error);
      
      try {
        // 주문이 생성되었다면 해당 주문 ID 사용, 그렇지 않으면 전달된 ID 사용
        const deleteOrderId = order?.id || orderId;
        
        console.log('롤백 - 주문 삭제 시도:', deleteOrderId);
        
        // 생성된 주문 항목 삭제 시도
        const { error: deleteItemsError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', deleteOrderId);
          
        if (deleteItemsError) {
          console.error('주문 항목 삭제 중 오류:', deleteItemsError);
        }
        
        // 생성된 주문 삭제 시도
        const { error: deleteOrderError } = await supabase
          .from('orders')
          .delete()
          .eq('id', deleteOrderId);
          
        if (deleteOrderError) {
          console.error('주문 삭제 중 오류:', deleteOrderError);
        }
        
        // 결제 정보 삭제 시도
        const { error: deletePaymentError } = await supabase
          .from('payments')
          .delete()
          .eq('order_id', deleteOrderId);
          
        if (deletePaymentError) {
          console.error('결제 정보 삭제 중 오류:', deletePaymentError);
        }
      } catch (rollbackError) {
        console.error('롤백 중 오류:', rollbackError);
      }
      
      // 재고 부족 오류
      if (error.message && error.message.includes('재고가 부족합니다')) {
        return NextResponse.json(
          { error: error.message }, 
          { status: 400 }
        );
      }
      
      // 그 외 오류
      return NextResponse.json(
        { error: '주문 처리 중 오류가 발생했습니다: ' + error.message }, 
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('주문 처리 중 오류:', error);
    
    return NextResponse.json(
      { error: '주문 처리 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류') }, 
      { status: 500 }
    );
  }
}