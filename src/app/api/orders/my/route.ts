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
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[주문 API] 인증 헤더가 없거나 잘못된 형식입니다:', authHeader);
    return null;
  }
  
  try {
    // Bearer 접두사 제거
    const token = authHeader.split(' ')[1].trim();
    console.log('[주문 API] 토큰:', token.substring(0, 20) + '...');
    
    // 1. UUID 형식의 사용자 ID인지 확인
    if (isValidUUID(token)) {
      console.log('[주문 API] UUID 형식의 사용자 ID로 인증 시도');
      
      // 사용자 ID가 users 테이블에 존재하는지 확인
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', token)
        .maybeSingle();
        
      if (userError) {
        console.error('[주문 API] 사용자 확인 오류:', userError.message);
        return null;
      }
      
      if (!userData) {
        console.log('[주문 API] 해당 ID의 사용자를 찾을 수 없습니다.');
        return null;
      }
      
      console.log('[주문 API] 사용자 ID 인증 성공:', token);
      return token; // 사용자 ID 반환
    }
    
    // 2. JSON 형식의 토큰인지 확인 (로컬스토리지에 직접 저장된 형식)
    try {
      const parsedToken = JSON.parse(token);
      console.log('[주문 API] JSON 토큰 파싱 성공');
      
      if (parsedToken.user && parsedToken.user.id && isValidUUID(parsedToken.user.id)) {
        console.log('[주문 API] JSON 토큰에서 사용자 ID 추출 성공:', parsedToken.user.id);
        
        // 사용자 ID가 유효한지 확인
        const { data: userData, error: userError } = await supabaseClient
          .from('users')
          .select('id')
          .eq('id', parsedToken.user.id)
          .maybeSingle();
        
        if (userError || !userData) {
          console.error('[주문 API] JSON 토큰의 사용자 ID 확인 실패');
          return null;
        }
        
        return parsedToken.user.id;
      }
    } catch (parseError) {
      console.warn('[주문 API] JSON 토큰 파싱 실패:', parseError);
      // JSON 파싱 실패 - 다음 단계로 진행
    }
    
    console.error('[주문 API] 유효하지 않은 토큰 형식');
    return null;
  } catch (error) {
    console.error('[주문 API] 토큰 처리 중 오류 발생:', error);
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
    console.log('[주문 API] 주문 정보 요청 시작');
    
    // 사용자 ID 가져오기
    const userId = await getUserId(request);
    
    if (!userId) {
      console.error('[주문 API] 사용자 인증 실패');
      return NextResponse.json({ error: '인증되지 않은 사용자' }, { status: 401 });
    }
    
    console.log('[주문 API] 인증된 사용자:', userId);
    
    // 주문 테이블 존재 여부 확인 (디버깅용)
    const { data: tableCheck, error: tableError } = await supabaseClient
      .from('orders')
      .select('id')
      .limit(1);
      
    if (tableError) {
      console.error('[주문 API] 주문 테이블 접근 오류:', tableError);
      return NextResponse.json({ 
        error: '주문 테이블에 접근할 수 없습니다.',
        details: tableError.message 
      }, { status: 500 });
    }
    
    console.log('[주문 API] 주문 테이블 접근 성공, 결과 확인:', !!tableCheck);
    
    // 주문 정보 조회
    const { data: ordersData, error: ordersError } = await supabaseClient
      .from('orders')
      .select(`
        id, 
        order_number, 
        status, 
        total_amount, 
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.error('[주문 API] 주문 정보 조회 오류:', ordersError);
      return NextResponse.json({ 
        error: '주문 정보를 조회하는 중 오류가 발생했습니다.', 
        details: ordersError.message 
      }, { status: 500 });
    }
    
    console.log('[주문 API] 주문 정보 조회 성공, 개수:', ordersData?.length || 0);
    
    // 주문이 없는 경우 빈 배열 반환
    if (!ordersData || ordersData.length === 0) {
      console.log('[주문 API] 주문 내역이 없습니다.');
      return NextResponse.json([]);
    }
    
    // 각 주문에 대한 상품 정보 조회
    const orderHistory = await Promise.all(ordersData.map(async (order) => {
      console.log(`[주문 API] 주문 ${order.id}의 상품 정보 조회`);
      
      const { data: orderItems, error: itemsError } = await supabaseClient
        .from('order_items')
        .select(`
          id,
          product_id,
          quantity,
          price,
          options
        `)
        .eq('order_id', order.id);
      
      if (itemsError) {
        console.error(`[주문 API] 주문 ${order.id}의 상품 정보 조회 오류:`, itemsError);
        return {
          ...order,
          items: []
        };
      }
      
      console.log(`[주문 API] 주문 ${order.id}의 상품 개수:`, orderItems?.length || 0);
      
      // 상품 이름 가져오기
      const items = await Promise.all((orderItems || []).map(async (item) => {
        try {
          const { data: product, error: productError } = await supabaseClient
            .from('products')
            .select('name')
            .eq('id', item.product_id)
            .maybeSingle();
          
          if (productError || !product) {
            console.warn(`[주문 API] 상품 ${item.product_id} 정보 조회 실패:`, productError);
            return {
              ...item,
              product_name: '상품명 없음'
            };
          }
          
          return {
            ...item,
            product_name: product.name
          };
        } catch (err) {
          console.error(`[주문 API] 상품 정보 처리 중 오류:`, err);
          return {
            ...item,
            product_name: '처리 오류'
          };
        }
      }));
      
      return {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
        items: items.map(item => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          options: item.options
        }))
      };
    }));
    
    console.log('[주문 API] 주문 내역 조회 완료');
    return NextResponse.json(orderHistory);
  } catch (error) {
    console.error('[주문 API] 주문 내역 조회 중 예외 발생:', error);
    return NextResponse.json({ 
      error: '주문 내역을 조회하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 