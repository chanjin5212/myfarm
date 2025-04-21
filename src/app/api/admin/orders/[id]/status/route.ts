import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 관리자 토큰 검증 함수
async function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isValid: false, error: '인증 토큰이 필요합니다' };
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      login_id: string;
      role: string;
    };
    
    if (decoded.role !== 'admin') {
      return { isValid: false, error: '관리자 권한이 없습니다' };
    }
    
    return { isValid: true, userId: decoded.id };
  } catch (error) {
    return { isValid: false, error: '유효하지 않은 토큰입니다' };
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 관리자 인증
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const orderId = params.id;
    
    if (!orderId) {
      return NextResponse.json(
        { error: '주문 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 요청 본문 파싱
    const { status } = await request.json();
    
    if (!status) {
      return NextResponse.json(
        { error: '변경할 상태 정보가 필요합니다' },
        { status: 400 }
      );
    }

    // 유효한 상태 값인지 확인
    const validStatuses = [
      'pending', 'payment_pending', 'paid', 'preparing', 
      'shipping', 'delivered', 'canceled', 'cancelled', 'refunded'
    ];
    
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '유효하지 않은 주문 상태입니다' },
        { status: 400 }
      );
    }

    // 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError || !order) {
      console.error('주문 정보 조회 오류:', orderError);
      return NextResponse.json(
        { error: '주문 정보를 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }

    // 주문 상태 변경
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (updateError) {
      console.error('주문 상태 변경 오류:', updateError);
      return NextResponse.json(
        { error: '주문 상태 변경에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '주문 상태가 변경되었습니다',
      order: updatedOrder
    });
    
  } catch (error) {
    console.error('주문 상태 변경 에러:', error);
    return NextResponse.json(
      { error: '주문 상태 변경에 실패했습니다' },
      { status: 500 }
    );
  }
} 