import { NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const KAKAO_PAY_API_URL = 'https://kapi.kakao.com/v1/payment/ready';
const KAKAO_PAY_APPROVAL_URL = 'https://kapi.kakao.com/v1/payment/approve';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 카카오페이 결제 준비
export async function POST(request: Request) {
  try {
    const { orderId, itemName, quantity, totalAmount, userId, shippingAddress, shippingName, shippingPhone } = await request.json();

    // 주문 생성
    const orderInsertData = {
      user_id: userId,
      status: 'pending',
      shipping_name: shippingName,
      shipping_phone: shippingPhone,
      shipping_address: shippingAddress.address,
      shipping_detail_address: shippingAddress.detailAddress || null,
      shipping_memo: shippingAddress.memo || null,
      payment_method: 'kakao',  // 카카오페이 결제이므로 'kakao'로 설정
      total_amount: totalAmount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('카카오페이 주문 생성 데이터:', JSON.stringify(orderInsertData, null, 2));  // 상세 로깅 추가

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsertData)
      .select()
      .single();

    if (orderError) {
      console.error('주문 생성 오류:', orderError);
      return NextResponse.json(
        { error: '주문 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    const params = {
      cid: process.env.KAKAO_PAY_CID || '',
      partner_order_id: orderId,
      partner_user_id: userId,
      item_name: itemName,
      quantity: quantity,
      total_amount: totalAmount,
      tax_free_amount: '0',
      approval_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments/success?order_id=${orderId}`,
      fail_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments/fail?order_id=${orderId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments/cancel?order_id=${orderId}`,
    };

    console.log('카카오페이 API 요청 파라미터:', params);
    console.log('카카오페이 API 키:', process.env.KAKAO_PAY_ADMIN_KEY ? '설정됨' : '설정되지 않음');
    console.log('카카오페이 가맹점 코드:', process.env.KAKAO_PAY_CID ? '설정됨' : '설정되지 않음');

    const response = await axios.post(KAKAO_PAY_API_URL, params, {
      headers: {
        'Authorization': `KakaoAK ${process.env.KAKAO_PAY_ADMIN_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      }
    });

    console.log('카카오페이 API 응답:', response.data);

    // tid 저장
    const { error: updateError } = await supabase
      .from('orders')
      .update({ tid: response.data.tid })
      .eq('id', orderId);

    if (updateError) {
      console.error('tid 저장 오류:', updateError);
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('카카오페이 결제 준비 중 오류:', error);
    return NextResponse.json(
      { error: '결제 준비 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 카카오페이 결제 승인
export async function PATCH(request: NextRequest) {
  try {
    // 토큰 검증
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1].trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('인증 오류:', authError);
      return NextResponse.json({ error: '인증이 유효하지 않습니다.' }, { status: 401 });
    }

    const { pg_token, orderId, userId } = await request.json();

    if (!pg_token || !orderId || !userId) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (orderError || !order) {
      console.error('주문 조회 오류:', orderError);
      return NextResponse.json(
        { error: '주문 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 카카오페이 결제 승인 요청
    const kakaoResponse = await fetch('https://kapi.kakao.com/v1/payment/approve', {
      method: 'POST',
      headers: {
        'Authorization': `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
      body: new URLSearchParams({
        cid: process.env.KAKAO_CID!,
        tid: order.tid,
        partner_order_id: orderId,
        partner_user_id: userId,
        pg_token: pg_token
      })
    });

    if (!kakaoResponse.ok) {
      const errorData = await kakaoResponse.json();
      console.error('카카오페이 결제 승인 오류:', errorData);
      return NextResponse.json(
        { error: '카카오페이 결제 승인에 실패했습니다.' },
        { status: kakaoResponse.status }
      );
    }

    const kakaoData = await kakaoResponse.json();

    // 주문 상태 업데이트
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_id: kakaoData.payment_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('주문 상태 업데이트 오류:', updateError);
      return NextResponse.json(
        { error: '주문 상태를 업데이트할 수 없습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '결제가 성공적으로 완료되었습니다.',
      orderId: orderId
    });

  } catch (error) {
    console.error('결제 승인 처리 중 오류:', error);
    return NextResponse.json(
      { error: '결제 승인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 