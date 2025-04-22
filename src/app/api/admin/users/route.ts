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

// 회원 목록 조회 API
export async function GET(request: NextRequest) {
  try {
    // 관리자 인증
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    
    // URL에서 검색 및 정렬 매개변수 가져오기
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    
    // 사용자 쿼리
    let query = supabase
      .from('users')
      .select('*');
    
    // 검색어가 있는 경우 필터링
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,nickname.ilike.%${search}%`);
    }
    
    // 정렬 설정
    query = query.order(sort, { ascending: order === 'asc' });
    
    // 페이지네이션 (페이지 번호는 1부터 시작)
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    // 쿼리 실행
    const { data: users, error, count } = await query
      .range(from, to);
    
    if (error) {
      console.error('회원 목록 조회 오류:', error);
      return NextResponse.json(
        { error: '회원 목록을 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }

    // 비밀번호 필드 제거
    const usersWithoutPassword = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    // 각 사용자의 총 구매액 및 주문 횟수 가져오기
    const usersWithStats = await Promise.all(
      usersWithoutPassword.map(async (user) => {
        // 사용자의 모든 주문 가져오기
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, total_amount')
          .eq('user_id', user.id);

        if (ordersError) {
          console.error(`사용자 ${user.id}의 주문 조회 오류:`, ordersError);
          return {
            ...user,
            total_purchase_amount: 0,
            order_count: 0
          };
        }

        // 총 구매액 계산
        const totalPurchaseAmount = orders ? orders.reduce((sum, order) => sum + order.total_amount, 0) : 0;
        
        // 주문 횟수
        const orderCount = orders ? orders.length : 0;

        return {
          ...user,
          total_purchase_amount: totalPurchaseAmount,
          order_count: orderCount
        };
      })
    );

    // 총 페이지 수 계산
    const totalPages = count ? Math.ceil(count / limit) : 1;
    
    // 응답 반환
    return NextResponse.json({
      users: usersWithStats,
      page,
      totalPages,
      totalUsers: count || users.length
    });
    
  } catch (error) {
    console.error('회원 목록 조회 에러:', error);
    return NextResponse.json(
      { error: '회원 목록을 가져오는데 실패했습니다' },
      { status: 500 }
    );
  }
} 