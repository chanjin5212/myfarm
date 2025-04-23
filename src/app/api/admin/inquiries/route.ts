import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 관리자 토큰 검증 함수
async function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isValid: false, error: '인증 토큰이 필요합니다' };
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      login_id: string;
      role: string;
    };
    
    if (decoded.role !== 'admin') {
      return { isValid: false, error: '관리자 권한이 없습니다' };
    }
    
    return { isValid: true, userId: decoded.id };
  } catch (error) {
    return { isValid: false, error: '유효하지 않은 토큰입니다' };
  }
}

// 문의 목록 조회 API
export async function GET(req: NextRequest) {
  try {
    // 관리자 인증
    const authResult = await verifyAdminToken(req);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    // 쿼리 파라미터 가져오기
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // 기본 쿼리 빌드
    let query = supabase
      .from('product_inquiries')
      .select(`
        *,
        users:user_id (name, email, nickname),
        products:product_id (name),
        reply_count:inquiry_replies(count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 검색어가 있는 경우 검색 조건 추가
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // 상태 필터가 있는 경우 조건 추가
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // 쿼리 실행
    const { data: inquiries, count, error } = await query;

    if (error) {
      console.error('문의 목록 조회 오류:', error);
      return NextResponse.json({ error: '문의 목록을 불러오는데 실패했습니다.' }, { status: 500 });
    }

    // 응답 데이터 형식 변환
    const formattedInquiries = inquiries?.map(inquiry => ({
      id: inquiry.id,
      product_id: inquiry.product_id,
      user_id: inquiry.user_id,
      title: inquiry.title,
      content: inquiry.content,
      is_private: inquiry.is_private,
      status: inquiry.status,
      created_at: inquiry.created_at,
      user_name: inquiry.users?.nickname || inquiry.users?.name || '알 수 없음',
      product_name: inquiry.products?.name || '알 수 없는 상품',
      reply_count: inquiry.reply_count?.[0]?.count || 0
    })) || [];

    // 총 페이지 수 계산
    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      inquiries: formattedInquiries,
      total: count,
      page,
      limit,
      totalPages
    });
  } catch (error) {
    console.error('문의 목록 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 