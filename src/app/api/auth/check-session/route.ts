import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// UUID 형식인지 확인하는 함수
function isValidUUID(id: string | null | undefined): boolean {
  if (id === null || id === undefined) return false;
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return pattern.test(id);
}

// 토큰에서 사용자 ID 추출
async function extractUserId(request: NextRequest): Promise<string | null> {
  // Authorization 헤더에서 토큰 가져오기
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[세션 체크 API] 인증 헤더가 없거나 잘못된 형식입니다.');
    return null;
  }
  
  try {
    // Bearer 접두사 제거
    const token = authHeader.split(' ')[1].trim();
    
    // UUID 형식의 사용자 ID인지 확인
    if (isValidUUID(token)) {
      // 사용자 ID가 users 테이블에 존재하는지 확인
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', token)
        .maybeSingle();

      if (userError) {
        console.error('[세션 체크 API] 사용자 확인 오류:', userError.message);
        return null;
      }
      
      if (!userData) {
        console.log('[세션 체크 API] 해당 ID의 사용자를 찾을 수 없습니다.');
        return null;
      }
      
      return token; // 사용자 ID 반환
    }
    
    console.error('[세션 체크 API] 유효하지 않은 토큰 형식:', token);
    return null;
  } catch (error) {
    console.error('[세션 체크 API] 토큰 처리 중 오류 발생:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  // 사용자 ID 추출
  const userId = await extractUserId(request);
  
  if (!userId) {
    return NextResponse.json(
      { valid: false, message: '인증되지 않은 사용자' },
      { status: 401 }
    );
  }
  
  try {
    // 사용자 세션 확인 (여기서는 사용자 존재 여부만 확인)
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('id, created_at, updated_at')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('[세션 체크 API] 사용자 조회 오류:', userError);
      return NextResponse.json(
        { valid: false, message: '세션 확인 중 오류 발생' },
        { status: 500 }
      );
    }
    
    if (!userData) {
      return NextResponse.json(
        { valid: false, message: '세션이 만료되었습니다.' },
        { status: 401 }
      );
    }
    
    // 여기서 추가적인 세션 유효성 검사를 수행할 수 있음
    // 예: 마지막 활동 시간 확인, 세션 만료 시간 확인 등
    
    // 세션 활동 시간 업데이트 (선택 사항)
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', userId);
    
    if (updateError) {
      console.error('[세션 체크 API] 사용자 활동 시간 업데이트 오류:', updateError);
      // 업데이트 실패해도 세션은 유효함으로 처리
    }
    
    // 유효한 세션 응답
    return NextResponse.json({
      valid: true,
      // 필요하다면 여기서 갱신된 토큰을 제공할 수 있음
      // renewedToken: '새로운 토큰'
    });
    
  } catch (error) {
    console.error('[세션 체크 API] 처리 중 오류:', error);
    return NextResponse.json(
      { valid: false, message: '세션 확인 중 오류 발생' },
      { status: 500 }
    );
  }
} 