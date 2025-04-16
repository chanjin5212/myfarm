import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  option?: {
    name: string;
    value: string;
  };
  shippingFee: number;
}

interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
  detailAddress: string;
  memo: string;
}

interface PaymentInfo {
  method: string;
  totalAmount: number;
}

interface OrderData {
  userId: string;
  items: OrderItem[];
  shipping: ShippingInfo;
  payment: PaymentInfo;
}

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
    const { orderData } = await request.json();
    
    if (!orderData) {
      return NextResponse.json({ error: '주문 데이터가 필요합니다.' }, { status: 400 });
    }
    
    // orderData의 userId와 인증된 사용자 ID가 일치하는지 확인
    if (orderData.userId !== userId) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    console.log('주문 데이터 수신:', {
      사용자ID: userId,
      주문데이터: orderData
    });

    if (!orderData.items || orderData.items.length === 0) {
      return NextResponse.json(
        { message: '주문할 상품이 없습니다.' },
        { status: 400 }
      );
    }

    if (!orderData.shipping || !orderData.shipping.name || !orderData.shipping.phone || !orderData.shipping.address) {
      return NextResponse.json(
        { message: '배송 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!orderData.payment || !orderData.payment.totalAmount) {
      return NextResponse.json(
        { message: '결제 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    // 주문 생성
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        status: 'pending',
        total_amount: orderData.payment.totalAmount,
        shipping_name: orderData.shipping.name,
        shipping_phone: orderData.shipping.phone,
        shipping_address: orderData.shipping.address,
        shipping_detail_address: orderData.shipping.detailAddress || null,
        shipping_memo: orderData.shipping.memo || null,
        payment_method: 'kakao',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('주문 생성 오류:', orderError);
      return NextResponse.json(
        { error: '주문 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 주문 상품 저장
    const orderItems = orderData.items.map((item: any) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      product_option_id: item.productOptionId || null,
      price: item.price,
      options: item.selectedOptions ? item.selectedOptions : null
    }));

    // 상품 ID 유효성 검사
    for (const item of orderItems) {
      console.log('상품 조회 시도:', item.product_id);
      
      // products 테이블에서 상품 조회
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', item.product_id)
        .single();

      if (productError) {
        console.error('products 테이블 조회 오류:', productError);
        console.error('상품 ID:', item.product_id);
      }

      if (!product) {
        console.error('상품을 찾을 수 없음:', item.product_id);
        // 주문 삭제
        await supabase
          .from('orders')
          .delete()
          .eq('id', order.id);
        return NextResponse.json(
          { message: '유효하지 않은 상품이 포함되어 있습니다.' },
          { status: 400 }
        );
      }

      console.log('찾은 상품:', product);
    }

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('주문 상품 저장 오류:', itemsError);
      // 주문 삭제
      await supabase
        .from('orders')
        .delete()
        .eq('id', order.id);
      return NextResponse.json(
        { message: '주문 상품 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 상품 재고 업데이트
    for (const item of orderItems) {
      console.log('재고 업데이트 시도:', item.product_id);
      
      // 상품 정보 조회
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single();

      if (productError || !product) {
        console.error('상품 조회 오류:', productError);
        // 주문 삭제
        await supabase
          .from('orders')
          .delete()
          .eq('id', order.id);
        return NextResponse.json(
          { message: '상품 정보를 찾을 수 없습니다.' },
          { status: 500 }
        );
      }

      // 재고 업데이트
      const { error: stockError } = await supabase
        .from('products')
        .update({ stock: product.stock - item.quantity })
        .eq('id', item.product_id);

      if (stockError) {
        console.error('재고 업데이트 오류:', stockError);
        // 주문 삭제
        await supabase
          .from('orders')
          .delete()
          .eq('id', order.id);
        return NextResponse.json(
          { message: '재고 업데이트에 실패했습니다.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      orderId: order.id,
      message: '주문이 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('주문 처리 중 오류:', error);
    return NextResponse.json(
      { message: '주문 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 토큰 검증
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ message: '인증이 유효하지 않습니다.' }, { status: 401 });
    }
    
    // 관리자 권한 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      console.error('사용자 정보 조회 오류:', userError);
      return NextResponse.json({ message: '사용자 정보를 확인할 수 없습니다.' }, { status: 500 });
    }
    
    if (userData.role !== 'admin') {
      return NextResponse.json({ message: '관리자만 접근할 수 있습니다.' }, { status: 403 });
    }
    
    // 페이지네이션 처리
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // 검색 파라미터
    const status = url.searchParams.get('status');
    const searchQuery = url.searchParams.get('search');
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');
    
    // 기본 쿼리 설정
    let query = supabase
      .from('orders')
      .select('*, users!inner(name, email)', { count: 'exact' });
    
    // 필터 적용
    if (status) {
      query = query.eq('status', status);
    }
    
    if (fromDate) {
      query = query.gte('order_date', fromDate);
    }
    
    if (toDate) {
      // 날짜 범위의 끝을 다음날 00:00:00으로 설정하여 해당 날짜를 포함
      const nextDay = new Date(toDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query = query.lt('order_date', nextDay.toISOString());
    }
    
    if (searchQuery) {
      // 주문 ID, 사용자 이름 또는 이메일로 검색
      query = query.or(`id.ilike.%${searchQuery}%, users.name.ilike.%${searchQuery}%, users.email.ilike.%${searchQuery}%`);
    }
    
    // 정렬 및 페이지네이션
    const { data: orders, error: ordersError, count } = await query
      .order('order_date', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (ordersError) {
      console.error('주문 조회 오류:', ordersError);
      return NextResponse.json({ message: '주문 목록을 조회할 수 없습니다.' }, { status: 500 });
    }
    
    // 주문 아이템 정보 조회
    const orderIds = orders.map(order => order.id);
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);
    
    if (itemsError) {
      console.error('주문 아이템 조회 오류:', itemsError);
      return NextResponse.json({ message: '주문 아이템 정보를 조회할 수 없습니다.' }, { status: 500 });
    }
    
    // 주문 데이터 가공
    const formattedOrders = orders.map(order => {
      const items = orderItems.filter(item => item.order_id === order.id);
      
      return {
        id: order.id,
        userId: order.user_id,
        userName: order.users?.name || '게스트',
        userEmail: order.users?.email || '이메일 없음',
        date: order.order_date,
        status: order.status,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        shipping: {
          name: order.shipping_name,
          phone: order.shipping_phone,
          address: order.shipping_address,
          detailAddress: order.shipping_detail_address,
          memo: order.shipping_memo
        },
        itemCount: items.length,
        items: items.map(item => ({
          id: item.id,
          productId: item.product_id,
          name: item.product_name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          option: item.option_name && item.option_value ? {
            name: item.option_name,
            value: item.option_value
          } : null,
          shippingFee: item.shipping_fee
        }))
      };
    });
    
    // 페이지네이션 정보
    const totalPages = count ? Math.ceil(count / limit) : 0;
    
    return NextResponse.json({
      orders: formattedOrders,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count || 0,
        itemsPerPage: limit
      }
    });
    
  } catch (error) {
    console.error('주문 목록 조회 오류:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 주문 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { message: '주문 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 주문 상품 삭제
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('주문 상품 삭제 오류:', itemsError);
      return NextResponse.json(
        { message: '주문 상품 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 주문 삭제
    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (orderError) {
      console.error('주문 삭제 오류:', orderError);
      return NextResponse.json(
        { message: '주문 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '주문이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('주문 삭제 중 오류:', error);
    return NextResponse.json(
      { message: '주문 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 