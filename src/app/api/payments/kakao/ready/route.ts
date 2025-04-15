import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
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
    
    // Validate UUID format
    const isValidUUID = (id: string) => {
      const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return pattern.test(id);
    };
    
    if (!isValidUUID(userId)) {
      return NextResponse.json({ error: '유효하지 않은 사용자 ID 형식입니다.' }, { status: 401 });
    }
    
    // DB에서 사용자 정보 직접 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError || !userData) {
      console.error('사용자 조회 오류:', userError);
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 요청 본문 파싱
    const { orderId, totalAmount, productName } = await request.json();
    
    // 주문 존재 및 사용자 소유 확인
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();
    
    if (orderError || !orderData) {
      console.error('주문 조회 오류:', orderError);
      return NextResponse.json({ error: '주문 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 주문 상태 업데이트 (결제 대기 중)
    await supabase
      .from('orders')
      .update({ status: 'payment_pending', updated_at: new Date().toISOString() })
      .eq('id', orderId);
    
    // 카카오페이 결제 준비 API 호출
    const kakaoPayApiKey = process.env.KAKAO_PAY_ADMIN_KEY;
    if (!kakaoPayApiKey) {
      return NextResponse.json({ error: '카카오페이 API 키가 설정되지 않았습니다.' }, { status: 500 });
    }
    
    // 카카오페이 결제 준비 요청
    const approvalUrl = `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/payments/approval?order_id=${orderId}&status=success`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/payments/approval?order_id=${orderId}&status=cancel`;
    const failUrl = `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/payments/approval?order_id=${orderId}&status=fail`;
    
    const kakaoResponse = await fetch('https://kapi.kakao.com/v1/payment/ready', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'Authorization': `KakaoAK ${kakaoPayApiKey}`,
      },
      body: new URLSearchParams({
        'cid': 'TC0ONETIME',  // 테스트용 가맹점 코드
        'partner_order_id': orderId,
        'partner_user_id': userId,
        'item_name': productName,
        'quantity': '1',
        'total_amount': totalAmount.toString(),
        'tax_free_amount': '0',
        'approval_url': approvalUrl,
        'cancel_url': cancelUrl,
        'fail_url': failUrl,
      }),
    });
    
    if (!kakaoResponse.ok) {
      const errorData = await kakaoResponse.json();
      console.error('카카오페이 API 오류:', errorData);
      return NextResponse.json({ error: '카카오페이 결제 준비 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    const kakaoData = await kakaoResponse.json();
    
    // 결제 준비 정보 저장
    await supabase
      .from('payment_sessions')
      .insert({
        order_id: orderId,
        user_id: userId,
        payment_method: 'kakao',
        tid: kakaoData.tid,
        status: 'ready',
        amount: totalAmount,
        created_at: new Date().toISOString(),
      });
    
    // 클라이언트에 결제 페이지 URL 반환
    return NextResponse.json({
      tid: kakaoData.tid,
      next_redirect_pc_url: kakaoData.next_redirect_pc_url,
      created_at: kakaoData.created_at,
    });
  } catch (error) {
    console.error('오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 