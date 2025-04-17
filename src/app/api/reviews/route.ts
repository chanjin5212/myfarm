import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// 환경 변수 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 사용자 ID 가져오기 함수
async function getUserId(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return null;
    }

    // URL 디코딩하여 사용자 ID 추출
    try {
      const userId = decodeURIComponent(token);
      
      // 유효한 사용자 ID인지 확인
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
        
      if (error || !user) {
        console.error('사용자 확인 오류:', error);
        return null;
      }
      
      return userId;
    } catch (e) {
      console.error('토큰 디코딩 오류:', e);
      return null;
    }
  } catch (error) {
    console.error('사용자 ID 가져오기 오류:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 가져오기
    const body = await request.json();
    const { product_id, order_id, rating, content } = body;

    // 필수 필드 확인
    if (!product_id || !rating || !content) {
      return NextResponse.json(
        { error: '상품ID, 별점, 내용은 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    // 별점 범위 검증
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: '별점은 1점에서 5점 사이여야 합니다.' },
        { status: 400 }
      );
    }

    // 유저 인증 확인
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 해당 상품이 존재하는지 확인
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .single();

    if (productError || !productData) {
      console.error('상품 조회 오류:', productError);
      return NextResponse.json(
        { error: '해당 상품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 리뷰 중복 확인 (동일 사용자, 동일 상품, 동일 주문에 대한 리뷰 확인)
    if (order_id) {
      const { data: existingReview, error: reviewCheckError } = await supabase
        .from('product_reviews')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', product_id)
        .eq('order_id', order_id);

      if (reviewCheckError) {
        console.error('리뷰 중복 확인 오류:', reviewCheckError);
      } else if (existingReview && existingReview.length > 0) {
        return NextResponse.json(
          { error: '이미 해당 상품에 대한 리뷰를 작성하셨습니다.' },
          { status: 409 }
        );
      }
    }

    // 리뷰 저장
    const { data: review, error: insertError } = await supabase
      .from('product_reviews')
      .insert([
        {
          product_id,
          user_id: userId,
          order_id: order_id || null,
          rating,
          content,
          status: 'active'
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('리뷰 저장 오류:', insertError);
      return NextResponse.json(
        { error: '리뷰 저장 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 성공 응답
    return NextResponse.json({
      success: true,
      message: '리뷰가 성공적으로 등록되었습니다.',
      review
    });

  } catch (error) {
    console.error('리뷰 등록 처리 오류:', error);
    return NextResponse.json(
      { error: '리뷰 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('product_id');
    const userId = url.searchParams.get('user_id');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const page = parseInt(url.searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    if (!productId) {
      return NextResponse.json(
        { error: '상품 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 리뷰 쿼리 구성
    let query = supabase
      .from('product_reviews')
      .select(`
        *,
        users:user_id (nickname, name, avatar_url)
      `)
      .eq('product_id', productId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 특정 사용자의 리뷰만 필터링할 경우
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: reviews, error, count } = await query;

    if (error) {
      console.error('리뷰 조회 오류:', error);
      return NextResponse.json(
        { error: '리뷰 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 리뷰 평균 평점 계산
    const { data: ratingData, error: ratingError } = await supabase
      .from('product_reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('status', 'active');

    let averageRating = 0;
    if (!ratingError && ratingData && ratingData.length > 0) {
      const sum = ratingData.reduce((acc: number, review: { rating: number }) => acc + review.rating, 0);
      averageRating = sum / ratingData.length;
    }

    // 리뷰 총 개수 조회
    const { count: totalCount, error: countError } = await supabase
      .from('product_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('status', 'active');

    if (countError) {
      console.error('리뷰 개수 조회 오류:', countError);
    }

    return NextResponse.json({
      reviews,
      totalCount: totalCount || 0,
      averageRating,
      currentPage: page,
      totalPages: Math.ceil((totalCount || 0) / limit)
    });

  } catch (error) {
    console.error('리뷰 조회 처리 오류:', error);
    return NextResponse.json(
      { error: '리뷰 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 