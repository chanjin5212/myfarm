import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 상품 이미지 조회 API
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const resolvedParams = await params;
    const productId = resolvedParams.productId;

    // 상품 이미지 조회
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order');

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching product images:', error);
    return NextResponse.json(
      { error: '상품 이미지를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 상품 이미지 저장 API
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const resolvedParams = await params;
    const productId = resolvedParams.productId;
    const { images } = await request.json();

    if (!images || !Array.isArray(images)) {
      return NextResponse.json(
        { error: '유효하지 않은 이미지 데이터입니다.' },
        { status: 400 }
      );
    }

    // 기존 이미지 삭제
    const { error: deleteError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', productId);

    if (deleteError) {
      throw deleteError;
    }

    // 새 이미지가 있는 경우 삽입
    if (images.length > 0) {
      // 이미지 데이터 준비
      const imageData = images.map((image, index) => ({
        product_id: productId,
        image_url: image.image_url,
        is_thumbnail: image.is_thumbnail || false,
        sort_order: image.sort_order || index
      }));

      // 이미지 데이터 삽입
      const { error: insertError } = await supabase
        .from('product_images')
        .insert(imageData);

      if (insertError) {
        throw insertError;
      }

      // 썸네일 이미지 찾기
      const thumbnailImage = images.find(img => img.is_thumbnail);

      // 상품 테이블의 썸네일 URL 업데이트
      if (thumbnailImage) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ thumbnail_url: thumbnailImage.image_url })
          .eq('id', productId);

        if (updateError) {
          throw updateError;
        }
      }
    }

    return NextResponse.json({ message: '상품 이미지가 저장되었습니다.' });
  } catch (error) {
    console.error('Error saving product images:', error);
    return NextResponse.json(
      { error: '상품 이미지 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const resolvedParams = await params;
    const productId = resolvedParams.productId;
    const { images } = await request.json();

    if (!images || !Array.isArray(images)) {
      return NextResponse.json(
        { error: '유효하지 않은 이미지 데이터입니다.' },
        { status: 400 }
      );
    }

    // 기존 이미지 삭제
    const { error: deleteError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', productId);

    if (deleteError) {
      throw deleteError;
    }

    // 새 이미지가 있는 경우 삽입
    if (images.length > 0) {
      // 이미지 데이터 준비
      const imageData = images.map((image, index) => ({
        product_id: productId,
        image_url: image.image_url,
        is_thumbnail: image.is_thumbnail || false,
        sort_order: image.sort_order || index
      }));

      // 이미지 데이터 삽입
      const { error: insertError } = await supabase
        .from('product_images')
        .insert(imageData);

      if (insertError) {
        throw insertError;
      }

      // 썸네일 이미지 찾기
      const thumbnailImage = images.find(img => img.is_thumbnail);

      // 상품 테이블의 썸네일 URL 업데이트
      if (thumbnailImage) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ thumbnail_url: thumbnailImage.image_url })
          .eq('id', productId);

        if (updateError) {
          throw updateError;
        }
      }
    }

    return NextResponse.json({ message: '상품 이미지가 업데이트되었습니다.' });
  } catch (error) {
    console.error('Error updating product images:', error);
    return NextResponse.json(
      { error: '상품 이미지 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  }
} 