import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

type Product = {
  id: string;
  stock: number;
};

type ProductOption = {
  id: string;
  stock: number;
};

type OrderItem = {
  id: string;
  quantity: number;
  product: Product | null;
  product_option: ProductOption | null;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  items: OrderItem[];
};

export async function POST(req: NextRequest) {
  try {
    console.log('API 요청 시작 - orders');
    const { orderId, orderData } = await req.json();
    console.log('주문 데이터 받음:', { orderId });
    
    // 유효성 검사
    if (!orderId || !orderData) {
      return NextResponse.json(
        { error: '주문 정보가 불완전합니다.' }, 
        { status: 400 }
      );
    }
    
    // 인증 검증
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 정보가 필요합니다.' }, 
        { status: 401 }
      );
    }
    
    // 토큰에서 사용자 ID 추출
    const userId = authHeader.split(' ')[1].trim();
    
    if (!userId) {
      return NextResponse.json(
        { error: '유효하지 않은 인증 정보입니다.' }, 
        { status: 401 }
      );
    }
    
    // 사용자 정보 확인
    if (userId !== orderData.userId) {
      return NextResponse.json(
        { error: '인증된 사용자와 주문 사용자가 일치하지 않습니다.' }, 
        { status: 403 }
      );
    }
    
    // 주문 데이터를 저장할 변수
    let order: any = null;
    
    // 트랜잭션 처리
    try {
      // 1. 주문 생성
      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          user_id: userId,
          status: 'paid',
          payment_method: orderData.payment?.method || 'naverpay',
          total_amount: orderData.payment?.total_amount,
          shipping_name: orderData.shipping.name,
          shipping_phone: orderData.shipping.phone,
          shipping_address: orderData.shipping.address,
          shipping_detail_address: orderData.shipping.detailAddress || null,
          shipping_memo: orderData.shipping.memo || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (orderError) {
        console.error('주문 생성 SQL 오류:', orderError);
        throw new Error('주문 생성 오류: ' + orderError.message);
      }
      
      // 주문이 정상적으로 생성되었는지 확인
      if (!createdOrder || !createdOrder.id) {
        console.error('주문 생성 실패 - 반환된 주문 데이터 없음');
        throw new Error('주문이 생성되지 않았습니다.');
      }
      
      // 전역 변수에 주문 할당
      order = createdOrder;
      
      console.log('주문 생성 완료:', order.id);
      
      // 2. 주문 상품 생성
      const orderItems = orderData.items.map((item: any) => ({
        order_id: order.id,
        product_id: item.productId,
        product_option_id: item.productOptionId,
        quantity: item.quantity,
        price: item.price + (item.selectedOptions?.additional_price || 0),
        options: {
          name: item.name,
          image: item.image,
          option_name: item.selectedOptions?.name || null,
          option_value: item.selectedOptions?.value || null,
          additional_price: item.selectedOptions?.additional_price || 0
        }
      }));

      console.log('주문 상품 데이터:', orderItems);

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('주문 상품 생성 오류:', itemsError);
        throw new Error('주문 상품 생성 오류: ' + itemsError.message);
      }

      console.log('주문 상품 생성 완료');
      
      // 3. 재고 감소 처리
      for (const item of orderData.items) {
        if (!item.productOptionId) {
          throw new Error('상품 옵션이 지정되지 않았습니다.');
        }

        // 상품 옵션의 재고 감소
        const { data: productOption, error: productOptionError } = await supabase
          .from('product_options')
          .select('stock')
          .eq('id', item.productOptionId)
          .single();

        if (productOptionError || !productOption) {
          throw new Error('상품 옵션 정보를 찾을 수 없습니다.');
        }

        const { error: stockError } = await supabase
          .from('product_options')
          .update({ stock: productOption.stock - item.quantity })
          .eq('id', item.productOptionId);

        if (stockError) {
          throw new Error('재고 업데이트에 실패했습니다.');
        }
      }
      
      // 성공 응답
      return NextResponse.json({
        status: 'success',
        orderId: order.id,
        message: '주문이 성공적으로 처리되었습니다.',
      });
      
    } catch (error: any) {
      // 오류 발생 시 롤백 (주문 취소)
      console.error('주문 처리 중 오류 발생:', error);

      try {
        // 주문이 생성되었다면 해당 주문 ID 사용, 그렇지 않으면 전달된 ID 사용
        const deleteOrderId = order?.id || orderId;

        console.log('롤백 - 주문 삭제 시도:', deleteOrderId);

        // 생성된 주문 항목 삭제 시도
        const { error: deleteItemsError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', deleteOrderId);

        if (deleteItemsError) {
          console.error('주문 항목 삭제 중 오류:', deleteItemsError);
        }

        // 생성된 주문 삭제 시도
        const { error: deleteOrderError } = await supabase
          .from('orders')
          .delete()
          .eq('id', deleteOrderId);

        if (deleteOrderError) {
          console.error('주문 삭제 중 오류:', deleteOrderError);
        }
      } catch (rollbackError) {
        console.error('롤백 중 오류:', rollbackError);
      }
      
      return NextResponse.json(
        { error: '주문 처리 중 오류가 발생했습니다: ' + error.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('주문 처리 중 오류:', error);
    return NextResponse.json(
      { error: '주문 처리 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류') },
      { status: 500 }
    );
  }
} 