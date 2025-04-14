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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const data = await request.json();
    
    // 관리자 권한 확인 로직 (토큰 검증 등)
    const token = request.cookies.get('sb-access-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    
    // 토큰으로 사용자 정보 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: '인증에 실패했습니다.' }, { status: 401 });
    }
    
    // 관리자 권한 확인
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (profileError || !userData) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    if (userData.role !== 'admin') {
      return NextResponse.json({ error: '관리자만 상품을 수정할 수 있습니다.' }, { status: 403 });
    }
    
    // 상품 존재 여부 확인
    const { data: existingProduct, error: productError } = await supabase
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
    
    // 허용된 필드만 추출
    const {
      name,
      description,
      price,
      sale_price,
      category,
      stock,
      is_active,
      manufacturer,
      country_of_origin,
      shipping_fee,
      total_sales,
      rating,
      review_count
    } = data;
    
    const updateData: any = {};
    
    // 필드가 존재하는 경우에만 업데이트 데이터에 추가
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (sale_price !== undefined) updateData.sale_price = sale_price;
    if (category !== undefined) updateData.category = category;
    if (stock !== undefined) updateData.stock = stock;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (manufacturer !== undefined) updateData.manufacturer = manufacturer;
    if (country_of_origin !== undefined) updateData.country_of_origin = country_of_origin;
    if (shipping_fee !== undefined) updateData.shipping_fee = shipping_fee;
    if (total_sales !== undefined) updateData.total_sales = total_sales;
    if (rating !== undefined) updateData.rating = rating;
    if (review_count !== undefined) updateData.review_count = review_count;
    
    // updated_at 자동 업데이트
    updateData.updated_at = new Date().toISOString();
    
    // 상품 정보 업데이트
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (updateError) {
      throw updateError;
    }
    
    return NextResponse.json({
      message: '상품이 성공적으로 업데이트되었습니다.',
      product: updatedProduct
    });
    
  } catch (error) {
    console.error('상품 업데이트 오류:', error);
    return NextResponse.json(
      { error: '상품 정보를 업데이트하는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 