import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    
    // 상품 정보 조회
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (productError) {
      if (productError.code === 'PGRST116') {
        return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
      }
      throw productError;
    }
    
    // 상품 이미지 조회
    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', id)
      .order('sort_order');
    
    if (imagesError) {
      throw imagesError;
    }
    
    // 상품 옵션 조회
    const { data: options, error: optionsError } = await supabase
      .from('product_options')
      .select('*')
      .eq('product_id', id)
      .order('option_name', { ascending: true });
    
    if (optionsError) {
      throw optionsError;
    }
    
    // 실제 상품 데이터만 반환
    const responseData = {
      product,
      images: images || [],
      options: options || []
    };
    
    // 상품이 없는 경우 404 반환
    if (!product) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('상품 상세 조회 오류:', error);
    return NextResponse.json(
      { error: '상품 정보를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 