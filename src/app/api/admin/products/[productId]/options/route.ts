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
    const productId = (await params).productId;
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
    const productId = (await params).productId;
    const { options } = await request.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 옵션 데이터 유효성 검사
    if (!options || !Array.isArray(options)) {
      return NextResponse.json(
        { error: '유효하지 않은 옵션 데이터입니다.' },
        { status: 400 }
      );
    }

    // product_id 확인
    options.forEach(option => {
      if (!option.product_id) {
        option.product_id = productId;
      }
    });

    // 옵션 데이터 추가
    const { data, error } = await supabase
      .from('product_options')
      .insert(options)
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: '상품 옵션이 성공적으로 추가되었습니다.',
      options: data
    });
  } catch (error) {
    console.error('상품 옵션 추가 오류:', error);
    return NextResponse.json(
      { error: '상품 옵션을 추가하는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

// PUT 요청 처리 - 상품 옵션 업데이트 (전체 옵션 목록 교체)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const productId = (await params).productId;
    const { options } = await request.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 옵션 데이터 유효성 검사
    if (!options || !Array.isArray(options)) {
      return NextResponse.json(
        { error: '유효하지 않은 옵션 데이터입니다.' },
        { status: 400 }
      );
    }

    // 트랜잭션 시작 - 기존 옵션 삭제 후 새 옵션 추가
    // 1. 기존 옵션 삭제
    const { error: deleteError } = await supabase
      .from('product_options')
      .delete()
      .eq('product_id', productId);

    if (deleteError) {
      throw deleteError;
    }

    // 2. 새 옵션 추가
    const processedOptions = options.map(option => ({
      product_id: productId,
      option_name: option.option_name,
      option_value: option.option_value,
      additional_price: option.additional_price, // 추가 가격만 저장
      stock: option.stock
    }));

    const { data, error: insertError } = await supabase
      .from('product_options')
      .insert(processedOptions)
      .select();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      message: '상품 옵션이 성공적으로 업데이트되었습니다.',
      options: data
    });
  } catch (error) {
    console.error('상품 옵션 업데이트 오류:', error);
    return NextResponse.json(
      { error: '상품 옵션을 업데이트하는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 