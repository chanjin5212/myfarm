import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();
    
    // 필수 필드 검증
    if (!email || !code) {
      return NextResponse.json({ 
        success: false, 
        error: '이메일과 인증 코드는 필수 항목입니다.' 
      }, { status: 400 });
    }
    
    // 인증 코드 검증
    const now = new Date();
    
    console.log('비밀번호 재설정 인증 정보 확인:', { email, code });
    
    // 이메일과 인증 코드로 검증 기록 확인
    const { data: verification, error: verificationError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('verified', false)
      .gte('expires_at', now.toISOString())
      .single();
      
    console.log('인증 코드 조회 결과:', verification);
    console.log('인증 코드 조회 오류:', verificationError);
    
    if (verificationError || !verification) {
      // 단순히 코드만 확인 (만료 및 검증 여부 무시)
      const { data: anyVerification } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .single();
        
      if (anyVerification) {
        if (anyVerification.verified) {
          return NextResponse.json({ 
            success: false, 
            error: '이미 사용된 인증 코드입니다.' 
          }, { status: 400 });
        }
        
        if (new Date(anyVerification.expires_at) < now) {
          return NextResponse.json({ 
            success: false, 
            error: '만료된 인증 코드입니다. 인증 코드를 재발급 받으세요.' 
          }, { status: 400 });
        }
      }
      
      return NextResponse.json({ 
        success: false, 
        error: '유효하지 않은 인증 코드입니다. 다시 확인해주세요.' 
      }, { status: 400 });
    }
    
    // 사용자 정보 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
      
    if (userError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: '해당 이메일로 등록된 사용자를 찾을 수 없습니다.' 
      }, { status: 404 });
    }

    try {
      // 인증 코드를 사용됨으로 표시
      const { error: updateError } = await supabase
        .from('email_verifications')
        .update({ verified: true })
        .eq('id', verification.id);
        
      if (updateError) {
        console.error('이메일 인증 상태 업데이트 오류:', JSON.stringify(updateError, null, 2));
        return NextResponse.json({
          success: false,
          error: '인증 상태 업데이트 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        }, { status: 500 });
      }
      
      // 고유 ID 생성 - 리셋 토큰으로 사용
      const resetId = uuidv4();
      
      return NextResponse.json({
        success: true,
        resetId: resetId,
        verificationCode: code, // 인증 코드도 함께 반환
        message: '인증이 완료되었습니다. 새 비밀번호를 설정해주세요.'
      });
    } catch (error) {
      console.error('비밀번호 재설정 인증 처리 오류:', typeof error === 'object' ? JSON.stringify(error, null, 2) : error);
      return NextResponse.json({
        success: false,
        error: '인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('인증 코드 검증 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: '인증 코드 검증 중 오류가 발생했습니다. 다시 시도해주세요.' 
    }, { status: 500 });
  }
} 