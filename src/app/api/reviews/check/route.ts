import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET(request: NextRequest) {
  try {
    // 쿼리 파라미터에서 product_id 가져오기
    const url = new URL(request.url);
    const productId = url.searchParams.get('product_id');

    // product_id가 필요함
    if (!productId) {
      return NextResponse.json({ 
        error: 'Missing required parameter: product_id is required' 
      }, { status: 400 });
    }

    // 인증 헤더에서 토큰 가져오기
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
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

    // 사용자가 해당 상품에 대한 리뷰를 작성했는지 확인
    const { data: reviews, error: reviewError } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('user_id', userId)
      .limit(1);

    if (reviewError) {
      console.error('리뷰 조회 오류:', reviewError);
      return NextResponse.json({ error: '리뷰 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // 리뷰가 존재하는지 여부 반환
    const hasReview = reviews && reviews.length > 0;

    return NextResponse.json({ hasReview });
  } catch (error) {
    console.error('리뷰 확인 API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 