import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const orderId = (await params).orderId;
    
    if (!orderId) {
      return NextResponse.json({ error: '주문 ID가 필요합니다.' }, { status: 400 });
    }
    
    console.log('주문 취소 요청:', orderId);
    
    // 인증 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 정보가 필요합니다.' }, { status: 401 });
    }
    
    // 토큰에서 사용자 ID 추출
    const userId = authHeader.split(' ')[1].trim();
    
    if (!userId) {
      return NextResponse.json({ error: '유효하지 않은 인증 정보입니다.' }, { status: 401 });
    }
    
    // 주문 정보 조회
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      console.error('주문 정보 조회 실패:', orderError);
      return NextResponse.json({ error: '주문 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 주문 소유자 확인
    if (orderData.user_id !== userId) {
      console.log('주문 소유자 불일치:', { orderId, requestUserId: userId, orderUserId: orderData.user_id });
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 주문이 이미 완료된 경우 취소 불가
    if (orderData.status === 'paid' || orderData.status === 'completed' || 
        orderData.status === 'shipping' || orderData.status === 'delivered') {
      console.log('이미 처리된 주문은 취소할 수 없음:', orderId, orderData.status);
      return NextResponse.json({
        error: `이미 처리된 주문(${orderData.status})은 취소할 수 없습니다.`
      }, { status: 400 });
    }
    
    // 주문 항목 삭제
    try {
      const { error: itemsDeleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);
      
      if (itemsDeleteError) {
        console.error('주문 항목 삭제 오류:', itemsDeleteError);
        // 계속 진행
      } else {
        console.log('주문 항목 삭제 완료:', orderId);
      }
    } catch (itemsError) {
      console.error('주문 항목 삭제 중 예외 발생:', itemsError);
      // 계속 진행
    }
    
    // 주문 완전 삭제
    const { data: deleteData, error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
      .select()
      .single();
    
    if (deleteError) {
      console.error('주문 삭제 오류:', deleteError);
      return NextResponse.json({ error: '주문 삭제에 실패했습니다.' }, { status: 500 });
    }
    
    console.log('주문 삭제 완료:', orderId);
    
    return NextResponse.json({ 
      success: true, 
      message: '주문이 성공적으로 삭제되었습니다.',
      order: deleteData
    });
    
  } catch (error) {
    console.error('주문 취소 중 오류 발생:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '주문 취소 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 