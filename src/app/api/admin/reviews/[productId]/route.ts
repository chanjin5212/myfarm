import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 관리자 토큰 검증 함수
async function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isValid: false, error: '인증 토큰이 필요합니다' };
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      login_id: string;
      role: string;
    };
    
    
    if (decoded.role !== 'admin') {
      return { isValid: false, error: '관리자 권한이 없습니다' };
    }
    
    return { isValid: true, userId: decoded.id };
  } catch (error) {
    return { isValid: false, error: '유효하지 않은 토큰입니다' };
  }
}

// 상품별 리뷰 목록 조회 API
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await context.params;
    
    // 관리자 인증
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    // 쿼리 파라미터 추출
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    
    // 페이지네이션 계산
    const offset = (page - 1) * limit;
    
    // 상품 정보 조회
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price, thumbnail_url')
      .eq('id', productId)
      .single();
    
    if (productError) {
      console.error('상품 정보 조회 오류:', productError);
      return NextResponse.json(
        { error: '상품 정보를 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }
    
    // 기본 쿼리 작성 - 특정 상품의 리뷰 목록 조회
    let query = supabase
      .from('product_reviews')
      .select(`
        *,
        user:user_id (id, name, nickname, email, avatar_url)
      `, { count: 'exact' })
      .eq('product_id', productId);
    
    // 정렬 적용
    if (sort === 'rating') {
      // 평점순 정렬
      query = query.order('rating', { ascending: order === 'asc' });
    } else if (sort === 'likes') {
      // 좋아요순 정렬
      query = query.order('likes_count', { ascending: order === 'asc' });
    } else {
      // 최신순 정렬 (기본)
      query = query.order('created_at', { ascending: order === 'asc' });
    }
    
    // 페이지네이션 적용
    query = query.range(offset, offset + limit - 1);
    
    // 쿼리 실행
    const { data: reviews, count, error } = await query;
    
    if (error) {
      console.error('상품 리뷰 목록 조회 오류:', error);
      return NextResponse.json(
        { error: '리뷰 목록을 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }
    
    // 리뷰 데이터 가공
    const processedReviews = reviews?.map(review => {
      // 사용자 정보 처리
      let userName = '알 수 없는 사용자';
      if (review.user) {
        userName = review.user.nickname || review.user.name || review.user.email.split('@')[0];
      }
      
      return {
        ...review,
        user_name: userName,
        user_avatar: review.user?.avatar_url || null
      };
    }) || [];
    
    // 총 페이지 수 계산
    const totalPages = Math.ceil((count || 0) / limit);
    
    // 평균 평점 계산
    const { data: ratingStats, error: ratingError } = await supabase
      .from('product_reviews')
      .select('rating')
      .eq('product_id', productId);
    
    let averageRating = 0;
    if (ratingStats && ratingStats.length > 0) {
      const totalRating = ratingStats.reduce((sum, review) => sum + review.rating, 0);
      averageRating = parseFloat((totalRating / ratingStats.length).toFixed(1));
    }
    
    // 별점별 리뷰 수 계산
    const starCounts = [0, 0, 0, 0, 0]; // 1점, 2점, 3점, 4점, 5점 리뷰 수
    
    if (ratingStats) {
      ratingStats.forEach(review => {
        const ratingIndex = Math.floor(review.rating) - 1;
        if (ratingIndex >= 0 && ratingIndex < 5) {
          starCounts[ratingIndex]++;
        }
      });
    }
    
    return NextResponse.json({
      product,
      reviews: processedReviews,
      total_reviews: count || 0,
      average_rating: averageRating,
      star_counts: starCounts,
      page,
      limit,
      totalPages
    });
    
  } catch (error) {
    console.error('관리자 리뷰 목록 조회 에러:', error);
    return NextResponse.json(
      { error: '리뷰 목록을 가져오는데 실패했습니다' },
      { status: 500 }
    );
  }
} 