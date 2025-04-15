import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 특정 주문 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const orderId = (await params).orderId;
    console.log('주문 조회 API 요청:', orderId);
    
    if (!orderId) {
      return NextResponse.json({ message: '주문 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 인증 토큰 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
    }
    
    // Bearer 토큰에서 사용자 ID 추출
    const userId = authHeader.split(' ')[1].trim();
    console.log('사용자 ID:', userId);
    
    // 주문 정보 조회
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();
    
    if (orderError) {
      console.error('주문 조회 실패:', orderError);
      return NextResponse.json({ message: '주문을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    if (!orderData) {
      console.error('주문 데이터가 없음:', orderId);
      return NextResponse.json({ message: '주문 정보가 없습니다.' }, { status: 404 });
    }
    
    console.log('DB에서 조회한 주문 데이터:', orderData);
    
    // 주문 상품 정보 조회
    const { data: orderItemsData, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    
    if (itemsError) {
      console.error('주문 상품 조회 실패:', itemsError);
      return NextResponse.json({ message: '주문 상품 정보를 가져올 수 없습니다.' }, { status: 500 });
    }
    
    console.log('DB에서 조회한 주문 상품 데이터:', orderItemsData);
    
    // 상품 정보를 보기 좋게 변환
    const items = orderItemsData.map(item => ({
      id: item.id,
      productId: item.product_id,
      name: item.product_name || '상품명 없음',
      price: item.price || 0,
      quantity: item.quantity || 1,
      image: item.image || null,
      option: item.option_name && item.option_value ? {
        name: item.option_name,
        value: item.option_value
      } : null,
      options: item.options || null,
      shippingFee: item.shipping_fee || 0
    }));
    
    // 주문 정보를 보기 좋게 변환 (DB 컬럼 이름 그대로 유지)
    const response = {
      id: orderData.id,
      order_number: orderData.order_number || orderId,
      user_id: orderData.user_id,
      status: orderData.status || 'pending',
      shipping_name: orderData.shipping_name || '',
      shipping_phone: orderData.shipping_phone || '',
      shipping_address: orderData.shipping_address || '',
      shipping_detail_address: orderData.shipping_detail_address || '',
      shipping_memo: orderData.shipping_memo || '',
      payment_method: orderData.payment_method || '',
      total_amount: orderData.total_amount || 0,
      created_at: orderData.created_at || new Date().toISOString(),
      updated_at: orderData.updated_at || new Date().toISOString(),
      
      // 중첩된 객체로도 접근할 수 있도록 추가
      shipping: {
        name: orderData.shipping_name || '',
        phone: orderData.shipping_phone || '',
        address: orderData.shipping_address || '',
        detailAddress: orderData.shipping_detail_address || '',
        memo: orderData.shipping_memo || ''
      },
      payment: {
        method: orderData.payment_method || '',
        totalAmount: orderData.total_amount || 0
      },
      items: items
    };
    
    console.log('클라이언트로 전송할 응답:', response);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('주문 조회 오류:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 주문 상태 업데이트 (관리자용 또는 사용자 주문 취소용)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const orderId = (await params).orderId;
    
    if (!orderId) {
      return NextResponse.json({ message: '주문 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 요청 데이터 파싱
    const requestData = await request.json();
    const { status } = requestData;
    
    if (!status) {
      return NextResponse.json({ message: '변경할 상태값이 필요합니다.' }, { status: 400 });
    }
    
    // 허용된 상태값 목록
    const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'];
    
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ 
        message: '유효하지 않은 상태값입니다.', 
        allowedStatuses 
      }, { status: 400 });
    }
    
    // 인증 토큰 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
    }
    
    // Bearer 토큰에서 사용자 ID 추출
    const userId = authHeader.split(' ')[1].trim();
    
    // 사용자 정보 조회 (관리자 권한 확인)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('사용자 정보 조회 오류:', userError);
      return NextResponse.json({ message: '사용자 정보를 확인할 수 없습니다.' }, { status: 500 });
    }
    
    const isAdmin = userData.role === 'admin';
    
    // 주문 정보 조회
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      if (orderError.code === 'PGRST116') {
        return NextResponse.json({ message: '해당 주문을 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json({ message: '주문 정보를 가져올 수 없습니다.' }, { status: 500 });
    }
    
    // 일반 사용자는 자신의 주문만 취소할 수 있음
    if (!isAdmin) {
      if (orderData.user_id !== userId) {
        return NextResponse.json({ message: '이 주문을 수정할 권한이 없습니다.' }, { status: 403 });
      }
      
      // 일반 사용자는 주문 취소만 가능
      if (status !== 'cancelled') {
        return NextResponse.json({ message: '일반 사용자는 주문 취소만 가능합니다.' }, { status: 403 });
      }
      
      // 이미 처리 중인 이후 상태의 주문은 취소할 수 없음
      const nonCancellableStatuses = ['shipped', 'delivered', 'cancelled', 'returned', 'refunded'];
      if (nonCancellableStatuses.includes(orderData.status)) {
        return NextResponse.json({ 
          message: `현재 주문 상태(${orderData.status})에서는 취소할 수 없습니다.` 
        }, { status: 400 });
      }
    }
    
    // 주문 상태 업데이트
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
      console.error('주문 상태 업데이트 오류:', updateError);
      return NextResponse.json({ message: '주문 상태를 업데이트할 수 없습니다.' }, { status: 500 });
    }
    
    // 주문 취소 시 재고 복구
    if (status === 'cancelled') {
      // 주문 아이템 정보 조회
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      
      if (itemsError) {
        console.error('주문 아이템 조회 오류:', itemsError);
        return NextResponse.json({ 
          message: '주문은 취소되었으나 재고 복구 중 오류가 발생했습니다.' 
        }, { status: 500 });
      }
      
      // 각 아이템의 재고 복구
      for (const item of orderItems) {
        // 옵션이 있는 경우
        if (item.option_id) {
          const { error: optionError } = await supabase.rpc('increment_option_stock', {
            p_option_id: item.option_id,
            p_quantity: item.quantity
          });
          
          if (optionError) {
            console.error(`옵션 재고 복구 오류 (${item.option_id}):`, optionError);
          }
        } else {
          // 일반 상품의 경우
          const { error: stockError } = await supabase.rpc('increment_product_stock', {
            p_product_id: item.product_id,
            p_quantity: item.quantity
          });
          
          if (stockError) {
            console.error(`상품 재고 복구 오류 (${item.product_id}):`, stockError);
          }
        }
      }
    }
    
    // 응답
    return NextResponse.json({
      message: '주문 상태가 업데이트되었습니다.',
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updated_at
      }
    });
    
  } catch (error) {
    console.error('주문 상태 업데이트 오류:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 