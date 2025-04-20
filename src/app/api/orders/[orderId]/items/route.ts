import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 특정 주문의 상품 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const orderId = (await params).orderId;
  
  // 인증 토큰 확인
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
  }
  
  // Bearer 토큰에서 사용자 ID 추출
  const userId = authHeader.split(' ')[1].trim();
  
  try {
    // 먼저 주문이 해당 사용자의 것인지 확인
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    
    if (orderError) {
      console.error('주문 확인 오류:', orderError);
      return NextResponse.json(
        { message: '주문 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 주문 상품 정보 조회
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        product_id,
        quantity,
        price,
        options,
        created_at,
        products:product_id (name, thumbnail_url)
      `)
      .eq('order_id', orderId);
    
    if (error) {
      console.error('주문 상품 조회 오류:', error);
      return NextResponse.json(
        { message: '주문 상품 정보를 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // 응답 데이터 포맷팅
    const formattedItems = orderItems.map(item => {
      // 타입 오류 수정을 위해 products 필드를 정확히 처리
      const productInfo = item.products || {};
      console.log('주문 상품 옵션 내용:', item.options);
      
      return {
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        name: typeof productInfo === 'object' && 'name' in productInfo ? productInfo.name : (item.options?.name || '상품명 없음'),
        image: typeof productInfo === 'object' && 'thumbnail_url' in productInfo ? productInfo.thumbnail_url : (item.options?.image || null),
        options: item.options || {}
      };
    });
    
    console.log('응답할 주문 상품 데이터:', JSON.stringify(formattedItems, null, 2));
    return NextResponse.json(formattedItems);
  } catch (error) {
    console.error('서버 오류:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 