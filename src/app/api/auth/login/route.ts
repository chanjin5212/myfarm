import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface LoginRequest {
  login_id: string;
  password: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as LoginRequest;
    const { login_id, password } = body;

    if (!login_id || !password) {
      return NextResponse.json({ 
        success: false, 
        error: '아이디와 비밀번호를 모두 입력해주세요.' 
      }, { status: 400 });
    }

    console.log('로그인 시도:', login_id); // 디버깅 로그 추가

    // 사용자 정보 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('login_id', login_id)
      .single();

    if (error || !user) {
      console.log('사용자 찾기 실패:', error?.message); // 디버깅 로그 추가
      return NextResponse.json({ 
        success: false, 
        error: '아이디 또는 비밀번호가 일치하지 않습니다.' 
      }, { status: 401 });
    }

    console.log('사용자 찾음:', user.id); // 디버깅 로그 추가

    // 저장된 비밀번호가 없는 경우 (소셜 로그인만 사용하는 계정인 경우)
    if (!user.password) {
      console.log('저장된 비밀번호가 없음 (소셜 로그인 계정)'); // 디버깅 로그 추가
      return NextResponse.json({ 
        success: false, 
        error: '일반 로그인이 설정되지 않은 계정입니다. 소셜 로그인을 이용해주세요.' 
      }, { status: 401 });
    }

    // 비밀번호 검증
    try {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('비밀번호 검증 결과:', isPasswordValid); // 디버깅 로그 추가
      
      if (!isPasswordValid) {
        return NextResponse.json({ 
          success: false, 
          error: '아이디 또는 비밀번호가 일치하지 않습니다.' 
        }, { status: 401 });
      }
    } catch (bcryptError) {
      console.error('비밀번호 검증 오류:', bcryptError); // 디버깅 로그 추가
      return NextResponse.json({ 
        success: false, 
        error: '로그인 처리 중 오류가 발생했습니다.' 
      }, { status: 500 });
    }

    // 마지막 로그인 시간 업데이트
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        last_login: now,
        updated_at: now
      })
      .eq('id', user.id);
      
    if (updateError) {
      console.log('로그인 시간 업데이트 실패:', updateError.message); // 디버깅 로그 추가
    }

    // 중요: 보안을 위해 비밀번호 필드 제거
    delete user.password;

    return NextResponse.json({ 
      success: true,
      message: '로그인에 성공했습니다.',
      user // 사용자 정보 반환
    });
    
  } catch (error) {
    console.error('로그인 처리 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: '로그인 처리 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 