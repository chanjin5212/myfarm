import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 환경 변수 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase 클라이언트 생성
const supabase = createClient(
  supabaseUrl || '',
  supabaseServiceKey || supabaseAnonKey || ''
);

// 사용자 ID로 정보 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = (await params).id;
    
    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 사용자 정보 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (error) {
      console.error('사용자 정보 조회 오류:', error);
      return NextResponse.json({ 
        error: '사용자 정보 조회 중 오류가 발생했습니다.', 
        details: error.message 
      }, { status: 500 });
    }
    
    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 개인정보 보호를 위해 비밀번호 해시 등 민감한 정보는 제외
    const { password_hash, ...safeUserData } = user;
    
    // 마지막 로그인 시간 업데이트
    const now = new Date().toISOString();
    await supabase
      .from('users')
      .update({ 
        last_login: now,
        updated_at: now 
      })
      .eq('id', userId);
    
    return NextResponse.json({
      user: safeUserData
    });
  } catch (error) {
    console.error('사용자 정보 조회 중 예외 발생:', error);
    return NextResponse.json({ 
      error: '사용자 정보를 조회하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 