import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    // 요청 데이터 파싱
    const { login_id } = await request.json();
    
    // 필수 필드 확인
    if (!login_id || login_id.trim() === '') {
      return NextResponse.json({ error: '로그인 아이디는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 아이디 길이 검증
    if (login_id.length < 4) {
      return NextResponse.json({ error: '로그인 아이디는 4자 이상이어야 합니다.' }, { status: 400 });
    }
    
    // 중복 확인
    const { data, error } = await supabase
      .from('users')
      .select('login_id')
      .eq('login_id', login_id)
      .maybeSingle();
    
    if (error) {
      throw new Error(error.message);
    }
    
    // 결과 반환
    return NextResponse.json({ 
      exists: !!data, 
      message: data ? '이미 사용 중인 아이디입니다.' : '사용 가능한 아이디입니다.'
    });
    
  } catch (error) {
    console.error('아이디 중복 확인 중 오류:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ error: '알 수 없는 오류가 발생했습니다.' }, { status: 500 });
  }
} 