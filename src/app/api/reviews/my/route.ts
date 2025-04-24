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
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[리뷰 API] 인증 헤더가 없거나 잘못된 형식입니다:', authHeader);
    return null;
  }
  
  try {
    // Bearer 접두사 제거
    const token = authHeader.split(' ')[1].trim();
    console.log('[리뷰 API] 토큰:', token.substring(0, 20) + '...');
    
    // 1. UUID 형식의 사용자 ID인지 확인
    if (isValidUUID(token)) {
      console.log('[리뷰 API] UUID 형식의 사용자 ID로 인증 시도');
      
      // 사용자 ID가 users 테이블에 존재하는지 확인
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', token)
        .maybeSingle();
        
      if (userError) {
        console.error('[리뷰 API] 사용자 확인 오류:', userError.message);
        return null;
      }
      
      if (!userData) {
        console.log('[리뷰 API] 해당 ID의 사용자를 찾을 수 없습니다.');
        return null;
      }
      
      console.log('[리뷰 API] 사용자 ID 인증 성공:', token);
      return token; // 사용자 ID 반환
    }
    
    // 2. JSON 형식의 토큰인지 확인 (로컬스토리지에 직접 저장된 형식)
    try {
      const parsedToken = JSON.parse(token);
      console.log('[리뷰 API] JSON 토큰 파싱 성공');
      
      if (parsedToken.user && parsedToken.user.id && isValidUUID(parsedToken.user.id)) {
        console.log('[리뷰 API] JSON 토큰에서 사용자 ID 추출 성공:', parsedToken.user.id);
        
        // 사용자 ID가 유효한지 확인
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', parsedToken.user.id)
          .maybeSingle();
        
        if (userError || !userData) {
          console.error('[리뷰 API] JSON 토큰의 사용자 ID 확인 실패');
          return null;
        }
        
        return parsedToken.user.id;
      }
    } catch (parseError) {
      console.warn('[리뷰 API] JSON 토큰 파싱 실패:', parseError);
      // JSON 파싱 실패 - 다음 단계로 진행
    }
    
    console.error('[리뷰 API] 유효하지 않은 토큰 형식');
    return null;
  } catch (error) {
    console.error('[리뷰 API] 토큰 처리 중 오류 발생:', error);
    return null;
  }
}

// UUID 형식인지 확인하는 함수
function isValidUUID(id: string | null | undefined): boolean {
  if (id === null || id === undefined) return false;
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return pattern.test(id);
}

// 사용자의 모든 리뷰 가져오기 함수
export async function GET(request: NextRequest) {
  try {
    console.log('[리뷰 API] 리뷰 정보 요청 시작');
    
    // 사용자 ID 가져오기
    const userId = await getUserId(request);
    
    if (!userId) {
      console.error('[리뷰 API] 사용자 인증 실패');
      return NextResponse.json({ error: '인증되지 않은 사용자' }, { status: 401 });
    }
    
    console.log('[리뷰 API] 인증된 사용자:', userId);
    
    // 리뷰 테이블 존재 여부 확인 (디버깅용)
    const { data: tableCheck, error: tableError } = await supabase
      .from('product_reviews')
      .select('id')
      .limit(1);
      
    if (tableError) {
      console.error('[리뷰 API] 리뷰 테이블 접근 오류:', tableError);
      return NextResponse.json({ 
        error: '리뷰 테이블에 접근할 수 없습니다.',
        details: tableError.message 
      }, { status: 500 });
    }
    
    console.log('[리뷰 API] 리뷰 테이블 접근 성공, 결과 확인:', !!tableCheck);
    
    // 리뷰 정보 조회
    const { data: reviews, error } = await supabase
      .from('product_reviews')
      .select(`
        id,
        product_id,
        rating,
        content,
        image_url,
        created_at,
        updated_at,
        products:product_id (
          name,
          thumbnail_url
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[리뷰 API] 리뷰 조회 오류:', error);
      return NextResponse.json({ 
        error: '리뷰를 조회하는 중 오류가 발생했습니다.', 
        details: error.message 
      }, { status: 500 });
    }
    
    console.log('[리뷰 API] 리뷰 조회 성공, 개수:', reviews?.length || 0);
    
    // 제품 정보를 포함한 리뷰 목록 반환
    const reviewsWithProductInfo = reviews?.map(review => ({
      ...review,
      product: review.products
    })) || [];
    
    return NextResponse.json(reviewsWithProductInfo);
  } catch (error) {
    console.error('[리뷰 API] 리뷰 조회 중 예외 발생:', error);
    return NextResponse.json({ 
      error: '리뷰를 조회하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 