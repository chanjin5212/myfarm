import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    // 필수 필드 검증
    if (!email || !code) {
      return NextResponse.json({ error: '이메일과 인증코드는 필수 항목입니다.' }, { status: 400 });
    }

    // 인증 코드 확인
    try {
      const { data: verifications, error } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString()) // 아직 만료되지 않은 코드
        .limit(1);

      if (error) {
        throw new Error(`인증 코드 확인 중 오류: ${error.message}`);
      }

      if (!verifications || verifications.length === 0) {
        return NextResponse.json({ 
          verified: false, 
          error: '인증 코드가 유효하지 않거나 만료되었습니다.' 
        }, { status: 400 });
      }

      // 이메일 인증 상태 업데이트
      try {
        const { error: updateError } = await supabase
          .from('email_verifications')
          .update({ verified: true })
          .eq('email', email);

        if (updateError) {
          throw new Error(`인증 상태 업데이트 오류: ${updateError.message}`);
        }

        return NextResponse.json({
          verified: true,
          message: '이메일 인증이 완료되었습니다.'
        });
      } catch (updateError) {
        if (updateError instanceof Error) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
        return NextResponse.json({ error: '인증 상태 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
      }
    } catch (verifyError) {
      if (verifyError instanceof Error) {
        return NextResponse.json({ error: verifyError.message }, { status: 500 });
      }
      return NextResponse.json({ error: '인증 처리 중 오류가 발생했습니다.' }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ error: '인증 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 