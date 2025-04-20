import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// GET 요청 처리 - 상품 옵션 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const resolvedParams = await params;
    const productId = resolvedParams.productId;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 상품 옵션 조회
    const { data, error } = await supabase
      .from('product_options')
      .select('*')
      .eq('product_id', productId)
      .order('id');

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('상품 옵션 조회 오류:', error);
    return NextResponse.json(
      { error: '상품 옵션을 조회하는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

// POST 요청 처리 - 상품 옵션 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { options } = await request.json();
    const resolvedParams = await params;
    const productId = resolvedParams.productId;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!options || !Array.isArray(options)) {
      return NextResponse.json({ error: '유효하지 않은 옵션 데이터입니다.' }, { status: 400 });
    }

    // 새 옵션 추가
    const { data: optionsData, error: optionsError } = await supabase
      .from('product_options')
      .insert(
        options.map((option: any) => ({
          product_id: productId,
          option_name: option.option_name,
          option_value: option.option_value,
          additional_price: option.additional_price,
          stock: option.stock,
          is_default: option.is_default || false
        }))
      )
      .select();
      
    if (optionsError) {
      console.error('옵션 추가 오류:', optionsError);
      return NextResponse.json({ error: '옵션 추가에 실패했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(optionsData);
  } catch (error) {
    console.error('옵션 처리 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PUT 요청 처리 - 상품 옵션 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { options } = await request.json();
    const resolvedParams = await params;
    const productId = resolvedParams.productId;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!options || !Array.isArray(options)) {
      return NextResponse.json({ error: '유효하지 않은 옵션 데이터입니다.' }, { status: 400 });
    }

    // 기존 옵션 조회
    const { data: existingOptions, error: fetchError } = await supabase
      .from('product_options')
      .select('id')
      .eq('product_id', productId);

    if (fetchError) {
      console.error('기존 옵션 조회 오류:', fetchError);
      return NextResponse.json({ error: '기존 옵션 조회에 실패했습니다.' }, { status: 500 });
    }

    // 업데이트할 옵션과 새로 추가할 옵션 분리
    const existingIds = existingOptions?.map(opt => opt.id) || [];
    const updateOptions = options.filter(opt => opt.id && existingIds.includes(opt.id));
    const newOptions = options.filter(opt => !opt.id || !existingIds.includes(opt.id));

    // 기존 옵션 업데이트
    if (updateOptions.length > 0) {
      const { error: updateError } = await supabase
        .from('product_options')
        .upsert(
          updateOptions.map(option => ({
            id: option.id,
            product_id: productId,
            option_name: option.option_name,
            option_value: option.option_value,
            additional_price: option.additional_price,
            stock: option.stock,
            is_default: option.is_default || false
          }))
        );

      if (updateError) {
        console.error('옵션 업데이트 오류:', updateError);
        return NextResponse.json({ error: '옵션 업데이트에 실패했습니다.' }, { status: 500 });
      }
    }

    // 새 옵션 추가
    if (newOptions.length > 0) {
      const { data: insertedOptions, error: insertError } = await supabase
        .from('product_options')
        .insert(
          newOptions.map(option => ({
            product_id: productId,
            option_name: option.option_name,
            option_value: option.option_value,
            additional_price: option.additional_price,
            stock: option.stock,
            is_default: option.is_default || false
          }))
        )
        .select();

      if (insertError) {
        console.error('새 옵션 추가 오류:', insertError);
        return NextResponse.json({ error: '새 옵션 추가에 실패했습니다.' }, { status: 500 });
      }
    }

    // 업데이트된 전체 옵션 조회
    const { data: updatedOptions, error: finalFetchError } = await supabase
      .from('product_options')
      .select('*')
      .eq('product_id', productId)
      .order('id');

    if (finalFetchError) {
      console.error('업데이트된 옵션 조회 오류:', finalFetchError);
      return NextResponse.json({ error: '업데이트된 옵션 조회에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(updatedOptions);
  } catch (error) {
    console.error('옵션 처리 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE 요청 처리 - 상품 옵션 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { optionId } = await request.json();
    const resolvedParams = await params;
    const productId = resolvedParams.productId;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!optionId) {
      return NextResponse.json({ error: '옵션 ID가 필요합니다.' }, { status: 400 });
    }

    // 1. order_items 테이블에서 참조 확인
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_option_id', optionId)
      .limit(1);

    if (orderItemsError) {
      console.error('주문 항목 조회 오류:', orderItemsError);
      return NextResponse.json({ error: '주문 항목 조회에 실패했습니다.' }, { status: 500 });
    }

    if (orderItems && orderItems.length > 0) {
      return NextResponse.json(
        { 
          error: '이 옵션은 주문 내역에서 사용되고 있어 삭제할 수 없습니다.',
          hasReferences: true,
          referenceType: 'order'
        },
        { status: 400 }
      );
    }

    // 2. cart_items 테이블에서 참조 확인
    const { data: cartItems, error: cartItemsError } = await supabase
      .from('cart_items')
      .select('id')
      .eq('product_option_id', optionId)
      .limit(1);

    if (cartItemsError) {
      console.error('장바구니 항목 조회 오류:', cartItemsError);
      return NextResponse.json({ error: '장바구니 항목 조회에 실패했습니다.' }, { status: 500 });
    }

    if (cartItems && cartItems.length > 0) {
      return NextResponse.json(
        { 
          error: '이 옵션은 장바구니에서 사용되고 있어 삭제할 수 없습니다.',
          hasReferences: true,
          referenceType: 'cart'
        },
        { status: 400 }
      );
    }

    // 참조가 없는 경우에만 삭제 수행
    const { error: deleteError } = await supabase
      .from('product_options')
      .delete()
      .eq('id', optionId)
      .eq('product_id', productId);

    if (deleteError) {
      console.error('옵션 삭제 오류:', deleteError);
      return NextResponse.json({ error: '옵션 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('옵션 삭제 처리 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 