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

    return NextResponse.json({
      products,
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
      stock: productData.stock ? Number(productData.stock) : 0,
      status: productData.status || 'active',
      category_id: productData.category_id || null,
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