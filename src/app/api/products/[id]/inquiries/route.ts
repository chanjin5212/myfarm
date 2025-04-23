import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// 현재 로그인한 사용자 ID 가져오기
async function getUserId(request: NextRequest) {
  // Authorization 헤더에서 토큰 가져오기
  const authHeader = request.headers.get('Authorization');
  console.log('[문의 API] Authorization 헤더 존재 여부:', !!authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[문의 API] 인증 헤더가 없거나 잘못된 형식입니다.');
    return null;
  }
  
  try {
    // Bearer 접두사 제거
    const token = authHeader.split(' ')[1].trim();
    console.log('[문의 API] 토큰 길이:', token.length);
    
    // UUID 형식의 사용자 ID인지 확인
    if (isValidUUID(token)) {
      console.log('[문의 API] UUID 형식의 사용자 ID로 인증:', token);
      
      // 사용자 ID가 users 테이블에 존재하는지 확인
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', token)
        .maybeSingle();
        
      if (userError) {
        console.error('[문의 API] 사용자 확인 오류:', userError.message);
        return null;
      }
      
      if (!userData) {
        console.log('[문의 API] 해당 ID의 사용자를 찾을 수 없습니다.');
        return null;
      }
      
      return token; // 사용자 ID 반환
    }
    
    console.error('[문의 API] 유효하지 않은 토큰 형식:', token);
    return null;
  } catch (error) {
    console.error('[문의 API] 토큰 처리 중 오류 발생:', error);
    return null;
  }
}

// UUID 형식인지 확인하는 함수
function isValidUUID(id: string | null | undefined): boolean {
  if (id === null || id === undefined) return false;
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return pattern.test(id);
}

// 상품 문의 목록 가져오기
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const productId = resolvedParams.id;
  
  if (!isValidUUID(productId)) {
    return NextResponse.json({ error: '유효하지 않은 상품 ID' }, { status: 400 });
  }
  
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '5');
  const offset = (page - 1) * limit;
  
  try {
    // 상품 문의 목록 조회
    const { data: inquiries, error, count } = await supabaseClient
      .from('product_inquiries')
      .select(`
        *,
        replies:inquiry_replies(*)
      `, { count: 'exact' })
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('[문의 API] 문의 목록 조회 오류:', error);
      return NextResponse.json(
        { error: '문의 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // 문의 작성자 정보 조회
    if (inquiries && inquiries.length > 0) {
      const userIds = [...new Set(inquiries.map(item => item.user_id))];
      
      const { data: users, error: usersError } = await supabaseClient
        .from('users')
        .select('id, nickname, name')
        .in('id', userIds);
      
      if (usersError) {
        console.error('[문의 API] 사용자 정보 조회 오류:', usersError);
      }
      
      // 사용자 정보 추가
      const enrichedInquiries = inquiries.map(inquiry => {
        const user = users?.find(u => u.id === inquiry.user_id);
        return {
          ...inquiry,
          username: user?.nickname || user?.name || '사용자'
        };
      });
      
      // 답변에 작성자 정보 추가
      for (const inquiry of enrichedInquiries) {
        if (inquiry.replies && inquiry.replies.length > 0) {
          const replyUserIds = [...new Set(inquiry.replies.map((r: any) => r.user_id))];
          
          const { data: replyUsers, error: replyUsersError } = await supabaseClient
            .from('users')
            .select('id, nickname, name, is_admin')
            .in('id', replyUserIds);
          
          if (replyUsersError) {
            console.error('[문의 API] 답변 작성자 정보 조회 오류:', replyUsersError);
          } else if (replyUsers) {
            inquiry.replies = inquiry.replies.map((reply: any) => {
              const user = replyUsers.find(u => u.id === reply.user_id);
              return {
                ...reply,
                username: user?.nickname || user?.name || '사용자',
                is_admin: user?.is_admin || false
              };
            });
          }
        }
      }
      
      return NextResponse.json({
        inquiries: enrichedInquiries,
        total: count || 0,
        hasMore: (count !== null) ? offset + limit < count : false
      });
    }
    
    return NextResponse.json({
      inquiries: [],
      total: 0,
      hasMore: false
    });
  } catch (error) {
    console.error('[문의 API] 문의 목록 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 상품 문의 등록
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const productId = resolvedParams.id;
  
  if (!isValidUUID(productId)) {
    return NextResponse.json({ error: '유효하지 않은 상품 ID' }, { status: 400 });
  }
  
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '인증되지 않은 사용자' }, { status: 401 });
  }
  
  try {
    // 상품 존재 여부 확인
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('id')
      .eq('id', productId)
      .maybeSingle();
    
    if (productError) {
      console.error('[문의 API] 상품 조회 오류:', productError);
      return NextResponse.json(
        { error: '상품 정보를 확인하는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    if (!product) {
      return NextResponse.json(
        { error: '존재하지 않는 상품입니다.' },
        { status: 404 }
      );
    }
    
    // 요청 내용 파싱
    const body = await request.json();
    const { title, content, is_private } = body;
    
    if (!title || !content) {
      return NextResponse.json(
        { error: '제목과 내용은 필수 항목입니다.' },
        { status: 400 }
      );
    }
    
    // 문의 등록
    const { data: inquiry, error: inquiryError } = await supabaseClient
      .from('product_inquiries')
      .insert({
        product_id: productId,
        user_id: userId,
        title: title,
        content: content,
        is_private: is_private || false,
        status: 'pending'
      })
      .select()
      .single();
    
    if (inquiryError) {
      console.error('[문의 API] 문의 등록 오류:', inquiryError);
      return NextResponse.json(
        { error: '문의 등록에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: '문의가 성공적으로 등록되었습니다.',
      inquiry: inquiry
    }, { status: 201 });
  } catch (error) {
    console.error('[문의 API] 문의 등록 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 