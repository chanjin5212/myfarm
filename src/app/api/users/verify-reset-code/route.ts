import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { login_id, email, code } = await request.json();
    
    // 필수 필드 검증
    if (!login_id || !email || !code) {
      return NextResponse.json({ 
        success: false, 
        error: '아이디, 이메일, 인증코드는 필수 항목입니다.' 
      }, { status: 400 });
    }
    
    // 사용자 확인
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('login_id', login_id)
      .eq('email', email)
      .single();
      
    if (userError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: '입력하신 정보와 일치하는 사용자를 찾을 수 없습니다.' 
      }, { status: 404 });
    }
    
    // 인증 코드 확인
    const now = new Date().toISOString();
    const { data: resetRequest, error: resetError } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('verification_code', code)
      .eq('is_used', false)
      .gte('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (resetError || !resetRequest) {
      return NextResponse.json({ 
        success: false, 
        error: '유효하지 않거나 만료된 인증 코드입니다.' 
      }, { status: 400 });
    }
    
    // 인증 코드 사용으로 표시 (아직 사용하지 않음 - 비밀번호 재설정 시 사용됨)
    // const { error: updateError } = await supabase
    //   .from('password_reset_requests')
    //   .update({ is_used: true })
    //   .eq('id', resetRequest.id);
    // 
    // if (updateError) {
    //   console.error('인증 코드 업데이트 오류:', updateError);
    //   return NextResponse.json({ 
    //     success: false, 
    //     error: '인증 코드 확인 중 오류가 발생했습니다.' 
    //   }, { status: 500 });
    // }
    
    return NextResponse.json({
      success: true,
      message: '인증 코드가 확인되었습니다.',
      resetId: resetRequest.id // 비밀번호 재설정 요청 ID 반환
    });
    
  } catch (error) {
    console.error('인증 코드 확인 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: '인증 코드 확인 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 