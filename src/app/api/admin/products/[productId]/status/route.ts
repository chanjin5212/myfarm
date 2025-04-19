import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { status } = await request.json();
    const productId = (await params).productId;

    // 유효한 상태 값인지 확인
    const validStatuses = ['active', 'inactive', 'out_of_stock'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '유효하지 않은 상태 값입니다.' },
        { status: 400 }
      );
    }

    // 상품 상태 업데이트
    const { error } = await supabase
      .from('products')
      .update({ status })
      .eq('id', productId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: '상품 상태가 업데이트되었습니다.' });
  } catch (error) {
    console.error('Error updating product status:', error);
    return NextResponse.json(
      { error: '상품 상태 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  }
} 