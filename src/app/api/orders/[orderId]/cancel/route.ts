import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 현재 로그인한 사용자 ID 가져오기
async function getUserId(request: NextRequest) {
  // Authorization 헤더에서 토큰 가져오기
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[주문 취소 API] 인증 헤더가 없거나 잘못된 형식입니다:', authHeader);
    return null;
  }
  
  try {
    // Bearer 접두사 제거
    const token = authHeader.split(' ')[1].trim();
    
    // 1. UUID 형식의 사용자 ID인지 확인
    if (isValidUUID(token)) {
      // 사용자 ID가 users 테이블에 존재하는지 확인
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', token)
        .maybeSingle();
        
      if (userError) {
        console.error('[주문 취소 API] 사용자 확인 오류:', userError.message);
        return null;
      }
      
      if (!userData) {
        console.log('[주문 취소 API] 해당 ID의 사용자를 찾을 수 없습니다.');
        return null;
      }
      
      return token; // 사용자 ID 반환
    }
    
    // 2. JSON 형식의 토큰인지 확인 (로컬스토리지에 직접 저장된 형식)
    try {
      const parsedToken = JSON.parse(token);
      
      if (parsedToken.user && parsedToken.user.id && isValidUUID(parsedToken.user.id)) {
        // 사용자 ID가 유효한지 확인
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', parsedToken.user.id)
          .maybeSingle();
        
        if (userError || !userData) {
          console.error('[주문 취소 API] JSON 토큰의 사용자 ID 확인 실패');
          return null;
        }
        
        return parsedToken.user.id;
      }
    } catch (parseError) {
      // JSON 파싱 실패 - 다음 단계로 진행
    }
    
    console.error('[주문 취소 API] 유효하지 않은 토큰 형식');
    return null;
  } catch (error) {
    console.error('[주문 취소 API] 토큰 처리 중 오류 발생:', error);
    return null;
  }
}

// UUID 형식인지 확인하는 함수
function isValidUUID(id: string | null | undefined): boolean {
  if (id === null || id === undefined) return false;
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return pattern.test(id);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    
    // 사용자 ID 가져오기
    const userId = await getUserId(request);
    
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }
    
    // 요청 본문에서 취소 사유 가져오기
    const { cancelReason } = await request.json();
    
    if (!cancelReason) {
      return NextResponse.json({ error: '취소 사유를 입력해주세요' }, { status: 400 });
    }
    
    // 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, tid, status, total_amount, payment_method')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      console.error('주문 조회 오류:', orderError);
      return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 });
    }
    
    // 유저의 주문인지 확인
    if (order.user_id !== userId) {
      return NextResponse.json({ error: '해당 주문에 대한 권한이 없습니다' }, { status: 403 });
    }
    
    // 주문이 결제완료 상태인지 확인
    if (order.status !== 'paid' && order.status !== 'payment_confirmed') {
      return NextResponse.json({ 
        error: '취소 가능한 주문 상태가 아닙니다. 결제 완료 상태인 주문만 취소할 수 있습니다.' 
      }, { status: 400 });
    }
    
    // tid가 없는 경우
    if (!order.tid) {
      return NextResponse.json({ error: '결제 정보가 올바르지 않습니다' }, { status: 400 });
    }

    // 네이버페이 결제 취소
    if (order.payment_method === 'naverpay') {
      const clientId = process.env.NEXT_PUBLIC_NAVER_PAY_CLIENT_ID!;
      const clientSecret = process.env.NEXT_PUBLIC_NAVER_PAY_CLIENT_SECRET!;
      const chainId = process.env.NEXT_PUBLIC_NAVER_PAY_CHAIN_ID!;
      const idempotencyKey = crypto.randomUUID();

      const cancelAmount = order.total_amount;
      const taxScopeAmount = order.total_amount;
      const taxExScopeAmount = 0;

      const body = new URLSearchParams({
        paymentId: order.tid,
        cancelAmount: String(cancelAmount),
        cancelReason,
        cancelRequester: '2',
        taxScopeAmount: String(taxScopeAmount),
        taxExScopeAmount: String(taxExScopeAmount),
      });

      const naverRes = await fetch(
        'https://dev-pub.apis.naver.com/naverpay-partner/naverpay/payments/v1/cancel',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Naver-Client-Id': clientId,
            'X-Naver-Client-Secret': clientSecret,
            'X-NaverPay-Chain-Id': chainId,
            'X-NaverPay-Idempotency-Key': idempotencyKey,
          },
          body,
        }
      );

      const naverData = await naverRes.json();

      if (!naverRes.ok) {
        return NextResponse.json(
          { error: '네이버페이 결제 취소 실패', naverData },
          { status: naverRes.status }
        );
      }

      // 주문 상태 업데이트
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'canceled',
          updated_at: new Date().toISOString(),
          cancel_reason: cancelReason,
          cancel_date: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('주문 상태 업데이트 오류:', updateError);
        return NextResponse.json({ 
          error: '주문 취소는 되었으나 상태 업데이트에 실패했습니다. 관리자에게 문의하세요.',
          naverData
        }, { status: 500 });
      }

      return NextResponse.json({
        message: '주문이 성공적으로 취소되었습니다',
        naverData
      });
    }

    // 네이버페이가 아닌 경우(추후 다른 결제수단 추가 가능)
    return NextResponse.json({ error: '지원하지 않는 결제수단입니다.' }, { status: 400 });
  } catch (error) {
    console.error('주문 취소 중 오류 발생:', error);
    return NextResponse.json({ error: '주문 취소 중 오류가 발생했습니다' }, { status: 500 });
  }
} 