import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const { paymentId, orderId } = await req.json();
    if (!paymentId || !orderId) {
      return NextResponse.json({ error: 'paymentId, orderId is required' }, { status: 400 });
    }
    console.log("데이터 확인" + paymentId);
    console.log("데이터 확인" + orderId);

    // 네이버페이 결제 승인 API 호출
    const clientId = process.env.NEXT_PUBLIC_NAVER_PAY_CLIENT_ID!;
    const clientSecret = process.env.NAVER_PAY_CLIENT_SECRET!;
    const chainId = process.env.NEXT_PUBLIC_NAVER_PAY_CHAIN_ID!;
    const idempotencyKey = uuidv4();

    const response = await fetch(
      'https://dev-pub.apis.naver.com/naverpay-partner/naverpay/payments/v2.2/apply/payment',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
          'X-NaverPay-Chain-Id': chainId,
          'X-NaverPay-Idempotency-Key': idempotencyKey,
        },
        body: `paymentId=${encodeURIComponent(paymentId)}`,
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // 주문 정보 조회 (orderId로 조회)
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json(
        { error: '주문 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 결제 승인 성공 시 결제 정보 DB 저장 및 주문 상태 업데이트
    // 네이버페이 결제 승인 응답에서 필요한 정보 추출
    // 실제 응답 구조에 따라 아래 필드명 수정 필요
    const paymentInfo = data.payment || data; // payment 필드가 없으면 전체 data 사용
    let amount = 0;
    // 1. 네이버페이 응답에서 금액 추출 시도
    if (typeof paymentInfo.totalPayAmount === 'number') {
      amount = paymentInfo.totalPayAmount;
    } else if (typeof paymentInfo.amount === 'number') {
      amount = paymentInfo.amount;
    }
    // 2. order 테이블에서 금액 가져오기 (없으면 0)
    const orderAmount = orderData.total_amount || 0;
    // 3. 금액이 0이거나 잘못된 경우 order 테이블 금액 사용
    if (!amount || amount <= 0) {
      amount = orderAmount;
    }
    const method = paymentInfo.payMethod || 'naverpay';

    // 주문 상태 업데이트
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        tid: paymentId,
        payment_method: method,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (orderUpdateError) {
      return NextResponse.json(
        { error: '주문 상태 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 결제 정보 저장 (paymentId를 payment_key로 저장)
    const paymentRecord = {
      order_id: orderId,
      payment_key: paymentId,
      payment_method: method,
      payment_provider: 'naverpay',
      amount: amount,
      status: 'DONE',
      payment_details: data, // 상세 응답 저장
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: paymentInsertError } = await supabase
      .from('payments')
      .insert(paymentRecord);

    // 장바구니 아이템 정리 (토스와 동일)
    try {
      const { data: cartData } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', orderData.user_id)
        .single();

      if (cartData) {
        const cartId = cartData.id;
        const { data: cartItems } = await supabase
          .from('cart_items')
          .select('id, product_id, product_option_id')
          .eq('cart_id', cartId);

        if (cartItems) {
          const itemsToDelete = cartItems
            .filter(cartItem =>
              orderData.order_items.some((orderItem: { product_id: string; product_option_id: string | null }) =>
                cartItem.product_id === orderItem.product_id &&
                cartItem.product_option_id === orderItem.product_option_id
              )
            )
            .map(item => item.id);

          if (itemsToDelete.length > 0) {
            await supabase
              .from('cart_items')
              .delete()
              .in('id', itemsToDelete);
          }
        }
      }
    } catch (cartDeleteError) {
      // 장바구니 삭제 실패해도 결제는 성공했으므로 계속 진행
    }

    // 결제 성공 응답
    return NextResponse.json({
      success: true,
      orderId: orderId,
      paymentId: paymentId,
      message: '네이버페이 결제가 성공적으로 처리되었습니다.',
      paymentData: data
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
} 