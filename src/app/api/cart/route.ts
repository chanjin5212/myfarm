import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 현재 로그인한 사용자 ID 가져오기
async function getUserId(request: NextRequest) {
  // Authorization 헤더에서 토큰 가져오기
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return await verifyToken(authHeader.substring(7));
  }
  
  // Next.js 15에서는 Route Handlers 내에서 쿠키 접근이 제한될 수 있음
  // 대신 Authorization 헤더를 우선적으로 사용하고, 
  // 클라이언트에서 쿠키를 헤더로 전달하도록 수정
  return null;
}

// 토큰 검증
async function verifyToken(token: string) {
  try {
    // 토큰이 없으면 null 반환
    if (!token) {
      console.log('토큰이 제공되지 않았습니다.');
      return null;
    }

    // URL 인코딩된 토큰 디코딩 시도
    let decodedToken = token;
    try {
      // encodeURIComponent로 인코딩된 토큰을 디코딩
      decodedToken = decodeURIComponent(token);
      console.log('토큰 URL 디코딩 성공');
    } catch (decodeError) {
      console.error('토큰 URL 디코딩 실패:', decodeError);
      // 디코딩에 실패해도 원본 토큰으로 진행
    }
    
    // 디코딩된 토큰으로 작업 계속
    token = decodedToken;

    // 토큰을 JSON 파싱 시도
    try {
      // 토큰이 JSON 문자열인지 확인
      const tokenObj = JSON.parse(token);
      console.log('토큰 JSON 파싱 성공');
      
      // 사용자 ID 추출 시도
      if (tokenObj.user && tokenObj.user.id) {
        console.log('사용자 ID를 토큰에서 추출:', tokenObj.user.id);
        return tokenObj.user.id;
      }
    } catch {
      console.log('토큰 JSON 파싱 실패, 다른 방식으로 진행');
    }

    // 토큰 형식 검증
    if (!token.includes('.')) {
      // 토큰 형식이 아니면 사용자 ID로 간주
      console.log('사용자 ID로 처리:', token);
      return token;
    }

    // 이 부분은 실제 토큰 검증 로직으로 대체해야 함
    // JWT 검증 라이브러리 사용 등
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.sub;
  } catch (error) {
    console.error('토큰 검증 오류:', error);
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
  try {
    // 사용자 인증
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    // 사용자의 장바구니 조회
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (cartError) {
      if (cartError.code === 'PGRST116') { // 결과 없음
        // 장바구니 생성
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert([
            { user_id: userId }
          ])
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        return NextResponse.json({ 
          id: newCart.id,
          items: [] 
        });
      }
      throw cartError;
    }

    // 장바구니 아이템 조회
    const { data: cartItems, error: itemsError } = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        product_option_id,
        quantity,
        products (
          id, 
          name, 
          price, 
          discount_price, 
          thumbnail_url, 
          stock
        ),
        product_options (
          id, 
          option_name, 
          option_value, 
          additional_price, 
          stock
        )
      `)
      .eq('cart_id', cart.id);

    if (itemsError) {
      throw itemsError;
    }

    // 응답 포맷 변환
    const formattedItems = cartItems.map(item => ({
      id: item.id,
      product_id: item.product_id,
      product_option_id: item.product_option_id,
      quantity: item.quantity,
      product: item.products,
      product_option: item.product_options
    }));

    return NextResponse.json({
      id: cart.id,
      items: formattedItems
    });
  } catch (error) {
    console.error('장바구니 조회 오류:', error);
    return NextResponse.json(
      { error: '장바구니 정보를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 사용자 인증
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    // 요청 데이터 파싱
    const requestData = await request.json();
    const { product_id, quantity } = requestData;
    
    // product_option_id가 유효한 UUID인지 확인하고, 아니면 null로 처리
    let product_option_id = requestData.product_option_id;
    if (product_option_id === null || product_option_id === undefined || product_option_id === 'null' || (product_option_id && !isValidUUID(product_option_id))) {
      // 유효하지 않은 product_option_id는 null로 저장
      product_option_id = null;
    }

    if (!product_id) {
      return NextResponse.json({ error: '상품 ID는 필수입니다.' }, { status: 400 });
    }

    if (!quantity || quantity < 1) {
      return NextResponse.json({ error: '수량은 1 이상이어야 합니다.' }, { status: 400 });
    }

    // 상품 존재 여부 확인
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, stock')
      .eq('id', product_id)
      .single();

    if (productError) {
      if (productError.code === 'PGRST116') {
        return NextResponse.json({ error: '존재하지 않는 상품입니다.' }, { status: 404 });
      }
      throw productError;
    }

    // 사용자의 장바구니 확인 또는 생성
    let cartId;
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (cartError) {
      if (cartError.code === 'PGRST116') {
        // 장바구니 생성
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert([
            { user_id: userId }
          ])
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        cartId = newCart.id;
      } else {
        throw cartError;
      }
    } else {
      cartId = cart.id;
    }

    let maxStock = product.stock;

    // 옵션이 있는 경우 옵션 재고 확인
    if (product_option_id) {
      const { data: option, error: optionError } = await supabase
        .from('product_options')
        .select('stock')
        .eq('id', product_option_id)
        .single();

      if (optionError) {
        throw optionError;
      }

      maxStock = Math.min(maxStock, option.stock);
    }

    if (quantity > maxStock) {
      return NextResponse.json({ 
        error: `재고가 부족합니다. 현재 재고: ${maxStock}개` 
      }, { status: 400 });
    }

    // 이미 장바구니에 같은 상품이 있는지 확인
    const { data: existingItems, error: existingError } = await supabase
      .from('cart_items')
      .select('id, quantity, product_option_id')
      .eq('cart_id', cartId)
      .eq('product_id', product_id);
    
    if (existingError) {
      throw existingError;
    }
    
    // 옵션이 있는 경우 같은 옵션만 필터링, 없는 경우 옵션 없는 상품만 필터링
    const filteredItems = existingItems?.filter(item => {
      if (product_option_id === null) {
        return item.product_option_id === null;
      } else {
        return item.product_option_id === product_option_id;
      }
    });

    // 이미 장바구니에 같은 상품이 있는 경우
    if (filteredItems && filteredItems.length > 0) {
      const existingItem = filteredItems[0];
      const newQuantity = existingItem.quantity + quantity;
      
      // 재고 확인
      if (newQuantity > maxStock) {
        return NextResponse.json({ 
          error: `재고가 부족합니다. 현재 재고: ${maxStock}개 / 장바구니에 담긴 수량: ${existingItem.quantity}개` 
        }, { status: 400 });
      }
      
      // 수량 업데이트
      const { data: updatedItem, error: updateError } = await supabase
        .from('cart_items')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString() 
        })
        .eq('id', existingItem.id)
        .select()
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      return NextResponse.json({
        success: true,
        data: updatedItem,
        message: '장바구니에 상품 수량이 추가되었습니다.'
      });
    }

    // 장바구니에 아이템 추가
    const { data: cartItem, error: insertError } = await supabase
      .from('cart_items')
      .insert([
        { 
          cart_id: cartId,
          product_id,
          product_option_id: product_option_id === null ? null : product_option_id,
          quantity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      data: cartItem,
      message: '장바구니에 상품이 추가되었습니다.'
    });
  } catch (error) {
    console.error('장바구니 추가 오류:', error);
    return NextResponse.json(
      { error: '장바구니에 상품을 추가하는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 