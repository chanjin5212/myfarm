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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // params.id를 비동기적으로 처리
    const id = (await params).id;
    console.log('원본 상품 ID:', id, typeof id);
    
    // ID 정리 및 변환
    const productId = id.toString().trim();
    console.log('변환된 상품 ID:', productId, typeof productId);
    
    if (!productId || productId === 'undefined' || productId === 'NaN') {
      console.log('유효하지 않은 상품 ID:', productId);
      return NextResponse.json(
        { error: '유효하지 않은 상품 ID입니다.' }, 
        { status: 400, headers }
      );
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '5');
    const sort = url.searchParams.get('sort') || 'recent';
    const offset = (page - 1) * limit;

    console.log('리뷰 파라미터:', { productId, page, limit, sort, offset });

    // 정렬 방식에 따른 쿼리 설정
    let query = supabase
      .from('product_reviews')
      .select(`
        *,
        users:user_id (nickname, name, avatar_url)
      `)
      .eq('product_id', productId)
      .eq('status', 'active');

    // 정렬 적용
    switch (sort) {
      case 'highest':
        query = query.order('rating', { ascending: false });
        break;
      case 'lowest':
        query = query.order('rating', { ascending: true });
        break;
      case 'helpful':
        query = query.order('helpful_count', { ascending: false });
        break;
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // 페이지네이션 적용
    query = query.range(offset, offset + limit - 1);

    // 리뷰 데이터 조회
    const { data: reviews, error } = await query;

    if (error) {
      console.error('리뷰 조회 오류:', error);
      return NextResponse.json(
        { error: '리뷰 조회 중 오류가 발생했습니다.', details: error.message },
        { status: 500, headers }
      );
    }

    console.log(`상품 ${productId} 리뷰 조회 결과:`, reviews?.length || 0, '개 리뷰 발견');

    // 리뷰 총 개수 조회
    const { count: total, error: countError } = await supabase
      .from('product_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('status', 'active');

    if (countError) {
      console.error('리뷰 개수 조회 오류:', countError);
      return NextResponse.json(
        { error: '리뷰 개수 조회 중 오류가 발생했습니다.', details: countError.message },
        { status: 500, headers }
      );
    }

    // 안전하게 total 값 처리
    const totalCount = total || 0;
    console.log('총 리뷰 개수:', totalCount);

    // 평균 평점 계산
    let averageRating = 0;
    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce(
        (acc, review) => acc + (review.rating || 0),
        0
      );
      averageRating = sum / reviews.length;
    }

    console.log('평균 평점:', averageRating);

    // 응답 데이터 포맷팅
    const formattedReviews = reviews ? reviews.map(review => {
      return {
        id: review.id,
        product_id: review.product_id,
        user_id: review.user_id,
        order_item_id: review.order_item_id,
        rating: review.rating,
        title: review.title || '',
        content: review.content,
        created_at: review.created_at,
        helpful_count: review.helpful_count || 0,
        status: review.status,
        username: review.users?.nickname || review.users?.name || '사용자',
        images: review.images || []
      };
    }) : [];

    const responseData = {
      reviews: formattedReviews,
      total: totalCount,
      averageRating,
      page,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: offset + limit < totalCount
    };

    console.log('응답 데이터 구조:', Object.keys(responseData));
    return NextResponse.json(responseData, { headers });
  } catch (error: any) {
    console.error('상품 리뷰 조회 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', details: error.message },
      { status: 500, headers }
    );
  }
}

// OPTIONS 요청 처리를 위한 핸들러 추가
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
} 