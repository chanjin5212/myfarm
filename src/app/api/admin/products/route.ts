import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const offset = (page - 1) * limit;

    // 기본 상품 데이터 가져오기
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: products, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // 각 상품에 대한 재고 정보 가져오기
    if (products && products.length > 0) {
      const productIds = products.map(product => product.id);
      
      // 각 상품의 모든 옵션에서 총 재고 가져오기
      const { data: optionsData, error: optionsError } = await supabase
        .from('product_options')
        .select('product_id, stock')
        .in('product_id', productIds);
        
      if (optionsError) {
        throw optionsError;
      }
      
      // 각 상품별 총 재고 계산
      const productStocks: { [key: string]: number } = {};
      optionsData?.forEach(option => {
        const productId = option.product_id;
        if (!productStocks[productId]) {
          productStocks[productId] = 0;
        }
        productStocks[productId] += option.stock;
      });
      
      // 상품 데이터에 재고 정보 추가
      const productsWithStock = products.map(product => ({
        ...product,
        stock: productStocks[product.id] || 0
      }));
      
      return NextResponse.json({
        products: productsWithStock,
        total: count || 0,
      });
    }

    return NextResponse.json({
      products: products || [],
      total: count || 0,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: '상품 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const productData = await request.json();

    // 필수 필드 검증
    if (!productData.name || !productData.price) {
      return NextResponse.json(
        { error: '상품명과 가격은 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    // 필수 필드 검증 및 형변환
    const cleanedProductData = {
      name: productData.name,
      description: productData.description || '',
      price: productData.price ? Number(productData.price) : 0,
      status: productData.status || 'active',
      thumbnail_url: productData.thumbnail_url || null,
      origin: productData.origin || null,
      harvest_date: productData.harvest_date || null,
      storage_method: productData.storage_method || null,
      is_organic: productData.is_organic || false
    };

    console.log('Processed product data:', cleanedProductData);

    // 상품 추가
    const { data, error } = await supabase
      .from('products')
      .insert(cleanedProductData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: '상품 추가에 실패했습니다.' },
      { status: 500 }
    );
  }
} 