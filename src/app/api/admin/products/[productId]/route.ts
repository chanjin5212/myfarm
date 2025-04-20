import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const resolvedParams = await params;
    const productId = resolvedParams.productId;

    // 상품 정보 조회
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: '상품 정보를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const resolvedParams = await params;
    const productId = resolvedParams.productId;

    // 상품 삭제 (CASCADE 설정으로 인해 관련된 모든 데이터도 함께 삭제됨)
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: '상품이 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: '상품 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const resolvedParams = await params;
    const productId = resolvedParams.productId;
    const productData = await request.json();

    // 빈 문자열 필드를 null로 변환
    const processedData: any = {};
    
    // 입력된 필드만 업데이트 객체에 추가
    if (productData.name !== undefined) processedData.name = productData.name;
    if (productData.description !== undefined) processedData.description = productData.description;
    if (productData.price !== undefined) processedData.price = Number(productData.price);
    if (productData.status !== undefined) processedData.status = productData.status;
    if (productData.thumbnail_url !== undefined) processedData.thumbnail_url = productData.thumbnail_url;
    if (productData.origin !== undefined) processedData.origin = productData.origin;
    if (productData.harvest_date !== undefined) processedData.harvest_date = productData.harvest_date;
    if (productData.storage_method !== undefined) processedData.storage_method = productData.storage_method;
    if (productData.is_organic !== undefined) processedData.is_organic = productData.is_organic;

    console.log('Processed update data:', processedData);

    // 상품 업데이트
    const { data, error } = await supabase
      .from('products')
      .update(processedData)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: '상품 정보 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  }
} 