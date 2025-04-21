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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const orderId = await params;
    
    if (!orderId) {
      return NextResponse.json(
        { error: '주문 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 요청 본문 파싱
    const { tracking_number, carrier, status = 'shipped' } = await request.json();
    
    if (!tracking_number) {
      return NextResponse.json(
        { error: '송장번호가 필요합니다' },
        { status: 400 }
      );
    }

    if (!carrier) {
      return NextResponse.json(
        { error: '택배사 정보가 필요합니다' },
        { status: 400 }
      );
    }

    // 주문 정보 조회 (존재하는지 확인)
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

    // 송장 정보 추가
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert({
        order_id: orderId,
        tracking_number,
        carrier,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (shipmentError) {
      console.error('송장 정보 추가 오류:', shipmentError);
      return NextResponse.json(
        { error: '송장 정보 추가에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '송장 정보가 추가되었습니다',
      shipment
    });
    
  } catch (error) {
    console.error('송장 정보 추가 에러:', error);
    return NextResponse.json(
      { error: '송장 정보 추가에 실패했습니다' },
      { status: 500 }
    );
  }
} 