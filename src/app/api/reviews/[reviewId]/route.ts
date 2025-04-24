import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 리뷰 정보 가져오기
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;
    
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
    if (review.user_id !== user.id) {
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
  { params }: { params: { reviewId: string } }
) {
  try {
    const reviewId = params.reviewId;
    
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
    if (review.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }
    
    // 리뷰 삭제 (실제로는 상태를 변경)
    const { error: deleteError } = await supabase
      .from('product_reviews')
      .update({ status: 'deleted' })
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