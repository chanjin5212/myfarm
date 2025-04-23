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

// 리뷰 삭제 API
export async function DELETE(
  request: NextRequest,
  context: { params: { reviewId: string } }
) {
  try {
    const { reviewId } = context.params;
    
    // 관리자 인증
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    
    // 먼저 리뷰가 존재하는지 확인
    const { data: review, error: reviewError } = await supabase
      .from('product_reviews')
      .select('id, product_id')
      .eq('id', reviewId)
      .single();
    
    if (reviewError) {
      console.error('리뷰 조회 오류:', reviewError);
      return NextResponse.json(
        { error: '리뷰를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // 리뷰 이미지 먼저 삭제 (있는 경우)
    const { data: reviewImages, error: imagesError } = await supabase
      .from('review_images')
      .select('id, image_url')
      .eq('review_id', reviewId);
    
    if (reviewImages && reviewImages.length > 0) {
      // 이미지 저장소에서 파일 삭제
      for (const image of reviewImages) {
        if (image.image_url) {
          const imagePath = image.image_url.replace(`${supabaseUrl}/storage/v1/object/public/`, '');
          await supabase.storage.from('reviews').remove([imagePath]);
        }
      }
      
      // 이미지 레코드 삭제
      await supabase
        .from('review_images')
        .delete()
        .eq('review_id', reviewId);
    }
    
    // 리뷰 좋아요 삭제
    await supabase
      .from('review_likes')
      .delete()
      .eq('review_id', reviewId);
    
    // 리뷰 삭제
    const { error: deleteError } = await supabase
      .from('product_reviews')
      .delete()
      .eq('id', reviewId);
    
    if (deleteError) {
      console.error('리뷰 삭제 오류:', deleteError);
      return NextResponse.json(
        { error: '리뷰 삭제에 실패했습니다' },
        { status: 500 }
      );
    }
    
    // 상품 평점 재계산 (평균 평점 업데이트)
    const productId = review.product_id;
    
    // 해당 상품의 모든 리뷰 가져오기
    const { data: productReviews, error: productReviewsError } = await supabase
      .from('product_reviews')
      .select('rating')
      .eq('product_id', productId);
    
    if (!productReviewsError && productReviews) {
      // 평균 평점 계산
      let averageRating = 0;
      if (productReviews.length > 0) {
        const totalRating = productReviews.reduce((sum, review) => sum + review.rating, 0);
        averageRating = totalRating / productReviews.length;
      }
      
      // 상품 테이블 업데이트
      await supabase
        .from('products')
        .update({ 
          average_rating: averageRating,
          review_count: productReviews.length
        })
        .eq('id', productId);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('리뷰 삭제 에러:', error);
    return NextResponse.json(
      { error: '리뷰 삭제 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
} 