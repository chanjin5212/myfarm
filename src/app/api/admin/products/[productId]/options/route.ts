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

// PUT 요청 처리 - 상품 옵션 업데이트 (전체 옵션 목록 교체)
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
    
    // 기존 옵션 삭제
    const { error: deleteError } = await supabase
      .from('product_options')
      .delete()
      .eq('product_id', productId);
      
    if (deleteError) {
      console.error('기존 옵션 삭제 오류:', deleteError);
      return NextResponse.json({ error: '기존 옵션 삭제에 실패했습니다.' }, { status: 500 });
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