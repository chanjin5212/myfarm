import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT Secret - 실제 환경에서는 환경 변수로 관리
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 관리자 인증 처리 함수
export async function POST(request: Request) {
  try {
    // 요청 데이터 파싱
    const { login_id, password } = await request.json();

    // 필수 필드 확인
    if (!login_id || !password) {
      return NextResponse.json({ message: '아이디와 비밀번호를 모두 입력해주세요.' }, { status: 400 });
    }

    // 사용자 조회 - 로그인 ID로 검색
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('login_id', login_id)
      .single();

    if (error || !user) {
      return NextResponse.json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    // 비밀번호 검증
    // 참고: 실제 환경에서는 비밀번호를 해싱하여 저장해야 함
    // 이 예제에서는 사용자 테이블에 저장된 비밀번호가 해싱되었다고 가정
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    // 관리자 권한 확인 - is_admin 필드 사용
    if (!user.is_admin) {
      return NextResponse.json({ message: '관리자 권한이 없습니다.' }, { status: 403 });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        id: user.id,
        login_id: user.login_id,
        role: 'admin' 
      },
      JWT_SECRET,
      { expiresIn: '2h' } // 2시간 후 만료
    );

    // 로그인 시간 업데이트
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // 토큰 반환
    return NextResponse.json({
      token,
      message: '로그인 성공'
    });

  } catch (error) {
    console.error('로그인 처리 중 오류:', error);
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 