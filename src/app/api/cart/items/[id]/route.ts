import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 타입 정의
type RouteParams = { params: { id: string } };

// 현재 로그인한 사용자 ID 가져오기
async function getUserId(request: NextRequest) {
  // Authorization 헤더에서 토큰 가져오기
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return await verifyToken(authHeader.substring(7));
  }
  
  // Next.js 15에서는 API 핸들러에서 쿠키 접근 방식이 변경됨
  // Authorization 헤더 우선 사용 방식으로 변경했으므로 이 부분은 생략
  return null;
}

// 토큰 검증
async function verifyToken(token: string) {
  try {
    // 사용자 ID가 직접 전달된 경우 그대로 사용
    if (!token.includes('.')) {
      console.log('사용자 ID로 처리:', token);
      return token;
    }
    
    // URL 인코딩된 토큰 디코딩 시도
    try {
      token = decodeURIComponent(token);
    } catch (decodeError) {
      console.error('토큰 URL 디코딩 실패:', decodeError);
      // 디코딩에 실패해도 원본 토큰으로 진행
    }
    
    // JSON 파싱 시도
    try {
      const jsonObj = JSON.parse(token);
      if (jsonObj.user && jsonObj.user.id) {
        console.log('사용자 ID를 JSON에서 추출:', jsonObj.user.id);
        return jsonObj.user.id;
      }
    } catch {
      // JSON 파싱 실패, JWT 방식으로 계속 진행
    }

    // 이 부분은 실제 토큰 검증 로직으로 대체해야 함
    // JWT 검증 라이브러리 사용 등
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return payload.sub;
    } catch (jwtError) {
      console.error('JWT 토큰 파싱 실패:', jwtError);
      // 마지막 방법으로, 토큰 자체를 사용자 ID로 시도
      return token;
    }
  } catch (error) {
    console.error('토큰 검증 오류:', error);
    return null;
  }
}

// 장바구니 아이템 수량 업데이트
export async function PATCH(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const itemId = context.params.id;
    
    // 사용자 인증
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 요청 데이터 파싱
    const { quantity } = await request.json();
    
    if (!quantity || quantity < 1) {
      return NextResponse.json({ error: '수량은 1 이상이어야 합니다.' }, { status: 400 });
    }
    
    // 장바구니 아이템이 해당 사용자의 것인지 확인
    const { data: cartItem, error: itemError } = await supabase
      .from('cart_items')
      .select(`
        id,
        cart_id,
        product_id,
        product_option_id,
        carts!inner(user_id)
      `)
      .eq('id', itemId)
      .eq('carts.user_id', userId)
      .single();
    
    if (itemError) {
      if (itemError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: '존재하지 않는 장바구니 아이템이거나 접근 권한이 없습니다.' 
        }, { status: 404 });
      }
      throw itemError;
    }
    
    // 상품 재고 확인
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', cartItem.product_id)
      .single();
    
    if (productError) {
      throw productError;
    }
    
    let maxStock = product.stock;
    
    // 옵션이 있는 경우 옵션 재고 확인
    if (cartItem.product_option_id) {
      const { data: option, error: optionError } = await supabase
        .from('product_options')
        .select('stock')
        .eq('id', cartItem.product_option_id)
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
    
    // 수량 업데이트
    const { data: updatedItem, error: updateError } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('장바구니 아이템 수량 업데이트 오류:', error);
    return NextResponse.json({ error: '장바구니 아이템 수량 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 장바구니 아이템 삭제
export async function DELETE(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const itemId = context.params.id;
    
    // 사용자 인증
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 장바구니 아이템이 해당 사용자의 것인지 확인
    const { data: cartItem, error: itemError } = await supabase
      .from('cart_items')
      .select(`
        id,
        cart_id,
        carts!inner(user_id)
      `)
      .eq('id', itemId)
      .eq('carts.user_id', userId)
      .maybeSingle();
    
    if (itemError && itemError.code !== 'PGRST116') {
      throw itemError;
    }
    
    if (!cartItem) {
      return NextResponse.json({ 
        error: '존재하지 않는 장바구니 아이템이거나 접근 권한이 없습니다.' 
      }, { status: 404 });
    }
    
    // 장바구니 아이템 삭제
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);
    
    if (deleteError) {
      throw deleteError;
    }
    
    return NextResponse.json({
      success: true,
      message: '장바구니에서 상품이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('장바구니 아이템 삭제 오류:', error);
    return NextResponse.json(
      { error: '장바구니에서 상품을 삭제하는데 실패했습니다.' },
      { status: 500 }
    );
  }
}