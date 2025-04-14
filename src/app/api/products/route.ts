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
    const limit = parseInt(searchParams.get('limit') || '12');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    
    // 쿼리 작성
    let query = supabase
      .from('products')
      .select('*')
      .eq('status', 'active');
    
    // 카테고리 필터
    if (category) {
      query = query.eq('category_id', category);
    }
    
    // 검색어 필터
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    // 페이지네이션 및 정렬
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // 쿼리 실행
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // 실제 데이터만 반환
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('상품 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '상품 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 