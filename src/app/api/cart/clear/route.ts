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
  console.log('[장바구니 비우기 API] Authorization 헤더:', authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[장바구니 비우기 API] 인증 헤더가 없거나 잘못된 형식입니다.');
    return null;
  }
  
  const token = authHeader.split(' ')[1].trim();
  console.log('[장바구니 비우기 API] 추출된 토큰 길이:', token.length);
  
  try {
    // 두 가지 방식으로 토큰 처리 시도
    
    // 1. Base64 디코딩 시도 (소셜 로그인)
    try {
      const decodedToken = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      console.log('[장바구니 비우기 API] Base64 디코딩 성공!');
      
      if (decodedToken.user && decodedToken.user.id) {
        console.log('[장바구니 비우기 API] 사용자 ID 추출 (소셜 로그인):', decodedToken.user.id);
        return decodedToken.user.id;
      }
    } catch (base64Error) {
      console.log('[장바구니 비우기 API] Base64 디코딩 실패, JSON 파싱 시도');
    }
    
    // 2. 직접 JSON 파싱 시도 (일반 로그인)
    try {
      const parsedToken = JSON.parse(token);
      console.log('[장바구니 비우기 API] JSON 파싱 성공!');
      
      if (parsedToken.user && parsedToken.user.id) {
        console.log('[장바구니 비우기 API] 사용자 ID 추출 (일반 로그인):', parsedToken.user.id);
        return parsedToken.user.id;
      }
    } catch (jsonError) {
      console.log('[장바구니 비우기 API] JSON 파싱 실패');
    }
    
    // 3. 토큰이 직접 ID인 경우도 처리 (다른 API와의 호환성)
    if (token.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log('[장바구니 비우기 API] 토큰이 UUID 형식으로 전달됨:', token);
      return token;
    }
    
    // 모든 방법이 실패한 경우
    console.log('[장바구니 비우기 API] 토큰에서 사용자 ID를 찾을 수 없습니다.');
    return null;
  } catch (error) {
    console.error('[장바구니 비우기 API] 토큰 처리 오류:', error);
    return null;
  }
}

// 장바구니 비우기 (모든 아이템 삭제)
export async function DELETE(request: NextRequest) {
  try {
    // 사용자 인증
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 사용자의 장바구니 아이템 전체 삭제
    const { error } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('[장바구니 비우기 API] 장바구니 비우기 실패:', error);
      return NextResponse.json({ 
        error: '장바구니 비우기 중 오류가 발생했습니다.',
        details: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: '장바구니가 성공적으로 비워졌습니다.' 
    });
  } catch (error) {
    console.error('[장바구니 비우기 API] 장바구니 비우기 오류:', error);
    return NextResponse.json({ 
      error: '장바구니 비우기 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 