import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase 설정 가져오기
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
    console.log('API 요청 시작 - orders/complete');
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 주문 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        items:order_items (
          id,
          quantity,
          product:products (
            id,
            stock
          ),
          product_option:product_options (
            id,
            stock
          )
        )
      `)
      .eq('order_number', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 타입 캐스팅
    const typedOrder = order as unknown as Order;

    // 재고 감소 처리
    for (const item of typedOrder.items) {
      if (item.product_option) {
        // 옵션 상품의 경우
        const { error: optionError } = await supabase
          .from('product_options')
          .update({ stock: item.product_option.stock - item.quantity })
          .eq('id', item.product_option.id);

        if (optionError) {
          throw new Error('Failed to update product option stock');
        }
      } else if (item.product) {
        // 일반 상품의 경우
        const { error: productError } = await supabase
          .from('products')
          .update({ stock: item.product.stock - item.quantity })
          .eq('id', item.product.id);

        if (productError) {
          throw new Error('Failed to update product stock');
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error completing order:', error);
    return NextResponse.json(
      { error: 'Failed to complete order' },
      { status: 500 }
    );
  }
}