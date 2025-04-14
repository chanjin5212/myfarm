import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    // 요청 본문에서 주문 데이터 추출
    const orderData: OrderData = await request.json();
    
    // 사용자 ID 확인
    const userId = orderData.userId;
    if (!userId) {
      return NextResponse.json({ message: '사용자 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 사용자 존재 여부 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      console.error('사용자 정보 조회 오류:', userError);
      return NextResponse.json({ message: '유효하지 않은 사용자입니다.' }, { status: 401 });
    }
    
    // 주문 데이터 유효성 검사
    if (!orderData.items || orderData.items.length === 0) {
      return NextResponse.json({ message: '주문 상품이 없습니다.' }, { status: 400 });
    }
    
    if (!orderData.shipping.name || !orderData.shipping.phone || !orderData.shipping.address) {
      return NextResponse.json({ message: '배송 정보가 불완전합니다.' }, { status: 400 });
    }
    
    // 주문 ID 생성
    const orderId = uuidv4();
    const orderDate = new Date().toISOString();
    
    // 주문 정보 저장
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        user_id: userId,
        order_date: orderDate,
        status: 'pending',
        total_amount: orderData.payment.totalAmount,
        payment_method: orderData.payment.method,
        shipping_name: orderData.shipping.name,
        shipping_phone: orderData.shipping.phone,
        shipping_address: orderData.shipping.address,
        shipping_detail_address: orderData.shipping.detailAddress,
        shipping_memo: orderData.shipping.memo
      });
    
    if (orderError) {
      console.error('주문 생성 오류:', orderError);
      return NextResponse.json({ message: '주문을 처리할 수 없습니다.' }, { status: 500 });
    }
    
    // 주문 상품 정보 저장
    const orderItems = orderData.items.map(item => ({
      id: uuidv4(),
      order_id: orderId,
      product_id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      price: item.price,
      option_name: item.option?.name || null,
      option_value: item.option?.value || null,
      shipping_fee: item.shippingFee,
      image: item.image
    }));
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
    
    if (itemsError) {
      console.error('주문 상품 저장 오류:', itemsError);
      // 주문 삭제 (롤백)
      await supabase.from('orders').delete().eq('id', orderId);
      return NextResponse.json({ message: '주문 상품을 처리할 수 없습니다.' }, { status: 500 });
    }
    
    // 재고 업데이트 로직 (가정: 각 상품마다 재고가 있음)
    for (const item of orderData.items) {
      // 상품 정보 조회
      const { data: productData } = await supabase
        .from('products')
        .select('stock, options')
        .eq('id', item.productId)
        .single();
      
      if (!productData) continue;
      
      if (item.option) {
        // 옵션이 있는 경우 해당 옵션의 재고 감소
        const options = productData.options || [];
        const updatedOptions = options.map((opt: any) => {
          if (opt.name === item.option?.name && opt.value === item.option?.value) {
            return { ...opt, stock: Math.max(0, opt.stock - item.quantity) };
          }
          return opt;
        });
        
        await supabase
          .from('products')
          .update({ options: updatedOptions })
          .eq('id', item.productId);
      } else {
        // 기본 재고 감소
        const newStock = Math.max(0, productData.stock - item.quantity);
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.productId);
      }
    }
    
    // 응답 반환
    return NextResponse.json({ 
      message: '주문이 성공적으로 처리되었습니다.',
      orderId
    }, { status: 201 });
    
  } catch (error) {
    console.error('주문 처리 오류:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
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