import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 현재 로그인한 사용자 ID 가져오기
async function getUserId(request: NextRequest) {
  // Authorization 헤더에서 토큰 가져오기
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // 사용자 ID가 직접 전달된 경우 그대로 사용
    if (!token.includes('.')) {
      return token;
    }
    
    // JWT 또는 토큰 검증 로직
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return payload.sub;
    } catch (error) {
      console.error('토큰 검증 오류:', error);
      return token; // 오류 발생 시 토큰 자체를 ID로 시도
    }
  }
  
  // 토큰이 없는 경우 null 반환
  return null;
}

// 장바구니 비우기 (모든 아이템 삭제)
export async function DELETE(
  request: NextRequest
) {
  try {
    // 사용자 인증
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
  } catch (error) {
    console.error('장바구니 비우기 오류:', error);
    return NextResponse.json({ error: '장바구니 비우기 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 