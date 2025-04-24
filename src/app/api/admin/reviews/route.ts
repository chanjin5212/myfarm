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

export async function GET(request: NextRequest) {
  try {
    // 관리자 인증
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    
    console.log('[API 호출] 인증 성공, 사용자 ID:', authResult.userId);

    // 쿼리 파라미터 추출
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    
    // 페이지네이션 계산
    const offset = (page - 1) * limit;
    
    // 기본 쿼리 작성 - 상품 목록 조회
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        thumbnail_url,
        created_at
      `, { count: 'exact' });
    
    // 검색어 적용
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    // 기본 정렬은 생성일
    if (sort === 'rating' || sort === 'review_count') {
      query = query.order('created_at', { ascending: order === 'asc' });
    } else {
      query = query.order(sort, { ascending: order === 'asc' });
    }
    
    // 페이지네이션 적용
    query = query.range(offset, offset + limit - 1);
    
    // 쿼리 실행
    const { data: products, count, error } = await query;
    
    if (error) {
      console.error('상품 목록 조회 오류:', error);
      return NextResponse.json(
        { error: '상품 목록을 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }
    
    // 데이터 가공 - 각 상품에 대한 평균 평점과 리뷰 수 계산
    const productsWithReviewStats = await Promise.all(products?.map(async (product) => {
      // 리뷰 통계 계산
      const { data: reviewStats, error: statsError } = await supabase
        .from('product_reviews')
        .select('rating')
        .eq('product_id', product.id);
      
      if (statsError) {
        console.error(`상품 ${product.id}의 리뷰 통계 조회 오류:`, statsError);
        return {
          ...product,
          average_rating: 0,
          review_count: 0
        };
      }
      
      const reviewCount = reviewStats?.length || 0;
      const totalRating = reviewStats?.reduce((sum, review) => sum + review.rating, 0) || 0;
      const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
      
      return {
        ...product,
        average_rating: parseFloat(averageRating.toFixed(1)),
        review_count: reviewCount
      };
    }) || []);
    
    // 평점 또는 리뷰 수로 정렬이 필요한 경우 JavaScript에서 정렬
    const sortedProducts = [...productsWithReviewStats];
    
    if (sort === 'rating') {
      sortedProducts.sort((a, b) => {
        return order === 'asc' 
          ? a.average_rating - b.average_rating
          : b.average_rating - a.average_rating;
      });
    } else if (sort === 'review_count') {
      sortedProducts.sort((a, b) => {
        return order === 'asc'
          ? a.review_count - b.review_count
          : b.review_count - a.review_count;
      });
    }
    
    // 총 페이지 수 계산
    const totalPages = Math.ceil((count || 0) / limit);
    
    return NextResponse.json({
      products: sortedProducts,
      total: count,
      page,
      limit,
      totalPages
    });
    
  } catch (error) {
    console.error('[API 오류] 관리자 리뷰 통계 조회 에러:', error);
    return NextResponse.json(
      { error: '리뷰 통계를 가져오는데 실패했습니다' },
      { status: 500 }
    );
  }
} 