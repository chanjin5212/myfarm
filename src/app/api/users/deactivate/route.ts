import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    // 인증 헤더에서 사용자 ID 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = decodeURIComponent(authHeader.split(' ')[1].trim());
    
    if (!userId) {
      return NextResponse.json({ error: '유효하지 않은 인증 정보입니다.' }, { status: 401 });
    }

    // 요청 본문 파싱
    const { password, reason } = await request.json();

    // 비밀번호가 있는 경우 비밀번호 검증 (일반 회원의 경우)
    if (password) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('password, login_id')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        console.error('사용자 정보 조회 실패:', userError);
        return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 });
      }

      // 비밀번호 있는 계정인데 비밀번호 검증 실패
      if (userData.login_id && (!userData.password || !await bcrypt.compare(password, userData.password))) {
        return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 400 });
      }
    }

    // 사용자의 주문 내역 확인
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('user_id', userId);

    if (ordersError) {
      console.error('주문 내역 조회 실패:', ordersError);
      return NextResponse.json({ error: '주문 내역 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // 진행 중인 주문이 있는지 확인
    const activeOrders = orders?.filter(order => 
      ['pending', 'payment_pending', 'paid', 'preparing', 'shipping'].includes(order.status)
    );

    if (activeOrders && activeOrders.length > 0) {
      return NextResponse.json({ 
        error: '진행 중인 주문이 있어 탈퇴할 수 없습니다. 주문이 완료된 후 다시 시도해주세요.' 
      }, { status: 400 });
    }

    // 현재 시간 생성
    const now = new Date().toISOString();

    // 탈퇴 사유 저장 (선택 사항)
    if (reason) {
      await supabase
        .from('user_deactivation_reasons')
        .insert([
          { user_id: userId, reason, created_at: now }
        ]);
    }

    // 사용자 정보 익명화 처리
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_deleted: true,
        deleted_at: now,
        email: `deleted_${userId}@example.com`,
        name: null,
        nickname: null,
        phone_number: null,
        avatar_url: null,
        address: null,
        detail_address: null,
        postcode: null,
        login_id: null,
        password: null,
        google_id: null,
        kakao_id: null,
        naver_id: null
      })
      .eq('id', userId);

    if (updateError) {
      console.error('사용자 탈퇴 처리 실패:', updateError);
      return NextResponse.json({ error: '탈퇴 처리 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // 사용자 관련 데이터 처리 (여기서는 장바구니 정보 삭제)
    const { error: cartError } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', userId);

    if (cartError) {
      console.log('장바구니 삭제 실패:', cartError);
      // 계속 진행 (장바구니 삭제 실패가 전체 프로세스를 중단할 필요는 없음)
    }

    return NextResponse.json({
      success: true,
      message: '성공적으로 탈퇴되었습니다.'
    });
  } catch (error) {
    console.error('회원 탈퇴 처리 중 오류 발생:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '회원 탈퇴 처리 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
} 