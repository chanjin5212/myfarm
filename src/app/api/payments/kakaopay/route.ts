import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 카카오페이 API 엔드포인트
const KAKAOPAY_API_BASE = 'https://open-api.kakaopay.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...requestData } = body;

    if (action === 'ready') {
      return await handleKakaoPayReady(requestData);
    } else if (action === 'approve') {
      return await handleKakaoPayApprove(requestData);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('카카오페이 API 오류:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// 카카오페이 결제 준비
async function handleKakaoPayReady(requestData: any) {
  const {
    orderId,
    orderName,
    totalAmount,
    userId,
    approvalUrl,
    cancelUrl,
    failUrl
  } = requestData;

  // 환경 변수에서 카카오페이 설정 가져오기
  const adminKey = process.env.KAKAO_PAY_ADMIN_KEY;
  const cid = process.env.KAKAO_PAY_CID || 'TC0ONETIME'; // 테스트용 CID

  if (!adminKey) {
    return NextResponse.json({ error: '카카오페이 설정이 올바르지 않습니다.' }, { status: 500 });
  }

  try {
    const response = await fetch(`${KAKAOPAY_API_BASE}/online/v1/payment/ready`, {
      method: 'POST',
      headers: {
        'Authorization': `SECRET_KEY ${adminKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cid: cid,
        partner_order_id: orderId,
        partner_user_id: userId,
        item_name: orderName,
        quantity: 1,
        total_amount: totalAmount,
        tax_free_amount: 0,
        approval_url: approvalUrl,
        cancel_url: cancelUrl,
        fail_url: failUrl
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('카카오페이 결제 준비 실패:', data);
      return NextResponse.json(data, { status: response.status });
    }

    // TID를 임시로 저장할 수 있지만, 여기서는 클라이언트에서 관리하도록 함
    return NextResponse.json({
      success: true,
      tid: data.tid,
      next_redirect_mobile_url: data.next_redirect_mobile_url,
      next_redirect_pc_url: data.next_redirect_pc_url,
      created_at: data.created_at
    });

  } catch (error) {
    console.error('카카오페이 결제 준비 요청 실패:', error);
    return NextResponse.json({ error: '카카오페이 결제 준비에 실패했습니다.' }, { status: 500 });
  }
}

// 카카오페이 결제 승인
async function handleKakaoPayApprove(requestData: any) {
  const { tid, orderId, userId, pgToken } = requestData;

  // 환경 변수에서 카카오페이 설정 가져오기
  const adminKey = process.env.KAKAO_PAY_ADMIN_KEY;
  const cid = process.env.KAKAO_PAY_CID || 'TC0ONETIME';

  if (!adminKey) {
    return NextResponse.json({ error: '카카오페이 설정이 올바르지 않습니다.' }, { status: 500 });
  }

  try {
    // 1. 카카오페이 결제 승인 API 호출
    const response = await fetch(`${KAKAOPAY_API_BASE}/online/v1/payment/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `SECRET_KEY ${adminKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cid: cid,
        tid: tid,
        partner_order_id: orderId,
        partner_user_id: userId,
        pg_token: pgToken
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('카카오페이 결제 승인 실패:', data);
      return NextResponse.json(data, { status: response.status });
    }

    // 2. 주문 정보 조회
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

    // 3. 주문 상태 업데이트
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        tid: tid,
        payment_method: 'kakaopay',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (orderUpdateError) {
      return NextResponse.json(
        { error: '주문 상태 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 4. 결제 정보 저장
    const paymentRecord = {
      order_id: orderId,
      payment_key: data.aid, // 카카오페이는 aid를 payment_key로 사용
      payment_method: data.payment_method_type || 'kakaopay',
      payment_provider: 'kakaopay',
      amount: data.amount.total,
      status: 'DONE',
      payment_details: data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: paymentInsertError } = await supabase
      .from('payments')
      .insert(paymentRecord);

    if (paymentInsertError) {
      console.error('결제 정보 저장 실패:', paymentInsertError);
      // 결제는 성공했으므로 계속 진행
    }

    // 5. 장바구니 아이템 정리
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
      console.error('장바구니 정리 실패:', cartDeleteError);
    }

    // 결제 성공 응답
    return NextResponse.json({
      success: true,
      orderId: orderId,
      tid: tid,
      message: '카카오페이 결제가 성공적으로 처리되었습니다.',
      paymentData: data
    });

  } catch (error) {
    console.error('카카오페이 결제 승인 요청 실패:', error);
    return NextResponse.json({ error: '카카오페이 결제 승인에 실패했습니다.' }, { status: 500 });
  }
} 