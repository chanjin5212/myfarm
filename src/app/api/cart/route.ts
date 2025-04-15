import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// 현재 로그인한 사용자 ID 가져오기
async function getUserId(request: NextRequest) {
  // Authorization 헤더에서 토큰 가져오기
  const authHeader = request.headers.get('Authorization');
  console.log('[장바구니 API] Authorization 헤더 존재 여부:', !!authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[장바구니 API] 인증 헤더가 없거나 잘못된 형식입니다.');
    return null;
  }
  
  try {
    // Bearer 접두사 제거
    const token = authHeader.split(' ')[1].trim();
    console.log('[장바구니 API] 토큰 길이:', token.length);
    
    // UUID 형식의 사용자 ID인지 확인
    if (isValidUUID(token)) {
      console.log('[장바구니 API] UUID 형식의 사용자 ID로 인증:', token);
      
      // 사용자 ID가 users 테이블에 존재하는지 확인
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', token)
        .maybeSingle();
        
      if (userError) {
        console.error('[장바구니 API] 사용자 확인 오류:', userError.message);
        return null;
      }
      
      if (!userData) {
        console.log('[장바구니 API] 해당 ID의 사용자를 찾을 수 없습니다.');
        return null;
      }
      
      return token; // 사용자 ID 반환
    }
    
    console.error('[장바구니 API] 유효하지 않은 토큰 형식:', token);
    return null;
  } catch (error) {
    console.error('[장바구니 API] 토큰 처리 중 오류 발생:', error);
    return null;
  }
}

// UUID 형식인지 확인하는 함수
function isValidUUID(id: string | null | undefined): boolean {
  if (id === null || id === undefined) return false;
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return pattern.test(id);
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '인증되지 않은 사용자' }, { status: 401 });
  }

  try {
    // 먼저 사용자의 장바구니 ID 가져오기 (여러 장바구니가 있을 수 있으므로 maybeSingle 대신 first() 사용)
    const { data: cartData, error: cartError } = await supabaseClient
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (cartError) throw cartError;

    // 장바구니가 없으면 빈 배열 반환
    if (!cartData || cartData.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const cartId = cartData[0].id;

    // 장바구니 아이템 가져오기
    const { data: cartItems, error: itemsError } = await supabaseClient
      .from('cart_items')
      .select(`
        id,
        product_id,
        product_option_id,
        quantity,
        products:product_id (
          id, 
          name, 
          price, 
          discount_price, 
          thumbnail_url, 
          stock
        ),
        product_options:product_option_id (
          id, 
          option_name, 
          option_value, 
          additional_price, 
          stock
        )
      `)
      .eq('cart_id', cartId);

    if (itemsError) throw itemsError;

    // 응답 데이터 형식 변환
    const items = cartItems.map(item => ({
      id: item.id,
      product_id: item.product_id,
      product_option_id: item.product_option_id,
      quantity: item.quantity,
      product: item.products,
      product_option: item.product_options
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('장바구니 조회 오류:', error);
    return NextResponse.json({ error: '장바구니 조회 실패', items: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '인증되지 않은 사용자' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { product_id, product_option_id, quantity } = body;

    // 사용자의 장바구니 가져오기 (여러 장바구니가 있을 수 있으므로 maybeSingle 대신 first() 사용)
    let cartId;
    const { data: cartData, error: cartError } = await supabaseClient
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (cartError) throw cartError;

    // 장바구니가 없으면 새로 생성
    if (!cartData || cartData.length === 0) {
      const { data: newCart, error: createCartError } = await supabaseClient
        .from('carts')
        .insert([{ user_id: userId }])
        .select('id')
        .single();

      if (createCartError) throw createCartError;
      cartId = newCart.id;
    } else {
      cartId = cartData[0].id;
    }

    // 중복된 상품이 있는지 확인
    const { data: existingItems, error: checkError } = await supabaseClient
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('product_id', product_id)
      .eq('product_option_id', product_option_id || null);

    if (checkError) throw checkError;

    let resultData;
    
    if (existingItems && existingItems.length > 0) {
      // 이미 있는 상품이면 수량 업데이트
      const existingItem = existingItems[0];
      const { data: updatedItem, error: updateError } = await supabaseClient
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id)
        .select()
        .single();

      if (updateError) throw updateError;
      resultData = updatedItem;
    } else {
      // 새 상품이면 추가
      const { data: newItem, error: insertError } = await supabaseClient
        .from('cart_items')
        .insert([{
          cart_id: cartId,
          product_id,
          product_option_id,
          quantity
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      resultData = newItem;
    }

    return NextResponse.json(resultData);
  } catch (error) {
    console.error('장바구니 추가 오류:', error);
    return NextResponse.json({ error: '장바구니 추가 실패' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '인증되지 않은 사용자' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const productOptionId = searchParams.get('product_option_id');

    if (!productId) {
      return NextResponse.json({ error: '상품 ID가 필요합니다' }, { status: 400 });
    }

    // 사용자의 장바구니 ID 가져오기
    const { data: cartData, error: cartError } = await supabaseClient
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (cartError) throw cartError;
    if (!cartData) {
      return NextResponse.json({ error: '장바구니가 없습니다' }, { status: 404 });
    }

    // 장바구니에서 아이템 삭제
    const query = supabaseClient
      .from('cart_items')
      .delete()
      .eq('cart_id', cartData.id)
      .eq('product_id', productId);

    // 상품 옵션 ID가 있으면 옵션도 함께 조건으로 사용
    if (productOptionId) {
      query.eq('product_option_id', productOptionId);
    } else {
      query.is('product_option_id', null);
    }

    const { error: deleteError } = await query;

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: '장바구니에서 상품이 삭제되었습니다' });
  } catch (error) {
    console.error('장바구니 삭제 오류:', error);
    return NextResponse.json({ error: '장바구니 삭제 실패' }, { status: 500 });
  }
} 