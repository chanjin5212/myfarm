import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 기본 상품 옵션 업데이트 API
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const resolvedParams = await params;
    const productId = resolvedParams.productId;
    const data = await request.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    if (!data || !data.option_name || !data.option_value) {
      return NextResponse.json(
        { error: '유효하지 않은 옵션 데이터입니다.' },
        { status: 400 }
      );
    }
    
    // 기존 기본 옵션 찾기
    const { data: existingOptions, error: findError } = await supabase
      .from('product_options')
      .select('*')
      .eq('product_id', productId)
      .eq('option_name', data.option_name)
      .eq('option_value', data.option_value);
      
    if (findError) {
      console.error('기본 옵션 조회 오류:', findError);
      return NextResponse.json(
        { error: '기본 옵션 조회에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // 기본 옵션이 존재하면 업데이트, 없으면 생성
    if (existingOptions && existingOptions.length > 0) {
      // 기존 옵션 업데이트
      const { data: updatedOption, error: updateError } = await supabase
        .from('product_options')
        .update({
          additional_price: data.additional_price || 0,
          stock: data.stock || 0,
          is_default: true
        })
        .eq('id', existingOptions[0].id)
        .select();
        
      if (updateError) {
        console.error('기본 옵션 업데이트 오류:', updateError);
        return NextResponse.json(
          { error: '기본 옵션 업데이트에 실패했습니다.' },
          { status: 500 }
        );
      }
      
      // 다른 옵션들은 기본 옵션이 아님으로 설정
      const { error: resetError } = await supabase
        .from('product_options')
        .update({ is_default: false })
        .eq('product_id', productId)
        .neq('id', existingOptions[0].id);
        
      if (resetError) {
        console.error('다른 옵션 업데이트 오류:', resetError);
      }
      
      return NextResponse.json(updatedOption);
    } else {
      // 새 기본 옵션 생성
      const { data: newOption, error: createError } = await supabase
        .from('product_options')
        .insert({
          product_id: productId,
          option_name: data.option_name,
          option_value: data.option_value,
          additional_price: data.additional_price || 0,
          stock: data.stock || 0,
          is_default: true
        })
        .select();
        
      if (createError) {
        console.error('기본 옵션 생성 오류:', createError);
        return NextResponse.json(
          { error: '기본 옵션 생성에 실패했습니다.' },
          { status: 500 }
        );
      }
      
      // 다른 옵션들은 기본 옵션이 아님으로 설정
      const { error: resetError } = await supabase
        .from('product_options')
        .update({ is_default: false })
        .eq('product_id', productId)
        .neq('id', newOption[0].id);
        
      if (resetError) {
        console.error('다른 옵션 업데이트 오류:', resetError);
      }
      
      return NextResponse.json(newOption);
    }
  } catch (error) {
    console.error('기본 옵션 처리 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 