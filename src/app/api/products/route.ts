import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // URL 파라미터 처리
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'newest';
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const organic = searchParams.get('organic');
    const limit = parseInt(searchParams.get('limit') || '12');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    
    // 쿼리 작성 - 상품 데이터 + 카테고리 정보
    let query = supabase
      .from('products')
      .select('*, categories(name)')
      .eq('status', 'active');
    
    // 카테고리 필터
    if (category) {
      query = query.eq('category_id', category);
    }
    
    // 검색어 필터
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    // 가격 필터
    if (minPrice) {
      query = query.gte('price', parseInt(minPrice));
    }
    
    if (maxPrice) {
      query = query.lte('price', parseInt(maxPrice));
    }
    
    // 유기농 필터
    if (organic === 'true') {
      query = query.eq('is_organic', true);
    }
    
    // 정렬 옵션
    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'price_low') {
      query = query.order('price', { ascending: true });
    } else if (sort === 'price_high') {
      query = query.order('price', { ascending: false });
    } else if (sort === 'popular') {
      // 임시로 판매량순
      query = query.order('sales_count', { ascending: false }).order('created_at', { ascending: false });
    }
    
    // 먼저 전체 카운트를 확인
    const countQuery = supabase
      .from('products')
      .select('id', { count: 'exact' })
      .eq('status', 'active');
    
    // 동일한 필터 조건 적용
    if (category) countQuery.eq('category_id', category);
    if (search) countQuery.ilike('name', `%${search}%`);
    if (minPrice) countQuery.gte('price', parseInt(minPrice));
    if (maxPrice) countQuery.lte('price', parseInt(maxPrice));
    if (organic === 'true') countQuery.eq('is_organic', true);
    
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      throw countError;
    }
    
    // 페이지네이션
    query = query.range(offset, offset + limit - 1);
    
    // 쿼리 실행
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // 응답 데이터 가공
    const products = data.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      discount_price: product.discount_price,
      thumbnail_url: product.thumbnail_url,
      is_organic: product.is_organic,
      category_name: product.categories?.name
    }));
    
    // 모바일 페이지 형식에 맞게 응답
    return NextResponse.json({
      products,
      total: count || 0,
      hasMore: offset + limit < (count || 0)
    });
  } catch (error) {
    console.error('상품 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '상품 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 