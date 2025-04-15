import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// 사용자 ID 가져오기 함수
async function getUserId(request: NextRequest) {
  // Authorization 헤더에서 토큰 가져오기
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('인증 헤더가 없거나 잘못된 형식입니다.');
    return null;
  }
  
  try {
    // Bearer 접두사 제거 및 URL 디코딩
    const encodedToken = authHeader.split(' ')[1].trim();
    const token = decodeURIComponent(encodedToken);
    
    // UUID 형식의 사용자 ID인지 확인
    if (isValidUUID(token)) {
      // 사용자 존재 여부 확인
      const { data, error } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', token)
        .maybeSingle();
      
      if (error) {
        console.error('[비밀번호 검증 API] 사용자 조회 오류:', error);
        return null;
      }
      
      if (!data) {
        console.error('[비밀번호 검증 API] 사용자 ID가 존재하지 않음:', token);
        return null;
      }
      
      console.log('[비밀번호 검증 API] 사용자 ID 검증 성공:', token);
      return token;
    }
    
    console.error('[비밀번호 검증 API] 유효하지 않은 토큰 형식:', token);
    return null;
  } catch (error) {
    console.error('[비밀번호 검증 API] 토큰 처리 오류:', error);
    return null;
  }
}

// UUID 유효성 검사
function isValidUUID(id: string): boolean {
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return pattern.test(id);
}

export async function POST(request: NextRequest) {
  try {
    console.log('[비밀번호 검증 API] 요청 시작');
    
    // 사용자 ID 가져오기
    const userId = await getUserId(request);
    
    if (!userId) {
      return NextResponse.json({ verified: false, error: '인증되지 않은 사용자' }, { status: 401 });
    }
    
    console.log('[비밀번호 검증 API] 사용자 ID:', userId);
    
    // 요청 데이터 파싱
    let password;
    try {
      const body = await request.json();
      password = body.password;
    } catch (e) {
      console.error('[비밀번호 검증 API] 요청 본문 파싱 오류:', e);
      return NextResponse.json({ verified: false, error: '요청 데이터가 유효하지 않습니다.' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ verified: false, error: '비밀번호가 제공되지 않았습니다.' }, { status: 400 });
    }

    // 사용자 정보 가져오기
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('password, login_id')
      .eq('id', userId)
      .maybeSingle();
    
    if (userError) {
      console.error('[비밀번호 검증 API] 사용자 조회 오류:', userError.message);
      return NextResponse.json({ verified: false, error: '사용자 정보를 조회할 수 없습니다.' }, { status: 500 });
    }
    
    if (!user) {
      console.error('[비밀번호 검증 API] 사용자를 찾을 수 없음:', userId);
      return NextResponse.json({ verified: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 소셜 로그인 사용자 확인 (login_id가 없으면 소셜 로그인)
    if (!user.login_id) {
      console.error('[비밀번호 검증 API] 소셜 로그인 사용자:', userId);
      return NextResponse.json({ 
        verified: false, 
        error: '소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.' 
      }, { status: 403 });
    }
    
    // 비밀번호 검증
    console.log('[비밀번호 검증 API] 비밀번호 검증 시도');
    
    if (!user.password) {
      console.error('[비밀번호 검증 API] 저장된 비밀번호가 없음:', userId);
      return NextResponse.json({ verified: false, error: '저장된 비밀번호가 없습니다.' }, { status: 400 });
    }
    
    // bcrypt로 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (isPasswordValid) {
      console.log('[비밀번호 검증 API] 비밀번호 검증 성공');
      return NextResponse.json({ verified: true });
    } else {
      console.log('[비밀번호 검증 API] 비밀번호 불일치');
      return NextResponse.json({ verified: false, error: '비밀번호가 일치하지 않습니다.' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('[비밀번호 검증 API] 오류:', error);
    return NextResponse.json(
      { verified: false, error: '비밀번호 검증 중 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
} 