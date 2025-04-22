import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    // 요청 본문에서 필요한 정보 추출
    const body = await request.json();
    const { paymentKey, orderId, amount } = body;

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    // 인증 헤더에서 토큰 추출
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: '인증 정보가 필요합니다.' },
        { status: 401 }
      );
    }
    
    // Bearer 토큰에서 사용자 ID 추출
    let userId;
    try {
      const token = authHeader.replace('Bearer ', '');
      userId = decodeURIComponent(token);
      console.log('추출된 사용자 ID:', userId);
    } catch (error) {
      console.error('토큰 디코딩 오류:', error);
      return NextResponse.json(
        { error: '잘못된 인증 형식입니다.' },
        { status: 401 }
      );
    }

    // 주문 정보 검증
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      console.error('주문 조회 실패:', orderError);
      return NextResponse.json(
        { error: '주문 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 주문이 이미 결제되었는지 확인
    if (orderData.status === 'paid') {
      console.log('이미 결제된 주문입니다:', orderData);
      return NextResponse.json({
        success: true,
        message: '이미 결제가 완료된 주문입니다.',
        orderId: orderId,
        paymentKey: orderData.payment_key,
      });
    }

    // 주문 금액 검증
    if (orderData.total_amount !== amount) {
      console.error(
        `금액 불일치: 주문금액 ${orderData.total_amount}, 결제금액 ${amount}`
      );
      return NextResponse.json(
        { error: '결제 금액이 주문 금액과 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    // 토스페이먼츠 API 호출하여 결제 승인
    const tossPaymentSecretKey = process.env.TOSS_PAYMENTS_SECRET_KEY || '';
    if (!tossPaymentSecretKey) {
      return NextResponse.json(
        { error: '결제 연동 설정이 올바르지 않습니다.' },
        { status: 500 }
      );
    }

    const encryptedSecretKey = 
      "Basic " + Buffer.from(tossPaymentSecretKey + ":").toString("base64");

    try {
      console.log('토스페이먼츠 결제 승인 요청 시작');
      const paymentConfirmResponse = await fetch(
        "https://api.tosspayments.com/v1/payments/confirm",
        {
          method: "POST",
          headers: {
            Authorization: encryptedSecretKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: orderId,
            amount: amount,
            paymentKey: paymentKey,
          }),
        }
      );

      if (!paymentConfirmResponse.ok) {
        const errorData = await paymentConfirmResponse.json();
        console.error('토스페이먼츠 API 호출 실패:', errorData);
        return NextResponse.json(
          { error: errorData.message || '결제 승인에 실패했습니다.' },
          { status: paymentConfirmResponse.status }
        );
      }

      const paymentData = await paymentConfirmResponse.json();
      console.log('토스페이먼츠 결제 승인 성공:', paymentData);

      // 주문 상태 업데이트
      const { error: orderUpdateError, data: updatedOrder } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          tid: paymentKey,
          payment_method: paymentData.method || 'card',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();

      if (orderUpdateError) {
        console.error('주문 상태 업데이트 실패:', orderUpdateError);
        return NextResponse.json(
          { error: '주문 상태 업데이트에 실패했습니다.' },
          { status: 500 }
        );
      }

      // 결제 정보 저장
      const paymentRecord = {
        order_id: orderId,
        payment_key: paymentKey,
        payment_method: paymentData.method || 'card',
        payment_provider: 'toss',
        amount: amount,
        status: 'DONE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error: paymentInsertError } = await supabase
        .from('payments')
        .insert(paymentRecord);

      if (paymentInsertError) {
        console.error('결제 정보 저장 실패:', paymentInsertError);
        // 실패해도 결제는 성공했으므로 계속 진행
      }

      // 사용자의 장바구니에서 결제 완료된 상품들 삭제
      try {
        // 1. 사용자의 장바구니 ID 찾기
        const { data: cartData, error: cartError } = await supabase
          .from('carts')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (cartError) {
          console.error('장바구니 조회 실패:', cartError);
        } else if (cartData) {
          const cartId = cartData.id;

          // 2. 장바구니 아이템 조회
          const { data: cartItems, error: cartItemsError } = await supabase
            .from('cart_items')
            .select('id, product_id, product_option_id')
            .eq('cart_id', cartId);
            
          if (cartItemsError) {
            console.error('장바구니 아이템 조회 실패:', cartItemsError);
          } else if (cartItems) {
            // 3. 주문 아이템과 일치하는 장바구니 아이템 삭제
            const itemsToDelete = cartItems
              .filter(cartItem => 
                orderData.order_items.some((orderItem: { product_id: string; product_option_id: string | null }) => 
                  cartItem.product_id === orderItem.product_id && 
                  cartItem.product_option_id === orderItem.product_option_id
                )
              )
              .map(item => item.id);

            if (itemsToDelete.length > 0) {
              const { error: deleteError } = await supabase
                .from('cart_items')
                .delete()
                .in('id', itemsToDelete);
                
              if (deleteError) {
                console.error('장바구니 아이템 삭제 실패:', deleteError);
              }
            }
          }
        }
      } catch (cartDeleteError) {
        console.error('장바구니 삭제 중 오류 발생:', cartDeleteError);
        // 장바구니 삭제 실패해도 결제는 성공했으므로 계속 진행
      }

      // 결제 성공 응답
      return NextResponse.json({
        success: true,
        orderId: orderId,
        paymentKey: paymentKey,
        message: '결제가 성공적으로 처리되었습니다.',
        paymentData: paymentData
      });
      
    } catch (tossApiError) {
      console.error('토스페이먼츠 API 오류:', tossApiError);
      return NextResponse.json(
        { error: '결제 승인 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('결제 처리 중 오류 발생:', error);
    return NextResponse.json(
      { error: '결제 처리 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 