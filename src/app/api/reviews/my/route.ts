import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 사용자의 모든 리뷰 가져오기 함수
export async function GET(request: NextRequest) {
  try {
    // 토큰 확인
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }
    
    // 토큰으로 사용자 정보 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: '인증에 실패했습니다' }, { status: 401 });
    }
    
    // 사용자의 리뷰 조회
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
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('리뷰 조회 오류:', error);
      return NextResponse.json({ error: '리뷰를 조회하는 중 오류가 발생했습니다' }, { status: 500 });
    }
    
    // 제품 정보를 포함한 리뷰 목록 반환
    const reviewsWithProductInfo = reviews.map(review => ({
      ...review,
      product: review.products
    }));
    
    return NextResponse.json(reviewsWithProductInfo);
  } catch (error) {
    console.error('리뷰 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '리뷰를 조회하는 중 오류가 발생했습니다' }, { status: 500 });
  }
} 