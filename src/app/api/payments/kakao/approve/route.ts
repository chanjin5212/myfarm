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
    const { pg_token, orderId } = await request.json();
    
    if (!pg_token || !orderId) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }
    
    // 결제 세션 조회
    const { data: sessionData, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', userId)
      .eq('payment_method', 'kakao')
      .eq('status', 'ready')
      .single();
    
    if (sessionError || !sessionData) {
      console.error('결제 세션 조회 오류:', sessionError);
      return NextResponse.json({ error: '유효한 결제 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 카카오페이 결제 승인 API 호출
    const kakaoPayApiKey = process.env.KAKAO_PAY_ADMIN_KEY;
    if (!kakaoPayApiKey) {
      return NextResponse.json({ error: '카카오페이 API 키가 설정되지 않았습니다.' }, { status: 500 });
    }
    
    console.log('카카오페이 결제 승인 요청:',  {
      cid: 'TC0ONETIME',
      tid: sessionData.tid,
      partner_order_id: orderId,
      partner_user_id: userId,
      pg_token
    });
    
    const kakaoResponse = await fetch('https://kapi.kakao.com/v1/payment/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'Authorization': `KakaoAK ${kakaoPayApiKey}`,
      },
      body: new URLSearchParams({
        'cid': 'TC0ONETIME',  // 테스트용 가맹점 코드
        'tid': sessionData.tid,
        'partner_order_id': orderId,
        'partner_user_id': userId,
        'pg_token': pg_token,
      }),
    });
    
    if (!kakaoResponse.ok) {
      console.error('카카오페이 결제 승인 실패 - 상태 코드:', kakaoResponse.status);
      let errorData;
      try {
        errorData = await kakaoResponse.json();
        console.error('카카오페이 API 오류:', errorData);
      } catch (e) {
        const errorText = await kakaoResponse.text();
        console.error('카카오페이 API 응답 텍스트:', errorText);
      }
      return NextResponse.json({ error: '카카오페이 결제 승인에 실패했습니다.' }, { status: 500 });
    }
    
    const kakaoData = await kakaoResponse.json();
    console.log('카카오페이 결제 승인 성공:', kakaoData);
    
    // 결제 세션 업데이트
    await supabase
      .from('payment_sessions')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
        response_data: kakaoData
      })
      .eq('id', sessionData.id);
    
    // 주문 상태 업데이트
    await supabase
      .from('orders')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    // 결제 완료 응답
    return NextResponse.json({
      success: true,
      orderId: orderId,
      message: '결제가 성공적으로 완료되었습니다.',
    });
    
  } catch (error) {
    console.error('결제 승인 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 