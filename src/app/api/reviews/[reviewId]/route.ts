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

// 리뷰 정보 가져오기
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;
    
    // 사용자 ID 가져오기
    const userId = await getUserId(request);
    
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }
    
    // 리뷰 정보 조회
    const { data: review, error } = await supabase
      .from('product_reviews')
      .select(`
        id,
        product_id,
        user_id,
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
      .eq('id', reviewId)
      .single();
    
    if (error) {
      console.error('리뷰 조회 오류:', error);
      return NextResponse.json({ error: '리뷰를 조회하는 중 오류가 발생했습니다' }, { status: 500 });
    }
    
    if (!review) {
      return NextResponse.json({ error: '리뷰를 찾을 수 없습니다' }, { status: 404 });
    }
    
    // 사용자의 리뷰가 아닌 경우 권한 없음
    if (review.user_id !== userId) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }
    
    // 제품 정보를 포함한 리뷰 정보 반환
    const reviewWithProductInfo = {
      ...review,
      product: review.products
    };
    
    return NextResponse.json(reviewWithProductInfo);
  } catch (error) {
    console.error('리뷰 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '리뷰를 조회하는 중 오류가 발생했습니다' }, { status: 500 });
  }
}

// 리뷰 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;
    
    // 사용자 ID 가져오기
    const userId = await getUserId(request);
    
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }
    
    // 리뷰 정보 조회 (권한 확인을 위해)
    const { data: review, error: reviewError } = await supabase
      .from('product_reviews')
      .select('id, user_id')
      .eq('id', reviewId)
      .single();
    
    if (reviewError) {
      console.error('리뷰 조회 오류:', reviewError);
      return NextResponse.json({ error: '리뷰를 찾을 수 없습니다' }, { status: 404 });
    }
    
    if (!review) {
      return NextResponse.json({ error: '리뷰를 찾을 수 없습니다' }, { status: 404 });
    }
    
    // 사용자의 리뷰가 아닌 경우 권한 없음
    if (review.user_id !== userId) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }
    
    // 리뷰 삭제
    const { error: deleteError } = await supabase
      .from('product_reviews')
      .delete()
      .eq('id', reviewId);
    
    if (deleteError) {
      console.error('리뷰 삭제 오류:', deleteError);
      return NextResponse.json({ error: '리뷰를 삭제하는 중 오류가 발생했습니다' }, { status: 500 });
    }
    
    return NextResponse.json({ message: '리뷰가 성공적으로 삭제되었습니다' });
  } catch (error) {
    console.error('리뷰 삭제 중 오류 발생:', error);
    return NextResponse.json({ error: '리뷰를 삭제하는 중 오류가 발생했습니다' }, { status: 500 });
  }
} 